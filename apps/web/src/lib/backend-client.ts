import "server-only";
import { createClient } from "./supabase/server";

// HTTP client for calling apps/backend through Kong — the same REST surface
// (`/v1/**`) apps/mobile's src/api.ts already talks to. The Server Actions in
// auth-actions.ts / board-actions.ts / workspace-actions.ts used to call
// src/lib/services/* in-process; they now go over the wire to the backend instead,
// through the same gateway every other client (mobile, future iOS) uses.
//
// Auth model mirrors apps/mobile/src/api.ts's request() helper: public routes (login,
// signup, reset) send no bearer token; authenticated routes send
// `Authorization: Bearer <supabase access token>` plus `x-workspace-id` when the caller
// knows which workspace is active. Every response is the same `{ok,data}`/`{ok,error}`
// envelope the old /api/v1 routes returned (apps/backend's ResponseInterceptor /
// AllExceptionsFilter reproduce that shape exactly) — this throws on `ok: false`, same as
// the mobile client does.

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

export interface BackendAuth {
  token: string;
  /** Omit (or pass null/undefined) when the caller doesn't know the active workspace yet —
   * the backend falls back to the account's default workspace, same as when this header is
   * simply absent from a mobile request. */
  workspaceId?: number | null;
}

interface BackendRequestInit {
  method?: string;
  body?: unknown;
}

async function request<T>(path: string, init: BackendRequestInit, auth: BackendAuth | null): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) {
    headers.authorization = `Bearer ${auth.token}`;
    if (auth.workspaceId != null) headers["x-workspace-id"] = String(auth.workspaceId);
  }

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status}).`);
  return json.data as T;
}

export const backend = {
  /** Public route — no bearer token (auth login/signup/reset). */
  public: <T>(path: string, init: BackendRequestInit = {}) => request<T>(path, init, null),
  /** Authenticated route — bearer token, optional x-workspace-id. */
  auth: <T>(path: string, auth: BackendAuth, init: BackendRequestInit = {}) => request<T>(path, init, auth),
};

/**
 * Resolves the caller's Supabase access token from the SSR cookie session — read the same
 * way apps/web/src/lib/supabase/server.ts's createClient() already manages it
 * (supabase.auth.getSession()). Throws "Not signed in." when there's no active session,
 * matching the error the backend itself would throw for a missing bearer token.
 */
export async function getAccessToken(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");
  return session.access_token;
}
