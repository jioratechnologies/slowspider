import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/services/supabase.service";
import { OtpService } from "./otp.service";
import { EmailService } from "../common/services/email.service";

// 1:1 port of apps/web's src/lib/services/account.ts. Identity lives in Supabase Auth
// (auth.users), so "verify a password" and "create an account" both go through Supabase's
// auth API. verifyCredentials/completeSignup/completeReset all return a Supabase session —
// the API adapter (AuthController) just returns the tokens as JSON, same as before.

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
}
export interface AccountRef {
  id: string;
  email: string;
}
export interface AuthResult extends AccountRef {
  session: SupabaseSession;
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

@Injectable()
export class AccountService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly otp: OtpService,
    private readonly email: EmailService
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async emailHasAccount(email: string): Promise<boolean> {
    const { data } = await this.supabase.admin().from("users").select("id").eq("email", email).maybeSingle();
    return !!data;
  }

  private toAuthResult(email: string, data: { user: { id: string } | null; session: { access_token: string; refresh_token: string } | null }): AuthResult {
    if (!data.user || !data.session) throw new Error("Something went wrong signing you in.");
    return { id: data.user.id, email, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } };
  }

  async verifyCredentials(email: string, password: string): Promise<AuthResult | null> {
    const e = this.normalizeEmail(email);
    if (!validEmail(e) || !password) return null;

    const { data, error } = await this.supabase.anon().auth.signInWithPassword({ email: e, password });
    if (error || !data.user || !data.session) return null;

    return this.toAuthResult(e, data);
  }

  async refreshSession(refreshToken: string): Promise<AuthResult | null> {
    if (!refreshToken) return null;
    const { data, error } = await this.supabase.anon().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.user || !data.session) return null;
    return this.toAuthResult(data.user.email || "", data);
  }

  async requestSignupOtp(email: string): Promise<{ devCode?: string }> {
    const e = this.normalizeEmail(email);
    if (!validEmail(e)) throw new Error("Enter a valid email.");

    if (await this.emailHasAccount(e)) throw new Error("That email already has an account — log in instead.");

    const { code, dev } = await this.otp.issueOtp("signup", e);
    if (!dev) {
      try {
        await this.email.sendOtpEmail(e, code, "signup");
      } catch {
        throw new Error("Couldn't send the email. Try again in a moment.");
      }
    }
    return { devCode: dev ? code : undefined };
  }

  async verifySignupOtp(email: string, code: string): Promise<void> {
    const e = this.normalizeEmail(email);
    const ok = await this.otp.verifyOtp("signup", e, code.trim());
    if (!ok) throw new Error("That code was wrong or expired.");
  }

  async completeSignup(email: string, password: string): Promise<AuthResult> {
    const e = this.normalizeEmail(email);
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const verified = await this.otp.consumeVerified("signup", e);
    if (!verified) throw new Error("Verify your email first.");

    if (await this.emailHasAccount(e)) throw new Error("That email already has an account — log in instead.");

    const { error } = await this.supabase.admin().auth.admin.createUser({ email: e, password, email_confirm: true });
    if (error) throw new Error(error.message);

    const { data, error: signInError } = await this.supabase.anon().auth.signInWithPassword({ email: e, password });
    if (signInError) throw new Error("Account created — please log in.");
    return this.toAuthResult(e, data);
  }

  async requestResetOtp(email: string): Promise<{ devCode?: string }> {
    const e = this.normalizeEmail(email);
    if (!validEmail(e)) throw new Error("Enter a valid email.");

    if (!(await this.emailHasAccount(e))) throw new Error("No account with that email.");

    const { code, dev } = await this.otp.issueOtp("reset", e);
    if (!dev) {
      try {
        await this.email.sendOtpEmail(e, code, "reset");
      } catch {
        throw new Error("Couldn't send the email. Try again in a moment.");
      }
    }
    return { devCode: dev ? code : undefined };
  }

  async verifyResetOtp(email: string, code: string): Promise<void> {
    const e = this.normalizeEmail(email);
    const ok = await this.otp.verifyOtp("reset", e, code.trim());
    if (!ok) throw new Error("That code was wrong or expired.");
  }

  async completeReset(email: string, password: string): Promise<AuthResult> {
    const e = this.normalizeEmail(email);
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const verified = await this.otp.consumeVerified("reset", e);
    if (!verified) throw new Error("Verify your email first.");

    const { data: profile } = await this.supabase.admin().from("users").select("id").eq("email", e).maybeSingle();
    if (!profile) throw new Error("No account with that email.");

    const { error } = await this.supabase.admin().auth.admin.updateUserById(profile.id, { password });
    if (error) throw new Error(error.message);

    const { data, error: signInError } = await this.supabase.anon().auth.signInWithPassword({ email: e, password });
    if (signInError) throw new Error("Password updated — please log in.");
    return this.toAuthResult(e, data);
  }
}
