"use client";

import { useLayoutEffect, useRef } from "react";
import { Loader2, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useCollabNoteText, diffRange } from "@/lib/yjs/use-collab-note-text";
import type { RealtimeDocChannel } from "@/hooks/useRealtimeBoard";

// Live co-editing for one note's `body` (kind: "text" | "rich" only — see NotesPanel's
// NoteRow, the sole place this is rendered). Binds a plain textarea to a Yjs CRDT doc over
// the existing /v1/realtime connection — see docs/MIGRATION-PLAN-bff-kong-split.md's
// Realtime section ("True concurrent co-editing"). No rich-text editor framework: this
// mirrors what the note composer already uses (a plain Textarea), just CRDT-bound instead of
// plain useState.
export default function CollaborativeNoteEditor({ noteId, docChannel }: { noteId: number; docChannel: RealtimeDocChannel }) {
  const { value, ready, error, onLocalChange } = useCollabNoteText(noteId, docChannel);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const prevValueRef = useRef(value);
  const editingLocallyRef = useRef(false);

  // Cursor-position preservation: when `value` changes because of a REMOTE update (not this
  // textarea's own onChange), naively re-rendering with a new controlled value would leave
  // the caret wherever the browser defaults it to (often the end) — jarring mid-sentence.
  // Shift the caret by the same edit the text itself just underwent instead.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    const prev = prevValueRef.current;
    if (el && prev !== value && !editingLocallyRef.current && document.activeElement === el) {
      const { selectionStart, selectionEnd } = el;
      const { start, endPrev, endNext } = diffRange(prev, value);
      const shift = endNext - endPrev;
      const adjust = (pos: number) => (pos <= start ? pos : pos >= endPrev ? pos + shift : start);
      const newStart = adjust(selectionStart ?? 0);
      const newEnd = adjust(selectionEnd ?? 0);
      el.setSelectionRange(newStart, newEnd);
    }
    editingLocallyRef.current = false;
    prevValueRef.current = value;
  }, [value]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 p-3 text-[12.5px] text-rose-500 dark:text-rose-400">
        Couldn&apos;t open this note for live editing: {error}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        {ready ? <Users className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
        <span>{ready ? "Live — changes sync as you type" : "Connecting…"}</span>
      </div>
      <Textarea
        ref={textareaRef}
        className="min-h-24 rounded-xl border-emerald-500/30 dark:border-emerald-500/25 bg-white dark:bg-white/[0.03] p-3 text-[13.5px] text-zinc-900 dark:text-zinc-100 focus:border-emerald-400 dark:focus:border-emerald-500/50 focus:ring-0"
        value={value}
        disabled={!ready}
        onChange={(e) => {
          editingLocallyRef.current = true;
          onLocalChange(e.target.value);
        }}
        placeholder="Start typing — collaborators with this note open see your changes live."
      />
    </div>
  );
}
