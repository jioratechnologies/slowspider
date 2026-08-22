import { Injectable } from "@nestjs/common";
import { Resend } from "resend";

// 1:1 port of apps/web's src/lib/email.ts.
@Injectable()
export class EmailService {
  private cached: Resend | null = null;

  private resend(): Resend {
    if (!this.cached) this.cached = new Resend(process.env.RESEND_API_KEY);
    return this.cached;
  }

  async sendOtpEmail(to: string, code: string, purpose: "signup" | "reset"): Promise<void> {
    const subject = purpose === "signup" ? "Verify your email — Slow Spider" : "Reset your password — Slow Spider";
    const { error } = await this.resend().emails.send({
      from: process.env.EMAIL_FROM || "Slow Spider <onboarding@resend.dev>",
      to,
      subject,
      html: `<p>Your code is <b style="font-size:20px">${code}</b>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    });
    if (error) throw new Error(error.message);
  }

  async sendInviteEmail(to: string, workspaceName: string, inviterEmail: string, token: string): Promise<void> {
    // apps/web reads NEXT_PUBLIC_APP_URL here; the backend has no NEXT_PUBLIC_ convention so
    // this is APP_URL — same default, see apps/backend/.env.example.
    const url = `${process.env.APP_URL || "http://localhost:3000"}/invite/${token}`;
    const { error } = await this.resend().emails.send({
      from: process.env.EMAIL_FROM || "Slow Spider <onboarding@resend.dev>",
      to,
      subject: `${inviterEmail} invited you to ${workspaceName} on Slow Spider`,
      html: `<p><b>${inviterEmail}</b> invited you to collaborate on <b>${workspaceName}</b>.</p><p><a href="${url}">Accept the invite</a></p><p>This link expires in 14 days.</p>`,
    });
    if (error) throw new Error(error.message);
  }
}
