"use client"

import { useEffect, useState, useRef } from "react"
import { BANK_NAME } from "@/lib/brand"

interface PreloaderProps {
  /** Minimum display time in ms (default: 1200) */
  minDuration?: number
  /** Callback when preloader finishes */
  onComplete?: () => void
}

export function Preloader({ minDuration = 1200, onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<"loading" | "complete" | "exit">("loading")
  const startTime = useRef(Date.now())
  const rafRef = useRef<number>()

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTime.current
      const rawProgress = Math.min(elapsed / minDuration, 1)
      
      // Eased progress with slight overshoot feel
      const eased = 1 - Math.pow(1 - rawProgress, 3)
      setProgress(eased * 100)

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setPhase("complete")
        // Brief pause at 100% before exit
        setTimeout(() => {
          setPhase("exit")
          setTimeout(() => onComplete?.(), 500)
        }, 200)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [minDuration, onComplete])

  // Get theme from document or default to dark
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const theme = document.documentElement.getAttribute("data-theme")
    setIsDark(theme !== "light")
    
    // Watch for theme changes
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

  const colors = {
    bg: isDark ? "#0A1628" : "#F8FAFC",
    bgGlow: isDark ? "#0D1F3C" : "#FFFFFF",
    primary: isDark ? "#3B9EFF" : "#0066CC",
    primaryGlow: isDark ? "rgba(59,158,255,0.4)" : "rgba(0,102,204,0.25)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMuted: isDark ? "rgba(255,255,255,0.5)" : "#64748B",
    ring: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    ringActive: isDark ? "rgba(59,158,255,0.25)" : "rgba(0,102,204,0.15)",
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: colors.bg,
        opacity: phase === "exit" ? 0 : 1,
        transform: phase === "exit" ? "scale(1.02)" : "scale(1)",
        transition: "opacity 500ms cubic-bezier(0.4, 0, 0.2, 1), transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: isDark ? 1 : 0.5 }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{
            width: 400,
            height: 400,
            background: `radial-gradient(circle, ${colors.primaryGlow} 0%, transparent 70%)`,
            animation: "preloaderPulse 3s ease-in-out infinite",
          }}
        />
      </div>

      {/* Main content */}
      <div
        className="relative flex flex-col items-center"
        style={{
          opacity: phase === "loading" ? 1 : phase === "complete" ? 1 : 0,
          transform: phase === "loading" ? "translateY(0)" : phase === "complete" ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 300ms ease, transform 300ms ease",
        }}
      >
        {/* Spinner container */}
        <div className="relative mb-8">
          {/* Outer decorative ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              width: 88,
              height: 88,
              top: -4,
              left: -4,
              border: `1px solid ${colors.ring}`,
            }}
          />
          
          {/* Main spinner track */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            {/* Track background */}
            <svg
              className="absolute inset-0"
              viewBox="0 0 80 80"
              fill="none"
            >
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke={colors.ring}
                strokeWidth="2.5"
              />
            </svg>

            {/* Animated progress arc */}
            <svg
              className="absolute inset-0"
              viewBox="0 0 80 80"
              fill="none"
              style={{
                animation: "preloaderSpin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              }}
            >
              <defs>
                <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
                  <stop offset="50%" stopColor={colors.primary} stopOpacity="1" />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity="1" />
                </linearGradient>
              </defs>
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="url(#spinnerGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="170 226"
                transform="rotate(-90 40 40)"
              />
            </svg>

            {/* Inner glow ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: 64,
                height: 64,
                background: `radial-gradient(circle, ${colors.ringActive} 0%, transparent 70%)`,
                animation: "preloaderInnerPulse 2s ease-in-out infinite",
              }}
            />

            {/* Center logo mark */}
            <div
              className="relative flex items-center justify-center rounded-2xl"
              style={{
                width: 44,
                height: 44,
                background: isDark 
                  ? `linear-gradient(135deg, ${colors.primary} 0%, #2563EB 100%)`
                  : `linear-gradient(135deg, ${colors.primary} 0%, #0052A3 100%)`,
                boxShadow: `0 8px 32px ${colors.primaryGlow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >
              <span
                className="text-lg font-bold text-white"
                style={{
                  textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  letterSpacing: "-0.02em",
                }}
              >
                {BANK_NAME[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              color: colors.text,
              letterSpacing: "-0.025em",
            }}
          >
            {BANK_NAME}
          </h1>
          <p
            className="mt-1.5 text-sm font-medium"
            style={{ color: colors.textMuted }}
          >
            Secure Banking Platform
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex flex-col items-center gap-3">
          {/* Progress bar */}
          <div
            className="relative overflow-hidden rounded-full"
            style={{
              width: 180,
              height: 3,
              background: colors.ring,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${colors.primary} 0%, ${isDark ? "#60B3FF" : "#3399FF"} 100%)`,
                boxShadow: `0 0 12px ${colors.primaryGlow}`,
                transition: "width 100ms ease-out",
              }}
            />
            {/* Shimmer effect */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
                animation: "preloaderShimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Progress text */}
          <span
            className="text-xs font-medium tabular-nums"
            style={{ color: colors.textMuted }}
          >
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes preloaderSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes preloaderPulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        @keyframes preloaderInnerPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        @keyframes preloaderShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Hook to manage preloader state
 * Usage:
 * const { isLoading, showPreloader, hidePreloader } = usePreloader()
 */
export function usePreloader(initialState = true) {
  const [isLoading, setIsLoading] = useState(initialState)

  const showPreloader = () => setIsLoading(true)
  const hidePreloader = () => setIsLoading(false)

  return { isLoading, showPreloader, hidePreloader }
}
