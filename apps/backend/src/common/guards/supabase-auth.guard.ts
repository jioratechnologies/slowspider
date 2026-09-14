import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SupabaseService } from "../services/supabase.service";
import { WorkspaceService } from "../../workspace/workspace.service";
import { ApiContext } from "../api-context.interface";

// Port of withApiAuth() in apps/web's src/lib/api/handler.ts as a Nest guard. Verifies
// `Authorization: Bearer <supabase access token>` locally against the project's JWKS (see
// SupabaseService.verifyAccessToken — no network round trip per request), resolves
// workspaceId from `x-workspace-id` (falling back to the account's default workspace), and
// attaches the resulting ApiContext onto the request for @CurrentUser() to read back out.
//
// Routes marked @Public() (auth login/signup/reset, cron) skip this entirely, matching the
// withApi() (no-auth) vs withApiAuth() split in the original.
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
    private readonly workspaceService: WorkspaceService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const authHeader: string = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new UnauthorizedException("Not signed in.");

    const user = await this.supabase.verifyAccessToken(token);
    if (!user) throw new UnauthorizedException("Invalid or expired token.");

    const headerWorkspace = Number(req.headers["x-workspace-id"]);
    const workspaceId = headerWorkspace || (await this.workspaceService.getDefaultWorkspaceId(user.id));
    if (!workspaceId) throw new BadRequestException("No workspace found for this account.");

    const ctx: ApiContext = { userId: user.id, email: user.email, token, workspaceId };
    req.apiContext = ctx;
    return true;
  }
}
