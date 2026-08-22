// Browser-side base64 <-> Uint8Array helpers for transporting Yjs binary updates over the
// (text-frame, JSON) /v1/realtime WebSocket — see docs/MIGRATION-PLAN-bff-kong-split.md's
// Realtime section. No Buffer here (this runs in the browser); chunked to avoid blowing the
// call stack on String.fromCharCode(...bytes) for a large snapshot.
const CHUNK_SIZE = 0x8000;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
