"use client";

import { createClient } from "./supabase/client";
import { STORAGE_QUOTA_BYTES } from "./types";

export const MEDIA_BUCKET = "note-media";

/**
 * Uploads straight from the browser to Supabase Storage — bytes never pass through our
 * server. The storage RLS policy pins the first path segment to the caller's own uid, so
 * the path is built from the session user rather than anything the caller passes in.
 */
export async function uploadMedia(file: Blob, filename: string, used: number): Promise<string> {
  if (used + file.size > STORAGE_QUOTA_BYTES) {
    throw new Error("Storage full — you've used your 10 GB. Delete some media notes to free space.");
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${user.id}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}

export async function mediaUrl(path: string): Promise<string> {
  const { data, error } = await createClient().storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}
