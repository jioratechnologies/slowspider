import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ApiContext } from "../api-context.interface";

// Pulls the { userId, email, token, workspaceId } context SupabaseAuthGuard attached to the
// request — the Nest equivalent of the `ctx` param apps/web's withApiAuth() handlers receive.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): ApiContext => {
  const req = ctx.switchToHttp().getRequest();
  return req.apiContext as ApiContext;
});
