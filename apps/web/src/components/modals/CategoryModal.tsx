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
      <DialogContent showCloseButton={false} className="max-h-[85vh] max-w-md gap-0 p-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl text-[var(--ink)]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-[var(--line)] flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-[15px] font-medium tracking-tight text-[var(--ink)]">
              Manage Categories
            </DialogTitle>
            <p className="text-[11.5px] text-[var(--muted)] mt-0.5">
              Click a dot to cycle color. Edit name inline.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="space-y-3 p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Category List */}
          <div className="space-y-1.5">
            {!categories.length && (
              <p className="rounded-lg border border-dashed border-[var(--line)] p-3 text-center text-[12px] text-[var(--muted)] italic">
                No categories yet. Add one below to organize your clusters.
              </p>
            )}
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 transition-all hover:border-[var(--line-strong)] group"
              >
                <button
                  type="button"
                  className="size-3.5 shrink-0 cursor-pointer rounded-full border border-[var(--line)] transition-transform hover:scale-110"
                  style={{ backgroundColor: cat.color }}
                  title="Click to cycle colour"
                  onClick={() => {
                    const i = COLORS.indexOf(cat.color);
                    onRecolor(cat.id, COLORS[(i + 1) % COLORS.length]);
                  }}
                />
                <input
                  className="flex-1 border-0 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] font-medium"
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
                  className="rounded p-1 text-[var(--muted)] opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="Delete category"
                  onClick={() => onDelete(cat.id)}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Category Input */}
          <div className="flex gap-2 pt-2 border-t border-[var(--line)]">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name..."
              className="h-8.5 rounded-lg border-[var(--line)] bg-[var(--bg)] px-3 text-[12.5px] text-[var(--ink)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button
              type="button"
              onClick={add}
              className="h-8.5 rounded-lg bg-[var(--ink)] text-[var(--bg)] px-3 text-xs font-medium cursor-pointer"
            >
              <Plus className="size-3 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-[var(--line)] bg-[var(--panel-2)] flex items-center justify-end">
          <Button
            type="button"
            className="h-8.5 rounded-lg bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 px-4 text-[12px] font-medium cursor-pointer"
            onClick={onClose}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
