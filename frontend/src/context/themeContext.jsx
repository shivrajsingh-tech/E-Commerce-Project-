"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import api from "@/lib/api";

const ThemeContext = createContext(null);

const THEME_KEY = "elibcart_theme";

export function ThemeProvider({ children }) {
  // Default is "light"; will sync from DB if logged in
  const [theme, setTheme] = useState("light");
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Apply theme to <html> element
  const applyTheme = useCallback((t) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.setAttribute("data-theme", "light");
    }
  }, []);

  // Load saved theme on mount (from localStorage first, then DB)
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    setTheme(saved);
    applyTheme(saved);
    setThemeLoaded(true);

    // Try to sync from backend if token exists
    const token = localStorage.getItem("token");
    if (token) {
      api
        .get("/users/theme")
        .then((res) => {
          const serverTheme = res.data?.theme || "light";
          setTheme(serverTheme);
          applyTheme(serverTheme);
          localStorage.setItem(THEME_KEY, serverTheme);
        })
        .catch(() => {
          // silent — keep local theme
        });
    }
  }, [applyTheme]);

  const toggleTheme = useCallback(async () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);

    // Persist to backend if logged in
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await api.patch("/users/theme", { theme: next });
      } catch {
        // silent
      }
    }
  }, [theme, applyTheme]);

  const setThemeExplicit = useCallback(
    async (t) => {
      if (t !== "light" && t !== "dark") return;
      setTheme(t);
      applyTheme(t);
      localStorage.setItem(THEME_KEY, t);

      const token = localStorage.getItem("token");
      if (token) {
        try {
          await api.patch("/users/theme", { theme: t });
        } catch {
          // silent
        }
      }
    },
    [applyTheme]
  );

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme: setThemeExplicit, themeLoaded }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
