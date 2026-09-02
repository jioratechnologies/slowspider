"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (matchIso) {
    const d = new Date(Number(matchIso[1]), Number(matchIso[2]) - 1, Number(matchIso[3]));
    if (!isNaN(d.getTime())) return d;
  }
  const matchDmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchDmy) {
    const d = new Date(Number(matchDmy[3]), Number(matchDmy[2]) - 1, Number(matchDmy[1]));
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Custom Theme DatePicker with Fixed Portal
 * Always floats on top of ALL dialogs, footers, and modals with z-index 999999.
 */
export function CustomDatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [cursor, setCursor] = useState(() => parseDate(value) || new Date());
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInputValue(value || "");
    if (value) {
      const d = parseDate(value);
      if (d) setCursor(d);
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = 310;
    const height = 360;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < height && rect.top > height;

    const top = showAbove ? rect.top - height - 6 : rect.bottom + 6;
    let left = rect.left;

    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    if (left < 12) left = 12;

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    // Measure the rendered popover and re-clamp within the viewport —
    // the static height guess in updatePosition runs small.
    function fitToViewport() {
      const el = popoverRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      const maxTop = window.innerHeight - h - 8;
      setPos((p) => (p && p.top > maxTop ? { ...p, top: Math.max(8, maxTop) } : p));
    }

    function handleScroll() {
      updatePosition();
    }
    function handleResize() {
      updatePosition();
      fitToViewport();
    }
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || popoverRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    const raf = requestAnimationFrame(fitToViewport);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, updatePosition]);

  const selectedDate = parseDate(value);
  const today = new Date();
  const grid = monthGrid(cursor.getFullYear(), cursor.getMonth());

  function shiftMonth(dir: 1 | -1) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  function handleSelectDate(d: Date) {
    const iso = isoDate(d);
    onChange(iso);
    setInputValue(iso);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setInputValue(text);
    const parsed = parseDate(text);
    if (parsed) {
      onChange(isoDate(parsed));
      setCursor(parsed);
    } else if (text.trim() === "") {
      onChange("");
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-xl border border-(line) bg-(sunken) pr-9 pl-3 text-[13px] text-(ink) placeholder:text-(ink3) focus:border-(line-strong) focus:ring-0 focus:outline-none transition-all",
            className
          )}
        />
        <button
          type="button"
          onClick={() => {
            if (!open) updatePosition();
            setOpen((v) => !v);
          }}
          className="absolute right-2.5 rounded-lg p-1 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors cursor-pointer"
          title="Open calendar"
        >
          <CalendarIcon className="size-4" />
        </button>
      </div>

      {/* Floating Portal Calendar Popover */}
      {open && mounted && pos && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 999999,
          }}
          className="w-75 sm:w-77.5 max-h-[calc(100dvh-16px)] overflow-y-auto no-scrollbar rounded-2xl border border-(line) bg-(panel) p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors cursor-pointer"
              onClick={() => shiftMonth(-1)}
              title="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="text-[14.5px] font-semibold tracking-tight text-(ink) font-sans">
              {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>

            <button
              type="button"
              className="rounded-lg p-1.5 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors cursor-pointer"
              onClick={() => shiftMonth(1)}
              title="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10.5px] font-semibold uppercase text-(ink3) py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isSelected = selectedDate ? isoDate(d) === isoDate(selectedDate) : false;
              const isToday = isoDate(d) === isoDate(today);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectDate(d)}
                  className={cn(
                    "relative flex size-8 sm:size-9 items-center justify-center rounded-xl text-[12.5px] font-medium transition-all cursor-pointer",
                    !inMonth && "text-(ink3) opacity-40 hover:opacity-80",
                    inMonth && !isSelected && !isToday && "text-(ink) hover:bg-(accent-soft)",
                    isToday && !isSelected && "border border-(line-strong) text-(ink) font-semibold",
                    isSelected && "bg-(ink) text-(bg) font-bold shadow-md"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="mt-3 flex items-center justify-between border-t border-(line) pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setInputValue("");
                setOpen(false);
              }}
              className="text-[11.5px] text-(muted) hover:text-rose-500 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleSelectDate(new Date())}
              className="text-[11.5px] font-medium text-(ink) hover:underline underline-offset-2 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * Custom Theme TimePicker with Fixed Portal
 * Always floats on top of ALL dialogs, footers, and modals with z-index 999999.
 */
export function CustomTimePicker({
  value,
  disabled,
  onChange,
  placeholder = "HH:MM",
  className,
}: {
  value: string;
  disabled?: boolean;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = 270;
    const height = 300;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < height && rect.top > height;

    const top = showAbove ? rect.top - height - 6 : rect.bottom + 6;
    let left = rect.left;

    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    if (left < 12) left = 12;

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    // Measure the rendered popover and re-clamp within the viewport —
    // the static height guess in updatePosition runs small.
    function fitToViewport() {
      const el = popoverRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      const maxTop = window.innerHeight - h - 8;
      setPos((p) => (p && p.top > maxTop ? { ...p, top: Math.max(8, maxTop) } : p));
    }

    function handleScroll() {
      updatePosition();
    }
    function handleResize() {
      updatePosition();
      fitToViewport();
    }
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || popoverRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    const raf = requestAnimationFrame(fitToViewport);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, updatePosition]);

  const PRESETS = [
    { label: "Morning", time: "09:00" },
    { label: "Noon", time: "12:00" },
    { label: "Afternoon", time: "15:00" },
    { label: "Evening", time: "18:00" },
    { label: "Night", time: "21:00" },
  ];

  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const MINUTES = ["00", "15", "30", "45"];

  const [currentH = "09", currentM = "00"] = (value || "09:00").split(":");

  function handleSelectTime(h: string, m: string) {
    const formatted = `${h}:${m}`;
    onChange(formatted);
    setInputValue(formatted);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setInputValue(text);
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text)) {
      onChange(text);
    } else if (text.trim() === "") {
      onChange("");
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-xl border border-(line) bg-(sunken) pr-9 pl-3 text-[13px] text-(ink) placeholder:text-(ink3) focus:border-(line-strong) focus:ring-0 focus:outline-none disabled:opacity-40 transition-all",
            className
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!open) updatePosition();
            setOpen((v) => !v);
          }}
          className="absolute right-2.5 rounded-lg p-1 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors disabled:opacity-40 cursor-pointer"
          title="Open time presets"
        >
          <Clock className="size-4" />
        </button>
      </div>

      {/* Floating Portal Time Popover */}
      {open && !disabled && mounted && pos && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 999999,
          }}
          className="w-65 max-h-[calc(100dvh-16px)] overflow-y-auto no-scrollbar rounded-2xl border border-(line) bg-(panel) p-3.5 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 select-none"
        >
          {/* Quick Presets */}
          <div className="mb-3">
            <span className="text-[10.5px] font-semibold uppercase text-(ink3) block mb-1.5">
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.time}
                  type="button"
                  onClick={() => {
                    onChange(p.time);
                    setInputValue(p.time);
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                    value === p.time
                      ? "bg-(ink) text-(bg) font-semibold"
                      : "bg-(panel-2) text-(muted) hover:bg-(accent-soft) hover:text-(ink)"
                  )}
                >
                  {p.label} <span className="font-mono text-[10px] opacity-70">({p.time})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hour and Minute Selector */}
          <div className="border-t border-(line) pt-2.5">
            <span className="text-[10.5px] font-semibold uppercase text-(ink3) block mb-1.5">
              Select Time
            </span>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="text-[10px] font-mono text-(muted) block mb-1">Hour</span>
                <div className="max-h-28 overflow-y-auto space-y-1 rounded-xl border border-(line) p-1 bg-(sunken) no-scrollbar">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectTime(h, currentM)}
                      className={cn(
                        "w-full rounded-lg py-1 text-[12px] font-mono font-medium transition-colors cursor-pointer",
                        currentH === h
                          ? "bg-(ink) text-(bg) font-bold"
                          : "text-(muted) hover:bg-(accent-soft) hover:text-(ink)"
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-(muted) block mb-1">Minute</span>
                <div className="space-y-1 rounded-xl border border-(line) p-1 bg-(sunken)">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectTime(currentH, m)}
                      className={cn(
                        "w-full rounded-lg py-1.5 text-[12px] font-mono font-medium transition-colors cursor-pointer",
                        currentM === m
                          ? "bg-(ink) text-(bg) font-bold"
                          : "text-(muted) hover:bg-(accent-soft) hover:text-(ink)"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-3 flex items-center justify-between border-t border-(line) pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setInputValue("");
                setOpen(false);
              }}
              className="text-[11.5px] text-(muted) hover:text-rose-500 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11.5px] font-medium text-(ink) hover:underline underline-offset-2 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
