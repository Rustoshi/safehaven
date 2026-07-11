"use client"

import { useState, useEffect, useRef } from "react"
import { BANK_NAME } from "@/lib/brand"

interface SplashScreenProps {
  children: React.ReactNode
  /** Minimum display time in ms (default: 1800) */
  minDuration?: number
}

export function SplashScreen({ children, minDuration = 1800 }: SplashScreenProps) {
  const [phase, setPhase] = useState<"splash" | "exit" | "done">("splash")
  const [progress, setProgress] = useState(0)
  const [isDark, setIsDark] = useState(true)
  const startTime = useRef(Date.now())
  const rafRef = useRef<number>()

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

  // Progress animation
  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTime.current
      const rawProgress = Math.min(elapsed / minDuration, 1)
      
      // Smooth easing with slight acceleration at the end
      const eased = rawProgress < 0.8 
        ? rawProgress * 1.1 
        : 0.88 + Math.pow((rawProgress - 0.8) / 0.2, 0.5) * 0.12
      
      setProgress(Math.min(eased * 100, 100))

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Brief pause at 100%, then exit
        setTimeout(() => {
          setPhase("exit")
          setTimeout(() => setPhase("done"), 600)
        }, 150)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [minDuration])

  // Theme colors
  const colors = {
    bg: isDark ? "#0A1628" : "#F8FAFC",
    bgGlow: isDark ? "#0D1F3C" : "#FFFFFF",
    primary: isDark ? "#3B9EFF" : "#0066CC",
    primaryLight: isDark ? "#60B3FF" : "#3399FF",
    primaryGlow: isDark ? "rgba(59,158,255,0.35)" : "rgba(0,102,204,0.2)",
    primaryGlowStrong: isDark ? "rgba(59,158,255,0.5)" : "rgba(0,102,204,0.35)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMuted: isDark ? "rgba(255,255,255,0.5)" : "#64748B",
    ring: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    ringMed: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
    track: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  }

  if (phase === "done") {
    return (
      <div
        style={{
          animation: "splashContentReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {children}
        <style jsx global>{`
          @keyframes splashContentReveal {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: colors.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: phase === "exit" ? 0 : 1,
          transform: phase === "exit" ? "scale(1.03)" : "scale(1)",
          transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Ambient background glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            opacity: isDark ? 1 : 0.6,
          }}
        >
          {/* Primary glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 500,
              height: 500,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${colors.primaryGlow} 0%, transparent 65%)`,
              animation: "splashAmbientPulse 4s ease-in-out infinite",
            }}
          />
          {/* Secondary accent glow */}
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "55%",
              transform: "translate(-50%, -50%)",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${colors.primaryGlow} 0%, transparent 70%)`,
              animation: "splashAmbientPulse 4s ease-in-out infinite 1s",
              opacity: 0.5,
            }}
          />
        </div>

        {/* Main content container */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Spinner assembly */}
          <div
            style={{
              position: "relative",
              width: 100,
              height: 100,
              marginBottom: 32,
            }}
          >
            {/* Outer decorative ring */}
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: `1px solid ${colors.ring}`,
              }}
            />
            
            {/* Second decorative ring */}
            <div
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                border: `1px dashed ${colors.ring}`,
                animation: "splashOuterRingSpin 20s linear infinite reverse",
              }}
            />

            {/* Main spinner container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
              }}
            >
              {/* Track ring */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={colors.track}
                  strokeWidth="3"
                />
              </svg>

              {/* Animated spinner arc */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  animation: "splashSpinnerRotate 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                }}
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="splashSpinnerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
                    <stop offset="30%" stopColor={colors.primary} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={colors.primaryLight} stopOpacity="1" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="url(#splashSpinnerGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="180 276"
                  transform="rotate(-90 50 50)"
                />
              </svg>

              {/* Spinner head glow */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: colors.primaryLight,
                  boxShadow: `0 0 12px 4px ${colors.primaryGlowStrong}`,
                  animation: "splashSpinnerRotate 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                  transformOrigin: "50% 50px",
                }}
              />

              {/* Inner glow effect */}
              <div
                style={{
                  position: "absolute",
                  inset: 16,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${colors.primaryGlow} 0%, transparent 70%)`,
                  animation: "splashInnerGlowPulse 2s ease-in-out infinite",
                }}
              />

              {/* Center logo container */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: isDark 
                    ? `linear-gradient(145deg, ${colors.primary} 0%, #2563EB 100%)`
                    : `linear-gradient(145deg, ${colors.primary} 0%, #0052A3 100%)`,
                  boxShadow: `
                    0 10px 40px ${colors.primaryGlowStrong},
                    0 4px 16px ${colors.primaryGlow},
                    inset 0 1px 0 rgba(255,255,255,0.25),
                    inset 0 -1px 0 rgba(0,0,0,0.1)
                  `,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {BANK_NAME[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Brand name and tagline */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: colors.text,
                letterSpacing: "-0.03em",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {BANK_NAME}
            </h1>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: colors.textMuted,
                marginTop: 6,
                letterSpacing: "0.01em",
              }}
            >
              Secure Banking Platform
            </p>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: 200,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Bar container */}
            <div
              style={{
                width: "100%",
                height: 4,
                borderRadius: 4,
                background: colors.track,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Progress fill */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  right: `${100 - progress}%`,
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
                  boxShadow: `0 0 16px ${colors.primaryGlow}`,
                  transition: "right 80ms ease-out",
                }}
              />
              {/* Shimmer overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                  animation: "splashShimmer 1.8s ease-in-out infinite",
                }}
              />
            </div>

            {/* Percentage */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.textMuted,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.02em",
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes splashSpinnerRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes splashOuterRingSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes splashAmbientPulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.08);
          }
        }

        @keyframes splashInnerGlowPulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.92);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        @keyframes splashShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}
