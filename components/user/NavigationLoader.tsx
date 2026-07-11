"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { BANK_NAME } from "@/lib/brand"

interface NavigationLoaderProps {
  /** Minimum display time in ms (default: 400) */
  minDuration?: number
}

export function NavigationLoader({ minDuration = 400 }: NavigationLoaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDark, setIsDark] = useState(true)

  // Theme detection
  useEffect(() => {
    const theme = document.documentElement.getAttribute("data-theme")
    setIsDark(theme !== "light")
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const newTheme = document.documentElement.getAttribute("data-theme")
          setIsDark(newTheme !== "light")
        }
      })
    })
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  // Track navigation
  useEffect(() => {
    setIsNavigating(true)
    setProgress(0)

    const startTime = Date.now()
    let rafId: number

    const animate = () => {
      const elapsed = Date.now() - startTime
      const rawProgress = Math.min(elapsed / minDuration, 1)
      
      // Smooth easing
      const eased = 1 - Math.pow(1 - rawProgress, 3)
      setProgress(eased * 100)

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        setTimeout(() => setIsNavigating(false), 150)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [pathname, searchParams, minDuration])

  // Theme colors
  const colors = {
    bg: isDark ? "rgba(10,22,40,0.95)" : "rgba(248,250,252,0.95)",
    primary: isDark ? "#3B9EFF" : "#0066CC",
    primaryGlow: isDark ? "rgba(59,158,255,0.4)" : "rgba(0,102,204,0.25)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMuted: isDark ? "rgba(255,255,255,0.5)" : "#64748B",
    track: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
  }

  if (!isNavigating) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "navLoaderFadeIn 150ms ease-out",
      }}
    >
      {/* Logo/Brand */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: `linear-gradient(145deg, ${colors.primary} 0%, #2563EB 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          boxShadow: `0 8px 32px ${colors.primaryGlow}`,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Bank name */}
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: colors.text,
          marginBottom: 24,
          letterSpacing: "0.02em",
        }}
      >
        {BANK_NAME}
      </p>

      {/* Progress bar */}
      <div
        style={{
          width: 120,
          height: 4,
          borderRadius: 4,
          background: colors.track,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${colors.primary} 0%, #60B3FF 100%)`,
            boxShadow: `0 0 12px ${colors.primaryGlow}`,
            width: `${progress}%`,
            transition: "width 50ms ease-out",
          }}
        />
      </div>

      {/* Loading text */}
      <p
        style={{
          fontSize: 11,
          color: colors.textMuted,
          marginTop: 12,
          letterSpacing: "0.05em",
        }}
      >
        Loading...
      </p>

      <style jsx global>{`
        @keyframes navLoaderFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
