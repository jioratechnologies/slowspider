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
  if (note.kind === "voice") return <Mic className="size-3.5 text-[var(--muted)] shrink-0" />;
  if (note.kind === "image") return <ImageIcon className="size-3.5 text-[var(--muted)] shrink-0" />;
  if (note.kind === "video") return <Video className="size-3.5 text-[var(--muted)] shrink-0" />;
  return <FileIcon className="size-3.5 text-[var(--muted)] shrink-0" />;
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
        mime: "audio/webm",
        size_bytes: blob.size,
        duration_ms: durationMs,
        pos: attachments.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const quotaPct = Math.min(100, Math.round((storageUsed / STORAGE_QUOTA_BYTES) * 100));

  return (
    <div className="space-y-2.5">
      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <VoiceRecorder
          onRecorded={addVoice}
          disabled={busy}
          className="h-8 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] hover:border-[var(--line-strong)] text-[12px] px-3 cursor-pointer"
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
          className="h-8 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] hover:border-[var(--line-strong)] text-[12px] cursor-pointer"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
          Attach file / media
        </Button>
        {error && <span className="text-[11.5px] text-rose-500">{error}</span>}
      </div>

      {/* Attachments List */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="group rounded-xl border border-[var(--line)] bg-[var(--bg)] p-2.5 transition-all hover:border-[var(--line-strong)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--line)]">
                <div className="flex items-center gap-2 min-w-0">
                  {getAttachmentIcon(a)}
                  <span className="text-[12.5px] font-medium text-[var(--ink)] truncate">
                    {getDisplayName(a)}
                  </span>
                  {a.size_bytes > 0 && (
                    <span className="text-[10.5px] font-mono text-[var(--muted)] shrink-0">
                      ({formatBytes(a.size_bytes)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                    title="Download file"
                    onClick={() => downloadAttachment(a)}
                  >
                    <Download className="size-3" />
                  </button>

                  {a.created_by === currentUserId && (
                    <button
                      type="button"
                      className="rounded p-1 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-all hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Remove attachment"
                      onClick={() => onDelete(a.id)}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Media Render */}
              <div className="pt-2">
                <NoteMedia note={a} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--line)] p-2.5 text-center text-[11.5px] text-[var(--muted)] italic">
          No files or recordings attached yet.
        </div>
      )}

      {/* Storage quota */}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-[var(--sunken)]">
          <span
            className="block h-full bg-[var(--ink)]"
            style={{ width: `${quotaPct}%` }}
          />
        </div>
        <span className="text-[10px] text-[var(--muted)] tabular-nums font-mono">
          {formatBytes(storageUsed)} / {formatBytes(STORAGE_QUOTA_BYTES)}
        </span>
      </div>
    </div>
  );
}
