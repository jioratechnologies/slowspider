import { withApiAuth } from "@/lib/api/handler";
import { createMediaUploadUrl, createMediaReadUrl, storageUsed } from "@/lib/services/board";
import { STORAGE_QUOTA_BYTES } from "@/lib/types";

// Clients never get the storage service key — they ask here for a short-lived signed URL
// and PUT the bytes straight to Supabase Storage, which keeps large uploads off this server.
export const POST = withApiAuth(async (req, { token, userId }) => {
  const { filename, sizeBytes } = await req.json();
  return createMediaUploadUrl(token, userId, String(filename), Number(sizeBytes) || 0);
});

export const GET = withApiAuth(async (req, { token, userId }) => {
  const path = new URL(req.url).searchParams.get("path");
  if (!path) {
    const used = await storageUsed(token, userId);
    return { used, quota: STORAGE_QUOTA_BYTES };
  }
  return { url: await createMediaReadUrl(token, path) };
});
