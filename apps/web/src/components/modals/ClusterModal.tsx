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
      <DialogContent showCloseButton={false} className="max-h-[88vh] max-w-lg gap-0 p-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18181c] shadow-2xl text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700/80 flex-row items-center justify-between space-y-0 bg-neutral-50/50 dark:bg-neutral-900/30">
          <DialogTitle className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {cluster ? "Edit cluster" : "New cluster"}
          </DialogTitle>
          <button
            type="button"
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X className="size-4.5" />
          </button>
        </DialogHeader>

        <div className="space-y-4.5 p-6 overflow-y-auto max-h-[calc(88vh-130px)]">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-500 dark:text-neutral-400">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Publications, Projects, Notes"
              autoFocus
              className="h-10 rounded-xl border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/80 px-3.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100 outline-none"
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
            <Label className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-500 dark:text-neutral-400">Colour</Label>
            <ColorPickerWidget color={color} onChange={setColor} />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-500 dark:text-neutral-400">Category</Label>
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer",
                  categoryId === null
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800"
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
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer",
                      on
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "border-transparent text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    )}
                    onClick={() => setCategoryId(cat.id)}
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              onClick={onManageCategories}
            >
              <Settings className="size-3.5" />
              <span>Manage categories</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/30 gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-semibold h-9 px-4">
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim()} className="rounded-xl text-xs font-semibold h-9 px-5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
