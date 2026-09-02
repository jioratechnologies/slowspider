"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, LineChart, Table, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPoint {
  x: number;
  y: number;
  label?: string;
}

export function parseCsvToPoints(csvText: string): { points: DataPoint[]; xLabel: string; yLabel: string } {
  const lines = csvText.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { points: [], xLabel: "X", yLabel: "Y" };

  let xLabel = "X";
  let yLabel = "Y";
  let startIndex = 0;

  // Check if first line is a header
  const firstLineCols = lines[0].split(/[,\t]+/).map((s) => s.trim().replace(/^["']|["']$/g, ""));
  if (isNaN(Number(firstLineCols[0])) || isNaN(Number(firstLineCols[1]))) {
    xLabel = firstLineCols[0] || "X";
    yLabel = firstLineCols[1] || "Y";
    startIndex = 1;
  }

  const points: DataPoint[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(/[,\t]+/).map((s) => s.trim());
    const x = parseFloat(cols[0]);
    const y = parseFloat(cols[1]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y, label: cols[2] });
    }
  }

  return { points, xLabel, yLabel };
}

export default function DataChartNote({
  csvData,
  title = "Experimental Data",
  onUpdateCsv,
}: {
  csvData: string;
  title?: string;
  onUpdateCsv?: (csv: string) => void;
}) {
  const [view, setView] = useState<"plot" | "table" | "raw">("plot");
  const [plotType, setPlotType] = useState<"scatter" | "line" | "bar">("line");
  const [rawText, setRawText] = useState(csvData);

  const { points, xLabel, yLabel } = useMemo(() => parseCsvToPoints(rawText), [rawText]);

  // Compute bounding box
  const stats = useMemo(() => {
    if (!points.length) return { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      minX: minX === maxX ? minX - 1 : minX,
      maxX: minX === maxX ? maxX + 1 : maxX,
      minY: minY === maxY ? minY - 1 : minY,
      maxY: minY === maxY ? maxY + 1 : maxY,
    };
  }, [points]);

  const width = 480;
  const height = 220;
  const pad = { top: 20, right: 20, bottom: 35, left: 45 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  function toSvgX(x: number) {
    return pad.left + ((x - stats.minX) / (stats.maxX - stats.minX)) * plotW;
  }

  function toSvgY(y: number) {
    return pad.top + plotH - ((y - stats.minY) / (stats.maxY - stats.minY)) * plotH;
  }

  // Sorted path for line chart
  const sortedPoints = useMemo(() => [...points].sort((a, b) => a.x - b.x), [points]);
  const polylinePoints = sortedPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ");

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/8 bg-zinc-50/60 dark:bg-white/2 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-zinc-100 dark:border-white/4 bg-white/70 dark:bg-white/2">
        <span className="text-[12.5px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 font-mono">
          <LineChart className="size-3.5 text-teal-500" />
          <span>{title}</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView("plot")}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
              view === "plot"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            Plot
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
              view === "table"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setView("raw")}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
              view === "raw"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            CSV
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {view === "plot" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono px-1">
              <span>{yLabel} vs {xLabel} ({points.length} data points)</span>
              <div className="flex gap-1">
                {(["line", "scatter", "bar"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPlotType(t)}
                    className={cn(
                      "capitalize px-1.5 py-0.5 rounded text-[10.5px] cursor-pointer",
                      plotType === t ? "bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold" : "hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full overflow-hidden rounded-xl border border-(line) bg-(panel) p-2">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Gridlines */}
                <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="currentColor" className="text-zinc-300 dark:text-zinc-700" strokeWidth="1" />
                <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="currentColor" className="text-zinc-300 dark:text-zinc-700" strokeWidth="1" />

                {/* Horizontal Grid lines */}
                {[0.25, 0.5, 0.75].map((pct) => {
                  const y = pad.top + plotH * pct;
                  return (
                    <line
                      key={pct}
                      x1={pad.left}
                      y1={y}
                      x2={width - pad.right}
                      y2={y}
                      stroke="currentColor"
                      className="text-zinc-200 dark:text-zinc-800"
                      strokeDasharray="3 3"
                    />
                  );
                })}

                {/* Axis Labels */}
                <text x={pad.left - 8} y={pad.top + 10} textAnchor="end" className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-mono">
                  {stats.maxY.toFixed(1)}
                </text>
                <text x={pad.left - 8} y={height - pad.bottom} textAnchor="end" className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-mono">
                  {stats.minY.toFixed(1)}
                </text>
                <text x={pad.left} y={height - pad.bottom + 14} textAnchor="start" className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-mono">
                  {stats.minX.toFixed(1)}
                </text>
                <text x={width - pad.right} y={height - pad.bottom + 14} textAnchor="end" className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-mono">
                  {stats.maxX.toFixed(1)}
                </text>

                {/* Plot Data */}
                {plotType === "line" && polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {plotType === "bar" &&
                  points.map((p, idx) => {
                    const bx = toSvgX(p.x) - 4;
                    const by = toSvgY(p.y);
                    const bH = height - pad.bottom - by;
                    return (
                      <rect
                        key={idx}
                        x={bx}
                        y={by}
                        width="8"
                        height={Math.max(2, bH)}
                        fill="#0d9488"
                        rx="2"
                        className="opacity-80 hover:opacity-100"
                      />
                    );
                  })}

                {points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={toSvgX(p.x)}
                    cy={toSvgY(p.y)}
                    r="4"
                    fill="#0f766e"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-transform hover:scale-150 cursor-pointer"
                  >
                    <title>{`(${p.x}, ${p.y})`}</title>
                  </circle>
                ))}
              </svg>
            </div>
          </div>
        )}

        {view === "table" && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 dark:border-white/6">
            <table className="w-full text-left text-[12px] font-mono">
              <thead className="bg-zinc-100 dark:bg-white/4 text-zinc-600 dark:text-zinc-300">
                <tr>
                  <th className="p-2 border-b border-zinc-200 dark:border-white/6">{xLabel}</th>
                  <th className="p-2 border-b border-zinc-200 dark:border-white/6">{yLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/4">
                {points.map((p, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/2">
                    <td className="p-2">{p.x}</td>
                    <td className="p-2 font-semibold text-teal-600 dark:text-teal-400">{p.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "raw" && (
          <div className="space-y-2">
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                if (onUpdateCsv) onUpdateCsv(e.target.value);
              }}
              rows={5}
              placeholder="x, y"
              className="w-full rounded-xl border border-zinc-200 dark:border-white/8 bg-white dark:bg-black/30 p-2.5 text-[12px] font-mono text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
            />
          </div>
        )}
      </div>
    </div>
  );
}
