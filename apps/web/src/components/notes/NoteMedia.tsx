"use client";

import { useEffect, useState } from "react";
import { Download, FileText, File as FileIcon, Pencil } from "lucide-react";
import { mediaUrl } from "@/lib/note-media";
import type { Note } from "@/lib/types";

import CustomAudioPlayer from "./CustomAudioPlayer";

/**
 * Storage objects are private — every render trades the stored path for a
 * short-lived signed URL rather than linking the object directly.
 */
export default function NoteMedia({ 
  note,
  onEditSketch,
}: { 
  note: Note;
  onEditSketch?: (url: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!note.url) return;
    let live = true;
    mediaUrl(note.url)
      .then((u) => {
        if (!live) return;
        setUrl(u);
        // For text files, fetch inline content so the user can read without downloading
        const mime = note.mime || "";
        const isText = mime.startsWith("text/") || mime === "application/json" || /\.(txt|json|md|csv|log|js|ts)$/i.test(note.body || "");
        if (isText) {
          fetch(u)
            .then((r) => r.text())
            .then((t) => live && setTextContent(t))
            .catch(() => {});
        }
      })
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [note.url, note.mime, note.body]);

  if (error) return <div className="text-[12px] text-rose-400">This attachment couldn&apos;t be loaded.</div>;
  if (!url) return <div className="h-10 animate-pulse rounded-lg bg-white/[0.04]" />;

  const displayName = note.body || "attachment";

  if (note.kind === "voice") {
    return (
      <CustomAudioPlayer
        src={url}
        title={displayName}
        durationMs={note.duration_ms}
      />
    );
  }

  if (note.kind === "video") {
    return (
      <div className="space-y-2">
        <video className="max-h-80 w-full rounded-xl bg-black" controls src={url} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download={displayName}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Download className="size-3.5" /> Download Video
        </a>
      </div>
    );
  }

  const isActuallyImage = note.kind === "image" && !imgError && /\.(jpg|jpeg|png|gif|webp|svg|avif|ico|bmp)$/i.test(displayName);

  if (isActuallyImage) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          className="max-h-80 w-full rounded-xl object-contain bg-black/40 border border-white/[0.06]" 
          src={url} 
          alt={displayName}
          onError={() => setImgError(true)}
        />
        <div className="flex items-center gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={displayName}
            className="inline-flex items-center gap-1.5 text-[11.5px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Download className="size-3.5" /> Download Image
          </a>
          {onEditSketch && (
            <button
              type="button"
              onClick={() => onEditSketch(url)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer border border-purple-500/25 shadow-2xs"
            >
              <Pencil className="size-3.5 text-purple-500" /> Edit Canvas
            </button>
          )}
        </div>
      </div>
    );
  }

  // Generic file (kind === "file", text, pdf, or image fallback)
  const mime = note.mime || "";
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(displayName);
  const isText = mime.startsWith("text/") || mime === "application/json" || /\.(txt|json|md|csv|log|js|ts)$/i.test(displayName);

  return (
    <div className="space-y-2.5">
      {/* Always show a download/open link */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={displayName}
        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12.5px] text-zinc-200 hover:bg-white/[0.07] hover:text-white transition-colors"
      >
        {isText ? <FileText className="size-4 text-zinc-400" /> : <FileIcon className="size-4 text-zinc-400" />}
        <span className="flex-1 truncate max-w-[240px] font-medium">{displayName}</span>
        <Download className="size-3.5 text-zinc-400 shrink-0" />
      </a>

      {/* Inline text preview */}
      {isText && textContent !== null && (
        <pre className="max-h-60 overflow-auto rounded-xl bg-black/50 p-3 text-[12px] font-mono leading-relaxed text-zinc-300 whitespace-pre-wrap break-words border border-white/[0.06]">
          {textContent.slice(0, 8000)}{textContent.length > 8000 ? "\n\n… (truncated)" : ""}
        </pre>
      )}

      {/* Inline PDF preview via browser iframe */}
      {isPdf && (
        <iframe
          src={url}
          className="h-80 w-full rounded-xl border border-white/[0.08]"
          title={displayName}
        />
      )}
    </div>
  );
}
