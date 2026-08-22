"use server";

import { createClient } from "./supabase/server";
import { backend } from "./backend-client";

// Web adapter over apps/backend's /v1/auth/** routes (through Kong) — used to call
// ./services/account.ts in-process; the backend now does the credential checks, OTP
// issuance/verification, and rate limiting itself (its AuthController enforces the same
// Redis-backed rate limit apps/web's route handler used to, keyed identically —
// `login:<email>` / `otp-req:<email>` — so there's no need for a local check here anymore).
// Every login/signup/reset call still ends the same way: persist the returned Supabase
// session into cookies via ./supabase/server.ts, exactly as before.

export interface ActionResult {
  ok: boolean;
  error?: string;
  devCode?: string; // only set in dev mode, so the UI can display it instead of an inbox
}

interface AuthTokens {
  token: string;
  refreshToken: string;
  user: { id: string; email: string };
}

function isDevMode(): boolean {
  return process.env.AUTH_MODE !== "prod";
}

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

async function persistSession(session: { access_token: string; refresh_token: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession(session);
  if (error) throw new Error(error.message);
}

async function persistTokens(result: AuthTokens): Promise<void> {
  await persistSession({ access_token: result.token, refresh_token: result.refreshToken });
}

// ---- signup: request email OTP ----
export async function requestSignupOtp(email: string): Promise<ActionResult> {
  try {
    const { devCode } = await backend.public<{ devCode?: string }>("/v1/auth/signup/otp", { method: "POST", body: { email } });
    return { ok: true, devCode };
  } catch (e) {
    return fail(e);
  }
}

export async function verifySignupOtp(email: string, code: string): Promise<ActionResult> {
  try {
    await backend.public("/v1/auth/signup/verify", { method: "POST", body: { email, code } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function completeSignup(email: string, password: string): Promise<ActionResult> {
  try {
    // The backend's /v1/auth/signup/complete already creates the account's default
    // workspace server-side (AuthController.signupComplete) — no separate call needed here.
    const result = await backend.public<AuthTokens>("/v1/auth/signup/complete", { method: "POST", body: { email, password } });
    await persistTokens(result);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- login ----
export async function loginAction(email: string, password: string): Promise<ActionResult> {
  try {
    const result = await backend.public<AuthTokens>("/v1/auth/login", { method: "POST", body: { email, password } });
    await persistTokens(result);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- forgot password: request OTP, verify, set new password ----
export async function requestResetOtp(email: string): Promise<ActionResult> {
  try {
    const { devCode } = await backend.public<{ devCode?: string }>("/v1/auth/reset/otp", { method: "POST", body: { email } });
    return { ok: true, devCode };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyResetOtp(email: string, code: string): Promise<ActionResult> {
  try {
    await backend.public("/v1/auth/reset/verify", { method: "POST", body: { email, code } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function completeReset(email: string, password: string): Promise<ActionResult> {
  try {
    const result = await backend.public<AuthTokens>("/v1/auth/reset/complete", { method: "POST", body: { email, password } });
    await persistTokens(result);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function authModeIsDev(): Promise<boolean> {
  return isDevMode();
}
