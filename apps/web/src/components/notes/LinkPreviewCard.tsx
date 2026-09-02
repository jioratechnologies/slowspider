"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import { previewLink, type LinkPreview } from "@/lib/board-actions";

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

    previewLink(cleanUrl)
      .then((json) => {
        if (live && json) setData(json);
      })
      .catch(() => {
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
    <div className="rounded-lg border border-(line) bg-(panel) overflow-hidden transition-all text-(ink) shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-(line) bg-(panel)">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-(muted) font-mono">
          <Globe className="size-3 shrink-0 text-(muted)" />
          <span className="truncate">{domain}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowToggle && (
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] text-(muted) hover:text-(ink) hover:bg-(accent-soft) transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-mono text-(ink) hover:underline transition-colors"
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
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-2 p-2.5 transition-colors hover:bg-(accent-soft) group block min-w-0"
        >
          {image && (
            <div className="relative w-full h-20 shrink-0 rounded overflow-hidden bg-(sunken) border border-(line)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover grayscale contrast-125"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {loading && !data ? (
              <div className="flex items-center gap-1.5 text-[11px] text-(muted)">
                <Loader2 className="size-3 animate-spin" /> Loading preview...
              </div>
            ) : (
              <>
                <h4 className="text-[12.5px] font-medium text-(ink) group-hover:underline transition-colors line-clamp-1 leading-snug">
                  {title}
                </h4>
                {description ? (
                  <p className="mt-0.5 text-[11px] text-(muted) line-clamp-2 leading-relaxed">
                    {description}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </a>
      ) : (
        <div className="px-2.5 py-1.5 text-[11.5px]">
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-(ink) hover:underline break-all inline-flex items-center gap-1 font-mono"
          >
            <span>{title || cleanUrl}</span>
            <ExternalLink className="size-2.5 shrink-0 opacity-70" />
          </a>
        </div>
      )}
    </div>
  );
}
