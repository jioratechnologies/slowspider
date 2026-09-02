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
  Pencil,
  PenTool,
  Table as TableIcon,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { formatBytes } from "@/lib/note-media";
import { uploadMedia } from "@/lib/note-media";
import { STORAGE_QUOTA_BYTES, type Note, type NoteKind, type NoteVisibility } from "@/lib/types";
import type { RealtimeDocChannel } from "@/hooks/useRealtimeBoard";
import NoteMedia from "./NoteMedia";
import VoiceRecorder from "./VoiceRecorder";
import LinkPreviewCard from "./LinkPreviewCard";
import CollaborativeNoteEditor from "./CollaborativeNoteEditor";
import MathRenderer, { MathQuickBar } from "../research/MathRenderer";
import ArxivPaperCard, { isArxivUrl } from "../research/ArxivPaperCard";
import DataChartNote from "../research/DataChartNote";
import WhiteboardCanvas from "../research/WhiteboardCanvas";
import JupyterViewer from "../research/JupyterViewer";

// Kinds that get real-time co-editing (Y.Text-backed) rather than plain create/delete — see
// docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section. Scoped narrowly per that spec:
// not every text-ish kind (code/link/table stay read-only-after-create here, matching how
// they already behave — no edit affordance existed for any note kind before this change).
const COLLAB_KINDS = new Set<NoteKind>(["text", "rich"]);

export type NewNote = Omit<Note, "id" | "workspace_id" | "created_by" | "created_at" | "yjs_state">;

export type ComposerKind = NoteKind | "sketch";

// Both text notes, media notes, and canvas sketches live here.
const COMPOSERS: { kind: ComposerKind; label: string; icon: typeof Type; color: string }[] = [
  { kind: "text", label: "Text", icon: Type, color: "text-indigo-500" },
  { kind: "rich", label: "Rich", icon: Paperclip, color: "text-purple-500" },
  { kind: "sketch", label: "Canvas", icon: PenTool, color: "text-pink-500" },
  { kind: "code", label: "Code", icon: Code2, color: "text-emerald-500" },
  { kind: "link", label: "Link", icon: Link2, color: "text-blue-500" },
  { kind: "table", label: "Table", icon: TableIcon, color: "text-amber-500" },
  { kind: "voice", label: "Audio", icon: Mic, color: "text-rose-500" },
  { kind: "image", label: "Media", icon: ImageIcon, color: "text-cyan-500" },
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
  docChannel,
  onAdd,
  onUpdate,
  onDelete,
}: {
  notes: Note[];
  currentUserId: string;
  storageUsed: number;
  parentLabel: string;
  /** Realtime connection for CRDT co-editing of text/rich notes' body — see
   * CollaborativeNoteEditor. Rides the existing /v1/realtime socket, not a new connection. */
  docChannel: RealtimeDocChannel;
  onAdd: (note: NewNote) => Promise<void>;
  onUpdate?: (id: number, patch: Partial<Note>) => void;
  onDelete: (id: number) => void;
}) {
  const [kind, setKind] = useState<ComposerKind>("text");
  // Only one note's live editor is open at a time in this panel.
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingSketchNote, setEditingSketchNote] = useState<{ note: Note; resolvedUrl: string } | null>(null);
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
      const noteKind = kind === "sketch" ? "image" : kind;
      await onAdd({
        task_id: null,
        cluster_id: null,
        kind: noteKind,
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
    await submit({ kind: kind === "rich" ? "rich" : kind === "code" ? "code" : kind === "table" ? "table" : "text", body: value });
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
      <div className="space-y-2">
        {/* Row 1: Note Type Buttons (Wrapped, no horizontal scrolling) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 shadow-xs">
          {COMPOSERS.map((c) => {
            const active = kind === c.kind;
            return (
              <button
                key={c.kind}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs border border-neutral-200 dark:border-neutral-700 font-bold"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40"
                )}
                title={c.label}
                onClick={() => setKind(c.kind)}
              >
                <c.icon className={cn("size-3.5", active ? c.color : "text-neutral-400")} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Visibility Toggle (Shared / Public) & Mode Context */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
            {kind === "text" && "LaTeX Math ($...$ or $$...$$) supported"}
            {kind === "rich" && "Rich-formatted text with styling"}
            {kind === "sketch" && "Excalidraw-like Canvas Sketch (Stylus / Apple Pencil)"}
            {kind === "code" && "Monospace code block"}
            {kind === "link" && "Live preview link or paper citation"}
            {kind === "table" && "Experimental table data"}
            {kind === "voice" && "Voice audio recording"}
            {kind === "image" && "File, photo, diagram, or notebook"}
          </div>

          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
              visibility === "private"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
            )}
            title={
              visibility === "private"
                ? "Private — visible only to you"
                : "Shared — visible to everyone in this workspace"
            }
            onClick={() => setVisibility((v) => (v === "private" ? "workspace" : "private"))}
          >
            {visibility === "private" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            <span>{visibility === "private" ? "Private Note" : "Shared / Public"}</span>
          </button>
        </div>
      </div>

      {/* Input / Editor body */}
      {(kind === "text" || kind === "code" || kind === "table") && (
        <div className="space-y-2.5">
          <MathQuickBar onInsert={(sym) => setBody((prev) => (prev ? `${prev} ${sym}` : sym))} />
          <Textarea
            className={cn(
              "min-h-28 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs leading-relaxed",
              kind !== "text" && "font-mono text-xs bg-neutral-50 dark:bg-black/40"
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
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs text-neutral-900 dark:text-neutral-100 shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase text-purple-600 dark:text-purple-400 font-bold mb-2">
                <span>Live Math Rendering Preview</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-purple-500/20">
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
          className="min-h-28 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs leading-relaxed [&:empty]:before:text-neutral-400 dark:[&:empty]:before:text-neutral-500 [&:empty]:before:content-[attr(data-placeholder)]"
        />
      )}

      {/* Canvas Sketch Composer */}
      {kind === "sketch" && (
        <div className="space-y-3 pt-1">
          <WhiteboardCanvas
            onSaveImage={async (blob) => {
              const file = new File([blob], `sketch_${Date.now()}.png`, { type: "image/png" });
              await addFile(file);
            }}
          />
        </div>
      )}

      {kind === "link" && (
        <div className="space-y-2.5">
          <Input 
            value={linkUrl} 
            onChange={(e) => setLinkUrl(e.target.value)} 
            placeholder="https://… (arXiv paper, DOI, article, repo, doc)" 
            className="h-10 rounded-xl border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-0"
          />
          <Input 
            value={body} 
            onChange={(e) => setBody(e.target.value)} 
            placeholder="What is it? (optional paper title / description)" 
            className="h-10 rounded-xl border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-0"
          />
          {linkUrl.trim().startsWith("http") && (
            <div className="pt-1">
              <span className="text-[11px] font-mono text-neutral-500 mb-1.5 block uppercase font-semibold">
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
              className="h-9.5 rounded-xl border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-semibold text-xs"
            >
              <ImageIcon className="size-4 mr-1.5 text-cyan-500" /> Upload file, photo, or notebook
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowWhiteboard((v) => !v)}
              className="h-9.5 rounded-xl border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-semibold text-xs"
            >
              <PenTool className="size-4 mr-1.5 text-purple-500" /> {showWhiteboard ? "Close Whiteboard" : "Draw Feynman / Diagram"}
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

      {kind !== "voice" && kind !== "image" && kind !== "sketch" && (
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            size="sm" 
            onClick={kind === "link" ? addLink : addWritten} 
            disabled={busy || (kind === "link" ? !linkUrl.trim() : !body.trim())}
            className="h-9.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 font-bold dark:hover:bg-white px-5 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null} Add note
          </Button>
          {error && <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">{error}</span>}
        </div>
      )}
      {(kind === "voice" || kind === "image" || kind === "sketch") && error && (
        <div className="text-xs font-semibold text-rose-500 dark:text-rose-400">{error}</div>
      )}

      {/* Notes list */}
      <div className="flex flex-col gap-2 pt-1">
        {!sorted.length && (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/6 p-4 text-center text-[12px] text-zinc-400 dark:text-zinc-500 italic">
            No notes on this {parentLabel} yet.
          </div>
        )}
        {sorted.map((n) => (
          <NoteRow
            key={n.id}
            note={n}
            mine={n.created_by === currentUserId}
            editing={editingNoteId === n.id}
            docChannel={docChannel}
            onToggleEdit={() => setEditingNoteId((cur) => (cur === n.id ? null : n.id))}
            onEditSketch={(resolvedUrl) => setEditingSketchNote({ note: n, resolvedUrl })}
            onDelete={() => onDelete(n.id)}
          />
        ))}
      </div>

      {/* Modal for Editing Existing Canvas Sketch */}
      {editingSketchNote && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-[640px]">
            <WhiteboardCanvas
              initialImageUrl={editingSketchNote.resolvedUrl}
              isPinned={false}
              onSaveImage={async (blob) => {
                setBusy(true);
                setError(null);
                try {
                  const file = new File([blob], `sketch_edited_${Date.now()}.png`, { type: "image/png" });
                  const path = await uploadMedia(file, file.name, storageUsed);
                  if (onUpdate) {
                    onUpdate(editingSketchNote.note.id, {
                      url: path,
                      size_bytes: file.size,
                      mime: file.type,
                    });
                  }
                  setEditingSketchNote(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to update sketch.");
                } finally {
                  setBusy(false);
                }
              }}
              onClose={() => setEditingSketchNote(null)}
            />
          </div>
        </div>
      )}

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

function NoteRow({
  note,
  mine,
  editing,
  docChannel,
  onToggleEdit,
  onEditSketch,
  onDelete,
}: {
  note: Note;
  mine: boolean;
  editing: boolean;
  docChannel: RealtimeDocChannel;
  onToggleEdit: () => void;
  onEditSketch?: (resolvedUrl: string) => void;
  onDelete: () => void;
}) {
  const collabEditable = COLLAB_KINDS.has(note.kind);
  return (
    <div className="group relative rounded-xl border border-zinc-200 dark:border-white/8 bg-white dark:bg-white/2 p-3 transition-all hover:bg-zinc-50/70 dark:hover:bg-white/[0.04]">
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
        {collabEditable && (
          <button
            type="button"
            className={cn(
              "rounded-md p-1 transition-all hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer",
              editing ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 opacity-0 group-hover:opacity-100"
            )}
            title={editing ? "Close live editor" : "Edit live — changes sync to everyone with this note open"}
            onClick={onToggleEdit}
          >
            {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
          </button>
        )}
        {mine && (
          <button
            type="button"
            className="rounded-md p-1 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
            title="Delete note"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <CollaborativeNoteEditor key={note.id} noteId={note.id} docChannel={docChannel} />
      ) : (
        <NoteBody note={note} onEditSketch={onEditSketch} />
      )}
    </div>
  );
}

function NoteBody({ note, onEditSketch }: { note: Note; onEditSketch?: (resolvedUrl: string) => void }) {
  if (note.kind === "voice" || note.kind === "image" || note.kind === "video") {
    return <NoteMedia note={note} onEditSketch={onEditSketch} />;
  }

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
      <pre className="overflow-x-auto rounded-xl bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/6 p-3 text-[12px] font-mono leading-relaxed text-zinc-900 dark:text-zinc-200">
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
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/6">
        <table className="w-full text-left text-[12px] border-collapse">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className={cn("border-b border-zinc-200 dark:border-white/6", rIdx === 0 && "bg-zinc-100/60 dark:bg-white/4 font-semibold")}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2 border-r border-zinc-200 dark:border-white/6 last:border-r-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </table>
      </div>
    );
  }

  return (
    <div className="text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200 select-text">
      <MathRenderer text={note.body} />
    </div>
  );
}
