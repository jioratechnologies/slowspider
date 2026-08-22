"use client";

import { useEffect, useState, useCallback } from "react";
import { Calculator, Check, Copy, Delete, History, Keyboard, Minimize2, Maximize2, Pin, PinOff, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScientificCalculator({
  isPinned,
  onTogglePin,
  onClose,
}: {
  isPinned?: boolean;
  onTogglePin?: () => void;
  onClose?: () => void;
}) {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [isRad, setIsRad] = useState(true);
  const [history, setHistory] = useState<Array<{ eq: string; res: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const inputDigit = useCallback((digit: string) => {
    setDisplay((prev) => {
      if (prev === "0" && digit !== ".") return digit;
      if (digit === "." && prev.includes(".")) return prev;
      return prev + digit;
    });
  }, []);

  const inputOp = useCallback((op: string) => {
    setEquation((prev) => `${prev} ${display} ${op}`);
    setDisplay("0");
  }, [display]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setEquation("");
  }, []);

  const backspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }, []);

  const calculate = useCallback(() => {
    try {
      const fullEq = `${equation} ${display}`
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "Math.PI")
        .replace(/\be\b/g, "Math.E")
        .replace(/\^/g, "**");

      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const result = new Function(`return ${fullEq}`)();
      if (!isNaN(result) && isFinite(result)) {
        const resStr = Number(result.toFixed(8)).toString();
        setHistory((prev) => [{ eq: `${equation} ${display}`, res: resStr }, ...prev.slice(0, 9)]);
        setDisplay(resStr);
        setEquation("");
      } else {
        setDisplay("Error");
      }
    } catch {
      setDisplay("Error");
    }
  }, [equation, display]);

  const applyFunc = useCallback((funcName: string) => {
    const val = parseFloat(display);
    if (isNaN(val)) return;

    let res = 0;
    const toRad = isRad ? val : (val * Math.PI) / 180;

    switch (funcName) {
      case "sin":
        res = Math.sin(toRad);
        break;
      case "cos":
        res = Math.cos(toRad);
        break;
      case "tan":
        res = Math.tan(toRad);
        break;
      case "asin":
        res = isRad ? Math.asin(val) : (Math.asin(val) * 180) / Math.PI;
        break;
      case "acos":
        res = isRad ? Math.acos(val) : (Math.acos(val) * 180) / Math.PI;
        break;
      case "atan":
        res = isRad ? Math.atan(val) : (Math.atan(val) * 180) / Math.PI;
        break;
      case "ln":
        res = Math.log(val);
        break;
      case "log":
        res = Math.log10(val);
        break;
      case "sqrt":
        res = Math.sqrt(val);
        break;
      case "sq":
        res = Math.pow(val, 2);
        break;
      case "exp":
        res = Math.exp(val);
        break;
      case "inv":
        res = 1 / val;
        break;
      case "fact":
        res = factorial(Math.floor(val));
        break;
      case "neg":
        res = -val;
        break;
    }

    if (!isNaN(res) && isFinite(res)) {
      setDisplay(Number(res.toFixed(8)).toString());
    } else {
      setDisplay("Error");
    }
  }, [display, isRad]);

  function factorial(n: number): number {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let r = 1;
    for (let i = 2; i <= Math.min(n, 100); i++) r *= i;
    return r;
  }

  // Keyboard and Numpad Support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        inputDigit(".");
      } else if (e.key === "+" || e.key === "-") {
        e.preventDefault();
        inputOp(e.key);
      } else if (e.key === "*") {
        e.preventDefault();
        inputOp("×");
      } else if (e.key === "/") {
        e.preventDefault();
        inputOp("÷");
      } else if (e.key === "^") {
        e.preventDefault();
        inputOp("^");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        calculate();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Escape" || e.key.toLowerCase() === "c") {
        e.preventDefault();
        clearAll();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        applyFunc("sin");
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        applyFunc("tan");
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        applyFunc("ln");
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        applyFunc("sqrt");
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        inputDigit("Math.PI");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputDigit, inputOp, calculate, backspace, clearAll, applyFunc]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-[#16161c]/95 shadow-2xl backdrop-blur-2xl text-zinc-900 dark:text-zinc-100 transition-all overflow-hidden",
        isPinned && "fixed bottom-6 right-6 z-50 w-80 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-purple-500/30"
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-100/70 dark:bg-white/[0.03] border-b border-zinc-200/80 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Calculator className="size-4 text-purple-500" />
          <span className="text-[12.5px] font-semibold tracking-tight">Scientific Calculator</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsRad((v) => !v)}
            className="rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 cursor-pointer"
            title="Toggle Radians / Degrees"
          >
            {isRad ? "RAD" : "DEG"}
          </button>

          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                isPinned
                  ? "bg-purple-500/20 text-purple-600 dark:text-purple-400"
                  : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              title={isPinned ? "Unpin calculator" : "Pin calculator to screen"}
            >
              {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </button>
          )}

          {isPinned && (
            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3.5 space-y-3">
          {/* Display screen */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.06] bg-zinc-50 dark:bg-[#101014] p-3 text-right">
            <div className="min-h-4 text-[11px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
              {equation || " "}
            </div>
            <div className="text-[22px] font-mono font-bold text-zinc-900 dark:text-zinc-100 truncate tracking-tight">
              {display}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-5 gap-1.5 text-[12px] font-mono">
            {/* Row 1: Sci */}
            <CalcBtn label="sin" onClick={() => applyFunc("sin")} sci />
            <CalcBtn label="cos" onClick={() => applyFunc("cos")} sci />
            <CalcBtn label="tan" onClick={() => applyFunc("tan")} sci />
            <CalcBtn label="ln" onClick={() => applyFunc("ln")} sci />
            <CalcBtn label="C" onClick={clearAll} danger />

            {/* Row 2: Sci & Powers */}
            <CalcBtn label="√" onClick={() => applyFunc("sqrt")} sci />
            <CalcBtn label="x²" onClick={() => applyFunc("sq")} sci />
            <CalcBtn label="xʸ" onClick={() => inputOp("^")} sci />
            <CalcBtn label="log" onClick={() => applyFunc("log")} sci />
            <CalcBtn label="⌫" onClick={backspace} />

            {/* Row 3: Math & Digits */}
            <CalcBtn label="π" onClick={() => inputDigit("Math.PI")} sci />
            <CalcBtn label="7" onClick={() => inputDigit("7")} num />
            <CalcBtn label="8" onClick={() => inputDigit("8")} num />
            <CalcBtn label="9" onClick={() => inputDigit("9")} num />
            <CalcBtn label="÷" onClick={() => inputOp("÷")} op />

            {/* Row 4: Digits */}
            <CalcBtn label="e" onClick={() => inputDigit("Math.E")} sci />
            <CalcBtn label="4" onClick={() => inputDigit("4")} num />
            <CalcBtn label="5" onClick={() => inputDigit("5")} num />
            <CalcBtn label="6" onClick={() => inputDigit("6")} num />
            <CalcBtn label="×" onClick={() => inputOp("×")} op />

            {/* Row 5: Digits */}
            <CalcBtn label="1/x" onClick={() => applyFunc("inv")} sci />
            <CalcBtn label="1" onClick={() => inputDigit("1")} num />
            <CalcBtn label="2" onClick={() => inputDigit("2")} num />
            <CalcBtn label="3" onClick={() => inputDigit("3")} num />
            <CalcBtn label="-" onClick={() => inputOp("-")} op />

            {/* Row 6: Eval */}
            <CalcBtn label="n!" onClick={() => applyFunc("fact")} sci />
            <CalcBtn label="0" onClick={() => inputDigit("0")} num />
            <CalcBtn label="." onClick={() => inputDigit(".")} num />
            <CalcBtn label="=" onClick={calculate} equals />
            <CalcBtn label="+" onClick={() => inputOp("+")} op />
          </div>

          {/* Keyboard badge reminder & History */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-white/[0.06] text-[10.5px] font-mono text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <Keyboard className="size-3 text-purple-500" /> Numpad & Keyboard active
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                <History className="size-3 text-purple-500" />
                <span>{showHistory ? "Hide" : `History (${history.length})`}</span>
              </button>
            )}
          </div>

          {showHistory && history.length > 0 && (
            <div className="mt-1.5 max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono">
              {history.map((h, idx) => (
                <div
                  key={idx}
                  onClick={() => setDisplay(h.res)}
                  className="flex items-center justify-between rounded-lg p-1.5 bg-zinc-50 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.05] cursor-pointer"
                >
                  <span className="text-zinc-400 truncate">{h.eq} =</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{h.res}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalcBtn({
  label,
  onClick,
  num,
  sci,
  op,
  danger,
  equals,
}: {
  label: string;
  onClick: () => void;
  num?: boolean;
  sci?: boolean;
  op?: boolean;
  danger?: boolean;
  equals?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-xl font-semibold transition-all cursor-pointer shadow-2xs flex items-center justify-center select-none active:scale-95",
        num && "bg-white dark:bg-[#202026] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200/80 dark:border-white/[0.06]",
        sci && "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 text-[11.5px]",
        op && "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 text-[14px]",
        danger && "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20",
        equals && "bg-purple-600 text-white hover:bg-purple-700 font-bold col-span-1 shadow-xs"
      )}
    >
      {label}
    </button>
  );
}
