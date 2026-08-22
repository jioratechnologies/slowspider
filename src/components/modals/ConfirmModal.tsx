"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export interface ConfirmState {
  title: string;
  message: string;
  onConfirm: (() => void) | null; // null = informational (OK-only)
}

export default function ConfirmModal({ state, onClose }: { state: ConfirmState | null; onClose: () => void }) {
  if (!state) return null;
  const { title, message, onConfirm } = state;

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-100 gap-3" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mx-0! mb-0! rounded-b-none! border-t-0 bg-transparent! p-0!">
          <Button variant="outline" onClick={onClose}>
            {onConfirm ? "Cancel" : "OK"}
          </Button>
          {onConfirm && (
            <Button
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
