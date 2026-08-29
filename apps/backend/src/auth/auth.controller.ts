import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { RateLimitService } from "../common/services/rate-limit.service";
import { AccountService } from "./account.service";
import { WorkspaceService } from "../workspace/workspace.service";

// Port of apps/web's src/app/api/v1/auth/**/route.ts — all public (no bearer token), same
// as withApi() there. Same URL paths minus the leading /api.
@Public()
@Controller("v1/auth")
export class AuthController {
  constructor(
    private readonly account: AccountService,
    private readonly rateLimit: RateLimitService,
    private readonly workspace: WorkspaceService
  ) {}

  // POST /v1/auth/login
  @Post("login")
  async login(@Body() body: { email?: string; password?: string }) {
    const { email, password } = body || {};
    if (!email || !password) throw new Error("Enter your email and password.");

    // Same Redis key as the web login path — one shared budget regardless of client.
    const withinLimit = await this.rateLimit.checkRateLimit(`login:${this.account.normalizeEmail(email)}`, 5, 300);
    if (!withinLimit) throw new Error("Too many attempts. Try again in a few minutes.");

    const result = await this.account.verifyCredentials(email, password);
    if (!result) throw new Error("Wrong email or password.");

    return { token: result.session.access_token, refreshToken: result.session.refresh_token, user: { id: result.id, email: result.email } };
  }

  // POST /v1/auth/refresh
  @Post("refresh")
  async refresh(@Body() body: { refreshToken?: string }) {
    const { refreshToken } = body || {};
    if (!refreshToken) throw new Error("No refresh token provided.");
    const result = await this.account.refreshSession(refreshToken);
    if (!result) throw new Error("Session expired.");
    return { token: result.session.access_token, refreshToken: result.session.refresh_token, user: { id: result.id, email: result.email } };
  }

  // POST /v1/auth/signup/otp
  @Post("signup/otp")
  async signupOtp(@Body() body: { email?: string }) {
    const { email } = body || {};
    await this.rateLimit.enforceRateLimit(`otp-req:${this.account.normalizeEmail(email || "")}`, 3, 600);
    return this.account.requestSignupOtp(email || "");
  }

  // POST /v1/auth/signup/verify
  @Post("signup/verify")
  async signupVerify(@Body() body: { email?: string; code?: string }) {
    const { email, code } = body || {};
    await this.account.verifySignupOtp(email || "", code || "");
    return { verified: true };
  }

  // POST /v1/auth/signup/complete
  @Post("signup/complete")
  async signupComplete(@Body() body: { email?: string; password?: string }) {
    const { email, password } = body || {};
    const result = await this.account.completeSignup(email || "", password || "");
    await this.workspace.createDefaultWorkspace(result.id);
    return { token: result.session.access_token, refreshToken: result.session.refresh_token, user: { id: result.id, email: result.email } };
  }

  // POST /v1/auth/reset/otp
  @Post("reset/otp")
  async resetOtp(@Body() body: { email?: string }) {
    const { email } = body || {};
    await this.rateLimit.enforceRateLimit(`otp-req:${this.account.normalizeEmail(email || "")}`, 3, 600);
    return this.account.requestResetOtp(email || "");
  }

  // POST /v1/auth/reset/verify
  @Post("reset/verify")
  async resetVerify(@Body() body: { email?: string; code?: string }) {
    const { email, code } = body || {};
    await this.account.verifyResetOtp(email || "", code || "");
    return { verified: true };
  }

  // POST /v1/auth/reset/complete
  @Post("reset/complete")
  async resetComplete(@Body() body: { email?: string; password?: string }) {
    const { email, password } = body || {};
    const result = await this.account.completeReset(email || "", password || "");
    return { token: result.session.access_token, refreshToken: result.session.refresh_token, user: { id: result.id, email: result.email } };
  }
}
