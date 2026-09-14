import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { createRemoteJWKSet as CreateRemoteJWKSet } from "jose";

// Port of apps/web's src/lib/db.ts (service-role client) + the anon/per-token client
// factories duplicated across src/lib/services/account.ts, board.ts and src/lib/api/handler.ts
// — centralized here as one provider instead of three copies of createSupabaseClient(...).
//
// Same RLS model as apps/web: `admin()` uses the service_role key and bypasses RLS (every
// caller MUST scope its own queries — see BoardService/WorkspaceService), while `forToken()`
// gives a client scoped to the caller's own Supabase access token so Postgres RLS is the real
// workspace-access boundary for board/notes reads and writes.
@Injectable()
export class SupabaseService {
  private adminClient: SupabaseClient | null = null;
  private anonClientCached: SupabaseClient | null = null;
  private jwks: ReturnType<typeof CreateRemoteJWKSet> | null = null;

  private url(): string {
    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error("SUPABASE_URL is not set.");
    return url;
  }

  private publishableKey(): string {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!key) throw new Error("SUPABASE_PUBLISHABLE_KEY is not set.");
    return key;
  }

  /** Service-role client — bypasses RLS. Mirrors db() in apps/web/src/lib/db.ts. */
  admin(): SupabaseClient {
    if (this.adminClient) return this.adminClient;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
    this.adminClient = createClient(this.url(), serviceKey, { auth: { persistSession: false } });
    return this.adminClient;
  }

  /** Publishable-key client with no session persistence — mirrors anonClient() in account.ts. */
  anon(): SupabaseClient {
    if (this.anonClientCached) return this.anonClientCached;
    this.anonClientCached = createClient(this.url(), this.publishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.anonClientCached;
  }

  /** Per-request client scoped to the caller's access token — mirrors client(token) in board.ts. */
  forToken(accessToken: string): SupabaseClient {
    return createClient(this.url(), this.publishableKey(), {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /**
   * Verifies a Supabase access token locally against the project's JWKS instead of calling
   * GoTrue's /auth/v1/user endpoint (what SupabaseAuthGuard and the realtime gateway used to
   * do via anon().auth.getUser(token)) — that was a full cross-region network round trip on
   * *every* authenticated request. This project signs tokens with ES256 (asymmetric), so the
   * signature can be checked against the public JWKS with no server round trip; jose caches
   * the key set and only refetches it on a kid it hasn't seen. Same trust boundary (Supabase's
   * own signing key) — just verified locally instead of by asking Supabase to do it for us.
   */
  async verifyAccessToken(token: string): Promise<{ id: string; email: string } | null> {
    try {
      const { jwtVerify } = await import("jose");
      if (!this.jwks) {
        const { createRemoteJWKSet } = await import("jose");
        this.jwks = createRemoteJWKSet(new URL(`${this.url()}/auth/v1/.well-known/jwks.json`));
      }
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${this.url()}/auth/v1`,
        audience: "authenticated",
      });
      if (typeof payload.sub !== "string") return null;
      return { id: payload.sub, email: typeof payload.email === "string" ? payload.email : "" };
    } catch {
      return null;
    }
  }
}
