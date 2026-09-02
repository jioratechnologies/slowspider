"use client";

import { useMemo } from "react";
import { BookMarked, Code2, Play } from "lucide-react";
import MathRenderer from "./MathRenderer";
import { cn } from "@/lib/utils";

interface NotebookCell {
  cell_type: "markdown" | "code" | "raw";
  source: string | string[];
  execution_count?: number | null;
  outputs?: Array<{
    output_type: string;
    text?: string | string[];
    data?: {
      "text/plain"?: string | string[];
      "image/png"?: string;
      "image/jpeg"?: string;
    };
  }>;
}

interface NotebookData {
  cells?: NotebookCell[];
  metadata?: {
    language_info?: {
      name?: string;
    };
  };
}

export default function JupyterViewer({
  content,
  filename,
}: {
  content: string | NotebookData;
  filename?: string;
}) {
  const notebook = useMemo<NotebookData | null>(() => {
    if (typeof content === "object") return content;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  if (!notebook || !notebook.cells) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-white/8 p-4 text-center text-xs text-zinc-400 font-mono">
        Invalid or unreadable Jupyter notebook.
      </div>
    );
  }

  function joinSource(src: string | string[]) {
    if (Array.isArray(src)) return src.join("");
    return src;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/8 bg-zinc-50/50 dark:bg-white/1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-zinc-100 dark:border-white/4 bg-white/70 dark:bg-white/2">
        <div className="flex items-center gap-2 font-mono text-[12px] text-zinc-700 dark:text-zinc-300">
          <BookMarked className="size-4 text-amber-500" />
          <span className="font-semibold">{filename || "notebook.ipynb"}</span>
          <span className="text-zinc-400 text-[11px]">
            ({notebook.cells.length} cells · {notebook.metadata?.language_info?.name || "Python"})
          </span>
        </div>
      </div>

      {/* Cells List */}
      <div className="p-3 space-y-3 max-h-125 overflow-y-auto">
        {notebook.cells.map((cell, idx) => {
          const srcText = joinSource(cell.source);

          if (cell.cell_type === "markdown") {
            return (
              <div
                key={idx}
                className="rounded-xl p-3 bg-white/60 dark:bg-white/2 border border-zinc-200/60 dark:border-white/4 text-[13px] leading-relaxed text-zinc-900 dark:text-zinc-200"
              >
                <MathRenderer text={srcText} />
              </div>
            );
          }

          if (cell.cell_type === "code") {
            return (
              <div
                key={idx}
                className="rounded-xl overflow-hidden border border-(line) bg-(panel)"
              >
                {/* Input Prompt */}
                <div className="flex items-start gap-2 bg-(sunken)/60 p-2 font-mono text-[11px] border-b border-(line)">
                  <span className="text-sky-600 dark:text-sky-400 font-bold shrink-0">
                    In [{cell.execution_count ?? " "}]:
                  </span>
                  <pre className="flex-1 overflow-x-auto text-[12px] text-zinc-900 dark:text-zinc-200">
                    <code>{srcText}</code>
                  </pre>
                </div>

                {/* Output Prompt & Rendered Plots */}
                {cell.outputs && cell.outputs.length > 0 && (
                  <div className="p-2.5 space-y-2 bg-zinc-50/40 dark:bg-black/20 text-[12px] font-mono">
                    {cell.outputs.map((out, oIdx) => {
                      const outText = out.text ? joinSource(out.text) : out.data?.["text/plain"] ? joinSource(out.data["text/plain"]) : null;
                      const imgPng = out.data?.["image/png"];

                      return (
                        <div key={oIdx} className="space-y-1">
                          {outText && (
                            <pre className="overflow-x-auto text-zinc-600 dark:text-zinc-400 text-[11px] whitespace-pre-wrap">
                              {outText}
                            </pre>
                          )}
                          {imgPng && (
                            <div className="pt-1 flex justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`data:image/png;base64,${imgPng}`}
                                alt="Plot Output"
                                className="max-h-72 rounded-lg border border-zinc-200 dark:border-white/10 shadow-xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
