"use client";

import React, { useState, useEffect, useRef } from "react";
import { Pipette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLORS } from "@/lib/board-helpers";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

export function ColorPickerWidget({
  color,
  onChange,
  className,
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<"hex" | "rgb">("hex");
  const [hexInput, setHexInput] = useState(color || "#4C9A8A");
  const [rInput, setRInput] = useState("76");
  const [gInput, setGInput] = useState("154");
  const [bInput, setBInput] = useState("138");
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHexInput(color || "#4C9A8A");
    const rgb = hexToRgb(color || "#4C9A8A");
    if (rgb) {
      setRInput(String(rgb.r));
      setGInput(String(rgb.g));
      setBInput(String(rgb.b));
    }
  }, [color]);

  function handleHexChange(val: string) {
    setHexInput(val);
    if (/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
      const formatted = val.startsWith("#") ? val : `#${val}`;
      onChange(formatted);
      const rgb = hexToRgb(formatted);
      if (rgb) {
        setRInput(String(rgb.r));
        setGInput(String(rgb.g));
        setBInput(String(rgb.b));
      }
    }
  }

  function handleRgbChange(newR: string, newG: string, newB: string) {
    setRInput(newR);
    setGInput(newG);
    setBInput(newB);
    const r = parseInt(newR, 10);
    const g = parseInt(newG, 10);
    const b = parseInt(newB, 10);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const hex = rgbToHex(r, g, b);
      setHexInput(hex);
      onChange(hex);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Palette Swatches with Rainbow Color Wheel button */}
      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
        {COLORS.map((c) => {
          const isSelected = c.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              className={cn(
                "size-7 rounded-xl transition-all relative flex items-center justify-center cursor-pointer hover:scale-110",
                isSelected
                  ? "ring-2 ring-zinc-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-[#16161a] scale-110 shadow-md z-10"
                  : "opacity-85 hover:opacity-100"
              )}
              style={{ backgroundColor: c }}
              onClick={() => {
                onChange(c);
                setHexInput(c);
              }}
              title={c}
            />
          );
        })}

        {/* Color Wheel Trigger */}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="relative size-7 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 shadow-xs border border-zinc-200 dark:border-white/10 overflow-hidden"
          style={{
            background: "conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)",
          }}
          title="Custom Color Wheel & Dropper"
        >
          <div className="size-3.5 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white">
            <Pipette className="size-2.5" />
          </div>
          <input
            ref={colorInputRef}
            type="color"
            value={color.startsWith("#") ? color : "#4C9A8A"}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val);
              setHexInput(val);
            }}
            className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
          />
        </button>
      </div>

      {/* HEX / RGB Mode Selector & Value Input */}
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.02] p-2">
        {/* Live Color Swatch */}
        <div
          className="size-8 rounded-lg border border-black/10 dark:border-white/10 shrink-0 shadow-inner"
          style={{ backgroundColor: color }}
        />

        {/* Mode Switcher */}
        <div className="flex items-center rounded-lg bg-zinc-200/60 dark:bg-white/[0.06] p-0.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setMode("hex")}
            className={cn(
              "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
              mode === "hex" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            HEX
          </button>
          <button
            type="button"
            onClick={() => setMode("rgb")}
            className={cn(
              "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
              mode === "rgb" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            RGB
          </button>
        </div>

        {/* Dynamic Input Box */}
        {mode === "hex" ? (
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#4C9A8A"
              maxLength={7}
              className="h-8 w-full rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2 text-[12px] font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none uppercase"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <input
              type="number"
              min={0}
              max={255}
              value={rInput}
              onChange={(e) => handleRgbChange(e.target.value, gInput, bInput)}
              className="h-8 w-full rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-1 text-center text-[11.5px] font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 focus:outline-none"
              placeholder="R"
            />
            <input
              type="number"
              min={0}
              max={255}
              value={gInput}
              onChange={(e) => handleRgbChange(rInput, e.target.value, bInput)}
              className="h-8 w-full rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-1 text-center text-[11.5px] font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 focus:outline-none"
              placeholder="G"
            />
            <input
              type="number"
              min={0}
              max={255}
              value={bInput}
              onChange={(e) => handleRgbChange(rInput, gInput, e.target.value)}
              className="h-8 w-full rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-1 text-center text-[11.5px] font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 focus:outline-none"
              placeholder="B"
            />
          </div>
        )}
      </div>
    </div>
  );
}
