"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const iOS = /iphone|ipad|ipod/i.test(ua) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  let body: string;
  if (iOS) {
    body = "On iPhone or iPad, open this in <b>Safari</b>, tap the <b>Share</b> button, then choose <b>Add to Home Screen</b>. It gets its own icon and opens full-screen.";
  } else {
    body = "Use your browser's <b>Install</b> option — look for an install icon in the address bar, or open the browser menu and choose <b>Install Slow Spider</b>. Works in Chrome and Edge on desktop and Android.";
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-110 gap-3">
        <DialogHeader>
          <DialogTitle>Install Slow Spider</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: body }} />
        <DialogFooter className="mx-0! mb-0! rounded-b-none! border-t-0 bg-transparent! p-0!">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
