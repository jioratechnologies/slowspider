import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { uploadMedia, type NoteKind } from "./api";

export interface PickedFile {
  uri: string;
  name: string;
  mime: string;
  size: number;
}

/** Same mapping the web's TaskAttachmentsSection uses, so both clients label files alike. */
export function kindForMime(mime: string): NoteKind {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "voice";
  if (mime.startsWith("image/")) return "image";
  return "file";
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

/** Photo/video from the gallery. Returns null when the user cancels or denies permission. */
export async function pickMedia(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Photo library permission denied.");

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.8 });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `upload-${Date.now()}`,
    mime: asset.mimeType || "application/octet-stream",
    size: asset.fileSize ?? 0,
  };
}

/** Any file type, via the system document picker. */
export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || `file-${Date.now()}`,
    mime: asset.mimeType || "application/octet-stream",
    size: asset.size ?? 0,
  };
}

/**
 * Uploads the bytes and returns the storage path plus the resolved size — the size matters
 * because it's what gets written to `size_bytes` and counted against the 10 GB quota.
 */
export async function uploadPicked(file: PickedFile): Promise<{ path: string; size: number }> {
  // Some pickers report size 0; fall back to the real blob length so both the server-side
  // quota check and the stored row see a truthful number.
  let size = file.size;
  if (!size) {
    try {
      size = (await (await fetch(file.uri)).blob()).size;
    } catch {
      size = 0;
    }
  }
  const path = await uploadMedia(file.uri, file.name, file.mime, size);
  return { path, size };
}
