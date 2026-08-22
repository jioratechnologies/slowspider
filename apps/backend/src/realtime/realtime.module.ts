import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { WorkspaceModule } from "../workspace/workspace.module";

// SupabaseService/NatsService come from the @Global() CommonModule, no explicit import
// needed. WorkspaceModule is imported explicitly for WorkspaceService.isMember() — the
// membership check RealtimeGateway reuses rather than reimplementing.
@Module({
  imports: [WorkspaceModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway], // main.ts calls app.get(RealtimeGateway).attach(...)
})
export class RealtimeModule {}
