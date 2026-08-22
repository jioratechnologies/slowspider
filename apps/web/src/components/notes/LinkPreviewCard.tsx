"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import type { LinkPreview } from "@/lib/board-actions";

export default function LinkPreviewCard({
  url,
  fallbackTitle,
  allowToggle = true,
  defaultExpanded = true,
}: {
  url: string;
  fallbackTitle?: string;
  allowToggle?: boolean;
  defaultExpanded?: boolean;
}) {
  const [data, setData] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(defaultExpanded);
  const [imgError, setImgError] = useState(false);

  const cleanUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

  useEffect(() => {
    if (!cleanUrl) return;
    let live = true;
    setLoading(true);

    fetch("/api/v1/notes/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: cleanUrl }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.json();
      })
      .then((json) => {
        if (live && json) setData(json);
      })
      .catch(() => {
        // Fallback gracefully
        if (live) {
          try {
            const parsed = new URL(cleanUrl);
            setData({
              url: cleanUrl,
              title: fallbackTitle || parsed.hostname,
              description: "",
              image: null,
              siteName: parsed.hostname,
            });
          } catch {
            setData(null);
          }
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [cleanUrl, fallbackTitle]);

  let domain = "";
  try {
    domain = new URL(cleanUrl).hostname;
  } catch {
    domain = cleanUrl;
  }

  const title = data?.title || fallbackTitle || domain;
  const description = data?.description || "";
  const image = !imgError && data?.image ? data.image : null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-white/15">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] bg-white/50 dark:bg-white/[0.01]">
        <div className="flex items-center gap-1.5 min-w-0 text-[11.5px] text-zinc-500 dark:text-zinc-400 font-mono">
          <Globe className="size-3.5 shrink-0 text-sky-500" />
          <span className="truncate">{domain}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowToggle && (
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              {showPreview ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              <span>{showPreview ? "Hide" : "Preview"}</span>
            </button>
          )}

          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="size-3" />
            <span>Open</span>
          </a>
        </div>
      </div>

      {/* Preview Body */}
      {showPreview ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row gap-3 p-3 transition-colors hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] group block"
        >
          {image && (
            <div className="relative w-full sm:w-28 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-black/40 border border-zinc-200/60 dark:border-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {loading && !data ? (
              <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                <Loader2 className="size-3 animate-spin" /> Loading preview...
              </div>
            ) : (
              <>
                <h4 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                  {title}
                </h4>
                {description ? (
                  <p className="mt-1 text-[11.5px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {description}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </a>
      ) : (
        <div className="px-3 py-2 text-[12.5px]">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-400 hover:underline break-all inline-flex items-center gap-1.5"
          >
            <span>{title || url}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
      )}
    </div>
  );
}
