import { Module } from "@nestjs/common";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService], // used by SupabaseAuthGuard (getDefaultWorkspaceId) and AuthModule (signup)
})
export class WorkspaceModule {}
