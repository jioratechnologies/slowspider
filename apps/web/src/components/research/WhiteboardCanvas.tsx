"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Copy,
  Download,
  Eraser,
  Highlighter,
  Maximize2,
  Minimize2,
  Minus,
  PenTool,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
  Type,
  X,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CanvasTool = "pen" | "highlighter" | "eraser" | "line" | "arrow" | "rect" | "circle" | "text";

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export default function WhiteboardCanvas({
  isPinned = false,
  initialImageUrl,
  onTogglePin,
  onSaveImage,
  onClose,
}: {
  isPinned?: boolean;
  initialImageUrl?: string;
  onTogglePin?: () => void;
  onSaveImage?: (blob: Blob) => void;
  onClose?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

  const [color, setColor] = useState("#818CF8"); // Indigo default
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [copied, setCopied] = useState(false);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing state
  const startPos = useRef<Point | null>(null);
  const lastPoint = useRef<Point | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  const saveSnapshotToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => {
        const updated = prev.slice(0, historyIndex + 1);
        return [...updated, imgData];
      });
      setHistoryIndex((prev) => prev + 1);
    } catch {
      // ignore
    }
  }, [historyIndex]);

  // Robust Canvas Auto-Resizer that keeps drawing preserved and coordinates 100% aligned
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.max(1, window.devicePixelRatio || 2);
    const newWidth = Math.round(rect.width * dpr);
    const newHeight = Math.round(rect.height * dpr);

    if (canvas.width === newWidth && canvas.height === newHeight) return;

    // Preserve existing canvas drawing during resize
    let prevCanvas: HTMLCanvasElement | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      prevCanvas = document.createElement("canvas");
      prevCanvas.width = canvas.width;
      prevCanvas.height = canvas.height;
      const pCtx = prevCanvas.getContext("2d");
      pCtx?.drawImage(canvas, 0, 0);
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill background
    ctx.fillStyle = "#141418";
    ctx.fillRect(0, 0, newWidth, newHeight);

    // Restore previous drawing scaled smoothly
    if (prevCanvas) {
      ctx.drawImage(prevCanvas, 0, 0, newWidth, newHeight);
    }
  }, []);

  // Resize observer to continuously maintain exact 1:1 coordinate matching
  useEffect(() => {
    if (isMinimized) return;

    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    // Initial resize
    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(wrapper);

    window.addEventListener("resize", resizeCanvas);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isMinimized, isPinned, resizeCanvas]);

  // Load existing image if initialImageUrl provided (Edit Canvas mode)
  useEffect(() => {
    if (!initialImageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw loaded image onto canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveSnapshotToHistory();
    };
    img.src = initialImageUrl;
  }, [initialImageUrl, saveSnapshotToHistory]);

  // Handle Undo / Redo
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  // Exact 1:1 coordinate mapping: scales screen client pixels to canvas buffer pixels
  function getPointerCoords(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const pt = getPointerCoords(e);
    setIsDrawing(true);
    startPos.current = pt;
    lastPoint.current = pt;

    const rect = canvas.getBoundingClientRect();
    const dpr = rect.width > 0 ? canvas.width / rect.width : 2;
    const scaledLineWidth = lineWidth * dpr;

    // Save snapshot for shape rubberbanding
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === "text") {
      setIsDrawing(false);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);

    if (tool === "highlighter") {
      ctx.strokeStyle = color;
      ctx.lineWidth = scaledLineWidth * 3.5;
      ctx.globalAlpha = 0.35;
    } else if (tool === "eraser") {
      ctx.strokeStyle = "#141418";
      ctx.lineWidth = scaledLineWidth * 4.5;
      ctx.globalAlpha = 1.0;
    } else {
      ctx.strokeStyle = color;
      const dynamicWidth = pt.pressure ? Math.max(dpr, scaledLineWidth * (pt.pressure * 1.5)) : scaledLineWidth;
      ctx.lineWidth = dynamicWidth;
      ctx.globalAlpha = 1.0;
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pt = getPointerCoords(e);
    const rect = canvas.getBoundingClientRect();
    const dpr = rect.width > 0 ? canvas.width / rect.width : 2;
    const scaledLineWidth = lineWidth * dpr;

    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      if (lastPoint.current) {
        // Smooth quadratic bezier curve interpolation
        const midX = (lastPoint.current.x + pt.x) / 2;
        const midY = (lastPoint.current.y + pt.y) / 2;
        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
        ctx.stroke();
      }
      lastPoint.current = pt;
    } else if (snapshotRef.current && startPos.current) {
      // Shape Rubberbanding
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = scaledLineWidth;

      const sx = startPos.current.x;
      const sy = startPos.current.y;
      const w = pt.x - sx;
      const h = pt.y - sy;

      if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      } else if (tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();

        // Arrowhead
        const headlen = Math.max(10 * dpr, scaledLineWidth * 3);
        const angle = Math.atan2(pt.y - sy, pt.x - sx);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - headlen * Math.cos(angle - Math.PI / 6), pt.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - headlen * Math.cos(angle + Math.PI / 6), pt.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (tool === "rect") {
        ctx.beginPath();
        ctx.roundRect(sx, sy, w, h, 6 * dpr);
        ctx.stroke();
      } else if (tool === "circle") {
        ctx.beginPath();
        const rx = Math.abs(w / 2);
        const ry = Math.abs(h / 2);
        const cx = sx + w / 2;
        const cy = sy + h / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    setIsDrawing(false);
    startPos.current = null;
    lastPoint.current = null;
    snapshotRef.current = null;

    try {
      const canvas = canvasRef.current;
      canvas?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    saveSnapshotToHistory();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#141418";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveSnapshotToHistory();
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `sketch-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleCopyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback to download
        handleDownload();
      }
    });
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob && onSaveImage) {
        onSaveImage(blob);
      }
    }, "image/png");
  }

  const PALETTE = [
    "#FFFFFF", // White
    "#818CF8", // Indigo
    "#38BDF8", // Sky
    "#34D399", // Emerald
    "#FBBF24", // Amber
    "#F43F5E", // Rose
    "#C084FC", // Purple
    "#FB923C", // Orange
  ];

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-[#141418] text-neutral-100 shadow-2xl transition-all duration-200 select-none overflow-hidden",
        isPinned
          ? "fixed bottom-5 right-5 z-[90] w-[95vw] sm:w-[580px] max-h-[85vh] border-indigo-500/30 ring-1 ring-indigo-500/20"
          : "w-full"
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-[#18181D] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <PenTool className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              Canvas Drawing Pad
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold">
                Stylus Ready
              </span>
            </h3>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                isPinned ? "bg-indigo-500/20 text-indigo-400" : "text-neutral-400 hover:text-white"
              )}
              title={isPinned ? "Unpin from screen" : "Pin canvas always on screen"}
            >
              {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </button>
          )}

          {isPinned && (
            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="rounded-lg p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isMinimized ? "Expand Canvas" : "Minimize Canvas"}
            >
              {isMinimized ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-3 p-3.5">
          {/* Tool ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
            {/* Tool Selection */}
            <div className="flex items-center gap-1 bg-[#1c1c22] p-1 rounded-2xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setTool("pen")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "pen" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Pencil / Stylus (Pressure Sensitive)"
              >
                <Pencil className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("highlighter")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "highlighter" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Highlighter"
              >
                <Highlighter className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("arrow")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "arrow" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Vector Arrow"
              >
                <ArrowRight className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("line")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "line" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Straight Line"
              >
                <Minus className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("rect")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "rect" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Rectangle Box"
              >
                <Square className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("circle")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "circle" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Circle / Ellipse"
              >
                <Circle className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("text")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "text" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Text Stamp"
              >
                <Type className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("eraser")}
                className={cn(
                  "rounded-xl p-2 transition-all cursor-pointer",
                  tool === "eraser" ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                )}
                title="Eraser"
              >
                <Eraser className="size-4" />
              </button>
            </div>

            {/* Undo / Redo / Clear / Grid */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="rounded-xl p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 cursor-pointer transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="size-4" />
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="rounded-xl p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 cursor-pointer transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className={cn(
                  "rounded-xl p-2 transition-colors cursor-pointer",
                  showGrid ? "text-indigo-400 bg-indigo-500/15" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                )}
                title="Toggle Dot Grid"
              >
                <Grid className="size-4" />
              </button>

              <button
                type="button"
                onClick={clearCanvas}
                className="rounded-xl p-2 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                title="Clear Canvas"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {/* Color palette & Stroke width */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    if (tool === "eraser") setTool("pen");
                  }}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "size-5.5 rounded-full border border-black/40 transition-all cursor-pointer",
                    color === c && tool !== "eraser" ? "scale-125 ring-2 ring-indigo-400 shadow-sm" : "hover:scale-110 opacity-80 hover:opacity-100"
                  )}
                />
              ))}
            </div>

            {/* Stroke Width Selector */}
            <div className="flex items-center gap-1 bg-[#1c1c22] px-2 py-1 rounded-xl border border-neutral-800 text-xs font-mono">
              <span className="text-[10px] text-neutral-500 uppercase mr-1">Stroke</span>
              {[2, 4, 8].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setLineWidth(size)}
                  className={cn(
                    "size-5 rounded-md flex items-center justify-center cursor-pointer transition-colors",
                    lineWidth === size ? "bg-indigo-600 text-white font-bold" : "text-neutral-400 hover:text-white"
                  )}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{ width: `${size + 1}px`, height: `${size + 1}px` }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            ref={canvasWrapperRef}
            className={cn(
              "relative w-full h-[320px] rounded-2xl overflow-hidden border border-neutral-800 bg-[#141418] touch-none",
              showGrid && "bg-[radial-gradient(#262630_1px,transparent_1px)] [background-size:16px_16px]"
            )}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="w-full h-full cursor-crosshair block touch-none"
            />
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyImage}
                className="h-8.5 rounded-xl border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 text-xs font-semibold"
              >
                {copied ? <Check className="size-3.5 mr-1 text-emerald-400" /> : <Copy className="size-3.5 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8.5 rounded-xl border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 text-xs font-semibold"
              >
                <Download className="size-3.5 mr-1" /> Export PNG
              </Button>
            </div>

            {onSaveImage && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 shadow-xs transition-all cursor-pointer"
              >
                <Check className="size-3.5 mr-1.5" /> Save to Note
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
