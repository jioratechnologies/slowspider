import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotebookPen, X } from "lucide-react";
import NotesPanel, { type NewNote } from "../notes/NotesPanel";
import type { Note, Task } from "@/lib/types";
import { isTextNote } from "@/lib/types";
import type { RealtimeDocChannel } from "@/hooks/useRealtimeBoard";

export default function TaskNotesModal({
  task,
  notes,
  currentUserId,
  storageUsed,
  docChannel,
  onClose,
  onAddNote,
  onDeleteNote,
}: {
  task: Task | null;
  notes: Note[];
  currentUserId: string;
  storageUsed: number;
  docChannel: RealtimeDocChannel;
  onClose: () => void;
  onAddNote: (note: NewNote) => Promise<void>;
  onDeleteNote: (id: number) => void;
}) {
  // Only text-kind notes are shown here. Attachments (image/video/voice/file) live in TaskModal.
  const textNotes = notes.filter((n) => isTextNote(n.kind));

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[88vh] sm:max-w-[560px] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border border-(line) bg-(panel) shadow-2xl">
        <DialogHeader className="px-6 py-4.5 border-b border-(line) flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-(ink)">
              <NotebookPen className="size-4 text-indigo-500 dark:text-indigo-400" />
              <span>Notes for &quot;{task?.title || "Untitled"}&quot;</span>
            </DialogTitle>
            <p className="text-[11.5px] text-(muted) mt-1 leading-normal">
              Private notes are visible only to you. Shared notes are visible to all collaborators.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-(ink3) hover:bg-(panel-2) hover:text-(ink) transition-colors"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 bg-(bg) p-6">
          <NotesPanel
            notes={textNotes}
            currentUserId={currentUserId}
            storageUsed={storageUsed}
            parentLabel="task"
            docChannel={docChannel}
            onAdd={(n) => onAddNote({ ...n, task_id: task!.id, cluster_id: null })}
            onDelete={onDeleteNote}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
