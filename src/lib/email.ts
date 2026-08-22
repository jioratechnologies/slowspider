import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;
function resend(): Resend {
  if (!cached) cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

export async function sendOtpEmail(to: string, code: string, purpose: "signup" | "reset"): Promise<void> {
  const subject = purpose === "signup" ? "Verify your email — Slow Spider" : "Reset your password — Slow Spider";
  const { error } = await resend().emails.send({
    from: process.env.EMAIL_FROM || "Slow Spider <onboarding@resend.dev>",
    to,
    subject,
    html: `<p>Your code is <b style="font-size:20px">${code}</b>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
  if (error) throw new Error(error.message);
}

export async function sendInviteEmail(to: string, workspaceName: string, inviterEmail: string, token: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;
  const { error } = await resend().emails.send({
    from: process.env.EMAIL_FROM || "Slow Spider <onboarding@resend.dev>",
    to,
    subject: `${inviterEmail} invited you to ${workspaceName} on Slow Spider`,
    html: `<p><b>${inviterEmail}</b> invited you to collaborate on <b>${workspaceName}</b>.</p><p><a href="${url}">Accept the invite</a></p><p>This link expires in 14 days.</p>`,
  });
  if (error) throw new Error(error.message);
}
