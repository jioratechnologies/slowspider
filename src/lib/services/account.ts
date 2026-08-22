import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { db } from "../db";
import { issueOtp, verifyOtp, consumeVerified } from "../otp";
import { sendOtpEmail } from "../email";

// Portable business logic for signup/login/reset — no Next.js imports. Identity now lives
// in Supabase Auth (auth.users), not our own table, so "verify a password" and "create an
// account" both go through Supabase's auth API rather than our own bcrypt/users-table code.
//
// A plain (non-SSR) publishable-key client is used for anything that returns a session — it never
// touches cookies, so it stays framework-agnostic; the caller (a Server Action for web, a
// Route Handler for the API) decides what to do with the returned tokens: the web adapter
// persists them into cookies via src/lib/supabase/server.ts, the API adapter just returns
// them to the client as JSON.

function anonClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function emailHasAccount(email: string): Promise<boolean> {
  const { data } = await db().from("users").select("id").eq("email", email).maybeSingle();
  return !!data;
}

function toAuthResult(email: string, data: { user: { id: string } | null; session: { access_token: string; refresh_token: string } | null }): AuthResult {
  if (!data.user || !data.session) throw new Error("Something went wrong signing you in.");
  return { id: data.user.id, email, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } };
}

// ---- credential check — shared by the web login action and the API login route ----
export async function verifyCredentials(email: string, password: string): Promise<AuthResult | null> {
  const e = normalizeEmail(email);
  if (!validEmail(e) || !password) return null;

  const { data, error } = await anonClient().auth.signInWithPassword({ email: e, password });
  if (error || !data.user || !data.session) return null;

  return toAuthResult(e, data);
}

// ---- signup: request email OTP ----
export async function requestSignupOtp(email: string): Promise<{ devCode?: string }> {
  const e = normalizeEmail(email);
  if (!validEmail(e)) throw new Error("Enter a valid email.");

  if (await emailHasAccount(e)) throw new Error("That email already has an account — log in instead.");

  const { code, dev } = await issueOtp("signup", e);
  if (!dev) {
    try {
      await sendOtpEmail(e, code, "signup");
    } catch {
      throw new Error("Couldn't send the email. Try again in a moment.");
    }
  }
  return { devCode: dev ? code : undefined };
}

export async function verifySignupOtp(email: string, code: string): Promise<void> {
  const e = normalizeEmail(email);
  const ok = await verifyOtp("signup", e, code.trim());
  if (!ok) throw new Error("That code was wrong or expired.");
}

export async function completeSignup(email: string, password: string): Promise<AuthResult> {
  const e = normalizeEmail(email);
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const verified = await consumeVerified("signup", e);
  if (!verified) throw new Error("Verify your email first.");

  if (await emailHasAccount(e)) throw new Error("That email already has an account — log in instead.");

  const { error } = await db().auth.admin.createUser({ email: e, password, email_confirm: true });
  if (error) throw new Error(error.message);

  const { data, error: signInError } = await anonClient().auth.signInWithPassword({ email: e, password });
  if (signInError) throw new Error("Account created — please log in.");
  return toAuthResult(e, data);
}

// ---- forgot password: request OTP, verify, set new password ----
export async function requestResetOtp(email: string): Promise<{ devCode?: string }> {
  const e = normalizeEmail(email);
  if (!validEmail(e)) throw new Error("Enter a valid email.");

  if (!(await emailHasAccount(e))) throw new Error("No account with that email.");

  const { code, dev } = await issueOtp("reset", e);
  if (!dev) {
    try {
      await sendOtpEmail(e, code, "reset");
    } catch {
      throw new Error("Couldn't send the email. Try again in a moment.");
    }
  }
  return { devCode: dev ? code : undefined };
}

export async function verifyResetOtp(email: string, code: string): Promise<void> {
  const e = normalizeEmail(email);
  const ok = await verifyOtp("reset", e, code.trim());
  if (!ok) throw new Error("That code was wrong or expired.");
}

export async function completeReset(email: string, password: string): Promise<AuthResult> {
  const e = normalizeEmail(email);
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const verified = await consumeVerified("reset", e);
  if (!verified) throw new Error("Verify your email first.");

  const { data: profile } = await db().from("users").select("id").eq("email", e).maybeSingle();
  if (!profile) throw new Error("No account with that email.");

  const { error } = await db().auth.admin.updateUserById(profile.id, { password });
  if (error) throw new Error(error.message);

  const { data, error: signInError } = await anonClient().auth.signInWithPassword({ email: e, password });
  if (signInError) throw new Error("Password updated — please log in.");
  return toAuthResult(e, data);
}
