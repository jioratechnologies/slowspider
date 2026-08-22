import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./auth/auth.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import { BoardModule } from "./board/board.module";
import { NotesModule } from "./notes/notes.module";
import { CronModule } from "./cron/cron.module";
import { SupabaseAuthGuard } from "./common/guards/supabase-auth.guard";

@Module({
  imports: [CommonModule, WorkspaceModule, AuthModule, BoardModule, NotesModule, CronModule],
  providers: [
    // Global guard — port of withApiAuth() in apps/web's src/lib/api/handler.ts. Routes
    // opt out with @Public() (auth login/signup/reset, cron/cold-storage).
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
  ],
})
export class AppModule {}
