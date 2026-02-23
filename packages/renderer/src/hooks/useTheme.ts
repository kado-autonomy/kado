import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light";
export type ThemeMode = Theme | "system";

const STORAGE_KEY = "kado-theme";

function getSystemPreference(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return null;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() ?? getSystemPreference();
  });

  useEffect(() => {
    const stored = getStoredTheme();
    const initial = stored ?? getSystemPreference();
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      if (!getStoredTheme()) {
        const next = media.matches ? "light" : "dark";
        setThemeState(next);
        applyTheme(next);
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
      const resolved = getSystemPreference();
      setThemeState(resolved);
      applyTheme(resolved);
    } else {
      setThemeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const mode: ThemeMode = getStoredTheme() ? theme : "system";

  return { theme, mode, toggleTheme, setTheme };
}
