"use client";

import { useState } from "react";
import { BookOpen, Check, Copy, ExternalLink, FileText, GraduationCap, Quote, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArxivPaperProps {
  url: string;
  title?: string;
  authors?: string[];
  abstract?: string;
  year?: string;
  arxivId?: string;
  category?: string;
}

export function isArxivUrl(url: string): boolean {
  if (!url) return false;
  return url.includes("arxiv.org") || url.startsWith("arxiv:") || url.includes("doi.org");
}

export function extractArxivId(url: string): string | null {
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+(?:v[0-9]+)?)/i) ||
                url.match(/arxiv:([0-9]+\.[0-9]+(?:v[0-9]+)?)/i);
  return match ? match[1] : null;
}

export default function ArxivPaperCard({
  url,
  title: initialTitle,
  authors: initialAuthors,
  abstract: initialAbstract,
  year: initialYear,
  category: initialCategory,
}: ArxivPaperProps) {
  const [copiedBibtex, setCopiedBibtex] = useState(false);
  const [showAbstract, setShowAbstract] = useState(true);

  const arxivId = extractArxivId(url) || "2305.18290";
  const title = initialTitle || `Research Paper (${arxivId})`;
  const authors = initialAuthors && initialAuthors.length ? initialAuthors : ["Research Team"];
  const year = initialYear || new Date().getFullYear().toString();
  const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

  // Generate standard BibTeX citation
  const citeKey = `${authors[0]?.split(" ").pop()?.toLowerCase() || "author"}${year}${arxivId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const bibtex = `@article{${citeKey},
  title={${title}},
  author={${authors.join(" and ")}},
  journal={arXiv preprint arXiv:${arxivId}},
  year={${year}},
  url={https://arxiv.org/abs/${arxivId}}
}`;

  function copyBibtex() {
    navigator.clipboard.writeText(bibtex);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/10 overflow-hidden shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-500/30">
      {/* Top Header with arXiv badge and quick actions */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-indigo-100/50 dark:bg-indigo-900/20 border-b border-indigo-200/60 dark:border-indigo-500/15">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-bold font-mono text-rose-600 dark:text-rose-400">
            <GraduationCap className="size-3" />
            <span>arXiv:{arxivId}</span>
          </span>
          {initialCategory && (
            <span className="rounded-md bg-zinc-200/70 dark:bg-white/10 px-1.5 py-0.5 text-[10.5px] font-mono text-zinc-600 dark:text-zinc-300">
              {initialCategory}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyBibtex}
            className="inline-flex items-center gap-1 rounded-lg border border-(line-strong) bg-(panel-2) px-2 py-1 text-[11.5px] font-medium text-(ink) hover:bg-(sunken) transition-colors cursor-pointer"
            title="Copy BibTeX Citation"
          >
            {copiedBibtex ? <Check className="size-3 text-emerald-500" /> : <Quote className="size-3" />}
            <span>{copiedBibtex ? "Copied!" : "Cite (BibTeX)"}</span>
          </button>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 px-2.5 py-1 text-[11.5px] font-medium transition-colors shadow-2xs"
            title="Open PDF in new tab"
          >
            <FileText className="size-3" />
            <span>PDF</span>
          </a>
        </div>
      </div>

      {/* Paper Content */}
      <div className="p-4 space-y-2.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <h3 className="text-[14.5px] font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
            {title}
          </h3>
        </a>

        {/* Authors */}
        <div className="flex items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-400">
          <Users className="size-3.5 shrink-0 text-zinc-400" />
          <span className="truncate">{authors.join(", ")}</span>
          <span className="text-zinc-400 dark:text-zinc-500 font-mono">({year})</span>
        </div>

        {/* Abstract */}
        {initialAbstract && (
          <div className="pt-1">
            <p className={cn(
              "text-[12.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed",
              !showAbstract && "line-clamp-2"
            )}>
              {initialAbstract}
            </p>
            <button
              type="button"
              onClick={() => setShowAbstract((v) => !v)}
              className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {showAbstract ? "Collapse abstract" : "Show full abstract"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
