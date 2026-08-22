import { Injectable } from "@nestjs/common";
import { RedisService } from "../common/services/redis.service";

export type OtpPurpose = "signup" | "reset";

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const VERIFIED_TTL_SECONDS = 15 * 60; // window to set a password after verifying the code

// 1:1 port of apps/web's src/lib/otp.ts.
@Injectable()
export class OtpService {
  constructor(private readonly redis: RedisService) {}

  private isDevMode(): boolean {
    return process.env.AUTH_MODE !== "prod";
  }

  private otpKey(purpose: OtpPurpose, email: string): string {
    return `otp:${purpose}:${email.trim().toLowerCase()}`;
  }
  private verifiedKey(purpose: OtpPurpose, email: string): string {
    return `otp-verified:${purpose}:${email.trim().toLowerCase()}`;
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async issueOtp(purpose: OtpPurpose, email: string): Promise<{ code: string; dev: boolean }> {
    if (this.isDevMode()) {
      return { code: process.env.DEV_OTP_CODE || "123456", dev: true };
    }
    const code = this.generateCode();
    await this.redis.client().set(this.otpKey(purpose, email), code, "EX", OTP_TTL_SECONDS);
    return { code, dev: false };
  }

  async verifyOtp(purpose: OtpPurpose, email: string, code: string): Promise<boolean> {
    if (this.isDevMode()) {
      const ok = code === (process.env.DEV_OTP_CODE || "123456");
      if (ok) await this.redis.client().set(this.verifiedKey(purpose, email), "1", "EX", VERIFIED_TTL_SECONDS);
      return ok;
    }
    const stored = await this.redis.client().get(this.otpKey(purpose, email));
    if (!stored || stored !== code) return false;
    await this.redis.client().del(this.otpKey(purpose, email));
    await this.redis.client().set(this.verifiedKey(purpose, email), "1", "EX", VERIFIED_TTL_SECONDS);
    return true;
  }

  async consumeVerified(purpose: OtpPurpose, email: string): Promise<boolean> {
    const key = this.verifiedKey(purpose, email);
    const ok = await this.redis.client().get(key);
    if (!ok) return false;
    await this.redis.client().del(key);
    return true;
  }
}
