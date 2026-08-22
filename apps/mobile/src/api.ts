import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// The mobile client is a pure consumer of the same /api/v1 REST adapter the web app's
// Server Actions sit next to — one auth scheme (Supabase access token), one service layer,
// no duplicated business logic.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// expo-secure-store has no web implementation — it throws at call time in a browser.
// The Expo dev server's browser preview (localhost:8081) needs something that works there
// too, so this falls back to localStorage on web only; native (Android/iOS) is unaffected.
const storage =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => (typeof localStorage === "undefined" ? null : localStorage.getItem(key)),
        setItemAsync: async (key: string, value: string) => {
          if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
        },
        deleteItemAsync: async (key: string) => {
          if (typeof localStorage !== "undefined") localStorage.removeItem(key);
        },
      }
    : SecureStore;

const TOKEN_KEY = "ss_access_token";
const REFRESH_KEY = "ss_refresh_token";
const WORKSPACE_KEY = "ss_workspace_id";
const USER_KEY = "ss_user_id";

export interface Session {
  accessToken: string;
  refreshToken: string | null;
  workspaceId: number | null;
  userId: string | null;
}

let session: Session | null = null;

export async function loadSession(): Promise<Session | null> {
  const accessToken = await storage.getItemAsync(TOKEN_KEY);
  if (!accessToken) return null;
  const refreshToken = await storage.getItemAsync(REFRESH_KEY);
  const ws = await storage.getItemAsync(WORKSPACE_KEY);
  const userId = await storage.getItemAsync(USER_KEY);
  session = { accessToken, refreshToken, workspaceId: ws ? Number(ws) : null, userId };
  return session;
}

export async function saveSession(next: Session): Promise<void> {
  session = next;
  await storage.setItemAsync(TOKEN_KEY, next.accessToken);
  if (next.refreshToken) await storage.setItemAsync(REFRESH_KEY, next.refreshToken);
  if (next.workspaceId != null) await storage.setItemAsync(WORKSPACE_KEY, String(next.workspaceId));
  if (next.userId) await storage.setItemAsync(USER_KEY, next.userId);
}

export async function clearSession(): Promise<void> {
  session = null;
  await Promise.all([
    storage.deleteItemAsync(TOKEN_KEY),
    storage.deleteItemAsync(REFRESH_KEY),
    storage.deleteItemAsync(WORKSPACE_KEY),
    storage.deleteItemAsync(USER_KEY),
  ]);
}

/** Pins the active workspace so every request after this carries `x-workspace-id`. */
export async function setActiveWorkspace(workspaceId: number): Promise<void> {
  if (!session) return;
  session = { ...session, workspaceId };
  await storage.setItemAsync(WORKSPACE_KEY, String(workspaceId));
}

export function currentSession(): Session | null {
  return session;
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as object) };
  if (auth) {
    if (!session) throw new Error("Not signed in.");
    headers.authorization = `Bearer ${session.accessToken}`;
    if (session.workspaceId != null) headers["x-workspace-id"] = String(session.workspaceId);
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status}).`);
  return json.data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; refreshToken: string; user: { id: string; email: string } }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    ),
  board: () => request<BoardPayload>("/api/v1/board"),
  updateTask: (id: number, patch: Record<string, unknown>) =>
    request(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  createTask: (input: { title: string; cluster_id: number | null; pos: number }) =>
    request<RemoteTask>("/api/v1/tasks", { method: "POST", body: JSON.stringify(input) }),
  deleteTaskForever: (id: number) => request(`/api/v1/tasks/${id}`, { method: "DELETE" }),
  createCluster: (input: { name: string; color: string; category_id: number | null; pos: number }) =>
    request<RemoteCluster>("/api/v1/clusters", { method: "POST", body: JSON.stringify(input) }),
  updateCluster: (id: number, patch: Record<string, unknown>) =>
    request(`/api/v1/clusters/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteClusterForever: (id: number) => request(`/api/v1/clusters/${id}`, { method: "DELETE" }),
  createNote: (input: Record<string, unknown>) =>
    request<RemoteNote>("/api/v1/notes", { method: "POST", body: JSON.stringify(input) }),
  deleteNote: (id: number) => request(`/api/v1/notes/${id}`, { method: "DELETE" }),
  uploadUrl: (filename: string, sizeBytes: number) =>
    request<{ path: string; signedUrl: string; token: string }>("/api/v1/notes/media", {
      method: "POST",
      body: JSON.stringify({ filename, sizeBytes }),
    }),
  mediaUrl: (path: string) => request<{ url: string }>(`/api/v1/notes/media?path=${encodeURIComponent(path)}`),
  quota: () => request<{ used: number; quota: number }>("/api/v1/notes/media"),
  saveSortMode: (sortMode: SortMode) =>
    request("/api/v1/settings/sort-mode", { method: "PATCH", body: JSON.stringify({ sortMode }) }),
  workspaces: () => request<{ workspaces: RemoteWorkspace[] }>("/api/v1/workspace"),
  createWorkspace: (name: string) => request<RemoteWorkspace>("/api/v1/workspace", { method: "POST", body: JSON.stringify({ name }) }),
  renameWorkspace: (id: number, name: string) => request(`/api/v1/workspace/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  addMilestone: (taskId: number, title: string, pos: number) =>
    request<RemoteMilestone>(`/api/v1/tasks/${taskId}/milestones`, { method: "POST", body: JSON.stringify({ title, pos }) }),
  updateMilestone: (taskId: number, id: number, patch: Record<string, unknown>) =>
    request(`/api/v1/tasks/${taskId}/milestones/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteMilestone: (taskId: number, id: number) => request(`/api/v1/tasks/${taskId}/milestones/${id}`, { method: "DELETE" }),
};

/** Uploads bytes straight to Supabase Storage using a short-lived signed URL from our API. */
export async function uploadMedia(uri: string, filename: string, mime: string, sizeBytes: number): Promise<string> {
  const { path, signedUrl } = await api.uploadUrl(filename, sizeBytes);
  const body = await (await fetch(uri)).blob();
  const res = await fetch(signedUrl, { method: "PUT", headers: { "content-type": mime }, body });
  if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
  return path;
}

export type Priority = "high" | "med" | "low" | "none";

export interface RemoteMilestone {
  id: number;
  task_id: number;
  title: string;
  done: boolean;
  pos: number;
}

export interface RemoteTask {
  id: number;
  cluster_id: number | null;
  title: string;
  priority: Priority;
  starred: boolean;
  deadline: string | null;
  deadline_time: string | null;
  notes: string;
  done: boolean;
  cold: boolean;
  binned: boolean;
  binned_at: string | null;
  pos: number;
  milestones?: RemoteMilestone[];
}

export interface RemoteWorkspace {
  id: number;
  name: string;
  owner_id: string;
  created_at: string;
  role: "owner" | "editor";
}

export interface RemoteCluster {
  id: number;
  name: string;
  color: string;
  category_id: number | null;
  status: "active" | "cold" | "binned";
  binned_at: string | null;
  pos: number;
}

export interface RemoteCategory {
  id: number;
  name: string;
  color: string;
  pos: number;
}

export type NoteKind = "text" | "rich" | "code" | "link" | "image" | "video" | "voice" | "table" | "file";
export type AttachmentKind = "image" | "video" | "voice" | "file";
export type TextNoteKind = "text" | "rich" | "code" | "link" | "table";

// Mirrors src/lib/types.ts on the web side: attachments are raw files shown in the task's
// Attachments list; text notes are authored content shown in the Notes sheet.
const ATTACHMENT_KINDS: string[] = ["image", "video", "voice", "file"];
export function isAttachment(kind: string): kind is AttachmentKind {
  return ATTACHMENT_KINDS.includes(kind);
}
export function isTextNote(kind: string): kind is TextNoteKind {
  return !ATTACHMENT_KINDS.includes(kind);
}

export interface RemoteNote {
  id: number;
  task_id: number | null;
  cluster_id: number | null;
  created_by: string;
  kind: NoteKind;
  visibility: "workspace" | "private";
  body: string;
  url: string | null;
  mime: string | null;
  size_bytes: number;
  duration_ms: number | null;
  created_at: string;
}

export type SortMode = "smart" | "manual";

export interface BoardPayload {
  categories: RemoteCategory[];
  clusters: RemoteCluster[];
  tasks: RemoteTask[];
  notes: RemoteNote[];
  storageUsed: number;
  workspaceId: number;
  sortMode: SortMode;
}
