import React, { createContext, useContext, useState, useEffect } from "react";

export type ColorScheme = "system" | "forced-navy" | "forced-red";
export type DarkMode = "light" | "dark" | "system";

export interface ColorSchemeTheme {
  primaryBg: string;
  accentBg: string;
  accentBgLight: string;
  accentHover: string;
  accentText: string;
  subText: string;
  iconColor: string;
  ringColor: string;
}

interface ColorSchemeContextProps {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  darkMode: DarkMode;
  setDarkMode: (mode: DarkMode) => void;
  isDarkActive: boolean;
  theme: ColorSchemeTheme;
}

const ColorSchemeContext = createContext<ColorSchemeContextProps | undefined>(undefined);

export const ColorSchemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    try {
      const stored = localStorage.getItem("wehive-color-scheme");
      if (stored === "forced-navy" || stored === "forced-red" || stored === "system") {
        return stored as ColorScheme;
      }
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
    return "system";
  });

  const [darkMode, setDarkModeState] = useState<DarkMode>(() => {
    try {
      const stored = localStorage.getItem("wehive-dark-mode");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored as DarkMode;
      }
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
    return "system";
  });

  const setColorScheme = (newScheme: ColorScheme) => {
    setColorSchemeState(newScheme);
    try {
      localStorage.setItem("wehive-color-scheme", newScheme);
    } catch (e) {
      console.warn("Failed to write color scheme to localStorage:", e);
    }
  };

  const setDarkMode = (newMode: DarkMode) => {
    setDarkModeState(newMode);
    try {
      localStorage.setItem("wehive-dark-mode", newMode);
    } catch (e) {
      console.warn("Failed to write dark mode to localStorage:", e);
    }
  };

  const [isDarkActive, setIsDarkActive] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-system", "theme-navy", "theme-red");
    
    if (colorScheme === "forced-navy") {
      root.classList.add("theme-navy");
    } else if (colorScheme === "forced-red") {
      root.classList.add("theme-red");
    } else {
      root.classList.add("theme-system");
    }
  }, [colorScheme]);

  // Handle dark mode side effects on document element class
  useEffect(() => {
    const root = document.documentElement;
    
    const checkDarkActive = () => {
      if (darkMode === "dark") return true;
      if (darkMode === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    };

    const isDark = checkDarkActive();
    setIsDarkActive(isDark);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Dynamic system theme listener
  useEffect(() => {
    if (darkMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      setIsDarkActive(e.matches);
      if (e.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [darkMode]);

  const theme: ColorSchemeTheme = {
    primaryBg: 
      colorScheme === "forced-navy" 
        ? "bg-slate-900 border-slate-800" 
        : colorScheme === "forced-red" 
        ? "bg-stone-900 border-stone-800" 
        : "bg-blue-950 border-blue-900",
    
    accentBg: 
      colorScheme === "forced-navy" 
        ? "bg-blue-600 hover:bg-blue-700 text-white" 
        : colorScheme === "forced-red" 
        ? "bg-red-600 hover:bg-red-700 text-white" 
        : "bg-red-600 hover:bg-red-700 text-white",

    accentBgLight: 
      colorScheme === "forced-navy" 
        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
        : colorScheme === "forced-red" 
        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
        : "bg-red-500/10 text-red-400 border border-red-500/20",

    accentHover: 
      colorScheme === "forced-navy" 
        ? "hover:text-blue-400" 
        : colorScheme === "forced-red" 
        ? "hover:text-red-400" 
        : "hover:text-red-400",

    accentText: 
      colorScheme === "forced-navy" 
        ? "text-blue-500" 
        : colorScheme === "forced-red" 
        ? "text-red-500" 
        : "text-red-500",

    subText: 
      colorScheme === "forced-navy" 
        ? "text-blue-300" 
        : colorScheme === "forced-red" 
        ? "text-red-300" 
        : "text-red-300",

    iconColor: 
      colorScheme === "forced-navy" 
        ? "text-blue-400" 
        : colorScheme === "forced-red" 
        ? "text-red-500" 
        : "text-red-500",

    ringColor: 
      colorScheme === "forced-navy" 
        ? "ring-blue-500" 
        : colorScheme === "forced-red" 
        ? "ring-red-500" 
        : "ring-red-500"
  };

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme, darkMode, setDarkMode, isDarkActive, theme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
};

export const useColorScheme = () => {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error("useColorScheme must be used within a ColorSchemeProvider");
  }
  return context;
};
