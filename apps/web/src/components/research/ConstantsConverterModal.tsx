"use client";

import { useState } from "react";
import { Activity, Atom, Calculator, Check, Copy, Flame, Layers, LineChart, Pin, Search, Sparkles, X, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MathRenderer from "./MathRenderer";
import EquationGraphVisualizer from "./EquationGraphVisualizer";
import ScientificCalculator from "./ScientificCalculator";
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
    symbol: "α",
    latex: "\\alpha",
    name: "Fine-structure constant",
    category: "quantum",
    valueStr: "7.2973525693 × 10⁻³",
    unit: "dimensionless",
    altValue: "≈ 1 / 137.035999084",
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
    symbol: "R∞",
    latex: "R_\\infty",
    name: "Rydberg constant",
    category: "atomic",
    valueStr: "1.0973731568160 × 10⁷",
    unit: "m⁻¹",
    altValue: "13.605693122994 eV",
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
    symbol: "σ",
    latex: "\\sigma",
    name: "Stefan-Boltzmann constant",
    category: "thermodynamics",
    valueStr: "5.670374419 × 10⁻⁸",
    unit: "W·m⁻²·K⁻⁴",
  },
];

const H_PLANCK = 6.62607015e-34;
const C_LIGHT = 299792458;
const E_CHARGE = 1.602176634e-19;
const K_BOLTZ = 1.380649e-23;

export default function ConstantsConverterModal({
  open,
  onClose,
  onPinCalculator,
}: {
  open: boolean;
  onClose: () => void;
  onPinCalculator?: () => void;
}) {
  const [tab, setTab] = useState<"constants" | "converter" | "graph" | "calculator">("constants");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Unit Converter State
  const [energyEv, setEnergyEv] = useState<string>("1.5");
  const [convUnit, setConvUnit] = useState<"eV" | "nm" | "THz" | "K" | "cm-1" | "J">("eV");

  function copyText(val: string, id: string) {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  let currentEv = 0;
  const num = parseFloat(energyEv);
  if (!isNaN(num) && num > 0) {
    switch (convUnit) {
      case "eV":
        currentEv = num;
        break;
      case "nm":
        currentEv = (H_PLANCK * C_LIGHT) / (num * 1e-9 * E_CHARGE);
        break;
      case "THz":
        currentEv = (H_PLANCK * num * 1e12) / E_CHARGE;
        break;
      case "K":
        currentEv = (K_BOLTZ * num) / E_CHARGE;
        break;
      case "cm-1":
        currentEv = (H_PLANCK * C_LIGHT * (num * 100)) / E_CHARGE;
        break;
      case "J":
        currentEv = num / E_CHARGE;
        break;
    }
  }

  const values = {
    eV: currentEv ? currentEv.toExponential(4) : "—",
    nm: currentEv ? (((H_PLANCK * C_LIGHT) / (currentEv * E_CHARGE)) * 1e9).toFixed(2) : "—",
    THz: currentEv ? (((currentEv * E_CHARGE) / H_PLANCK) * 1e-12).toFixed(3) : "—",
    K: currentEv ? (((currentEv * E_CHARGE) / K_BOLTZ)).toFixed(2) : "—",
    cmInv: currentEv ? (((currentEv * E_CHARGE) / (H_PLANCK * C_LIGHT * 100))).toFixed(1) : "—",
    Joules: currentEv ? (currentEv * E_CHARGE).toExponential(4) : "—",
  };

  const filteredConstants = PHYSICAL_CONSTANTS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.unit.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === "all" || c.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[94vw] sm:max-w-180 gap-0 p-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] shadow-2xl backdrop-blur-2xl text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Atom className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Scientific Research Suite
              </DialogTitle>
              <DialogDescription className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Constants, multi-unit optics converter, equation visualizer & calculator
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex overflow-x-auto border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] px-4 sm:px-6 pt-2 gap-2 sm:gap-4 no-scrollbar">
          <button
            type="button"
            onClick={() => setTab("constants")}
            className={cn(
              "pb-2.5 text-[12.5px] sm:text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
              tab === "constants"
                ? "border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Sparkles className="size-3.5" />
            <span>Constants</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("converter")}
            className={cn(
              "pb-2.5 text-[12.5px] sm:text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
              tab === "converter"
                ? "border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Zap className="size-3.5" />
            <span>Energy &amp; Optics</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("graph")}
            className={cn(
              "pb-2.5 text-[12.5px] sm:text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
              tab === "graph"
                ? "border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Activity className="size-3.5" />
            <span>Equation &amp; Waves</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("calculator")}
            className={cn(
              "pb-2.5 text-[12.5px] sm:text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
              tab === "calculator"
                ? "border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Calculator className="size-3.5" />
            <span>Calculator</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-[72vh] overflow-y-auto space-y-4">
          {tab === "constants" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="size-3.5 absolute left-3 top-3 text-zinc-400" />
                  <Input
                    placeholder="Search constant (e.g. Planck, c, mass, eV, charge)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8.5 h-9 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] text-[13px]"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-0.5 text-[11px] font-mono no-scrollbar">
                  {["all", "quantum", "electromagnetism", "astrophysics", "thermodynamics", "atomic"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCat(cat)}
                      className={cn(
                        "rounded-lg px-2 py-1 capitalize transition-colors cursor-pointer shrink-0",
                        selectedCat === cat
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                          : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredConstants.map((c) => (
                  <div
                    key={c.symbol}
                    className="group flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02] p-3 transition-all hover:bg-zinc-100/70 dark:hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold text-[13px]">
                          {c.symbol}
                        </span>
                        <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {c.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(`${c.valueStr} ${c.unit}`, c.symbol)}
                        className="rounded-lg p-1.5 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                        title="Copy constant value"
                      >
                        {copiedId === c.symbol ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-white/[0.04] flex flex-col gap-0.5 font-mono text-[12px]">
                      <div className="flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                        <span>{c.valueStr}</span>
                        <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">{c.unit}</span>
                      </div>
                      {c.altValue && (
                        <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">
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
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] p-4 space-y-3">
                <span className="text-[11.5px] font-semibold uppercase tracking-wider font-mono text-zinc-500 dark:text-zinc-400 block">
                  Input Value & Unit
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="number"
                    step="any"
                    value={energyEv}
                    onChange={(e) => setEnergyEv(e.target.value)}
                    placeholder="Enter value (e.g. 1.5)"
                    className="h-10 text-[14px] font-mono rounded-xl bg-white dark:bg-white/[0.03]"
                  />
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {(["eV", "nm", "THz", "K", "cm-1", "J"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setConvUnit(u)}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-xs font-mono font-medium transition-colors cursor-pointer",
                          convUnit === u
                            ? "bg-purple-600 text-white dark:bg-purple-500"
                            : "bg-zinc-200/70 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-white/20"
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11.5px] font-semibold uppercase tracking-wider font-mono text-zinc-500 dark:text-zinc-400 block px-1">
                  Equivalent Scientific Representations
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    className="rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 text-xs"
                  >
                    <Pin className="size-3.5 mr-1.5" /> Pin Calculator to Screen
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
    <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02] p-3 transition-colors hover:bg-zinc-100/60 dark:hover:bg-white/[0.04]">
      <div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">{label}</div>
        <div className="text-[13.5px] font-mono font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
        title="Copy"
      >
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
