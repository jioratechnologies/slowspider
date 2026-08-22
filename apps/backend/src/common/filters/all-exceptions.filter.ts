import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";

// Port of errorResponse() in apps/web's src/lib/api/handler.ts: every thrown Error becomes
// { ok: false, error: e.message }, with the status code derived from the message —
// 429 if it starts with "Too many", 401 if it's exactly "Not signed in.", else 400 — unless
// the thrower specified a status explicitly.
//
// In the original, "explicitly specified a status" meant errorResponse(e, status) was called
// with a second argument (used only by withApiAuth for the 401 "Not signed in." /
// "Invalid or expired token." cases and the 400 "No workspace found for this account." case).
// Here that's represented by throwing a Nest HttpException (SupabaseAuthGuard does this) —
// its status is used as-is instead of re-deriving one from the message.
function deriveStatus(message: string): number {
  if (message.startsWith("Too many")) return 429;
  if (message === "Not signed in.") return 401;
  return 400;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const rawMessage = typeof body === "string" ? body : ((body as { message?: unknown })?.message ?? exception.message);
      const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
      res.status(status).json({ ok: false, error: message });
      return;
    }

    const message = exception instanceof Error ? exception.message : "Something went wrong.";
    res.status(deriveStatus(message)).json({ ok: false, error: message });
  }
}
