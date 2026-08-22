import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { YjsDocService } from "./yjs-doc.service";
import { WorkspaceModule } from "../workspace/workspace.module";

// SupabaseService/NatsService come from the @Global() CommonModule, no explicit import
// needed. WorkspaceModule is imported explicitly for WorkspaceService.isMember() — the
// membership check RealtimeGateway reuses rather than reimplementing. YjsDocService (CRDT
// co-editing of Note.body, see docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section) is
// scoped to this module too — it's only ever used from RealtimeGateway's message handling.
@Module({
  imports: [WorkspaceModule],
  providers: [RealtimeGateway, YjsDocService],
  exports: [RealtimeGateway], // main.ts calls app.get(RealtimeGateway).attach(...)
})
export class RealtimeModule {}
