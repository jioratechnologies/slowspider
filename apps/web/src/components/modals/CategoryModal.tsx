"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { COLORS } from "@/lib/board-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
      <DialogContent showCloseButton={false} className="max-h-[85vh] max-w-md gap-0 p-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18181c] shadow-2xl text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700/80 flex-row items-center justify-between space-y-0 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div>
            <DialogTitle className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Manage Categories
            </DialogTitle>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Click a dot to cycle color. Edit name inline.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X className="size-4.5" />
          </button>
        </DialogHeader>

        <div className="space-y-3.5 p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Category List */}
          <div className="space-y-2">
            {!categories.length && (
              <p className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 p-4 text-center text-xs text-neutral-400 italic">
                No categories yet. Add one below to organize your clusters.
              </p>
            )}
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/80 px-3.5 py-2 transition-all hover:border-neutral-400 group"
              >
                <button
                  type="button"
                  className="size-4 shrink-0 cursor-pointer rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-110 shadow-xs"
                  style={{ backgroundColor: cat.color }}
                  title="Click to cycle colour"
                  onClick={() => {
                    const i = COLORS.indexOf(cat.color);
                    onRecolor(cat.id, COLORS[(i + 1) % COLORS.length]);
                  }}
                />
                <input
                  className="flex-1 border-0 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 font-semibold"
                  type="text"
                  defaultValue={cat.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== cat.name) onRename(cat.id, v);
                    else e.target.value = cat.name;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
                <button
                  type="button"
                  className="size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Delete category"
                  onClick={() => onDelete(cat.id)}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Category Form */}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="h-10 text-sm font-medium rounded-xl border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
            />
            <Button
              type="button"
              onClick={add}
              disabled={!newName.trim()}
              className="h-10 rounded-xl px-4 text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            >
              <Plus className="size-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-semibold h-9 px-4">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
