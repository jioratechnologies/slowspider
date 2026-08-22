"use server";

import { createClient } from "./supabase/server";
import * as account from "./services/account";
import { createDefaultWorkspace } from "./services/workspace";
import { enforceRateLimit } from "./rate-limit";

// Web adapter over ./services/account.ts — the REST API adapter (src/app/api/v1/auth/*)
// calls the exact same service functions after its own rate-limit check, then returns the
// Supabase session tokens directly to the client instead of persisting them into cookies.

export interface ActionResult {
  ok: boolean;
  error?: string;
  devCode?: string; // only set in dev mode, so the UI can display it instead of an inbox
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

// ---- signup: request email OTP ----
export async function requestSignupOtp(email: string): Promise<ActionResult> {
  try {
    await enforceRateLimit(`otp-req:${account.normalizeEmail(email)}`, 3, 600);
    const { devCode } = await account.requestSignupOtp(email);
    return { ok: true, devCode };
  } catch (e) {
    return fail(e);
  }
}

export async function verifySignupOtp(email: string, code: string): Promise<ActionResult> {
  try {
    await account.verifySignupOtp(email, code);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function completeSignup(email: string, password: string): Promise<ActionResult> {
  try {
    const result = await account.completeSignup(email, password);
    await persistSession(result.session);
    await createDefaultWorkspace(result.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- login ----
export async function loginAction(email: string, password: string): Promise<ActionResult> {
  try {
    await enforceRateLimit(`login:${account.normalizeEmail(email)}`, 5, 300);
  } catch (e) {
    return fail(e);
  }
  const result = await account.verifyCredentials(email, password);
  if (!result) return { ok: false, error: "Wrong email or password." };
  await persistSession(result.session);
  return { ok: true };
}

// ---- forgot password: request OTP, verify, set new password ----
export async function requestResetOtp(email: string): Promise<ActionResult> {
  try {
    await enforceRateLimit(`otp-req:${account.normalizeEmail(email)}`, 3, 600);
    const { devCode } = await account.requestResetOtp(email);
    return { ok: true, devCode };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyResetOtp(email: string, code: string): Promise<ActionResult> {
  try {
    await account.verifyResetOtp(email, code);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function completeReset(email: string, password: string): Promise<ActionResult> {
  try {
    const result = await account.completeReset(email, password);
    await persistSession(result.session);
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
