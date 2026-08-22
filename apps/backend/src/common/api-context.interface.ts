// Mirrors apps/web's ApiContext (src/lib/api/handler.ts) — attached to the request by
// SupabaseAuthGuard, read back out via the @CurrentUser() param decorator.
export interface ApiContext {
  userId: string;
  email: string;
  token: string;
  workspaceId: number;
}
