"use client";

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Cluster } from "@/lib/types";

export default function CategoryFilter({
  categories,
  clusters,
  activeCategory,
  onSelect,
}: {
  categories: Category[];
  clusters: Cluster[];
  activeCategory: number | null;
  onSelect: (id: number | null) => void;
}) {
  const used = categories.filter((cat) => clusters.some((c) => c.category_id === cat.id));
  if (!used.length) return null;

  return (
    <div className="mb-4 max-w-full overflow-x-auto no-scrollbar py-0.5">
      {/* Segmented Filter Bar */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1 shadow-xs shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[var(--muted)] border-r border-[var(--line)] mr-0.5 shrink-0">
          <SlidersHorizontal className="size-3.5" />
          <span className="text-[11.5px] font-medium tracking-tight">Filter</span>
        </div>

        {/* All Pill */}
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all duration-150 cursor-pointer",
            activeCategory === null
              ? "bg-[var(--ink)] text-[var(--bg)] shadow-xs"
              : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)]"
          )}
          onClick={() => onSelect(null)}
        >
          <span>All</span>
          <span className={cn(
            "rounded-md px-1.5 py-0.2 text-[10px] font-mono",
            activeCategory === null ? "bg-white/20 text-white" : "bg-[var(--sunken)] text-[var(--muted)]"
          )}>
            {clusters.length}
          </span>
        </button>

        {/* Category Pills */}
        {used.map((cat) => {
          const on = activeCategory === cat.id;
          const count = clusters.filter((c) => c.category_id === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all duration-150 border cursor-pointer",
                on
                  ? "border-[var(--ink)] bg-[var(--accent-soft)] text-[var(--ink)] font-semibold"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)]"
              )}
              onClick={() => onSelect(cat.id)}
            >
              <span
                className="size-2 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                style={{
                  backgroundColor: cat.color,
                }}
              />
              <span>{cat.name}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.2 text-[10px] font-mono",
                  on ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--sunken)] text-[var(--muted)]"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
