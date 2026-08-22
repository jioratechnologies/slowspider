"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePref = "auto" | "light" | "dark";
const KEY = "slowspider.theme";

export function useTheme() {
  const [theme, setTheme] = useState<ThemePref>("auto");

  useEffect(() => {
    let stored: ThemePref = "auto";
    try {
      stored = (localStorage.getItem(KEY) as ThemePref) || "auto";
    } catch {}
    setTheme(stored);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (currentTheme: ThemePref) => {
      const isDark = currentTheme === "auto" ? mediaQuery.matches : currentTheme === "dark";
      el.setAttribute("data-theme", isDark ? "dark" : "light");
      if (isDark) {
        el.classList.add("dark");
      } else {
        el.classList.remove("dark");
      }
    };

    applyTheme(theme);

    const onSystemThemeChange = () => {
      if (theme === "auto") {
        applyTheme("auto");
      }
    };

    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemePref = prev === "auto" ? "light" : prev === "light" ? "dark" : "auto";
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      return next;
    });
  }, []);

  const setExplicitTheme = useCallback((next: ThemePref) => {
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }, []);

  return { theme, cycleTheme, setTheme: setExplicitTheme };
}

