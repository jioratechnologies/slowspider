import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller";
import { LinkPreviewService } from "./link-preview.service";
import { BoardModule } from "../board/board.module";

@Module({
  imports: [BoardModule], // insertNote/updateNote/deleteNote live on BoardService (mirrors board.ts)
  controllers: [NotesController],
  providers: [LinkPreviewService],
})
export class NotesModule {}
