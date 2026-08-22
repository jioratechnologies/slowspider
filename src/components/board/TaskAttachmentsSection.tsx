"use client";

import { useRef, useState } from "react";
import { File as FileIcon, Loader2, Mic, Trash2, Download, Image as ImageIcon, Video, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, uploadMedia, mediaUrl } from "@/lib/note-media";
import { STORAGE_QUOTA_BYTES, type Note } from "@/lib/types";
import NoteMedia from "@/components/notes/NoteMedia";
import VoiceRecorder from "@/components/notes/VoiceRecorder";
import type { NewNote } from "@/components/notes/NotesPanel";

function getAttachmentIcon(note: Note) {
  if (note.kind === "voice") return <Mic className="size-4 text-amber-500 shrink-0" />;
  if (note.kind === "image") return <ImageIcon className="size-4 text-sky-500 shrink-0" />;
  if (note.kind === "video") return <Video className="size-4 text-purple-500 shrink-0" />;
  return <FileIcon className="size-4 text-zinc-400 shrink-0" />;
}

function getDisplayName(note: Note) {
  if (note.kind === "voice" && note.body.startsWith("voice-")) return "Voice Recording";
  return note.body || "Untitled";
}

export default function TaskAttachmentsSection({
  taskId,
  attachments,
  storageUsed,
  currentUserId,
  onAdd,
  onDelete,
}: {
  taskId: number;
  attachments: Note[];
  storageUsed: number;
  currentUserId: string;
  onAdd: (note: NewNote) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFile(file: File) {
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(file.name);

    const kind = isVideo
      ? "video"
      : isAudio
      ? "voice"
      : isImage
      ? "image"
      : "file";

    setBusy(true);
    setError(null);
    try {
      const path = await uploadMedia(file, file.name, storageUsed);
      await onAdd({
        task_id: taskId,
        cluster_id: null,
        kind,
        visibility: "workspace",
        body: file.name,
        url: path,
        mime: file.type || "application/octet-stream",
        size_bytes: file.size,
        duration_ms: null,
        pos: attachments.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadAttachment(note: Note) {
    if (!note.url) return;
    try {
      const url = await mediaUrl(note.url);
      const a = document.createElement("a");
      a.href = url;
      a.download = note.body || "attachment";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Failed to download attachment", e);
    }
  }

  async function addVoice(blob: Blob, durationMs: number) {
    setBusy(true);
    setError(null);
    try {
      const name = `Audio_Record_${Date.now()}.webm`;
      const file = new File([blob], name, { type: blob.type || "audio/webm" });
      const path = await uploadMedia(file, name, storageUsed);
      await onAdd({
        task_id: taskId,
        cluster_id: null,
        kind: "voice",
        visibility: "workspace",
        body: name,
        url: path,
        mime: blob.type || "audio/webm",
        size_bytes: blob.size,
        duration_ms: durationMs,
        pos: attachments.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const quotaPct = Math.min(100, Math.round((storageUsed / STORAGE_QUOTA_BYTES) * 100));

  return (
    <div className="space-y-3">
      {/* Upload Controls Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <VoiceRecorder
          onRecorded={addVoice}
          disabled={busy || storageUsed >= STORAGE_QUOTA_BYTES}
        />
        <input
          ref={fileRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) addFile(f);
          }}
        />
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => fileRef.current?.click()} 
          disabled={busy}
          className="h-8 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-white text-[12.5px] cursor-pointer"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
          Attach file / media
        </Button>
        {error && <span className="text-[12px] text-rose-500 dark:text-rose-400">{error}</span>}
      </div>

      {/* Uncollapsed Full Attachments List with Real-time Media Players & Previews */}
      {attachments.length > 0 ? (
        <div className="space-y-2.5">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="group rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.02] p-3 transition-all hover:border-zinc-300 dark:hover:border-white/15"
            >
              {/* Attachment Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200/50 dark:border-white/[0.04]">
                <div className="flex items-center gap-2 min-w-0">
                  {getAttachmentIcon(a)}
                  <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {getDisplayName(a)}
                  </span>
                  {a.size_bytes > 0 && (
                    <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                      ({formatBytes(a.size_bytes)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Download file"
                    onClick={() => downloadAttachment(a)}
                  >
                    <Download className="size-3.5" />
                  </button>

                  {a.created_by === currentUserId && (
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Remove attachment"
                      onClick={() => onDelete(a.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Full Uncollapsed Media Render */}
              <div className="pt-2">
                <NoteMedia note={a} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.06] p-3 text-center text-[12px] text-zinc-400 dark:text-zinc-500 italic">
          No files or recordings attached yet.
        </div>
      )}

      {/* Storage quota */}
      <div className="flex items-center gap-2.5 pt-1">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/[0.06]">
          <span
            className={`block h-full rounded-full ${quotaPct > 90 ? "bg-rose-500" : "bg-purple-600 dark:bg-purple-400"}`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums font-mono">
          {formatBytes(storageUsed)} / {formatBytes(STORAGE_QUOTA_BYTES)}
        </span>
      </div>
    </div>
  );
}
