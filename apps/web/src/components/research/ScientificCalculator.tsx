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
      case "inv":
        res = val !== 0 ? 1 / val : 0;
        break;
      case "fact": {
        const n = Math.floor(val);
        if (n < 0 || n > 170) {
          setDisplay("Overflow");
          return;
        }
        let f = 1;
        for (let i = 2; i <= n; i++) f *= i;
        res = f;
        break;
      }
      default:
        return;
    }

    const resStr = Number(res.toFixed(8)).toString();
    setHistory((prev) => [{ eq: `${funcName}(${display})`, res: resStr }, ...prev.slice(0, 9)]);
    setDisplay(resStr);
  }, [display, isRad]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      if (!isNaN(Number(e.key))) {
        inputDigit(e.key);
      } else if (e.key === ".") {
        inputDigit(".");
      } else if (e.key === "+") {
        inputOp("+");
      } else if (e.key === "-") {
        inputOp("-");
      } else if (e.key === "*") {
        inputOp("×");
      } else if (e.key === "/") {
        e.preventDefault();
        inputOp("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        calculate();
      } else if (e.key === "Backspace") {
        backspace();
      } else if (e.key === "Escape") {
        clearAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputDigit, inputOp, calculate, backspace, clearAll]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-(line) bg-(panel) shadow-xl text-(ink) transition-all overflow-hidden",
        isPinned && "fixed bottom-6 right-6 z-50 w-80 shadow-2xl border-(ink)"
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-(panel-2) border-b border-(line)">
        <div className="flex items-center gap-2">
          <Calculator className="size-3.5 text-(muted)" />
          <span className="text-[12px] font-medium tracking-tight text-(ink)">Calculator</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsRad((v) => !v)}
            className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase bg-(bg) border border-(line) text-(muted) hover:text-(ink) cursor-pointer"
            title="Toggle Radians / Degrees"
          >
            {isRad ? "RAD" : "DEG"}
          </button>

          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={cn(
                "rounded p-1 text-(muted) hover:text-(ink) transition-colors cursor-pointer",
                isPinned && "text-(ink)"
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
              className="rounded p-1 text-(muted) hover:text-(ink) cursor-pointer"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-(muted) hover:text-(ink) cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3 space-y-2.5">
          {/* Display screen */}
          <div className="rounded-lg border border-(line) bg-(bg) p-2.5 text-right">
            <div className="min-h-4 text-[10.5px] font-mono text-(muted) truncate">
              {equation || " "}
            </div>
            <div className="text-[20px] font-mono font-medium text-(ink) truncate tracking-tight">
              {display}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-5 gap-1 text-[12px] font-mono">
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

          {/* Keyboard & History */}
          <div className="flex items-center justify-between pt-1 border-t border-(line) text-[10px] font-mono text-(muted)">
            <span className="flex items-center gap-1">
              <Keyboard className="size-2.5" /> Keyboard active
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-1 text-(muted) hover:text-(ink) cursor-pointer"
              >
                <History className="size-2.5" />
                <span>{showHistory ? "Hide" : `History (${history.length})`}</span>
              </button>
            )}
          </div>

          {showHistory && history.length > 0 && (
            <div className="mt-1 max-h-24 overflow-y-auto space-y-1 text-[10.5px] font-mono">
              {history.map((h, idx) => (
                <div
                  key={idx}
                  onClick={() => setDisplay(h.res)}
                  className="flex items-center justify-between rounded p-1 bg-(panel-2) hover:bg-(accent-soft) cursor-pointer"
                >
                  <span className="text-(muted) truncate">{h.eq} =</span>
                  <span className="font-medium text-(ink)">{h.res}</span>
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
        "h-8 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 border",
        num && "bg-(bg) text-(ink) border-(line) hover:border-(line-strong) hover:bg-(panel)",
        sci && "bg-(panel-2) text-(muted) border-(line) hover:text-(ink) hover:border-(line-strong) text-[11px]",
        op && "bg-(panel-2) text-(ink) border-(line) hover:border-(line-strong) text-[13px]",
        danger && "bg-(panel-2) text-(muted) border-(line) hover:text-rose-500 hover:border-rose-500/30",
        equals && "bg-(ink) text-(bg) border-(ink) font-bold hover:opacity-90"
      )}
    >
      {label}
    </button>
  );
}
