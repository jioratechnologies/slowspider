import { Injectable } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";
import { STORAGE_QUOTA_BYTES } from "../types";

// Storage abstraction called for by the migration plan's "Infra target" section
// (docs/MIGRATION-PLAN-bff-kong-split.md): everything that touches the Supabase Storage SDK
// directly lives here (getUploadUrl / getFileUrl / deleteFile), so swapping to a
// self-hosted S3-compatible store later (MinIO) is a change to this file only, not to every
// controller/service that currently reaches into board.ts's storage calls.
//
// Behavior is a 1:1 port of the storage-related functions in apps/web's
// src/lib/services/board.ts (storageUsed, createMediaUploadUrl, createMediaReadUrl, and the
// inline `.storage.from(MEDIA_BUCKET).remove([path])` call inside deleteNote).
@Injectable()
export class StorageService {
  static readonly MEDIA_BUCKET = "note-media";

  constructor(private readonly supabase: SupabaseService) {}

  async storageUsed(token: string, userId: string): Promise<number> {
    const { data, error } = await this.supabase.forToken(token).rpc("user_storage_used", { p_user_id: userId });
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  }

  /** Short-lived signed upload URL — bytes never pass through this server. */
  async getUploadUrl(
    token: string,
    userId: string,
    filename: string,
    sizeBytes: number
  ): Promise<{ path: string; signedUrl: string; token: string }> {
    const used = await this.storageUsed(token, userId);
    if (used + sizeBytes > STORAGE_QUOTA_BYTES) {
      throw new Error("Storage full — you've used your 10 GB. Delete some media notes to free space.");
    }
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${userId}/${Date.now()}-${safe}`;
    const { data, error } = await this.supabase.forToken(token).storage.from(StorageService.MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    // supabase-js can hand back a storage-relative path here; native clients PUT to this
    // directly and have no base URL to resolve it against.
    const signedUrl = data.signedUrl.startsWith("http")
      ? data.signedUrl
      : `${process.env.SUPABASE_URL}/storage/v1${data.signedUrl.startsWith("/") ? "" : "/"}${data.signedUrl}`;
    return { path, signedUrl, token: data.token };
  }

  /** Short-lived signed read URL for an existing object. */
  async getFileUrl(token: string, path: string): Promise<string> {
    const { data, error } = await this.supabase.forToken(token).storage.from(StorageService.MEDIA_BUCKET).createSignedUrl(path, 3600);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  async deleteFile(token: string, path: string): Promise<void> {
    const { error } = await this.supabase.forToken(token).storage.from(StorageService.MEDIA_BUCKET).remove([path]);
    if (error) throw new Error(error.message);
  }
}
