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

  // ── Mathematics: Waves, Distributions & Transforms ──
  {
    name: "Standard Gaussian Bell Curve",
    discipline: "Mathematics",
    category: "Statistics & Probability",
    latex: "f(x) = \\frac{1}{\\sqrt{2\\pi a^2}} e^{-\\frac{x^2}{2a^2}}",
    mathExpr: "(1 / (sqrt(2 * pi) * a)) * exp(- (x^2) / (2 * a^2))",
    defaultXMin: -4,
    defaultXMax: 4,
    paramA: { name: "Standard Deviation (σ)", value: 1, min: 0.2, max: 3, step: 0.1 },
  },
  {
    name: "Lorentzian (Cauchy) Peak",
    discipline: "Mathematics",
    category: "Spectral Distribution",
    latex: "L(x) = \\frac{1}{\\pi} \\frac{\\gamma}{x^2 + \\gamma^2}",
    mathExpr: "(1 / pi) * (a / (x^2 + a^2 + 0.001))",
    defaultXMin: -5,
    defaultXMax: 5,
    paramA: { name: "HWHM Width (γ)", value: 0.5, min: 0.1, max: 2, step: 0.05 },
  },
  {
    name: "Airy Disk Diffraction",
    discipline: "Mathematics",
    category: "Special Functions",
    latex: "I(x) = \\left(\\frac{2 J_1(x)}{x}\\right)^2 \\approx \\left(\\frac{\\sin(a x) - a x \\cos(a x)}{(a x)^2}\\right)^2",
    mathExpr: "((sin(a * max(abs(x), 0.01)) - a * max(abs(x), 0.01) * cos(a * max(abs(x), 0.01))) / (a * max(abs(x), 0.01))^2)^2",
    defaultXMin: -8,
    defaultXMax: 8,
    paramA: { name: "Aperture Scale (a)", value: 1, min: 0.3, max: 3, step: 0.1 },
  },
  {
    name: "Logistic Growth Sigmoid",
    discipline: "Mathematics",
    category: "Differential Models",
    latex: "P(t) = \\frac{L}{1 + e^{-k(t - t_0)}}",
    mathExpr: "a / (1 + exp(-b * (x - 2)))",
    defaultXMin: -4,
    defaultXMax: 8,
    paramA: { name: "Carrying Capacity (L)", value: 10, min: 2, max: 20, step: 1 },
    paramB: { name: "Growth Rate (k)", value: 1, min: 0.2, max: 3, step: 0.1 },
  },

  // ── Astrophysics: Radiation & Relativity ──
  {
    name: "Planck Blackbody Radiation",
    discipline: "Astrophysics",
    category: "Radiative Transfer",
    latex: "B_\\lambda(T) = \\frac{2hc^2}{\\lambda^5} \\frac{1}{e^{\\frac{hc}{\\lambda k_B T}} - 1}",
    mathExpr: "(1 / (max(x, 0.1)^5)) / (exp(a / max(x, 0.1)) - 1 + 0.0001)",
    defaultXMin: 0.1,
    defaultXMax: 8,
    paramA: { name: "Temperature Factor (a)", value: 2.5, min: 0.5, max: 6, step: 0.2 },
  },
  {
    name: "Schwarzschild Effective Potential",
    discipline: "Astrophysics",
    category: "General Relativity",
    latex: "V_{\\text{eff}}(r) = -\\frac{M}{r} + \\frac{L^2}{2r^2} - \\frac{M L^2}{r^3}",
    mathExpr: "-1 / max(x, 0.5) + a^2 / (2 * max(x, 0.5)^2) - a^2 / max(x, 0.5)^3",
    defaultXMin: 0.8,
    defaultXMax: 10,
    paramA: { name: "Angular Momentum (L)", value: 3.5, min: 1.5, max: 6, step: 0.2 },
  },
];

function evaluateExpression(expr: string, x: number, a: number, b: number): number {
  try {
    let sanitized = expr
      .replace(/pi/gi, String(Math.PI))
      .replace(/\be\b/g, String(Math.E))
      .replace(/exp/g, "Math.exp")
      .replace(/sqrt/g, "Math.sqrt")
      .replace(/abs/g, "Math.abs")
      .replace(/cos/g, "Math.cos")
      .replace(/sin/g, "Math.sin")
      .replace(/tan/g, "Math.tan")
      .replace(/log/g, "Math.log10")
      .replace(/ln/g, "Math.log")
      .replace(/\^/g, "**")
      .replace(/\bmax\b/g, "Math.max")
      .replace(/\bmin\b/g, "Math.min");

    sanitized = sanitized.replace(/([0-9])([a-zA-Z])/g, "$1 * $2");
    sanitized = sanitized.replace(/\bx\b/g, `(${x})`);
    sanitized = sanitized.replace(/\ba\b/g, `(${a})`);
    sanitized = sanitized.replace(/\bb\b/g, `(${b})`);

    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const val = new Function(`return ${sanitized}`)();
    return typeof val === "number" && !isNaN(val) && isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

export default function EquationGraphVisualizer() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");
  const [selectedPreset, setSelectedPreset] = useState<PresetEquation>(RESEARCH_PRESETS[0]);
  const [customEquationInput, setCustomEquationInput] = useState<string>(RESEARCH_PRESETS[0].mathExpr);
  const [latexFormulaInput, setLatexFormulaInput] = useState<string>(RESEARCH_PRESETS[0].latex);

  const [paramA, setParamA] = useState<number>(RESEARCH_PRESETS[0].paramA.value);
  const [paramB, setParamB] = useState<number>(RESEARCH_PRESETS[0].paramB?.value ?? 1);

  const [xMin, setXMin] = useState<number>(RESEARCH_PRESETS[0].defaultXMin);
  const [xMax, setXMax] = useState<number>(RESEARCH_PRESETS[0].defaultXMax);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const selectPreset = (p: PresetEquation) => {
    setSelectedPreset(p);
    setCustomEquationInput(p.mathExpr);
    setLatexFormulaInput(p.latex);
    setParamA(p.paramA.value);
    setParamB(p.paramB?.value ?? 1);
    setXMin(p.defaultXMin);
    setXMax(p.defaultXMax);
  };

  const points = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const steps = 300;
    const dx = (xMax - xMin) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      const y = evaluateExpression(customEquationInput, x, paramA, paramB);
      pts.push({ x, y });
    }
    return pts;
  }, [customEquationInput, paramA, paramB, xMin, xMax]);

  const { minY, maxY } = useMemo(() => {
    if (!points.length) return { minY: -1, maxY: 1 };
    let min = Infinity;
    let max = -Infinity;
    points.forEach((p) => {
      if (p.y < min) min = p.y;
      if (p.y > max) max = p.y;
    });
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const margin = (max - min) * 0.15 || 0.5;
    return { minY: min - margin, maxY: max + margin };
  }, [points]);

  const svgW = 600;
  const svgH = 260;
  const pad = { top: 25, right: 30, bottom: 35, left: 50 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const toSvgX = (x: number) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const toSvgY = (y: number) => pad.top + ((maxY - y) / (maxY - minY)) * plotH;

  const polylineStr = useMemo(() => {
    return points
      .map((p) => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`)
      .join(" ");
  }, [points, xMin, xMax, minY, maxY]);

  const copyLatexFormula = (latex: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 1500);
  };

  const exportImage = (format: "png" | "svg") => {
    if (!svgRef.current) return;
    if (format === "svg") {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgRef.current);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPreset.name.replace(/\s+/g, "_")}.svg`;
      a.click();
    } else {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgRef.current);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = svgW * 2;
        canvas.height = svgH * 2;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = `${selectedPreset.name.replace(/\s+/g, "_")}.png`;
          a.click();
        }
      };
      img.src = url;
    }
  };

  const filteredPresets = RESEARCH_PRESETS.filter(
    (p) => selectedDiscipline === "All" || p.discipline === selectedDiscipline
  );

  return (
    <div className="space-y-3.5 text-(ink)">
      {/* Discipline Category Filter & Preset Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-mono no-scrollbar">
          <span className="text-[10px] uppercase font-mono text-(muted) mr-1 shrink-0">
            Discipline:
          </span>
          {["All", "Physics", "Chemistry", "Mathematics", "Astrophysics"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDiscipline(d)}
              className={cn(
                "rounded-md px-2 py-0.5 transition-all cursor-pointer shrink-0 font-medium border",
                selectedDiscipline === d
                  ? "bg-(ink) text-(bg) border-(ink)"
                  : "bg-(panel-2) text-(muted) border-(line) hover:text-(ink)"
              )}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Model Chips */}
        <div className="flex flex-wrap items-center gap-1 max-h-24 overflow-y-auto pr-1">
          {filteredPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => selectPreset(preset)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-mono transition-all cursor-pointer border",
                selectedPreset.name === preset.name
                  ? "bg-(ink) text-(bg) border-(ink)"
                  : "bg-(panel-2) text-(muted) border-(line) hover:text-(ink)"
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editable Custom Formula Input Bar */}
      <div className="rounded-xl border border-(line) bg-(panel-2) p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-[10.5px] font-mono uppercase text-(muted) font-bold flex items-center gap-1.5">
            <Sparkles className="size-3" />
            <span>Formula f(x, a, b)</span>
          </span>
          <span className="text-[10px] font-mono text-(ink3)">
            sin, cos, tan, exp, ln, sqrt, ^, abs, pi, e
          </span>
        </div>

        <Input
          value={customEquationInput}
          onChange={(e) => setCustomEquationInput(e.target.value)}
          placeholder="Type formula, e.g. sin(a * x) * exp(-b * x^2)"
          className="h-8.5 text-[13px] font-mono rounded-lg bg-(bg) border-(line)"
        />

        {/* Live LaTeX preview */}
        <div className="pt-1 border-t border-(line) text-[12.5px]">
          <MathRenderer text={`$$y = ${latexFormulaInput || customEquationInput}$$`} displayMode={true} />
        </div>
      </div>

      {/* Parameter Sliders */}
      <div className="flex flex-wrap items-center gap-4 bg-(panel-2) rounded-xl border border-(line) p-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-(muted) whitespace-nowrap">
            A: <b className="text-(ink)">{paramA}</b>
          </span>
          <input
            type="range"
            min={-5}
            max={10}
            step={0.05}
            value={paramA}
            onChange={(e) => setParamA(parseFloat(e.target.value))}
            className="w-24 accent-(ink) cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-(muted) whitespace-nowrap">
            B: <b className="text-(ink)">{paramB}</b>
          </span>
          <input
            type="range"
            min={-5}
            max={10}
            step={0.1}
            value={paramB}
            onChange={(e) => setParamB(parseFloat(e.target.value))}
            className="w-24 accent-(ink) cursor-pointer"
          />
        </div>
      </div>

      {/* SVG Interactive Wave Visualizer */}
      <div className="relative rounded-xl border border-(line) bg-[#000000] p-2 overflow-hidden">
        {/* Action overlay */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-lg p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="View in Dialog"
          >
            <Maximize2 className="size-3" />
            <span className="hidden sm:inline">Dialog</span>
          </button>
          <button
            type="button"
            onClick={() => exportImage("png")}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Download PNG"
          >
            <Download className="size-3" />
            <span>PNG</span>
          </button>
          <button
            type="button"
            onClick={() => exportImage("svg")}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Download SVG"
          >
            <Download className="size-3" />
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
          <rect width={svgW} height={svgH} fill="#000000" rx="8" />

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
                stroke="#222222"
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
                stroke="#222222"
                strokeDasharray="2 3"
                strokeWidth="1"
              />
            );
          })}

          {/* Axes */}
          {minY <= 0 && maxY >= 0 && (
            <line
              x1={pad.left}
              y1={toSvgY(0)}
              x2={svgW - pad.right}
              y2={toSvgY(0)}
              stroke="#444444"
              strokeWidth="1.5"
            />
          )}
          {xMin <= 0 && xMax >= 0 && (
            <line
              x1={toSvgX(0)}
              y1={pad.top}
              x2={toSvgX(0)}
              y2={svgH - pad.bottom}
              stroke="#444444"
              strokeWidth="1.5"
            />
          )}

          {/* Axis numeric ticks */}
          <text x={pad.left - 6} y={pad.top + 8} textAnchor="end" fill="#666666" fontSize="9" fontFamily="monospace">
            {maxY.toFixed(2)}
          </text>
          <text x={pad.left - 6} y={svgH - pad.bottom} textAnchor="end" fill="#666666" fontSize="9" fontFamily="monospace">
            {minY.toFixed(2)}
          </text>
          <text x={pad.left} y={svgH - pad.bottom + 14} textAnchor="start" fill="#666666" fontSize="9" fontFamily="monospace">
            {xMin.toFixed(1)}
          </text>
          <text x={svgW - pad.right} y={svgH - pad.bottom + 14} textAnchor="end" fill="#666666" fontSize="9" fontFamily="monospace">
            {xMax.toFixed(1)}
          </text>

          {/* Crisp Monochrome Curve */}
          {polylineStr && (
            <polyline
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
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
                stroke="#666666"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={toSvgX(hoverCoord.x)}
                cy={toSvgY(hoverCoord.y)}
                r="4"
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth="1.5"
              />
              <rect
                x={Math.min(svgW - pad.right - 90, Math.max(pad.left, toSvgX(hoverCoord.x) - 45))}
                y={Math.max(pad.top, toSvgY(hoverCoord.y) - 26)}
                width="84"
                height="18"
                rx="4"
                fill="#111111"
                stroke="#333333"
              />
              <text
                x={Math.min(svgW - pad.right - 48, Math.max(pad.left + 42, toSvgX(hoverCoord.x)))}
                y={Math.max(pad.top + 12, toSvgY(hoverCoord.y) - 14)}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontFamily="monospace"
              >
                {`(${hoverCoord.x.toFixed(2)}, ${hoverCoord.y.toFixed(2)})`}
              </text>
            </g>
          )}
        </svg>

        {/* Domain Zoom controls */}
        <div className="flex items-center justify-between pt-1.5 px-1 text-[10.5px] font-mono text-(muted)">
          <span>Domain: [{xMin}, {xMax}]</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setXMin((v) => v * 0.8);
                setXMax((v) => v * 0.8);
              }}
              className="rounded border border-white/10 px-1.5 py-0.2 hover:bg-white/10 text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="size-2.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setXMin((v) => v * 1.25);
                setXMax((v) => v * 1.25);
              }}
              className="rounded border border-white/10 px-1.5 py-0.2 hover:bg-white/10 text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="size-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Equation Studio Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] gap-0 p-0 overflow-hidden rounded-2xl border border-(line) bg-(panel) shadow-2xl text-(ink) flex flex-col"
        >
          {/* Dialog Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-(line)">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg border border-(line) bg-(panel-2) text-(ink)">
                <Activity className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-medium tracking-tight text-(ink)">
                  Equation Studio &amp; Wave Visualizer
                </DialogTitle>
                <DialogDescription className="text-[11.5px] text-(muted)">
                  Interactive multi-disciplinary function modeler with LaTeX rendering
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg p-1.5 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Dialog Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 max-h-[calc(90vh-80px)]">
            {/* Equation & Formula Card */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl border border-(line) bg-(panel-2) p-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-mono uppercase bg-(bg) text-(muted) border border-(line) px-2 py-0.5 rounded">
                    {selectedPreset.discipline} · {selectedPreset.category}
                  </span>
                  <span className="text-[13px] font-medium text-(ink)">{selectedPreset.name}</span>
                </div>
                <div className="text-[14px] text-(ink) pt-1 overflow-x-auto no-scrollbar">
                  <MathRenderer text={`$$${latexFormulaInput || selectedPreset.latex}$$`} displayMode={true} />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyLatexFormula(latexFormulaInput || selectedPreset.latex)}
                  className="rounded-lg border-(line) text-xs text-(muted) hover:text-(ink)"
                >
                  {copiedLatex ? <Check className="size-3 mr-1.5 text-emerald-500" /> : <Copy className="size-3 mr-1.5" />}
                  {copiedLatex ? "Copied" : "Copy LaTeX"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportImage("png")}
                  className="rounded-lg border-(line) text-xs text-(muted) hover:text-(ink)"
                >
                  <Download className="size-3 mr-1.5" /> PNG
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportImage("svg")}
                  className="rounded-lg border-(line) text-xs text-(muted) hover:text-(ink)"
                >
                  <Download className="size-3 mr-1.5" /> SVG
                </Button>
              </div>
            </div>

            {/* Presets Catalog */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-(muted) block">
                Preset Equation Catalog
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredPresets.map((p) => {
                  const isSelected = selectedPreset.name === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => selectPreset(p)}
                      className={cn(
                        "flex flex-col text-left justify-between rounded-lg border p-2.5 transition-all cursor-pointer",
                        isSelected
                          ? "border-(ink) bg-(accent-soft)"
                          : "border-(line) bg-(bg) hover:border-(line-strong) hover:bg-(panel)"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-(ink) truncate">
                          {p.name}
                        </span>
                        <span className="text-[9.5px] font-mono text-(muted) uppercase">
                          {p.discipline}
                        </span>
                      </div>
                      <div className="mt-1 text-[11.5px] text-(muted) font-mono">
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
