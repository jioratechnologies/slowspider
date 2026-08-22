import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiContext } from "../common/api-context.interface";
import { BoardService } from "../board/board.service";
import { StorageService } from "../common/services/storage.service";
import { LinkPreviewService } from "./link-preview.service";
import { STORAGE_QUOTA_BYTES } from "../common/types";

// Port of apps/web's src/app/api/v1/notes/route.ts, notes/[id]/route.ts,
// notes/media/route.ts, notes/preview/route.ts.
@Controller("v1/notes")
export class NotesController {
  constructor(
    private readonly board: BoardService,
    private readonly storage: StorageService,
    private readonly linkPreview: LinkPreviewService
  ) {}

  // POST /v1/notes
  @Post()
  async create(@CurrentUser() ctx: ApiContext, @Body() input: any) {
    return this.board.insertNote(ctx.token, ctx.workspaceId, ctx.userId, input);
  }

  // PATCH /v1/notes/:id
  @Patch(":id")
  async update(@CurrentUser() ctx: ApiContext, @Param("id") id: string, @Body() patch: any) {
    await this.board.updateNote(ctx.token, ctx.workspaceId, Number(id), patch);
    return { updated: true };
  }

  // DELETE /v1/notes/:id
  @Delete(":id")
  async remove(@CurrentUser() ctx: ApiContext, @Param("id") id: string) {
    await this.board.deleteNote(ctx.token, ctx.workspaceId, Number(id));
    return { deleted: true };
  }

  // POST /v1/notes/media — clients never get the storage service key, they ask here for a
  // short-lived signed URL and PUT the bytes straight to Supabase Storage.
  @Post("media")
  async createUploadUrl(@CurrentUser() ctx: ApiContext, @Body() body: { filename?: string; sizeBytes?: number }) {
    return this.storage.getUploadUrl(ctx.token, ctx.userId, String(body.filename), Number(body.sizeBytes) || 0);
  }

  // GET /v1/notes/media?path=... -> signed read URL; GET /v1/notes/media (no query) -> quota
  @Get("media")
  async getMediaOrQuota(@CurrentUser() ctx: ApiContext, @Query("path") path?: string) {
    if (!path) {
      const used = await this.storage.storageUsed(ctx.token, ctx.userId);
      return { used, quota: STORAGE_QUOTA_BYTES };
    }
    return { url: await this.storage.getFileUrl(ctx.token, path) };
  }

  // POST /v1/notes/preview
  @Post("preview")
  async preview(@Body() body: { url?: string }) {
    return this.linkPreview.fetchLinkPreview(String(body.url || ""));
  }
}
