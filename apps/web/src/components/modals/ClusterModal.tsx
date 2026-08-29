"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ColorPickerWidget } from "@/components/ui/color-picker-widget";
import type { Category, Cluster } from "@/lib/types";

export default function ClusterModal({
  open,
  cluster,
  categories,
  defaultColor,
  onClose,
  onSave,
  onManageCategories,
}: {
  open: boolean;
  cluster: Cluster | null;
  categories: Category[];
  defaultColor: string;
  onClose: () => void;
  onSave: (input: { name: string; color: string; category_id: number | null }) => void;
  onManageCategories: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const openKey = open ? `open:${cluster?.id ?? "new"}` : null;
  if (openKey !== null && openKey !== loadedFor) {
    setLoadedFor(openKey);
    setName(cluster?.name || "");
    setColor(cluster?.color || defaultColor);
    setCategoryId(cluster?.category_id ?? null);
  } else if (openKey === null && loadedFor !== null) {
    setLoadedFor(null);
  }

  if (!open) return null;

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed, color, category_id: categoryId });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[88vh] max-w-120 gap-0 p-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl text-[var(--ink)]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-[var(--line)] flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-[15px] font-medium tracking-tight text-[var(--ink)]">
            {cluster ? "Edit cluster" : "New cluster"}
          </DialogTitle>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4 p-6 overflow-y-auto max-h-[calc(88vh-130px)]">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label className="text-[11.5px] font-medium text-[var(--muted)]">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Publications, Projects, Notes"
              autoFocus
              className="h-9 rounded-lg border-[var(--line)] bg-[var(--bg)] px-3 text-[13.5px] text-[var(--ink)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
          </div>

          {/* Color Palette */}
          <div className="space-y-1.5">
            <Label className="text-[11.5px] font-medium text-[var(--muted)]">Colour</Label>
            <ColorPickerWidget color={color} onChange={setColor} />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label className="text-[11.5px] font-medium text-[var(--muted)]">Category</Label>
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)]">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-mono border transition-all cursor-pointer",
                  categoryId === null
                    ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-medium"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                )}
                onClick={() => setCategoryId(null)}
              >
                None
              </button>
              {categories.map((cat) => {
                const on = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-mono border transition-all cursor-pointer",
                      on
                        ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-medium"
                        : "border-[var(--line)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--ink)]"
                    )}
                    onClick={() => setCategoryId(cat.id)}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors pt-0.5 cursor-pointer font-mono"
              onClick={onManageCategories}
            >
              <Settings className="size-3" /> Manage categories
            </button>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-[var(--line)] bg-[var(--panel-2)] flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-8.5 rounded-lg px-3 text-[12px] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-8.5 rounded-lg bg-[var(--ink)] text-[var(--bg)] font-medium hover:opacity-90 px-4 text-[12px] cursor-pointer"
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
