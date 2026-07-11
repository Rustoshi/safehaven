"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "nova-theme"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to dark - matches server render
  const [theme, setThemeState] = useState<Theme>("dark")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark")

  // Initialize theme from localStorage (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored && stored !== theme) {
      setThemeState(stored)
    }
  }, [])

  // Resolve theme and apply to document
  useEffect(() => {
    const resolved: ResolvedTheme = theme === "system" ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    document.documentElement.setAttribute("data-theme", resolved)

    // Listen for system theme changes when in system mode
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? "dark" : "light"
        setResolvedTheme(newResolved)
        document.documentElement.setAttribute("data-theme", newResolved)
      }
      mediaQuery.addEventListener("change", handler)
      return () => mediaQuery.removeEventListener("change", handler)
    }
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  // REMOVED: The `if (!mounted) return null` was blocking SSR completely
  // Now we render immediately with dark theme default, then hydrate

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

// Shared theme-aware colors hook for consistent theming across all pages
export function useThemeColors() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return {
    // Backgrounds
    bgBase: isDark ? "#0A1628" : "#F8FAFC",
    bgElevated: isDark ? "#0D1F3C" : "#FFFFFF",
    bgSurface: isDark ? "#112244" : "#F1F5F9",
    bgHover: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    bgActive: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    bgCard: isDark ? "#131B2E" : "#FFFFFF",
    bgInput: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
    bgOverlay: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)",
    
    // Hero/gradient backgrounds
    heroGradient: isDark
      ? "linear-gradient(180deg, #0D1F3C 0%, #0A1628 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)",
    bgHero: isDark 
      ? "linear-gradient(180deg, #060e1a 0%, #081422 60%, #0a1628 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
    
    // Borders
    border: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
    borderSubtle: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    borderStrong: isDark ? "rgba(255,255,255,0.15)" : "#CBD5E1",
    borderBlue: isDark ? "rgba(59,158,255,0.18)" : "rgba(0,102,204,0.15)",
    
    // Text colors
    textPrimary: isDark ? "#FFFFFF" : "#0F172A",
    textSecondary: isDark ? "rgba(255,255,255,0.7)" : "#334155",
    textTertiary: isDark ? "rgba(255,255,255,0.45)" : "#64748B",
    textMuted: isDark ? "rgba(255,255,255,0.35)" : "#94A3B8",
    textInverse: isDark ? "#0A1628" : "#FFFFFF",
    
    // Accent colors
    blue: isDark ? "#3B9EFF" : "#0066CC",
    blueBg: isDark ? "rgba(59,158,255,0.12)" : "rgba(0,102,204,0.08)",
    green: isDark ? "#00C896" : "#059669",
    greenBg: isDark ? "rgba(0,200,150,0.12)" : "rgba(5,150,105,0.08)",
    red: isDark ? "#EF4444" : "#DC2626",
    redBg: isDark ? "rgba(239,68,68,0.12)" : "rgba(220,38,38,0.08)",
    yellow: isDark ? "#F59E0B" : "#D97706",
    yellowBg: isDark ? "rgba(245,158,11,0.12)" : "rgba(217,119,6,0.08)",
    amber: isDark ? "#F59E0B" : "#B45309",
    amberBg: isDark ? "rgba(245,158,11,0.12)" : "rgba(180,83,9,0.08)",
    
    // Shadows
    shadow: isDark 
      ? "0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(59,158,255,0.12)"
      : "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
    shadowCard: isDark
      ? "0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(59,158,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    
    // Utility
    isDark,
  }
}
