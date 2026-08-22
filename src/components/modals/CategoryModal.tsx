"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { COLORS } from "@/lib/board-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Category } from "@/lib/types";

export default function CategoryModal({
  open,
  categories,
  onClose,
  onAdd,
  onRename,
  onRecolor,
  onDelete,
}: {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onRecolor: (id: number, color: string) => void;
  onDelete: (id: number) => void;
}) {
  const [newName, setNewName] = useState("");

  if (!open) return null;

  function add() {
    const v = newName.trim();
    if (!v) return;
    onAdd(v);
    setNewName("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[85vh] max-w-md gap-0 p-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4.5 border-b border-zinc-100 dark:border-white/[0.08] flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Manage Categories
            </DialogTitle>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Click a dot to cycle color. Edit name inline.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100 transition-colors"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="space-y-3.5 p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Category List */}
          <div className="space-y-1.5">
            {!categories.length && (
              <p className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.06] p-4 text-center text-[12.5px] text-zinc-400 dark:text-zinc-500 italic">
                No categories yet. Add one below to organize your clusters.
              </p>
            )}
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2.5 rounded-xl border border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] px-3 py-2 transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.04] group"
              >
                <button
                  type="button"
                  className="size-4.5 shrink-0 cursor-pointer rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-110 shadow-xs"
                  style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}60` }}
                  title="Click to cycle colour"
                  onClick={() => {
                    const i = COLORS.indexOf(cat.color);
                    onRecolor(cat.id, COLORS[(i + 1) % COLORS.length]);
                  }}
                />
                <input
                  className="flex-1 border-0 bg-transparent text-[13.5px] text-zinc-800 dark:text-zinc-200 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:text-zinc-950 dark:focus:text-white font-medium"
                  type="text"
                  defaultValue={cat.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== cat.name) onRename(cat.id, v);
                    else e.target.value = cat.name;
                  }}
                />
                <button
                  type="button"
                  className="rounded-md p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                  title="Delete category"
                  onClick={() => onDelete(cat.id)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Category Input */}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-10 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.03] px-3.5 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/[0.05] focus:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button
              type="button"
              className="h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-100 font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.12] border border-zinc-200 dark:border-white/10 px-4 text-[13px] shadow-xs transition-all"
              onClick={add}
            >
              <Plus className="size-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-zinc-100 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-black/20 flex items-center justify-end">
          <Button
            type="button"
            className="h-9 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 font-medium dark:hover:bg-white px-5 text-[13px] shadow-xs transition-all"
            onClick={onClose}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
