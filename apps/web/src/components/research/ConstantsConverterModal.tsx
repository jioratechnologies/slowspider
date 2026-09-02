"use client";

import { useState } from "react";
import { Activity, Atom, Calculator, Check, Copy, Layers, LineChart, PenTool, Pin, Search, Sparkles, X, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MathRenderer from "./MathRenderer";
import EquationGraphVisualizer from "./EquationGraphVisualizer";
import ScientificCalculator from "./ScientificCalculator";
import WhiteboardCanvas from "./WhiteboardCanvas";
import { cn } from "@/lib/utils";

interface PhysicalConstant {
  symbol: string;
  latex: string;
  name: string;
  category: "quantum" | "astrophysics" | "electromagnetism" | "thermodynamics" | "atomic";
  valueStr: string;
  unit: string;
  altValue?: string;
}

export const PHYSICAL_CONSTANTS: PhysicalConstant[] = [
  {
    symbol: "c",
    latex: "c",
    name: "Speed of light in vacuum",
    category: "astrophysics",
    valueStr: "299 792 458",
    unit: "m/s",
    altValue: "3.00 × 10⁸ m/s",
  },
  {
    symbol: "ħ",
    latex: "\\hbar",
    name: "Reduced Planck constant",
    category: "quantum",
    valueStr: "1.054571817 × 10⁻³⁴",
    unit: "J·s",
    altValue: "6.582119569 × 10⁻¹⁶ eV·s",
  },
  {
    symbol: "h",
    latex: "h",
    name: "Planck constant",
    category: "quantum",
    valueStr: "6.62607015 × 10⁻³⁴",
    unit: "J·s",
    altValue: "4.135667696 × 10⁻¹⁵ eV·s",
  },
  {
    symbol: "e",
    latex: "e",
    name: "Elementary charge",
    category: "electromagnetism",
    valueStr: "1.602176634 × 10⁻¹⁹",
    unit: "C",
  },
  {
    symbol: "kB",
    latex: "k_B",
    name: "Boltzmann constant",
    category: "thermodynamics",
    valueStr: "1.380649 × 10⁻²³",
    unit: "J/K",
    altValue: "8.617333262 × 10⁻⁵ eV/K",
  },
  {
    symbol: "G",
    latex: "G",
    name: "Gravitational constant",
    category: "astrophysics",
    valueStr: "6.67430 × 10⁻¹¹",
    unit: "m³·kg⁻¹·s⁻²",
  },
  {
    symbol: "me",
    latex: "m_e",
    name: "Electron mass",
    category: "quantum",
    valueStr: "9.1093837015 × 10⁻³¹",
    unit: "kg",
    altValue: "0.510998950 MeV/c²",
  },
  {
    symbol: "mp",
    latex: "m_p",
    name: "Proton mass",
    category: "atomic",
    valueStr: "1.67262192369 × 10⁻²⁷",
    unit: "kg",
    altValue: "938.272088 MeV/c²",
  },
  {
    symbol: "mn",
    latex: "m_n",
    name: "Neutron mass",
    category: "atomic",
    valueStr: "1.67492749804 × 10⁻²⁷",
    unit: "kg",
    altValue: "939.565420 MeV/c²",
  },
  {
    symbol: "ε0",
    latex: "\\varepsilon_0",
    name: "Vacuum permittivity",
    category: "electromagnetism",
    valueStr: "8.8541878128 × 10⁻¹²",
    unit: "F/m",
  },
  {
    symbol: "μ0",
    latex: "\\mu_0",
    name: "Vacuum permeability",
    category: "electromagnetism",
    valueStr: "1.25663706212 × 10⁻⁶",
    unit: "N/A²",
  },
  {
    symbol: "NA",
    latex: "N_A",
    name: "Avogadro constant",
    category: "thermodynamics",
    valueStr: "6.02214076 × 10²³",
    unit: "mol⁻¹",
  },
  {
    symbol: "R",
    latex: "R",
    name: "Molar gas constant",
    category: "thermodynamics",
    valueStr: "8.314462618",
    unit: "J/(mol·K)",
  },
  {
    symbol: "σ",
    latex: "\\sigma",
    name: "Stefan-Boltzmann constant",
    category: "thermodynamics",
    valueStr: "5.670374419 × 10⁻⁸",
    unit: "W/(m²·K⁴)",
  },
  {
    symbol: "R∞",
    latex: "R_\\infty",
    name: "Rydberg constant",
    category: "atomic",
    valueStr: "10 973 731.568160",
    unit: "m⁻¹",
    altValue: "13.605693122994 eV",
  },
  {
    symbol: "a0",
    latex: "a_0",
    name: "Bohr radius",
    category: "atomic",
    valueStr: "5.29177210903 × 10⁻¹¹",
    unit: "m",
    altValue: "0.529177 Å",
  },
  {
    symbol: "μB",
    latex: "\\mu_B",
    name: "Bohr magneton",
    category: "quantum",
    valueStr: "9.2740100783 × 10⁻²⁴",
    unit: "J/T",
    altValue: "5.7883818060 × 10⁻⁵ eV/T",
  },
  {
    symbol: "α",
    latex: "\\alpha",
    name: "Fine-structure constant",
    category: "quantum",
    valueStr: "7.2973525693 × 10⁻³",
    unit: "dimensionless",
    altValue: "≈ 1 / 137.035999084",
  },
  {
    symbol: "u",
    latex: "u",
    name: "Atomic mass unit (dalton)",
    category: "atomic",
    valueStr: "1.66053906660 × 10⁻²⁷",
    unit: "kg",
    altValue: "931.49410242 MeV/c²",
  },
  {
    symbol: "Φ0",
    latex: "\\Phi_0",
    name: "Magnetic flux quantum",
    category: "quantum",
    valueStr: "2.067833848 × 10⁻¹⁵",
    unit: "Wb",
  },
];

// Physical conversions
const C_SPEED = 299792458;
const H_PLANCK_EV = 4.135667696e-15;
const H_PLANCK_J = 6.62607015e-34;
const KB_EV = 8.617333262e-5;
const EV_TO_JOULES = 1.602176634e-19;

export function convertFromEv(ev: number) {
  if (ev <= 0 || isNaN(ev)) {
    return {
      eV: "0",
      nm: "0",
      THz: "0",
      K: "0",
      cmInv: "0",
      Joules: "0",
    };
  }

  const nm = (1239.841984 / ev).toFixed(2);
  const thz = (ev / H_PLANCK_EV / 1e12).toFixed(3);
  const kelvin = (ev / KB_EV).toFixed(2);
  const cmInv = (ev * 8065.544).toFixed(1);
  const joules = (ev * EV_TO_JOULES).toExponential(4);

  return {
    eV: ev.toPrecision(5),
    nm,
    THz: thz,
    K: kelvin,
    cmInv,
    Joules: joules,
  };
}

export function convertToEv(val: number, unit: "eV" | "nm" | "THz" | "K" | "cm-1" | "J"): number {
  if (val <= 0 || isNaN(val)) return 0;
  switch (unit) {
    case "eV":
      return val;
    case "nm":
      return 1239.841984 / val;
    case "THz":
      return val * 1e12 * H_PLANCK_EV;
    case "K":
      return val * KB_EV;
    case "cm-1":
      return val / 8065.544;
    case "J":
      return val / EV_TO_JOULES;
  }
}

export default function ConstantsConverterModal({
  open,
  onClose,
  onPinCalculator,
  onPinCanvas,
}: {
  open: boolean;
  onClose: () => void;
  onPinCalculator?: () => void;
  onPinCanvas?: () => void;
}) {
  const [tab, setTab] = useState<"constants" | "converter" | "graph" | "calculator" | "canvas">("constants");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Converter state
  const [energyEv, setEnergyEv] = useState<string>("1.5");
  const [convUnit, setConvUnit] = useState<"eV" | "nm" | "THz" | "K" | "cm-1" | "J">("eV");

  const evNum = convertToEv(parseFloat(energyEv) || 0, convUnit);
  const values = convertFromEv(evNum);

  const filteredConstants = PHYSICAL_CONSTANTS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.unit.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === "all" || c.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent 
        showCloseButton={false} 
        className="max-w-[94vw] sm:max-w-2xl gap-0 p-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18181c] shadow-2xl text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Atom className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Scientific Research Suite
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                Constants, multi-unit optics converter, equation visualizer, calculator &amp; canvas
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex overflow-x-auto border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 px-4 sm:px-6 pt-2 gap-2 sm:gap-4 no-scrollbar">
          <button
            type="button"
            onClick={() => setTab("constants")}
            className={cn(
              "pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0",
              tab === "constants"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <Sparkles className="size-4" />
            <span>Constants</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("converter")}
            className={cn(
              "pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0",
              tab === "converter"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <Zap className="size-4" />
            <span>Energy &amp; Optics</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("canvas")}
            className={cn(
              "pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0",
              tab === "canvas"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <PenTool className="size-4" />
            <span>Canvas Pad</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("graph")}
            className={cn(
              "pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0",
              tab === "graph"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <Activity className="size-4" />
            <span>Equation &amp; Waves</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("calculator")}
            className={cn(
              "pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0",
              tab === "calculator"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <Calculator className="size-4" />
            <span>Calculator</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-[72vh] overflow-y-auto space-y-4">
          {tab === "constants" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="size-3.5 absolute left-3 top-3 text-(muted)" />
                  <Input
                    placeholder="Search constant (e.g. Planck, c, mass, eV, charge)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8.5 h-9 rounded-lg border-(line) bg-(bg) text-[13px]"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-0.5 text-[11px] font-mono no-scrollbar">
                  {["all", "quantum", "electromagnetism", "astrophysics", "thermodynamics", "atomic"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCat(cat)}
                      className={cn(
                        "rounded-md px-2 py-1 capitalize transition-colors cursor-pointer shrink-0 border",
                        selectedCat === cat
                          ? "bg-(ink) text-(bg) border-(ink) font-medium"
                          : "bg-(panel-2) border-(line) text-(muted) hover:text-(ink)"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredConstants.map((c) => (
                  <div
                    key={c.symbol}
                    className="group flex flex-col justify-between rounded-lg border border-(line) bg-(bg) p-3 transition-all hover:border-(line-strong) hover:bg-(panel)"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded border border-(line) bg-(panel-2) font-mono font-bold text-[12px] text-(ink)">
                          {c.symbol}
                        </span>
                        <span className="text-[12.5px] font-medium text-(ink)">
                          {c.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(`${c.valueStr} ${c.unit}`, c.symbol)}
                        className="rounded p-1 text-(muted) opacity-0 group-hover:opacity-100 hover:bg-(accent-soft) hover:text-(ink) transition-all cursor-pointer"
                        title="Copy constant value"
                      >
                        {copiedId === c.symbol ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 pt-2 border-t border-(line) flex flex-col gap-0.5 font-mono text-[11.5px]">
                      <div className="flex items-center justify-between text-(ink)">
                        <span>{c.valueStr}</span>
                        <span className="text-(muted) text-[10.5px]">{c.unit}</span>
                      </div>
                      {c.altValue && (
                        <span className="text-[10px] text-(ink3)">
                          {c.altValue}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "converter" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-(line) bg-(panel-2) p-3.5 space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-(muted) block">
                  Input Value &amp; Unit
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="number"
                    step="any"
                    value={energyEv}
                    onChange={(e) => setEnergyEv(e.target.value)}
                    placeholder="Enter value (e.g. 1.5)"
                    className="h-9 text-[13.5px] font-mono rounded-lg bg-(bg) border-(line)"
                  />
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {(["eV", "nm", "THz", "K", "cm-1", "J"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setConvUnit(u)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-colors cursor-pointer border",
                          convUnit === u
                            ? "bg-(ink) text-(bg) border-(ink)"
                            : "bg-(bg) border-(line) text-(muted) hover:text-(ink)"
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-(muted) block px-0.5">
                  Equivalent Scientific Representations
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ConvertRow label="Photon Energy" value={`${values.eV} eV`} onCopy={() => copyText(`${values.eV} eV`, "ev")} copied={copiedId === "ev"} />
                  <ConvertRow label="Wavelength (λ = hc/E)" value={`${values.nm} nm`} onCopy={() => copyText(`${values.nm} nm`, "nm")} copied={copiedId === "nm"} />
                  <ConvertRow label="Frequency (ν = E/h)" value={`${values.THz} THz`} onCopy={() => copyText(`${values.THz} THz`, "thz")} copied={copiedId === "thz"} />
                  <ConvertRow label="Thermal Temp (T = E/kB)" value={`${values.K} K`} onCopy={() => copyText(`${values.K} K`, "k")} copied={copiedId === "k"} />
                  <ConvertRow label="Wavenumber (k = 1/λ)" value={`${values.cmInv} cm⁻¹`} onCopy={() => copyText(`${values.cmInv} cm^-1`, "cminv")} copied={copiedId === "cminv"} />
                  <ConvertRow label="SI Energy (Joules)" value={`${values.Joules} J`} onCopy={() => copyText(`${values.Joules} J`, "joules")} copied={copiedId === "joules"} />
                </div>
              </div>
            </div>
          )}

          {tab === "canvas" && (
            <div className="space-y-3">
              {onPinCanvas && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onPinCanvas();
                      onClose();
                    }}
                    className="rounded-xl border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer shadow-2xs"
                  >
                    <Pin className="size-3.5 mr-1.5 text-indigo-500" /> Pin Canvas to Screen
                  </Button>
                </div>
              )}
              <WhiteboardCanvas />
            </div>
          )}

          {tab === "graph" && <EquationGraphVisualizer />}

          {tab === "calculator" && (
            <div className="max-w-md mx-auto space-y-3">
              {onPinCalculator && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onPinCalculator();
                      onClose();
                    }}
                    className="rounded-xl border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer shadow-2xs"
                  >
                    <Pin className="size-3.5 mr-1.5 text-cyan-500" /> Pin Calculator to Screen
                  </Button>
                </div>
              )}
              <ScientificCalculator />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConvertRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-(line) bg-(bg) p-2.5 transition-colors hover:border-(line-strong) hover:bg-(panel)">
      <div>
        <div className="text-[10.5px] text-(muted) font-mono">{label}</div>
        <div className="text-[13px] font-mono font-medium text-(ink) mt-0.5">
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="rounded p-1 text-(muted) hover:bg-(accent-soft) hover:text-(ink) transition-colors cursor-pointer"
        title="Copy"
      >
        {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      </button>
    </div>
  );
}
