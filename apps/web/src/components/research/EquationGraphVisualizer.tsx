import { useMemo, useRef, useState } from "react";
import { Activity, Download, Layers, RefreshCw, Sliders, Sparkles, ZoomIn, ZoomOut, Check, ChevronDown, Maximize2, Copy, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MathRenderer from "./MathRenderer";
import { cn } from "@/lib/utils";

interface PresetEquation {
  name: string;
  discipline: "Physics" | "Chemistry" | "Mathematics" | "Astrophysics";
  category: string;
  latex: string;
  mathExpr: string;
  defaultXMin: number;
  defaultXMax: number;
  paramA: { name: string; value: number; min: number; max: number; step: number };
  paramB?: { name: string; value: number; min: number; max: number; step: number };
}

export const RESEARCH_PRESETS: PresetEquation[] = [
  // ── Physics: Quantum & Optics ──
  {
    name: "Gaussian Wavepacket",
    discipline: "Physics",
    category: "Quantum Mechanics",
    latex: "\\psi(x) = e^{-a x^2} \\cos(k x)",
    mathExpr: "exp(-a * x^2) * cos(b * x)",
    defaultXMin: -5,
    defaultXMax: 5,
    paramA: { name: "Width (a)", value: 0.5, min: 0.1, max: 2, step: 0.05 },
    paramB: { name: "Wavenumber (k)", value: 4, min: 0, max: 10, step: 0.2 },
  },
  {
    name: "Harmonic Oscillator (ψ₁)",
    discipline: "Physics",
    category: "Quantum Mechanics",
    latex: "\\psi_1(x) = \\sqrt{2a} \\cdot x \\cdot e^{-a x^2 / 2}",
    mathExpr: "sqrt(2 * a) * x * exp(-a * x^2 / 2)",
    defaultXMin: -4,
    defaultXMax: 4,
    paramA: { name: "Frequency (a)", value: 1, min: 0.2, max: 3, step: 0.1 },
  },
  {
    name: "Double-Slit Diffraction",
    discipline: "Physics",
    category: "Optics",
    latex: "I(\\theta) = \\cos^2(k x) \\cdot \\left(\\frac{\\sin(a x)}{a x}\\right)^2",
    mathExpr: "cos(b * x)^2 * (sin(a * max(abs(x), 0.001)) / (a * max(abs(x), 0.001)))^2",
    defaultXMin: -6,
    defaultXMax: 6,
    paramA: { name: "Slit Width (a)", value: 1, min: 0.2, max: 3, step: 0.1 },
    paramB: { name: "Slit Separation (k)", value: 3, min: 1, max: 8, step: 0.2 },
  },
  {
    name: "Damped Harmonic Oscillator",
    discipline: "Physics",
    category: "Classical Mechanics",
    latex: "x(t) = e^{-\\gamma t} \\cos(\\omega t)",
    mathExpr: "exp(-a * x) * cos(b * x)",
    defaultXMin: 0,
    defaultXMax: 10,
    paramA: { name: "Damping (γ)", value: 0.3, min: 0, max: 1, step: 0.05 },
    paramB: { name: "Frequency (ω)", value: 3, min: 0.5, max: 8, step: 0.1 },
  },
  {
    name: "Resonance Amplitude Curve",
    discipline: "Physics",
    category: "Classical Mechanics",
    latex: "A(\\omega) = \\frac{1}{\\sqrt{(1 - \\omega^2)^2 + (2\\gamma \\omega)^2}}",
    mathExpr: "1 / sqrt((1 - x^2)^2 + (2 * a * x)^2 + 0.001)",
    defaultXMin: 0,
    defaultXMax: 3,
    paramA: { name: "Damping (γ)", value: 0.15, min: 0.02, max: 0.6, step: 0.02 },
  },

  // ── Chemistry: Kinetics & Thermodynamics ──
  {
    name: "Michaelis-Menten Kinetics",
    discipline: "Chemistry",
    category: "Biochemistry & Catalysis",
    latex: "v = \\frac{V_{\\max} [S]}{K_m + [S]}",
    mathExpr: "(a * x) / (b + x)",
    defaultXMin: 0,
    defaultXMax: 10,
    paramA: { name: "V_max (a)", value: 5, min: 1, max: 15, step: 0.5 },
    paramB: { name: "K_m (b)", value: 2, min: 0.2, max: 5, step: 0.2 },
  },
  {
    name: "Arrhenius Reaction Rate",
    discipline: "Chemistry",
    category: "Physical Chemistry",
    latex: "k(T) = A \\cdot e^{-E_a / (R T)}",
    mathExpr: "exp(-a / max(x, 0.1))",
    defaultXMin: 0.1,
    defaultXMax: 5,
    paramA: { name: "Activation Barrier (E_a/R)", value: 2, min: 0.2, max: 6, step: 0.2 },
  },
  {
    name: "Morse Bond Potential",
    discipline: "Chemistry",
    category: "Molecular Physics",
    latex: "V(r) = D_e \\left( 1 - e^{-a (r - r_e)} \\right)^2",
    mathExpr: "a * (1 - exp(-b * (x - 1)))^2",
    defaultXMin: 0.4,
    defaultXMax: 4,
    paramA: { name: "Dissociation (D_e)", value: 2, min: 0.5, max: 5, step: 0.2 },
    paramB: { name: "Stiffness (a)", value: 1.5, min: 0.5, max: 3, step: 0.1 },
  },
  {
    name: "Acid-Base Titration Sigmoid",
    discipline: "Chemistry",
    category: "Analytical Chemistry",
    latex: "pH(V) = 7 + \\frac{1}{a} \\ln\\left(\\frac{x}{b - x}\\right)",
    mathExpr: "7 + 1.5 * Math.log(max(x, 0.01) / max(b - x, 0.01))",
    defaultXMin: 0.1,
    defaultXMax: 9.9,
    paramA: { name: "Slope (a)", value: 1.5, min: 0.5, max: 4, step: 0.2 },
    paramB: { name: "Equivalence Vol (V_eq)", value: 10, min: 5, max: 15, step: 0.5 },
  },

  // ── Astrophysics & Relativity ──
  {
    name: "Planck Blackbody Radiation",
    discipline: "Astrophysics",
    category: "Thermodynamics",
    latex: "I(\\lambda) = \\frac{2hc^2}{\\lambda^5 \\left(e^{\\frac{hc}{\\lambda k_B T}} - 1\\right)}",
    mathExpr: "1 / (x^5 * (exp(a / max(x, 0.2)) - 1))",
    defaultXMin: 0.2,
    defaultXMax: 5,
    paramA: { name: "Temperature scale (a)", value: 2, min: 0.5, max: 5, step: 0.2 },
  },
  {
    name: "Schwarzschild Effective Potential",
    discipline: "Astrophysics",
    category: "General Relativity",
    latex: "V_{eff}(r) = -\\frac{M}{r} + \\frac{L^2}{2r^2} - \\frac{M L^2}{r^3}",
    mathExpr: "-1 / max(x, 0.5) + a / (2 * max(x, 0.5)^2) - a / max(x, 0.5)^3",
    defaultXMin: 0.6,
    defaultXMax: 10,
    paramA: { name: "Angular Momentum (L²)", value: 4, min: 1, max: 10, step: 0.5 },
  },

  // ── Mathematics & Analysis ──
  {
    name: "Sinc Function sinc(x)",
    discipline: "Mathematics",
    category: "Signal Processing",
    latex: "f(x) = \\frac{\\sin(a x)}{a x}",
    mathExpr: "sin(a * max(abs(x), 0.0001)) / (a * max(abs(x), 0.0001))",
    defaultXMin: -10,
    defaultXMax: 10,
    paramA: { name: "Frequency (a)", value: 1, min: 0.2, max: 4, step: 0.1 },
  },
  {
    name: "Logistic Sigmoid",
    discipline: "Mathematics",
    category: "Statistics & Machine Learning",
    latex: "\\sigma(x) = \\frac{1}{1 + e^{-a x}}",
    mathExpr: "1 / (1 + exp(-a * x))",
    defaultXMin: -6,
    defaultXMax: 6,
    paramA: { name: "Growth Rate (a)", value: 1, min: 0.2, max: 3, step: 0.1 },
  },
  {
    name: "Fourier Square Wave (3 Terms)",
    discipline: "Mathematics",
    category: "Fourier Analysis",
    latex: "f(x) = \\sin(x) + \\frac{1}{3}\\sin(3x) + \\frac{1}{5}\\sin(5x)",
    mathExpr: "sin(x) + (1/3)*sin(3*x) + (1/5)*sin(5*x)",
    defaultXMin: -6.28,
    defaultXMax: 6.28,
    paramA: { name: "Scale (a)", value: 1, min: 0.5, max: 2, step: 0.1 },
  },
  {
    name: "Cubic Polynomial Catastrophe",
    discipline: "Mathematics",
    category: "Algebra",
    latex: "f(x) = x^3 - a x + b",
    mathExpr: "x^3 - a * x + b",
    defaultXMin: -3,
    defaultXMax: 3,
    paramA: { name: "Linear (a)", value: 3, min: -5, max: 8, step: 0.5 },
    paramB: { name: "Offset (b)", value: 0, min: -4, max: 4, step: 0.5 },
  },
];

/**
 * Parses user input formula into valid executable JS Math expression.
 */
function compileMathExpression(expr: string): (x: number, a: number, b: number) => number {
  try {
    // Replace standard math functions: sin, cos, tan, exp, log, ln, sqrt, abs, sinh, cosh, tanh, asin, acos, atan, pi, e
    let code = expr
      .replace(/\^/g, "**")
      .replace(/\bpi\b/gi, "Math.PI")
      .replace(/\be\b/g, "Math.E")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\btan\b/g, "Math.tan")
      .replace(/\basin\b/g, "Math.asin")
      .replace(/\bacos\b/g, "Math.acos")
      .replace(/\batan\b/g, "Math.atan")
      .replace(/\bsinh\b/g, "Math.sinh")
      .replace(/\bcosh\b/g, "Math.cosh")
      .replace(/\btanh\b/g, "Math.tanh")
      .replace(/\bexp\b/g, "Math.exp")
      .replace(/\bln\b/g, "Math.log")
      .replace(/\blog\b/g, "Math.log10")
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\bmax\b/g, "Math.max")
      .replace(/\bmin\b/g, "Math.min");

    // Clean multiple Math.Math occurrences
    code = code.replace(/Math\.Math\./g, "Math.");

    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    return new Function("x", "a", "b", `try { return ${code}; } catch(e) { return 0; }`) as any;
  } catch {
    return () => 0;
  }
}

export default function EquationGraphVisualizer() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");
  const [selectedPreset, setSelectedPreset] = useState<PresetEquation>(RESEARCH_PRESETS[0]);
  const [customEquationInput, setCustomEquationInput] = useState<string>(RESEARCH_PRESETS[0].mathExpr);
  const [latexFormulaInput, setLatexFormulaInput] = useState<string>(RESEARCH_PRESETS[0].latex);

  const [xMin, setXMin] = useState<number>(RESEARCH_PRESETS[0].defaultXMin);
  const [xMax, setXMax] = useState<number>(RESEARCH_PRESETS[0].defaultXMax);
  const [paramA, setParamA] = useState<number>(RESEARCH_PRESETS[0].paramA.value);
  const [paramB, setParamB] = useState<number>(RESEARCH_PRESETS[0].paramB?.value || 1);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  function copyLatexFormula(latex: string) {
    navigator.clipboard.writeText(latex);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 1500);
  }

  function selectPreset(p: PresetEquation) {
    setSelectedPreset(p);
    setCustomEquationInput(p.mathExpr);
    setLatexFormulaInput(p.latex);
    setXMin(p.defaultXMin);
    setXMax(p.defaultXMax);
    setParamA(p.paramA.value);
    setParamB(p.paramB?.value || 1);
  }

  // Calculate curve points
  const { points, minY, maxY } = useMemo(() => {
    const N = 350;
    const dx = (xMax - xMin) / N;
    const pts: Array<{ x: number; y: number }> = [];
    const fn = compileMathExpression(customEquationInput);

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i <= N; i++) {
      const x = xMin + i * dx;
      const y = fn(x, paramA, paramB);
      if (!isNaN(y) && isFinite(y)) {
        pts.push({ x, y });
        if (y < min) min = y;
        if (y > max) max = y;
      }
    }

    if (!isFinite(min) || !isFinite(max) || min === max) {
      min = -1;
      max = 1;
    }

    const yPad = (max - min) * 0.1 || 0.5;
    return {
      points: pts,
      minY: min - yPad,
      maxY: max + yPad,
    };
  }, [customEquationInput, xMin, xMax, paramA, paramB]);

  const svgW = 600;
  const svgH = 280;
  const pad = { top: 25, right: 30, bottom: 40, left: 55 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  function toSvgX(x: number) {
    return pad.left + ((x - xMin) / (xMax - xMin)) * plotW;
  }

  function toSvgY(y: number) {
    return pad.top + plotH - ((y - minY) / (maxY - minY)) * plotH;
  }

  const polylineStr = points.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ");

  // Export SVG / PNG
  function exportImage(type: "svg" | "png") {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });

    if (type === "svg") {
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `curve_plot_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = svgW * 2;
    canvas.height = svgH * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `curve_plot_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  const filteredPresets = RESEARCH_PRESETS.filter(
    (p) => selectedDiscipline === "All" || p.discipline === selectedDiscipline
  );

  return (
    <div className="space-y-4">
      {/* Discipline Category Filter & Preset Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
          <span className="text-[10.5px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mr-1 shrink-0">
            Discipline:
          </span>
          {["All", "Physics", "Chemistry", "Mathematics", "Astrophysics"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDiscipline(d)}
              className={cn(
                "rounded-lg px-2.5 py-1 transition-all cursor-pointer shrink-0 font-medium",
                selectedDiscipline === d
                  ? "bg-purple-600 text-white font-bold shadow-xs"
                  : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
              )}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Model Chips */}
        <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1">
          {filteredPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => selectPreset(preset)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer shadow-2xs",
                selectedPreset.name === preset.name
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
                  : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editable Custom Formula Input Bar */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10 p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            <span>Custom Equation Formula f(x, a, b)</span>
          </span>
          <span className="text-[10.5px] font-mono text-zinc-400 dark:text-zinc-500">
            Supports: sin, cos, tan, exp, ln, sqrt, ^, abs, pi, e
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={customEquationInput}
            onChange={(e) => setCustomEquationInput(e.target.value)}
            placeholder="Type any formula, e.g. sin(a * x) * exp(-b * x^2) or x^3 - 3*x"
            className="h-10 text-[13.5px] font-mono rounded-xl bg-white dark:bg-[#15151c] border-purple-500/25"
          />
        </div>

        {/* Live LaTeX preview of formula */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-500/15 text-[13px]">
          <div className="text-zinc-900 dark:text-zinc-100">
            <MathRenderer text={`$$y = ${latexFormulaInput || customEquationInput}$$`} displayMode={true} />
          </div>
        </div>
      </div>

      {/* Parameter Sliders */}
      <div className="flex flex-wrap items-center gap-4 bg-zinc-50/80 dark:bg-[#1a1a20] rounded-xl border border-zinc-200/80 dark:border-white/[0.06] p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
            Parameter A: <b className="text-purple-600 dark:text-purple-400">{paramA}</b>
          </span>
          <input
            type="range"
            min={-5}
            max={10}
            step={0.05}
            value={paramA}
            onChange={(e) => setParamA(parseFloat(e.target.value))}
            className="w-28 accent-purple-600 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
            Parameter B: <b className="text-purple-600 dark:text-purple-400">{paramB}</b>
          </span>
          <input
            type="range"
            min={-5}
            max={10}
            step={0.1}
            value={paramB}
            onChange={(e) => setParamB(parseFloat(e.target.value))}
            className="w-28 accent-purple-600 cursor-pointer"
          />
        </div>
      </div>

      {/* SVG Interactive Wave Visualizer */}
      <div className="relative rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101014] p-3 shadow-sm overflow-hidden">
        {/* Action overlay */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/85 dark:bg-black/70 backdrop-blur-md rounded-xl p-1 border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer shadow-2xs"
            title="View full equation dialog with formula library"
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden sm:inline">View in Dialog</span>
          </button>
          <button
            type="button"
            onClick={() => exportImage("png")}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Download PNG image"
          >
            <Download className="size-3.5" />
            <span>PNG</span>
          </button>
          <button
            type="button"
            onClick={() => exportImage("svg")}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Download SVG vector"
          >
            <Download className="size-3.5" />
            <span>SVG</span>
          </button>
        </div>

        {/* Live SVG Graph */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normX = (mouseX / rect.width) * svgW;
            if (normX >= pad.left && normX <= svgW - pad.right) {
              const xVal = xMin + ((normX - pad.left) / plotW) * (xMax - xMin);
              const nearest = points.reduce((prev, curr) => (Math.abs(curr.x - xVal) < Math.abs(prev.x - xVal) ? curr : prev), points[0]);
              if (nearest) setHoverCoord({ x: nearest.x, y: nearest.y });
            }
          }}
          onMouseLeave={() => setHoverCoord(null)}
        >
          <rect width={svgW} height={svgH} fill="#101014" rx="12" />

          {/* Coordinate Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = pad.top + plotH * pct;
            return (
              <line
                key={`y-${pct}`}
                x1={pad.left}
                y1={y}
                x2={svgW - pad.right}
                y2={y}
                stroke="#27272a"
                strokeDasharray="2 3"
                strokeWidth="1"
              />
            );
          })}

          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const x = pad.left + plotW * pct;
            return (
              <line
                key={`x-${pct}`}
                x1={x}
                y1={pad.top}
                x2={x}
                y2={svgH - pad.bottom}
                stroke="#27272a"
                strokeDasharray="2 3"
                strokeWidth="1"
              />
            );
          })}

          {/* X = 0 and Y = 0 Zero axes */}
          {minY <= 0 && maxY >= 0 && (
            <line
              x1={pad.left}
              y1={toSvgY(0)}
              x2={svgW - pad.right}
              y2={toSvgY(0)}
              stroke="#52525b"
              strokeWidth="1.5"
            />
          )}
          {xMin <= 0 && xMax >= 0 && (
            <line
              x1={toSvgX(0)}
              y1={pad.top}
              x2={toSvgX(0)}
              y2={svgH - pad.bottom}
              stroke="#52525b"
              strokeWidth="1.5"
            />
          )}

          {/* Axis numeric ticks */}
          <text x={pad.left - 8} y={pad.top + 8} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
            {maxY.toFixed(2)}
          </text>
          <text x={pad.left - 8} y={svgH - pad.bottom} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
            {minY.toFixed(2)}
          </text>
          <text x={pad.left} y={svgH - pad.bottom + 16} textAnchor="start" fill="#71717a" fontSize="10" fontFamily="monospace">
            {xMin.toFixed(1)}
          </text>
          <text x={svgW - pad.right} y={svgH - pad.bottom + 16} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
            {xMax.toFixed(1)}
          </text>

          {/* Render Curve with vibrant gradient */}
          <defs>
            <linearGradient id="multiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {polylineStr && (
            <polyline
              fill="none"
              stroke="url(#multiGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />
          )}

          {/* Hover Crosshair / Tooltip */}
          {hoverCoord && (
            <g>
              <line
                x1={toSvgX(hoverCoord.x)}
                y1={pad.top}
                x2={toSvgX(hoverCoord.x)}
                y2={svgH - pad.bottom}
                stroke="#a855f7"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={toSvgX(hoverCoord.x)}
                cy={toSvgY(hoverCoord.y)}
                r="5"
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <rect
                x={Math.min(svgW - pad.right - 100, Math.max(pad.left, toSvgX(hoverCoord.x) - 45))}
                y={Math.max(pad.top, toSvgY(hoverCoord.y) - 30)}
                width="90"
                height="22"
                rx="6"
                fill="#18181b"
                stroke="#3f3f46"
              />
              <text
                x={Math.min(svgW - pad.right - 55, Math.max(pad.left + 45, toSvgX(hoverCoord.x)))}
                y={Math.max(pad.top + 14, toSvgY(hoverCoord.y) - 16)}
                textAnchor="middle"
                fill="#f4f4f5"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {`(${hoverCoord.x.toFixed(2)}, ${hoverCoord.y.toFixed(2)})`}
              </text>
            </g>
          )}
        </svg>

        {/* Domain Zoom controls */}
        <div className="flex items-center justify-between pt-2 px-1 text-[11.5px] font-mono text-zinc-500">
          <span>Domain: [{xMin}, {xMax}]</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setXMin((v) => v * 0.8);
                setXMax((v) => v * 0.8);
              }}
              className="rounded-md border border-zinc-200 dark:border-white/10 px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-white/10"
              title="Zoom In"
            >
              <ZoomIn className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setXMin((v) => v * 1.25);
                setXMax((v) => v * 1.25);
              }}
              className="rounded-md border border-zinc-200 dark:border-white/10 px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-white/10"
              title="Zoom Out"
            >
              <ZoomOut className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Equation & Wave Studio Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] gap-0 p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] shadow-2xl backdrop-blur-2xl text-zinc-900 dark:text-zinc-100 flex flex-col"
        >
          {/* Dialog Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <Activity className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Equation Studio &amp; Wave Visualizer
                </DialogTitle>
                <DialogDescription className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Interactive multi-disciplinary function modeler with LaTeX rendering
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="size-4.5" />
            </button>
          </div>

          {/* Dialog Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 max-h-[calc(90vh-80px)]">
            {/* Equation & Formula Hero Card */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10 p-4 shadow-xs">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold px-2 py-0.5 rounded-md">
                    {selectedPreset.discipline} · {selectedPreset.category}
                  </span>
                  <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{selectedPreset.name}</span>
                </div>
                <div className="text-[15px] text-zinc-900 dark:text-zinc-100 pt-1 overflow-x-auto no-scrollbar">
                  <MathRenderer text={`$$${latexFormulaInput || selectedPreset.latex}$$`} displayMode={true} />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyLatexFormula(latexFormulaInput || selectedPreset.latex)}
                  className="rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-300 hover:bg-purple-500/10 text-xs"
                >
                  {copiedLatex ? <Check className="size-3.5 mr-1.5 text-emerald-500" /> : <Copy className="size-3.5 mr-1.5" />}
                  {copiedLatex ? "Copied LaTeX!" : "Copy LaTeX"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportImage("png")}
                  className="rounded-xl border-zinc-200 dark:border-white/10 text-xs"
                >
                  <Download className="size-3.5 mr-1.5" /> PNG
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportImage("svg")}
                  className="rounded-xl border-zinc-200 dark:border-white/10 text-xs"
                >
                  <Download className="size-3.5 mr-1.5" /> SVG
                </Button>
              </div>
            </div>

            {/* Interactive Graph Canvas */}
            <div className="relative rounded-2xl border border-zinc-200 dark:border-white/10 bg-[#101014] p-3 shadow-inner overflow-hidden">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-auto select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const normX = (mouseX / rect.width) * svgW;
                  if (normX >= pad.left && normX <= svgW - pad.right) {
                    const xVal = xMin + ((normX - pad.left) / plotW) * (xMax - xMin);
                    const nearest = points.reduce((prev, curr) => (Math.abs(curr.x - xVal) < Math.abs(prev.x - xVal) ? curr : prev), points[0]);
                    if (nearest) setHoverCoord({ x: nearest.x, y: nearest.y });
                  }
                }}
                onMouseLeave={() => setHoverCoord(null)}
              >
                <rect width={svgW} height={svgH} fill="#101014" rx="12" />

                {/* Coordinate Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = pad.top + plotH * pct;
                  return (
                    <line key={`y-${pct}`} x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="#27272a" strokeDasharray="2 3" strokeWidth="1" />
                  );
                })}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const x = pad.left + plotW * pct;
                  return (
                    <line key={`x-${pct}`} x1={x} y1={pad.top} x2={x} y2={svgH - pad.bottom} stroke="#27272a" strokeDasharray="2 3" strokeWidth="1" />
                  );
                })}

                {/* Axis lines */}
                {minY <= 0 && maxY >= 0 && (
                  <line x1={pad.left} y1={toSvgY(0)} x2={svgW - pad.right} y2={toSvgY(0)} stroke="#52525b" strokeWidth="1.5" />
                )}
                {xMin <= 0 && xMax >= 0 && (
                  <line x1={toSvgX(0)} y1={pad.top} x2={toSvgX(0)} y2={svgH - pad.bottom} stroke="#52525b" strokeWidth="1.5" />
                )}

                {/* Axis Labels */}
                <text x={pad.left - 8} y={pad.top + 8} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
                  {maxY.toFixed(2)}
                </text>
                <text x={pad.left - 8} y={svgH - pad.bottom} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
                  {minY.toFixed(2)}
                </text>
                <text x={pad.left} y={svgH - pad.bottom + 16} textAnchor="start" fill="#71717a" fontSize="10" fontFamily="monospace">
                  {xMin.toFixed(1)}
                </text>
                <text x={svgW - pad.right} y={svgH - pad.bottom + 16} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
                  {xMax.toFixed(1)}
                </text>

                {/* Curve */}
                {polylineStr && (
                  <polyline
                    fill="none"
                    stroke="url(#multiGradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />
                )}

                {/* Hover Probe */}
                {hoverCoord && (
                  <g>
                    <line x1={toSvgX(hoverCoord.x)} y1={pad.top} x2={toSvgX(hoverCoord.x)} y2={svgH - pad.bottom} stroke="#a855f7" strokeDasharray="2 2" strokeWidth="1" />
                    <circle cx={toSvgX(hoverCoord.x)} cy={toSvgY(hoverCoord.y)} r="5" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
                    <rect
                      x={Math.min(svgW - pad.right - 100, Math.max(pad.left, toSvgX(hoverCoord.x) - 45))}
                      y={Math.max(pad.top, toSvgY(hoverCoord.y) - 30)}
                      width="90"
                      height="22"
                      rx="6"
                      fill="#18181b"
                      stroke="#3f3f46"
                    />
                    <text
                      x={Math.min(svgW - pad.right - 55, Math.max(pad.left + 45, toSvgX(hoverCoord.x)))}
                      y={Math.max(pad.top + 14, toSvgY(hoverCoord.y) - 16)}
                      textAnchor="middle"
                      fill="#f4f4f5"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {`(${hoverCoord.x.toFixed(2)}, ${hoverCoord.y.toFixed(2)})`}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Presets & Formulas Browser Grid in Dialog */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider font-mono text-zinc-500 dark:text-zinc-400">
                  Preset Equation Catalog
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-mono">
                  {["All", "Physics", "Chemistry", "Mathematics", "Astrophysics"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDiscipline(d)}
                      className={cn(
                        "rounded-lg px-2 py-0.5 transition-all cursor-pointer shrink-0 font-medium",
                        selectedDiscipline === d
                          ? "bg-purple-600 text-white font-bold"
                          : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {filteredPresets.map((p) => {
                  const isSelected = selectedPreset.name === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => selectPreset(p)}
                      className={cn(
                        "flex flex-col text-left justify-between rounded-xl border p-3 transition-all cursor-pointer",
                        isSelected
                          ? "border-purple-500/60 bg-purple-500/10 shadow-sm ring-1 ring-purple-500/30"
                          : "border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] hover:bg-zinc-100/70 dark:hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase">
                          {p.discipline}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[12px] text-zinc-700 dark:text-zinc-300 font-mono">
                        <MathRenderer text={`$$${p.latex}$$`} displayMode={false} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
