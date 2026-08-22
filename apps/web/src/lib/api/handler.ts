import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getDefaultWorkspaceId } from "@/lib/services/workspace";

// Next.js-specific routing glue for the REST adapter — the one place besides the Server
// Action files allowed to import next/server. Keeps every route handler under
// src/app/api/v1 to a few lines: verify → call the (portable) service function → shape a
// consistent { ok, data | error } response.
//
// Auth is a Supabase access token (the same token web gets from a login/signup Server
// Action and a mobile client gets straight back from /api/v1/auth/login) — one token
// scheme for every client, and it's what makes Realtime and RLS work identically for all
// of them.

type RouteParams = Record<string, string>;

export interface ApiContext {
  userId: string;
  email: string;
  token: string;
  workspaceId: number;
  params: RouteParams;
}

function errorResponse(e: unknown, status?: number) {
  const message = e instanceof Error ? e.message : "Something went wrong.";
  const code = status ?? (message.startsWith("Too many") ? 429 : message === "Not signed in." ? 401 : 400);
  return NextResponse.json({ ok: false, error: message }, { status: code });
}

/** Public routes (login, signup, reset) — no bearer token required. */
export function withApi(handler: (req: NextRequest, ctx: { params: RouteParams }) => Promise<unknown>) {
  return async (req: NextRequest, routeCtx: { params: Promise<RouteParams> }) => {
    try {
      const params = await routeCtx.params;
      const data = await handler(req, { params });
      return NextResponse.json({ ok: true, data });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/**
 * Authenticated routes — requires `Authorization: Bearer <supabase access token>`.
 * Workspace comes from an `X-Workspace-Id` header when the client has more than one
 * (mirrors the `active_workspace_id` cookie the web adapter uses); defaults to the
 * account's first workspace otherwise.
 */
export function withApiAuth(handler: (req: NextRequest, ctx: ApiContext) => Promise<unknown>) {
  return async (req: NextRequest, routeCtx: { params: Promise<RouteParams> }) => {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return errorResponse(new Error("Not signed in."), 401);

    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return errorResponse(new Error("Invalid or expired token."), 401);

    const headerWorkspace = Number(req.headers.get("x-workspace-id"));
    const workspaceId = headerWorkspace || (await getDefaultWorkspaceId(data.user.id));
    if (!workspaceId) return errorResponse(new Error("No workspace found for this account."), 400);

    try {
      const params = await routeCtx.params;
      const result = await handler(req, { userId: data.user.id, email: data.user.email || "", token, workspaceId, params });
      return NextResponse.json({ ok: true, data: result });
    } catch (e) {
      return errorResponse(e);
    }
  };
}
