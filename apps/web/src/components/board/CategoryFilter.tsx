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
      <div className="inline-flex items-center gap-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181c] p-1.5 shadow-xs shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 mr-1 shrink-0">
          <SlidersHorizontal className="size-4" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono">Filter</span>
        </div>

        {/* All Pill */}
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer",
            activeCategory === null
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
          onClick={() => onSelect(null)}
        >
          <span>All</span>
          <span className={cn(
            "rounded-md px-1.5 py-0.5 text-xs font-mono font-bold",
            activeCategory === null ? "bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
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
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 border cursor-pointer",
                on
                  ? "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold shadow-xs"
                  : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
              onClick={() => onSelect(cat.id)}
            >
              <span
                className="size-2.5 rounded-full shrink-0 ring-2 ring-black/10 dark:ring-white/20"
                style={{
                  backgroundColor: cat.color,
                }}
              />
              <span>{cat.name}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-mono font-bold",
                  on ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
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
