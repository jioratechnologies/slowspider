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
      <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-200/90 dark:border-white/[0.08] bg-white/90 dark:bg-[#16161a]/85 p-1 shadow-xs dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-500 border-r border-zinc-200 dark:border-white/[0.06] mr-0.5 shrink-0">
          <SlidersHorizontal className="size-3.5" />
          <span className="text-[11.5px] font-medium tracking-tight">Filter</span>
        </div>

        {/* All Pill */}
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all duration-150",
            activeCategory === null
              ? "bg-zinc-900 text-white dark:bg-white/10 dark:text-white shadow-xs border border-transparent dark:border-white/15"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04] border border-transparent"
          )}
          onClick={() => onSelect(null)}
        >
          <span>All</span>
          <span className={cn(
            "rounded-md px-1.5 py-0.2 text-[10px] font-mono",
            activeCategory === null ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-500"
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
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all duration-150 border",
                on
                  ? "text-zinc-900 dark:text-white shadow-xs font-semibold"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04]"
              )}
              style={
                on
                  ? {
                      backgroundColor: `color-mix(in srgb, ${cat.color} 18%, transparent)`,
                      borderColor: `color-mix(in srgb, ${cat.color} 45%, transparent)`,
                      boxShadow: `0 0 12px color-mix(in srgb, ${cat.color} 25%, transparent)`,
                    }
                  : undefined
              }
              onClick={() => onSelect(cat.id)}
            >
              <span
                className="size-2 rounded-full shrink-0 transition-transform"
                style={{
                  backgroundColor: cat.color,
                  boxShadow: on ? `0 0 8px ${cat.color}` : `0 0 4px ${cat.color}60`,
                }}
              />
              <span>{cat.name}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.2 text-[10px] font-mono",
                  on ? "bg-black/10 dark:bg-white/20 text-zinc-900 dark:text-white" : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-500"
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
