import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance } from "react-native";
import { lightTheme, darkTheme } from "./theme";

type ThemeContextType = {
  theme: typeof lightTheme | typeof darkTheme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = Appearance.getColorScheme(); // "dark" | "light" | null

  // Start with system theme
  const [isDark, setIsDark] = useState(systemScheme === "dark");

  // Auto-update when OS theme changes
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === "dark");
    });

    return () => listener.remove();
  }, []);

  // Manual toggle (overrides system)
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
};
