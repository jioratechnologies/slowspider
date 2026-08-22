"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLORS } from "@/lib/board-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ColorPickerWidget } from "@/components/ui/color-picker-widget";
import type { Category, Cluster, Note } from "@/lib/types";

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
  cluster: Cluster | null; // null = creating a new cluster
  categories: Category[];
  defaultColor: string;
  onClose: () => void;
  onSave: (input: { name: string; color: string; category_id: number | null }) => void;
  onManageCategories: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // Reset the form whenever the modal opens (or switches which cluster it's editing)
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
      <DialogContent showCloseButton={false} className="max-h-[88vh] max-w-120 gap-0 p-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4.5 border-b border-zinc-100 dark:border-white/[0.08] flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {cluster ? "Edit cluster" : "New cluster"}
          </DialogTitle>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100 transition-colors"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="space-y-5 p-6 overflow-y-auto max-h-[calc(88vh-130px)]">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Publications, Book projects, Teaching"
              autoFocus
              className="h-10 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.03] px-3.5 text-[13.5px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/[0.05] focus:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
          </div>

          {/* Color Palette with Color Wheel & HEX/RGB Input */}
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Colour</Label>
            <ColorPickerWidget color={color} onChange={setColor} />
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Category — what kind of cluster is this?</Label>
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.02]">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all",
                  categoryId === null
                    ? "bg-zinc-900 text-white dark:bg-white/10 dark:text-white shadow-xs border border-transparent dark:border-white/15"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04] border border-transparent"
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
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all border",
                      on
                        ? "text-zinc-900 dark:text-white shadow-xs font-semibold"
                        : "border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04]"
                    )}
                    style={
                      on
                        ? {
                            backgroundColor: `color-mix(in srgb, ${cat.color} 18%, transparent)`,
                            borderColor: `color-mix(in srgb, ${cat.color} 45%, transparent)`,
                            boxShadow: `0 0 10px color-mix(in srgb, ${cat.color} 25%, transparent)`,
                          }
                        : undefined
                    }
                    onClick={() => setCategoryId(cat.id)}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: on ? `0 0 8px ${cat.color}` : undefined,
                      }}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[11.5px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors pt-1 cursor-pointer"
              onClick={onManageCategories}
            >
              <Settings className="size-3.5" /> Manage categories
            </button>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-zinc-100 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-black/20 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-xl px-4 text-[13px] text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 font-medium dark:hover:bg-white px-5 text-[13px] shadow-xs transition-all cursor-pointer"
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
