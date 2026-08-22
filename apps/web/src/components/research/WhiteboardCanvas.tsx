"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Download, Eraser, Minus, Palette, Pen, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WhiteboardCanvas({
  onSaveImage,
  onClose,
}: {
  onSaveImage?: (blob: Blob) => void;
  onClose?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState("#38bdf8"); // Sky blue default
  const [lineWidth, setLineWidth] = useState(2.5);
  const [tool, setTool] = useState<"pen" | "eraser" | "line" | "arrow">("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high DPI canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill background
    ctx.fillStyle = "#121215";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function getCoords(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoords(e);
    setIsDrawing(true);
    setStartPos({ x, y });

    // Save snapshot for shape previews
    const rect = canvas.getBoundingClientRect();
    setSnapshot(ctx.getImageData(0, 0, rect.width * 2, rect.height * 2));

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "#121215" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoords(e);

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "line" || tool === "arrow") {
      if (snapshot && startPos) {
        ctx.putImageData(snapshot, 0, 0);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        if (tool === "arrow") {
          // Draw arrowhead
          const headlen = 10;
          const angle = Math.atan2(y - startPos.y, x - startPos.x);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x, y);
          ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }
    }
  }

  function stopDraw() {
    setIsDrawing(false);
    setStartPos(null);
    setSnapshot(null);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#121215";
    ctx.fillRect(0, 0, rect.width, rect.height);
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

  const COLORS = ["#ffffff", "#38bdf8", "#fbbf24", "#f43f5e", "#34d399", "#a855f7"];

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-950 text-white overflow-hidden shadow-2xl space-y-2 p-3">
      {/* Whiteboard Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={cn(
              "rounded-lg p-1.5 transition-colors cursor-pointer",
              tool === "pen" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
            )}
            title="Pen"
          >
            <Pen className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setTool("line")}
            className={cn(
              "rounded-lg p-1.5 transition-colors cursor-pointer",
              tool === "line" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
            )}
            title="Straight line"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setTool("arrow")}
            className={cn(
              "rounded-lg p-1.5 transition-colors cursor-pointer",
              tool === "arrow" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
            )}
            title="Vector / Arrow"
          >
            <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={cn(
              "rounded-lg p-1.5 transition-colors cursor-pointer",
              tool === "eraser" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
            )}
            title="Eraser"
          >
            <Eraser className="size-4" />
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer ml-1"
            title="Clear canvas"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                if (tool === "eraser") setTool("pen");
              }}
              style={{ backgroundColor: c }}
              className={cn(
                "size-5 rounded-full border border-white/20 transition-transform cursor-pointer",
                color === c && tool !== "eraser" ? "scale-125 ring-2 ring-white" : "hover:scale-110"
              )}
            />
          ))}
        </div>

        {/* Save / Close */}
        <div className="flex items-center gap-1.5">
          {onSaveImage && (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-7.5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 px-3 text-xs font-semibold"
            >
              <Check className="size-3 mr-1" /> Save sketch
            </Button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full h-[320px] rounded-xl overflow-hidden touch-none border border-white/5 bg-[#121215]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
}
