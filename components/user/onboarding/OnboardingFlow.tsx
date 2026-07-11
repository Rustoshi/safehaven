"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Session } from "next-auth"
import { cn } from "@/lib/utils"
import { BANK_NAME } from "@/lib/brand"
import {
  Wallet, ArrowLeftRight, CreditCard, Shield, TrendingUp,
  Sparkles, ChevronRight, Globe, Zap, Lock,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  session:       Session
  fiatAccount?:  { accountNumber: string }
  btcAccount?:   { btcAddress: string }
}

// ── Feature item component ────────────────────────────────────────────────────

function FeatureItem({ icon: Icon, title, description, color }: {
  icon: React.ElementType
  title: string
  description: string
  color: string
}) {
  return (
    <div className="flex items-start gap-4 text-left">
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}15` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-900">{title}</p>
        <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ── Animated background shapes ────────────────────────────────────────────────

function BackgroundShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-400/15 to-indigo-500/10 blur-3xl" />
      <div className="absolute top-1/3 right-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/10 to-orange-500/5 blur-2xl" />
    </div>
  )
}

// ── Wallet card preview ───────────────────────────────────────────────────────

function WalletCardPreview({ fiatAccount, btcAccount }: {
  fiatAccount?: { accountNumber: string }
  btcAccount?:  { btcAddress: string }
}) {
  const fiatLast4 = fiatAccount?.accountNumber?.slice(-4) || "••••"
  const btcAddr = btcAccount?.btcAddress || ""
  const btcShort = btcAddr ? `${btcAddr.slice(0, 4)}...${btcAddr.slice(-4)}` : "••••...••••"

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      {/* Bitcoin card (back) */}
      <div
        className="absolute top-4 left-4 right-4 h-[140px] rounded-2xl p-5 text-white shadow-xl"
        style={{
          background: "linear-gradient(135deg, #F7931A 0%, #E2761B 100%)",
          transform: "rotate(-4deg)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-[10px] font-bold">₿</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Bitcoin</span>
        </div>
        <p className="mt-8 font-mono text-[11px] tracking-wide opacity-90">{btcShort}</p>
      </div>

      {/* Fiat card (front) */}
      <div
        className="relative h-[160px] rounded-2xl p-5 text-white shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #0F4C81 0%, #1E3A5F 50%, #0D3F6B 100%)",
          transform: "rotate(2deg)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{BANK_NAME}</span>
          </div>
          <div className="flex gap-1">
            <div className="h-5 w-5 rounded-full bg-red-500/80" />
            <div className="h-5 w-5 rounded-full bg-amber-400/80 -ml-2" />
          </div>
        </div>
        <p className="mt-8 font-mono text-lg tracking-[0.2em]">•••• •••• •••• {fiatLast4}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] opacity-60">USD Account</span>
          <span className="text-[10px] font-medium opacity-80">VISA</span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingFlow({ session, fiatAccount, btcAccount }: OnboardingFlowProps) {
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const touchStartX = useRef(0)
  const totalSlides = 3

  const dismiss = useCallback(() => {
    localStorage.setItem("onboardingShown", "true")
  }, [])

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setSlide(index)
    }
  }

  const next = () => goToSlide(slide + 1)
  const prev = () => goToSlide(slide - 1)

  // Swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
  }

  // Check if already seen
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const shown = localStorage.getItem("onboardingShown")
      if (!shown) {
        setVisible(true)
      }
    }
  }, [])

  const finishOnboarding = useCallback(() => {
    dismiss()
    setVisible(false)
  }, [dismiss])

  const goToDashboard = useCallback(() => {
    dismiss()
    setVisible(false)
    router.push("/app/dashboard")
  }, [dismiss, router])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <BackgroundShapes />

      <div
        className="relative flex w-full max-w-md flex-col items-center px-6 py-8"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Skip button */}
        <button
          onClick={finishOnboarding}
          className="absolute -top-2 right-0 px-4 py-2 text-[13px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
        >
          Skip →
        </button>

        {/* ── Slide 1: Welcome ── */}
        {slide === 0 && (
          <div className="w-full text-center animate-[fadeIn_0.4s_ease-out]">
            {/* Logo/Brand mark */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Sparkles className="h-10 w-10 text-white" />
            </div>

            <h1 className="mb-2 text-[26px] font-bold text-slate-900 tracking-tight">
              Welcome, {session.user.firstName}!
            </h1>
            <p className="mb-8 text-[15px] text-slate-500 leading-relaxed">
              Your {BANK_NAME} account is ready.<br />
              Let&apos;s get you started.
            </p>

            {/* Quick stats */}
            <div className="mb-8 flex justify-center gap-6">
              <div className="text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-blue-50">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <p className="mt-2 text-[11px] font-medium text-slate-600">2 Wallets</p>
              </div>
              <div className="text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-emerald-50">
                  <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-2 text-[11px] font-medium text-slate-600">Global Access</p>
              </div>
              <div className="text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-amber-50">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <p className="mt-2 text-[11px] font-medium text-slate-600">Secure</p>
              </div>
            </div>

            <button
              onClick={next}
              className="group h-[52px] w-full rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-[15px] font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:shadow-xl hover:shadow-slate-900/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Get Started
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* ── Slide 2: Your Wallets ── */}
        {slide === 1 && (
          <div className="w-full text-center animate-[fadeIn_0.4s_ease-out]">
            <WalletCardPreview fiatAccount={fiatAccount} btcAccount={btcAccount} />

            <h2 className="mt-8 mb-2 text-[22px] font-bold text-slate-900 tracking-tight">
              Your Wallets Are Ready
            </h2>
            <p className="mb-8 text-[14px] text-slate-500 leading-relaxed">
              Manage USD and Bitcoin in one place.<br />
              Swap between currencies instantly.
            </p>

            <div className="mb-8 space-y-4">
              <FeatureItem
                icon={ArrowLeftRight}
                title="Instant Swaps"
                description="Convert between USD and BTC with competitive rates"
                color="#3B82F6"
              />
              <FeatureItem
                icon={TrendingUp}
                title="Real-Time Tracking"
                description="Monitor your portfolio value 24/7"
                color="#10B981"
              />
            </div>

            <button
              onClick={next}
              className="group h-[52px] w-full rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-[15px] font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:shadow-xl hover:shadow-slate-900/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* ── Slide 3: Features & Get Started ── */}
        {slide === 2 && (
          <div className="w-full text-center animate-[fadeIn_0.4s_ease-out]">
            {/* Feature grid icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Zap className="h-10 w-10 text-white" />
            </div>

            <h2 className="mb-2 text-[22px] font-bold text-slate-900 tracking-tight">
              Everything You Need
            </h2>
            <p className="mb-8 text-[14px] text-slate-500 leading-relaxed">
              Powerful features to manage your finances
            </p>

            <div className="mb-8 space-y-4">
              <FeatureItem
                icon={CreditCard}
                title="Virtual & Physical Cards"
                description="Spend anywhere with your debit card"
                color="#8B5CF6"
              />
              <FeatureItem
                icon={Shield}
                title="Bank-Grade Security"
                description="Your funds are protected with enterprise security"
                color="#10B981"
              />
              <FeatureItem
                icon={Globe}
                title="Global Transfers"
                description="Send money worldwide with low fees"
                color="#F59E0B"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={goToDashboard}
                className="group h-[52px] w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[15px] font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Dot navigation ── */}
        <div className="mt-10 flex gap-2.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === slide
                  ? "w-6 bg-slate-900"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>

        {/* Progress indicator */}
        <p className="mt-4 text-[11px] text-slate-400">
          {slide + 1} of {totalSlides}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
