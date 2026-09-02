"use client";

import React, { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

interface MathRendererProps {
  text: string;
  className?: string;
  displayMode?: boolean;
}

const LATEX_COMMAND_REGEX = /(\\[a-zA-Z]+(?:\{[^}]*\})*|\\[\^_\\]|\\(?:int|sum|prod|partial|nabla|hbar|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|pi|rho|sigma|tau|phi|chi|psi|omega|Delta|Gamma|Lambda|Phi|Psi|Omega|infty|pm|times|div|approx|neq|leq|geq|in|to|leftarrow|rightarrow|langle|rangle|sqrt|frac|hat))/;

/**
 * Robust LaTeX math renderer.
 * Handles:
 * 1. Block math: $$ ... $$
 * 2. Inline math: $ ... $
 * 3. Raw LaTeX commands (e.g. \nabla |\psi\rangle \alpha) even without explicit dollar signs.
 */
export default function MathRenderer({ text, className, displayMode }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Direct block rendering
    if (displayMode || (text.startsWith("$$") && text.endsWith("$$"))) {
      const clean = text.replace(/^\$\$|\$\$$/g, "").trim();
      try {
        const html = katex.renderToString(clean, {
          displayMode: true,
          throwOnError: false,
        });
        return (
          <div
            className="katex-block my-2 overflow-x-auto py-1 text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return <span className="font-mono text-rose-500">{text}</span>;
      }
    }

    // Step 1: Tokenize by $$...$$ and $...$
    const rawTokens: Array<{ type: "text" | "math"; content: string; block?: boolean }> = [];
    let remaining = text;

    while (remaining.length > 0) {
      const blockStart = remaining.indexOf("$$");
      const inlineStart = remaining.indexOf("$");

      if (blockStart !== -1 && (inlineStart === -1 || blockStart <= inlineStart)) {
        if (blockStart > 0) {
          rawTokens.push({ type: "text", content: remaining.slice(0, blockStart) });
        }
        const blockEnd = remaining.indexOf("$$", blockStart + 2);
        if (blockEnd !== -1) {
          rawTokens.push({ type: "math", content: remaining.slice(blockStart + 2, blockEnd), block: true });
          remaining = remaining.slice(blockEnd + 2);
        } else {
          rawTokens.push({ type: "text", content: remaining.slice(blockStart) });
          break;
        }
      } else if (inlineStart !== -1) {
        if (inlineStart > 0) {
          rawTokens.push({ type: "text", content: remaining.slice(0, inlineStart) });
        }
        const inlineEnd = remaining.indexOf("$", inlineStart + 1);
        if (inlineEnd !== -1) {
          rawTokens.push({ type: "math", content: remaining.slice(inlineStart + 1, inlineEnd), block: false });
          remaining = remaining.slice(inlineEnd + 1);
        } else {
          rawTokens.push({ type: "text", content: remaining.slice(inlineStart) });
          break;
        }
      } else {
        rawTokens.push({ type: "text", content: remaining });
        break;
      }
    }

    // Step 2: For text tokens, check if they contain raw LaTeX commands like \nabla \psi \alpha
    const finalTokens: Array<{ type: "text" | "math"; content: string; block?: boolean }> = [];

    for (const token of rawTokens) {
      if (token.type === "math") {
        finalTokens.push(token);
        continue;
      }

      // Check if text has LaTeX backslash commands
      if (token.content.includes("\\") && LATEX_COMMAND_REGEX.test(token.content)) {
        // If entire text token is predominantly LaTeX commands or contains LaTeX keywords
        try {
          const testHtml = katex.renderToString(token.content.trim(), {
            displayMode: false,
            throwOnError: false,
          });
          finalTokens.push({ type: "math", content: token.content.trim(), block: false });
          continue;
        } catch {
          // fallback to text
        }
      }

      finalTokens.push(token);
    }

    return (
      <>
        {finalTokens.map((tok, idx) => {
          if (tok.type === "math") {
            try {
              const html = katex.renderToString(tok.content, {
                displayMode: tok.block || false,
                throwOnError: false,
              });
              if (tok.block) {
                return (
                  <span
                    key={idx}
                    className="block my-2 overflow-x-auto text-center"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              }
              return (
                <span
                  key={idx}
                  className="inline-math px-0.5"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch {
              return <span key={idx} className="font-mono text-rose-500">{tok.content}</span>;
            }
          }

          return <span key={idx}>{tok.content}</span>;
        })}
      </>
    );
  }, [text, displayMode]);

  return <div className={cn("leading-relaxed", className)}>{renderedContent}</div>;
}

export const COMMON_PHYSICS_SYMBOLS = [
  { label: "ħ", latex: "$\\hbar$", name: "Reduced Planck constant" },
  { label: "∇", latex: "$\\nabla$", name: "Del / Gradient" },
  { label: "∂", latex: "$\\partial$", name: "Partial derivative" },
  { label: "∫", latex: "$\\int_{a}^{b} f(x) dx$", name: "Definite Integral" },
  { label: "∑", latex: "$\\sum_{i=1}^{N}$", name: "Summation" },
  { label: "√", latex: "$\\sqrt{x}$", name: "Square root" },
  { label: "a/b", latex: "$\\frac{a}{b}$", name: "Fraction" },
  { label: "Ĥ", latex: "$\\hat{H}$", name: "Hamiltonian operator" },
  { label: "|ψ⟩", latex: "$|\\psi\\rangle$", name: "Ket state" },
  { label: "⟨ψ|", latex: "$\\langle\\psi|$", name: "Bra state" },
  { label: "⟨ψ|Ĥ|ψ⟩", latex: "$\\langle\\psi|\\hat{H}|\\psi\\rangle$", name: "Expectation value" },
  { label: "α", latex: "$\\alpha$", name: "Alpha" },
  { label: "β", latex: "$\\beta$", name: "Beta" },
  { label: "γ", latex: "$\\gamma$", name: "Gamma" },
  { label: "λ", latex: "$\\lambda$", name: "Wavelength" },
  { label: "ω", latex: "$\\omega$", name: "Angular frequency" },
  { label: "Δ", latex: "$\\Delta$", name: "Delta / Change" },
  { label: "±", latex: "$\\pm$", name: "Plus-minus" },
  { label: "≈", latex: "$\\approx$", name: "Approximately" },
  { label: "∞", latex: "$\\infty$", name: "Infinity" },
  { label: "d/dt", latex: "$\\frac{d}{dt}$", name: "Time derivative" },
  { label: "E=mc²", latex: "$E = mc^2$", name: "Mass-energy equivalence" },
  { label: "Schrödinger", latex: "$$i\\hbar\\frac{\\partial}{\\partial t}\\psi = \\hat{H}\\psi$$", name: "Schrodinger equation" },
  { label: "Maxwell", latex: "$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}$$", name: "Gauss Law" },
];

export function MathQuickBar({ onInsert }: { onInsert: (latex: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1">
      <div className="flex items-center gap-1 shrink-0 rounded-lg bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10.5px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400">
        <span>∑ Math</span>
      </div>
      {COMMON_PHYSICS_SYMBOLS.map((sym) => (
        <button
          key={sym.label}
          type="button"
          onClick={() => onInsert(sym.latex)}
          title={`${sym.name}: ${sym.latex}`}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-0.5 text-neutral-900 dark:text-neutral-100 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-purple-300 font-mono font-bold transition-all text-xs cursor-pointer shadow-2xs active:scale-95"
        >
          {sym.label}
        </button>
      ))}
    </div>
  );
}
