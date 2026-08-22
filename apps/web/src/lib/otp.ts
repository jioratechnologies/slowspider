import "server-only";
import { redis } from "./redis";

export type OtpPurpose = "signup" | "reset";

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const VERIFIED_TTL_SECONDS = 15 * 60; // window to set a password after verifying the code

function isDevMode(): boolean {
  return process.env.AUTH_MODE !== "prod";
}

function otpKey(purpose: OtpPurpose, email: string): string {
  return `otp:${purpose}:${email.trim().toLowerCase()}`;
}
function verifiedKey(purpose: OtpPurpose, email: string): string {
  return `otp-verified:${purpose}:${email.trim().toLowerCase()}`;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Issues (or re-issues) an OTP. In dev mode it's always DEV_OTP_CODE and nothing is stored
// remotely — no need to hit Redis for a fixed code. Returns the code so the caller can decide
// whether to email it (prod) or hand it back to the UI directly (dev).
export async function issueOtp(purpose: OtpPurpose, email: string): Promise<{ code: string; dev: boolean }> {
  if (isDevMode()) {
    return { code: process.env.DEV_OTP_CODE || "123456", dev: true };
  }
  const code = generateCode();
  await redis().set(otpKey(purpose, email), code, "EX", OTP_TTL_SECONDS);
  return { code, dev: false };
}

export async function verifyOtp(purpose: OtpPurpose, email: string, code: string): Promise<boolean> {
  if (isDevMode()) {
    const ok = code === (process.env.DEV_OTP_CODE || "123456");
    if (ok) await redis().set(verifiedKey(purpose, email), "1", "EX", VERIFIED_TTL_SECONDS);
    return ok;
  }
  const stored = await redis().get(otpKey(purpose, email));
  if (!stored || stored !== code) return false;
  await redis().del(otpKey(purpose, email));
  await redis().set(verifiedKey(purpose, email), "1", "EX", VERIFIED_TTL_SECONDS);
  return true;
}

// Checked before letting someone set a password — proves they verified an OTP recently.
export async function consumeVerified(purpose: OtpPurpose, email: string): Promise<boolean> {
  const key = verifiedKey(purpose, email);
  const ok = await redis().get(key);
  if (!ok) return false;
  await redis().del(key);
  return true;
}
