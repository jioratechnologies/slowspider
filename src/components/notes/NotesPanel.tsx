"use client";

import { useMemo, useRef, useState } from "react";
import {
  Code2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link2,
  Loader2,
  Mic,
  Paperclip,
  Table as TableIcon,
  Trash2,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { formatBytes } from "@/lib/note-media";
import { uploadMedia } from "@/lib/note-media";
import { STORAGE_QUOTA_BYTES, type Note, type NoteKind, type NoteVisibility } from "@/lib/types";
import NoteMedia from "./NoteMedia";
import VoiceRecorder from "./VoiceRecorder";
import LinkPreviewCard from "./LinkPreviewCard";
import MathRenderer, { MathQuickBar } from "../research/MathRenderer";
import ArxivPaperCard, { isArxivUrl } from "../research/ArxivPaperCard";
import DataChartNote from "../research/DataChartNote";
import WhiteboardCanvas from "../research/WhiteboardCanvas";
import JupyterViewer from "../research/JupyterViewer";

export type NewNote = Omit<Note, "id" | "workspace_id" | "created_by" | "created_at">;

// Both text notes and media notes live here.
// Task-level raw attachments (not annotated) live in TaskAttachmentsSection.
const COMPOSERS: { kind: NoteKind; label: string; icon: typeof Type }[] = [
  { kind: "text", label: "Text", icon: Type },
  { kind: "rich", label: "Rich", icon: Paperclip },
  { kind: "code", label: "Code", icon: Code2 },
  { kind: "link", label: "Link", icon: Link2 },
  { kind: "table", label: "Table", icon: TableIcon },
  { kind: "voice", label: "Audio", icon: Mic },
  { kind: "image", label: "Media", icon: ImageIcon },
];

function parseTable(body: string): string[][] {
  return body
    .split("\n")
    .filter((r) => r.trim())
    .map((r) => r.split("|").map((c) => c.trim()));
}

export default function NotesPanel({
  notes,
  currentUserId,
  storageUsed,
  parentLabel,
  onAdd,
  onDelete,
}: {
  notes: Note[];
  currentUserId: string;
  storageUsed: number;
  parentLabel: string;
  onAdd: (note: NewNote) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [kind, setKind] = useState<NoteKind>("text");
  const [visibility, setVisibility] = useState<NoteVisibility>("workspace");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const richRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => [...notes].sort((a, b) => a.created_at.localeCompare(b.created_at)), [notes]);
  const quotaPct = Math.min(100, Math.round((storageUsed / STORAGE_QUOTA_BYTES) * 100));

  async function submit(partial: Partial<NewNote>) {
    setBusy(true);
    setError(null);
    try {
      await onAdd({
        task_id: null,
        cluster_id: null,
        kind,
        visibility,
        body: "",
        url: null,
        mime: null,
        size_bytes: 0,
        duration_ms: null,
        pos: sorted.length,
        ...partial,
      } as NewNote);
      setBody("");
      setLinkUrl("");
      if (richRef.current) richRef.current.innerHTML = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that note.");
    } finally {
      setBusy(false);
    }
  }

  async function addWritten() {
    const value = kind === "rich" ? sanitizeHtml(richRef.current?.innerHTML || "") : body.trim();
    if (!value) return;
    await submit({ kind, body: value });
  }

  async function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    await submit({ kind: "link", body: body.trim(), url });
  }

  async function addFile(file: File) {
    const mediaKind: NoteKind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "voice" : "image";
    setBusy(true);
    setError(null);
    try {
      const path = await uploadMedia(file, file.name, storageUsed);
      await submit({ kind: mediaKind, url: path, mime: file.type, size_bytes: file.size, body: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  }

  async function addVoice(blob: Blob, durationMs: number) {
    setBusy(true);
    setError(null);
    try {
      const path = await uploadMedia(blob, `voice-note.${blob.type.includes("mp4") ? "m4a" : "webm"}`, storageUsed);
      await submit({ kind: "voice", url: path, mime: blob.type, size_bytes: blob.size, duration_ms: durationMs, body: "Voice note" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Composer toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-1">
          {COMPOSERS.map((c) => (
            <button
              key={c.kind}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all",
                kind === c.kind 
                  ? "bg-zinc-900 text-white dark:bg-white/10 dark:text-white shadow-xs border border-transparent dark:border-white/15" 
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04]"
              )}
              title={c.label}
              onClick={() => setKind(c.kind)}
            >
              <c.icon className="size-3.5" />
              <span className="hidden sm:inline">{c.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-white/[0.08] shrink-0",
            visibility === "private" ? "text-amber-500 border-amber-500/30 bg-amber-500/10" : "text-zinc-700 dark:text-zinc-300"
          )}
          title={
            visibility === "private"
              ? "Private — visible only to you"
              : "Shared with everyone in this workspace"
          }
          onClick={() => setVisibility((v) => (v === "private" ? "workspace" : "private"))}
        >
          {visibility === "private" ? <EyeOff className="size-3 text-amber-500 dark:text-amber-400" /> : <Eye className="size-3 text-emerald-500 dark:text-emerald-400" />}
          <span>{visibility === "private" ? "Private" : "Shared"}</span>
        </button>
      </div>

      {/* Input / Editor body */}
      {(kind === "text" || kind === "code" || kind === "table") && (
        <div className="space-y-2">
          <MathQuickBar onInsert={(sym) => setBody((prev) => (prev ? `${prev} ${sym}` : sym))} />
          <Textarea
            className={cn(
              "min-h-24 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-3 text-[13.5px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/[0.05] focus:ring-0",
              kind !== "text" && "font-mono text-[12.5px] bg-zinc-50 dark:bg-black/30"
            )}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              kind === "code"
                ? "Paste code (Python, Julia, C++, Mathematica) — monospace"
                : kind === "table"
                  ? "Experimental data: x, y per line or separated by |\n0.0, 1.25\n1.0, 3.42\n2.0, 8.91"
                  : `A note on this ${parentLabel}... (LaTeX math supported: $E=mc^2$ or $$\\int e^{-x^2}dx$$)`
            }
          />
          {/* Live Equation / Math Preview while typing */}
          {kind === "text" && body.trim() && (body.includes("$") || body.includes("\\")) && (
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 dark:bg-purple-500/10 p-3 text-[13px] text-zinc-900 dark:text-zinc-100 animate-in fade-in">
              <div className="flex items-center justify-between text-[10.5px] font-mono uppercase text-purple-600 dark:text-purple-400 font-bold mb-1.5">
                <span>Live Math Rendering Preview</span>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-black/30 border border-purple-500/15">
                <MathRenderer text={body} />
              </div>
            </div>
          )}
        </div>
      )}

      {kind === "rich" && (
        <div
          ref={richRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Formatted note — paste styled text, lists, links"
          className="min-h-24 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-3 text-[13.5px] text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/[0.05] [&:empty]:before:text-zinc-400 dark:[&:empty]:before:text-zinc-500 [&:empty]:before:content-[attr(data-placeholder)]"
        />
      )}

      {kind === "link" && (
        <div className="space-y-2.5">
          <Input 
            value={linkUrl} 
            onChange={(e) => setLinkUrl(e.target.value)} 
            placeholder="https://… (arXiv paper, DOI, article, repo, doc)" 
            className="h-10 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3.5 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/[0.05] focus:ring-0"
          />
          <Input 
            value={body} 
            onChange={(e) => setBody(e.target.value)} 
            placeholder="What is it? (optional paper title / description)" 
            className="h-10 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3.5 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/[0.05] focus:ring-0"
          />
          {linkUrl.trim().startsWith("http") && (
            <div className="pt-1">
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mb-1.5 block uppercase">
                {isArxivUrl(linkUrl.trim()) ? "arXiv Paper Preview & Citation" : "Link preview"}
              </span>
              {isArxivUrl(linkUrl.trim()) ? (
                <ArxivPaperCard url={linkUrl.trim()} title={body} />
              ) : (
                <LinkPreviewCard url={linkUrl.trim()} fallbackTitle={body} allowToggle={true} />
              )}
            </div>
          )}
        </div>
      )}

      {kind === "voice" && <VoiceRecorder onRecorded={addVoice} disabled={busy} />}

      {kind === "image" && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*,.ipynb,.csv,.tsv,.pdf,.tex"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) addFile(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => fileRef.current?.click()} 
              disabled={busy}
              className="h-9 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-white text-[13px]"
            >
              <ImageIcon className="size-4 mr-1.5 text-sky-500 dark:text-sky-400" /> Upload file, photo, or notebook
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowWhiteboard((v) => !v)}
              className="h-9 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] text-[13px]"
            >
              <Paperclip className="size-4 mr-1.5 text-purple-500" /> {showWhiteboard ? "Close Whiteboard" : "Draw Feynman / Diagram"}
            </Button>
          </div>

          {showWhiteboard && (
            <div className="pt-2">
              <WhiteboardCanvas
                onSaveImage={(blob) => {
                  const file = new File([blob], `diagram_${Date.now()}.png`, { type: "image/png" });
                  addFile(file);
                  setShowWhiteboard(false);
                }}
                onClose={() => setShowWhiteboard(false)}
              />
            </div>
          )}
        </div>
      )}

      {kind !== "voice" && kind !== "image" && (
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            size="sm" 
            onClick={kind === "link" ? addLink : addWritten} 
            disabled={busy}
            className="h-9 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 font-medium dark:hover:bg-white px-4 text-[13px] shadow-xs transition-all"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null} Add note
          </Button>
          {error && <span className="text-[12px] text-rose-500 dark:text-rose-400">{error}</span>}
        </div>
      )}
      {(kind === "voice" || kind === "image") && error && <div className="text-[12px] text-rose-500 dark:text-rose-400">{error}</div>}

      {/* Notes list */}
      <div className="flex flex-col gap-2 pt-1">
        {!sorted.length && (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.06] p-4 text-center text-[12px] text-zinc-400 dark:text-zinc-500 italic">
            No notes on this {parentLabel} yet.
          </div>
        )}
        {sorted.map((n) => (
          <NoteRow key={n.id} note={n} mine={n.created_by === currentUserId} onDelete={() => onDelete(n.id)} />
        ))}
      </div>

      {/* Storage quota */}
      <div className="flex items-center gap-2.5 pt-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/[0.06]">
          <span 
            className={cn("block h-full rounded-full", quotaPct > 90 ? "bg-rose-500" : "bg-zinc-500 dark:bg-zinc-400")} 
            style={{ width: `${quotaPct}%` }} 
          />
        </div>
        <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 tabular-nums font-mono">
          {formatBytes(storageUsed)} of {formatBytes(STORAGE_QUOTA_BYTES)}
        </span>
      </div>
    </div>
  );
}

function NoteRow({ note, mine, onDelete }: { note: Note; mine: boolean; onDelete: () => void }) {
  return (
    <div className="group relative rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-3 transition-all hover:bg-zinc-50/70 dark:hover:bg-white/[0.04]">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">{note.kind}</span>
        {note.visibility === "private" ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Only you can see this note">
            <EyeOff className="size-2.5" /> Private
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Visible to all workspace collaborators">
            <Eye className="size-2.5" /> Shared
          </span>
        )}
        <span className="ml-auto text-[11px] text-zinc-400 dark:text-zinc-500">
          {new Date(note.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        {mine && (
          <button
            type="button"
            className="rounded-md p-1 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10"
            title="Delete note"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <NoteBody note={note} />
    </div>
  );
}

function NoteBody({ note }: { note: Note }) {
  if (note.kind === "voice" || note.kind === "image" || note.kind === "video") return <NoteMedia note={note} />;

  // Jupyter notebook content detection
  if (note.body && note.body.includes('"cells"') && note.body.includes('"cell_type"')) {
    return <JupyterViewer content={note.body} />;
  }

  if (note.kind === "link") {
    const url = note.url || note.body;
    return (
      <div className="pt-1">
        {isArxivUrl(url) ? (
          <ArxivPaperCard url={url} title={note.body} />
        ) : (
          <LinkPreviewCard url={url} fallbackTitle={note.body} allowToggle={true} defaultExpanded={true} />
        )}
      </div>
    );
  }

  if (note.kind === "code") {
    return (
      <pre className="overflow-x-auto rounded-xl bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/[0.06] p-3 text-[12px] font-mono leading-relaxed text-zinc-900 dark:text-zinc-200">
        <code>{note.body}</code>
      </pre>
    );
  }

  if (note.kind === "table") {
    // If it contains comma/tab separated numerical experimental data, offer data chart
    const lines = note.body.trim().split("\n");
    const hasCsvNums = lines.some((l) => /^[0-9.-]+[,\t\s]+[0-9.-]+/.test(l.trim()));
    if (hasCsvNums) {
      return <DataChartNote csvData={note.body} title="Experimental Dataset" />;
    }

    const rows = parseTable(note.body);
    if (!rows.length) return null;
    return (
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            {rows.map((cells, ri) => (
              <tr key={ri} className="border-b border-zinc-200 dark:border-white/[0.06] last:border-0">
                {cells.map((cell, ci) => (
                  <td key={ci} className={cn("px-3 py-1.5 text-zinc-700 dark:text-zinc-300", ri === 0 && "bg-zinc-100 dark:bg-white/[0.04] font-semibold text-zinc-900 dark:text-zinc-100")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (note.kind === "rich") {
    return <div className="prose-sm text-[13px] text-zinc-800 dark:text-zinc-200 [&_a]:text-sky-500 dark:[&_a]:text-sky-400 [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.body) }} />;
  }

  // Text note with full LaTeX math support ($...$ and $$...$$)
  return (
    <div className="text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
      <MathRenderer text={note.body} />
    </div>
  );
}
