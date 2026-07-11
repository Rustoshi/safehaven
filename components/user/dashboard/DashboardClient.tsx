"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { useRouter } from "next/navigation"
import type { Session } from "next-auth"
import {
  Bell, Sun, Moon, Eye, EyeOff, Plus, Send, ArrowDownLeft,
  LayoutGrid, X, Repeat, ArrowUpDown, Landmark, FileText,
  BarChart2, ShieldCheck, MessageCircle, CreditCard,
  Clock, BarChart, Zap, Headphones, ArrowRight, Globe, Users,
  Info, Mail, DollarSign, Download, Home, PieChart, LogOut, Wallet,
  Copy, Check, Bitcoin, Building2, Menu, Settings,
} from "lucide-react"
import type {
  UserDashboardData, SerializedTransaction,
} from "@/lib/services/dashboard-user.service"
import { useSidebar } from "@/components/user/UserAppShell"
import { useTheme, useThemeColors } from "@/components/shared/ThemeProvider"
import { useCurrency } from "@/components/shared/PlatformSettingsProvider"
import { BANK_NAME } from "@/lib/brand"

// ── Types / consts ────────────────────────────────────────────────────────────

interface Props {
  data:           UserDashboardData
  btcRate:        number
  session:        Session
  adminBtcWallet: string | null
}

const CREDIT_TYPES = ["deposit", "admin_deposit", "transfer_in", "refund", "loan_disbursement", "swap_in"]

const TIPS = [
  { icon: Clock,      title: "Save Regularly",   body: "Set up automatic transfers to build your emergency fund" },
  { icon: BarChart,   title: "Track Spending",    body: "Review your monthly analytics to spot saving opportunities" },
  { icon: Repeat,     title: "Diversify",         body: "Consider holding some balance in Bitcoin for portfolio variety" },
  { icon: ShieldCheck,title: "Stay Verified",     body: "Keep your KYC up to date to maintain full platform access" },
  { icon: Send,       title: "Send Instantly",    body: `Internal transfers between ${BANK_NAME} users are instant and free` },
]

const MORE_ITEMS = [
  { label: "Beneficiaries", sub: "Saved recipients",   icon: Users,         color: "#3B82F6", bg: "rgba(59,130,246,0.15)", href: "/app/beneficiaries" },
  { label: "Swap BTC",     sub: "Bitcoin swap",       icon: ArrowUpDown,   color: "#F59E0B", bg: "rgba(245,158,11,0.15)", href: "/app/swap" },
  { label: "Statements",   sub: "Account statements",  icon: BarChart2,    color: "#14B8A6", bg: "rgba(20,184,166,0.15)", href: "/app/statements" },
  { label: "Support",      sub: "Get help",           icon: MessageCircle, color: "#EC4899", bg: "rgba(236,72,153,0.15)", href: "/app/support" },
  { label: "Loans",        sub: "Loan products",      icon: Landmark,      color: "#818CF8", bg: "rgba(129,140,248,0.15)",href: "/app/loans" },
  { label: "Tax Refund",   sub: "Tax documents",      icon: FileText,      color: "#00C896", bg: "rgba(0,200,150,0.15)",  href: "/app/tax-refunds" },
  { label: "KYC Verify",   sub: "Identity check",     icon: ShieldCheck,   color: "#14B8A6", bg: "rgba(20,184,166,0.15)", href: "/app/kyc" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good Morning \u{1F44B}"
  if (h < 18) return "Good Afternoon \u{1F44B}"
  return "Good Evening \u{1F44B}"
}


function fmtDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, "0")
  const mon = d.toLocaleString("en-US", { month: "short" })
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${day} ${mon} ${year}, ${h}:${m}`
}

// ── Card Network Logos ────────────────────────────────────────────────────────

function VisaLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M293.2 348.7l33.4-195.8h53.4l-33.4 195.8h-53.4zm246.8-191c-10.6-4-27.2-8.3-47.9-8.3-52.8 0-90 26.5-90.3 64.5-.3 28.1 26.6 43.8 46.9 53.1 20.8 9.6 27.8 15.7 27.7 24.3-.1 13.1-16.6 19.1-31.9 19.1-21.4 0-32.7-3-50.3-10.2l-6.9-3.1-7.5 43.8c12.5 5.4 35.6 10.1 59.6 10.4 56.2 0 92.6-26.2 93-66.7.2-22.2-14-39.1-44.8-53.1-18.7-9-30.1-15-30-24.1 0-8.1 9.7-16.7 30.6-16.7 17.5-.3 30.1 3.5 40 7.5l4.8 2.2 7.2-42.7zm137.3-4.8h-41.3c-12.8 0-22.4 3.5-28 16.2l-79.4 179.4h56.2s9.2-24.1 11.3-29.4h68.6c1.6 6.9 6.5 29.4 6.5 29.4h49.7l-43.6-195.6zm-65.8 126.2c4.4-11.3 21.4-54.7 21.4-54.7-.3.5 4.4-11.4 7.1-18.7l3.6 16.9s10.3 46.8 12.4 56.5h-44.5zM313 152.9l-52.5 133.6-5.6-27.1c-9.7-31.2-40-65-73.9-81.9l47.9 170.9h56.6l84.2-195.5H313z" fill="white"/>
      <path d="M146.9 152.9H60.3l-.7 3.9c67.1 16.2 111.5 55.3 129.9 102.2l-18.7-89.9c-3.2-12.3-12.8-15.7-24.9-16.2z" fill="rgba(255,255,255,0.7)"/>
    </svg>
  )
}

function MastercardLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="310" cy="250" r="160" fill="#EB001B" opacity="0.9"/>
      <circle cx="470" cy="250" r="160" fill="#F79E1B" opacity="0.9"/>
      <path d="M390 130C420 160 440 200 440 250C440 300 420 340 390 370C360 340 340 300 340 250C340 200 360 160 390 130Z" fill="#FF5F00"/>
    </svg>
  )
}

function AmexLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 250L100 140H160L190 200L220 140H280L210 250L280 360H220L190 300L160 360H100L40 250Z" fill="white"/>
      <path d="M300 140H400L420 180L440 140H540V360H440L420 320L400 360H300V140ZM340 180V320H380V260H420V220H380V180H340Z" fill="white"/>
      <path d="M560 140H740V180H600V230H720V270H600V320H740V360H560V140Z" fill="white"/>
    </svg>
  )
}

function CardNetworkLogo({ network, style }: { network: string; style?: React.CSSProperties }) {
  const baseStyle = { height: 24, width: "auto", ...style }
  switch (network?.toLowerCase()) {
    case "visa":
      return <VisaLogo style={baseStyle} />
    case "mastercard":
      return <MastercardLogo style={baseStyle} />
    case "amex":
      return <AmexLogo style={baseStyle} />
    default:
      return <VisaLogo style={baseStyle} />
  }
}

// ── Theme Toggle Button ───────────────────────────────────────────────────────

function ThemeToggleButton({ size = 34, borderRadius = "50%" }: { size?: number; borderRadius?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div
      onClick={toggleTheme}
      style={{
        width: size, height: size, borderRadius,
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        transition: "background 200ms, border-color 200ms",
      }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun style={{ width: 17, height: 17, color: "#F59E0B" }} />
      ) : (
        <Moon style={{ width: 17, height: 17, color: "#64748B" }} />
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardClient({ data, btcRate: initialBtcRate, session, adminBtcWallet }: Props) {
  const router = useRouter()
  const { open: openSidebar } = useSidebar()
  const colors = useThemeColors()
  const { formatAmount, symbol: currencySymbol } = useCurrency()

  // Accounts
  const fiatAccount = data.accounts.find((a) => a.walletType === "fiat")
  const btcAccount  = data.accounts.find((a) => a.walletType === "bitcoin")
  const walletCards = data.accounts

  // Live BTC rate (CoinGecko, refreshes every 60s)
  const [btcRate, setBtcRate] = useState(initialBtcRate)
  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      try {
        const res = await fetch("/api/wallet/btc-rate")
        if (res.ok && mounted) {
          const d = await res.json()
          if (d.rate > 0) setBtcRate(d.rate)
        }
      } catch { /* */ }
    }
    const iv = setInterval(refresh, 60_000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  // Notification count
  const [unreadCount, setUnreadCount] = useState(data.pendingActions.unreadNotifications)
  const notifBadge = unreadCount === 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount)

  // Privacy toggle
  const [balanceHidden, setBalanceHidden] = useState(false)

  // Sheets
  const [moreOpen, setMoreOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [sendClosing, setSendClosing] = useState(false)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpClosing, setTopUpClosing] = useState(false)

  useBodyScrollLock(moreOpen || sendOpen || topUpOpen)

  const closeSend = useCallback(() => {
    setSendClosing(true)
    setTimeout(() => {
      setSendOpen(false)
      setSendClosing(false)
    }, 200)
  }, [])

  const closeTopUp = useCallback(() => {
    setTopUpClosing(true)
    setTimeout(() => {
      setTopUpOpen(false)
      setTopUpClosing(false)
    }, 200)
  }, [])

  // Copy helper
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const copyText = useCallback((text: string, field: string) => {
    const done = () => { setCopiedField(field); setTimeout(() => setCopiedField(null), 2000) }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        // Fallback for non-HTTPS / mobile
        const ta = document.createElement("textarea")
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"
        document.body.appendChild(ta); ta.select()
        try { document.execCommand("copy"); done() } catch { /* */ }
        document.body.removeChild(ta)
      })
    } else {
      const ta = document.createElement("textarea")
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"
      document.body.appendChild(ta); ta.select()
      try { document.execCommand("copy"); done() } catch { /* */ }
      document.body.removeChild(ta)
    }
  }, [])

  // Service statuses (admin-configurable)
  interface ServiceCfg { enabled: boolean; status: string; statusLabel: string; description: string }
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceCfg>>({})
  useEffect(() => {
    fetch("/api/user/services").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setServiceStatuses(d) }).catch(() => {})
  }, [])

  // Top Up: fetch admin payment details
  interface TopUpMethod { _id: string; name: string; slug: string; type: string; instructions: string; depositTarget: string }
  const [topUpMethods, setTopUpMethods] = useState<TopUpMethod[]>([])
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [topUpTab, setTopUpTab] = useState<"bank" | "btc">("bank")
  useEffect(() => {
    if (!topUpOpen || topUpMethods.length > 0) return
    setTopUpLoading(true)
    ;(async () => {
      try {
        const res = await fetch("/api/user/payment-methods")
        if (res.ok) { const d = await res.json(); setTopUpMethods(d.methods || []) }
      } catch { /* */ }
      setTopUpLoading(false)
    })()
  }, [topUpOpen, topUpMethods.length])

  // Carousel
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeCard, setActiveCard] = useState(0)

  // Active Cards carousel
  const activeCardsRef = useRef<HTMLDivElement>(null)
  const [activeCardIdx, setActiveCardIdx] = useState(0)

  // Smart tip rotation
  const [tipIdx, setTipIdx] = useState(0)
  const [tipVisible, setTipVisible] = useState(true)

  // Notification polling
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/user/notifications?limit=1")
        if (res.ok) {
          const json = await res.json()
          setUnreadCount(json.unreadCount)
        }
      } catch { /* */ }
    }, 60_000)
    return () => clearInterval(poll)
  }, [])

  // Refresh on focus
  useEffect(() => {
    const handler = () => router.refresh()
    window.addEventListener("focus", handler)
    return () => window.removeEventListener("focus", handler)
  }, [router])

  // Tip rotation
  useEffect(() => {
    const iv = setInterval(() => {
      setTipVisible(false)
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % TIPS.length)
        setTipVisible(true)
      }, 300)
    }, 10_000)
    return () => clearInterval(iv)
  }, [])

  // JS-based card snap + active card tracking
  useEffect(() => {
    const container = carouselRef.current
    if (!container) return
    const cards = container.querySelectorAll<HTMLElement>("[data-card-idx]")
    if (cards.length === 0) return

    let scrollTimer: ReturnType<typeof setTimeout> | null = null

    const snapToNearest = () => {
      const scrollLeft = container.scrollLeft
      let closest = 0
      let minDist = Infinity
      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - scrollLeft)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      container.scrollTo({ left: cards[closest].offsetLeft, behavior: "smooth" })
      setActiveCard(closest)
    }

    const onScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(snapToNearest, 80)
    }

    container.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", onScroll)
      if (scrollTimer) clearTimeout(scrollTimer)
    }
  }, [walletCards.length])

  // JS-based card snap + active card tracking for active cards
  useEffect(() => {
    const container = activeCardsRef.current
    if (!container) return
    const cards = container.querySelectorAll<HTMLElement>("[data-active-card-idx]")
    if (cards.length === 0) return

    let scrollTimer: ReturnType<typeof setTimeout> | null = null

    const snapToNearest = () => {
      const scrollLeft = container.scrollLeft
      let closest = 0
      let minDist = Infinity
      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - scrollLeft)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      container.scrollTo({ left: cards[closest].offsetLeft, behavior: "smooth" })
      setActiveCardIdx(closest)
    }

    const onScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(snapToNearest, 80)
    }

    container.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", onScroll)
      if (scrollTimer) clearTimeout(scrollTimer)
    }
  }, [])

  // Compute achievements
  const achievements: { icon: string; iconBg: string; title: string; body: string }[] = []
  if (data.incomeThisMonth > 0 || (fiatAccount && fiatAccount.balance > 0)) {
    achievements.push({ icon: "\u{1F3C6}", iconBg: "rgba(0,200,150,0.15)", title: "First Deposit", body: "Great start to your financial journey!" })
  }
  if (session.user.kycStatus === "verified") {
    achievements.push({ icon: "\u{1F6E1}", iconBg: "rgba(59,158,255,0.15)", title: "Identity Verified", body: "Full platform access unlocked." })
  }
  if (data.recentTransactions.some((t) => t.type === "transfer_out")) {
    achievements.push({ icon: "\u{1F680}", iconBg: "rgba(167,139,250,0.15)", title: "First Transfer", body: "You sent your first payment!" })
  }

  // Fiat card data
  const fiatBalance = fiatAccount ? formatAmount(fiatAccount.balance / 100) : `${currencySymbol}0.00`
  const fiatLast4   = fiatAccount ? fiatAccount.accountNumber.slice(-4) : "0000"
  const fiatFrozen  = fiatAccount?.isFrozen ?? false
  const lastTxDate  = data.recentTransactions.length > 0
    ? new Date(data.recentTransactions[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Never"

  // BTC card data
  const btcBal     = btcAccount ? (btcAccount.btcBalance / 1e8).toFixed(8) : "0.00000000"
  const btcUsdVal  = btcAccount ? formatAmount((btcAccount.btcBalance / 1e8) * btcRate) : `${currencySymbol}0.00`

  // Balance count-up animation (runs once on initial data load)
  const [displayFiat, setDisplayFiat] = useState(`${currencySymbol}0.00`)
  const [displayBtc, setDisplayBtc] = useState("0.00000000")
  const [displayBtcUsd, setDisplayBtcUsd] = useState(`${currencySymbol}0.00`)
  const balanceAnimated = useRef(false)

  useEffect(() => {
    if (balanceAnimated.current) {
      // Already animated — just set final values directly
      if (fiatAccount) setDisplayFiat(formatAmount(fiatAccount.balance / 100))
      if (btcAccount) {
        const bv = btcAccount.btcBalance / 1e8
        setDisplayBtc(bv.toFixed(8))
        setDisplayBtcUsd(formatAmount(bv * btcRate))
      }
      return
    }
    if (!fiatAccount && !btcAccount) return
    balanceAnimated.current = true

    const fiatTarget = fiatAccount ? fiatAccount.balance / 100 : 0
    const btcTarget = btcAccount ? btcAccount.btcBalance / 1e8 : 0
    const btcUsdTarget = btcTarget * btcRate
    const duration = 800
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3)

      const fiatVal = fiatTarget * ease
      setDisplayFiat(formatAmount(fiatVal))

      const btcVal = btcTarget * ease
      setDisplayBtc(btcVal.toFixed(8))
      const btcUsdVal2 = btcUsdTarget * ease
      setDisplayBtcUsd(formatAmount(btcUsdVal2))

      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [fiatAccount, btcAccount, btcRate, formatAmount])

  const navigate = useCallback((href: string) => {
    setMoreOpen(false)
    setSendOpen(false)
    router.push(href)
  }, [router])


  return (
    <div
      className="dash-shell"
      style={{
        background: colors.bgBase,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transition: "background-color 200ms ease",
      }}
    >

      {/* ═══ MAIN COLUMN ═══ */}
      <div className="dash-main">

      {/* ── Hero zone: header → cards → actions ── */}
      <div style={{
        background: colors.bgHero,
        paddingBottom: 24,
        transition: "background 200ms ease",
      }}>

      {/* ═══ SECTION 1: HEADER (mobile) ═══ */}
      <div className="dash-mobile-header" style={{ padding: "16px 20px 8px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            onClick={openSidebar}
            className="lg:hidden"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: colors.bgHover,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Menu style={{ width: 18, height: 18, color: colors.textMuted }} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: colors.textTertiary, fontWeight: 500, margin: 0 }}>{getGreeting()}</p>
            <p style={{ fontSize: 16, color: colors.textPrimary, fontWeight: 700, margin: 0 }}>{session.user.firstName} {session.user.lastName}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <ThemeToggleButton />
          <div
            onClick={() => navigate("/app/notifications")}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: colors.bgActive,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
            }}
          >
            <Bell style={{ width: 17, height: 17, color: colors.textSecondary }} />
            {notifBadge && (
              <div style={{
                position: "absolute", top: -3, right: -3,
                minWidth: 16, height: 16, borderRadius: "50%",
                background: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#fff", padding: "0 3px",
              }}>
                {notifBadge}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SECTION 1B: DESKTOP TOP BAR ═══ */}
      <div className="dash-topbar" style={{
        padding: "16px 20px 12px",
        alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 13, color: colors.textTertiary, margin: 0 }}>{getGreeting()}</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>{session.user.firstName} {session.user.lastName}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            onClick={() => navigate("/app/notifications")}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: colors.bgActive, border: `1px solid ${colors.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
            }}
          >
            <Bell style={{ width: 17, height: 17, color: colors.textSecondary }} />
            {notifBadge && (
              <div style={{
                position: "absolute", top: -3, right: -3,
                minWidth: 16, height: 16, borderRadius: "50%",
                background: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#fff", padding: "0 3px",
              }}>
                {notifBadge}
              </div>
            )}
          </div>
          <ThemeToggleButton size={36} borderRadius="10px" />
        </div>
      </div>

      {/* ═══ SECTION 2A: MOBILE — Swipeable Balance Cards ═══ */}
      <div className="dash-stagger dash-stagger-1 dash-mobile-cards">
        <div ref={carouselRef} className="scroll-x-hidden dash-wallet-grid">
          {/* Fiat Card */}
          {fiatAccount && (
            <div
              data-card-idx={0}
              className="dash-card-shimmer dash-glass-card"
              style={{
                borderRadius: 20, padding: "18px 20px",
                position: "relative", overflow: "hidden",
                background: "rgba(11, 26, 48, 0.8)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                border: "1px solid rgba(59,158,255,0.18)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(59,158,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 70% 10%, rgba(59,158,255,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(0,200,150,0.1) 0%, transparent 60%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", width: 300, height: 300, top: -200, right: -80, borderRadius: "50%", border: "1px solid rgba(59,158,255,0.06)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(59,158,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 style={{ width: 14, height: 14, color: "#3B9EFF" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(59,158,255,0.9)", margin: 0 }}>{BANK_NAME.toUpperCase()}</p>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0, marginTop: 1 }}>{session.user.firstName} {session.user.lastName}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0 }}>Fiat Account</p>
                  <p style={{ fontSize: 10, fontFamily: "'SF Mono', monospace", color: "rgba(59,158,255,0.7)", margin: 0, marginTop: 1 }}>&bull;&bull;&bull;&bull; {fiatLast4}</p>
                </div>
              </div>

              <div style={{ position: "relative", zIndex: 1, marginTop: 16, textAlign: "center" }}>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0, fontWeight: 500 }}>Available Balance</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
                  <p style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -0.5, margin: 0 }}>
                    {balanceHidden ? "\u2022\u2022\u2022\u2022\u2022" : displayFiat}
                  </p>
                  <div onClick={() => setBalanceHidden((v) => !v)} style={{ cursor: "pointer", padding: 4 }}>
                    {balanceHidden ? <EyeOff style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} /> : <Eye style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />}
                  </div>
                </div>
              </div>

              <div
                onClick={(e) => { e.stopPropagation(); copyText(fiatAccount.accountNumber, "fiat-acct") }}
                style={{ position: "relative", zIndex: 1, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}
              >
                <span style={{ fontSize: 11, fontFamily: "'SF Mono', monospace", color: "rgba(255,255,255,0.5)", letterSpacing: "0.4px" }}>{fiatAccount.accountNumber}</span>
                {copiedField === "fiat-acct" ? <Check style={{ width: 12, height: 12, color: "#00C896" }} /> : <Copy style={{ width: 12, height: 12, color: "rgba(255,255,255,0.3)" }} />}
              </div>

              <div style={{ position: "relative", zIndex: 1, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: fiatFrozen ? "#EF4444" : "#00C896", background: fiatFrozen ? "rgba(239,68,68,0.12)" : "rgba(0,200,150,0.1)", padding: "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: fiatFrozen ? "#EF4444" : "#00C896" }} />
                  {fiatFrozen ? "Frozen" : "Active"}
                </span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Last updated: {lastTxDate}</span>
              </div>
            </div>
          )}

          {/* Bitcoin Card */}
          {btcAccount && (
            <div
              data-card-idx={fiatAccount ? 1 : 0}
              className="dash-card-shimmer dash-glass-card"
              style={{
                borderRadius: 20, padding: "18px 20px",
                position: "relative", overflow: "hidden",
                background: "rgba(26, 20, 8, 0.8)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                border: "1px solid rgba(245,158,11,0.18)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(245,158,11,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 70% 10%, rgba(245,158,11,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(251,191,36,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", width: 300, height: 300, top: -200, right: -80, borderRadius: "50%", border: "1px solid rgba(245,158,11,0.06)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bitcoin style={{ width: 14, height: 14, color: "#F59E0B" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,158,11,0.9)", margin: 0 }}>BITCOIN WALLET</p>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0, marginTop: 1 }}>{session.user.firstName} {session.user.lastName}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0 }}>Crypto Account</p>
                  <p style={{ fontSize: 10, color: "rgba(245,158,11,0.8)", margin: 0, marginTop: 1 }}>{"\u20BF"} BTC</p>
                </div>
              </div>

              <div style={{ position: "relative", zIndex: 1, marginTop: 16, textAlign: "center" }}>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0, fontWeight: 500 }}>Bitcoin Balance</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>
                    {balanceHidden ? "\u2022\u2022\u2022\u2022\u2022" : `${displayBtc} BTC`}
                  </p>
                  <div onClick={() => setBalanceHidden((v) => !v)} style={{ cursor: "pointer", padding: 4 }}>
                    {balanceHidden ? <EyeOff style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} /> : <Eye style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />}
                  </div>
                </div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{balanceHidden ? "" : `\u2248 ${displayBtcUsd}`}</p>
              </div>

              {adminBtcWallet && (
                <div
                  onClick={(e) => { e.stopPropagation(); copyText(adminBtcWallet, "btc-addr") }}
                  style={{ position: "relative", zIndex: 1, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}
                >
                  <span style={{ fontSize: 10, fontFamily: "'SF Mono', monospace", color: "rgba(245,158,11,0.6)", letterSpacing: "0.3px" }}>{adminBtcWallet.slice(0, 8)}...{adminBtcWallet.slice(-6)}</span>
                  {copiedField === "btc-addr" ? <Check style={{ width: 12, height: 12, color: "#00C896" }} /> : <Copy style={{ width: 12, height: 12, color: "rgba(255,255,255,0.3)" }} />}
                </div>
              )}

              <div style={{ position: "relative", zIndex: 1, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: "#F59E0B", background: "rgba(245,158,11,0.1)", padding: "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F59E0B" }} />
                  1 BTC = {currencySymbol}{btcRate.toLocaleString()}
                </span>
                <span style={{ fontSize: 8, color: "rgba(245,158,11,0.6)", fontWeight: 500 }}>Live Rate</span>
              </div>
            </div>
          )}
        </div>

        {/* Carousel dots (mobile only) */}
        {walletCards.length > 1 && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 6 }}>
            {walletCards.map((_, i) => (
              <div key={i} style={{ width: i === activeCard ? 20 : 6, height: 6, borderRadius: 3, background: i === activeCard ? "#3B9EFF" : "rgba(255,255,255,0.2)", transition: "width 200ms, background 200ms" }} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ SECTION 2B: DESKTOP — Unified Portfolio Card ═══ */}
      <div className="dash-stagger dash-stagger-1 dash-desktop-portfolio">
        <div
          className="dash-card-shimmer"
          style={{
            borderRadius: 22, padding: "0",
            position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg, #0F3D7A 0%, #1556A8 40%, #1A6AC4 100%)",
            boxShadow: "0 12px 48px rgba(15,61,122,0.3), 0 4px 16px rgba(0,0,0,0.35)",
          }}
        >
          {/* Subtle overlay patterns */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 0% 100%, rgba(0,0,0,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 500, height: 500, top: -350, right: -150, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 350, height: 350, bottom: -250, left: -100, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />

          {/* ── ROW 1: Bank Name + Account Number ── */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 24px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Building2 style={{ width: 18, height: 18, color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>{BANK_NAME}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0, marginTop: 2 }}>Primary Account</p>
              </div>
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); if (fiatAccount) copyText(fiatAccount.accountNumber, "fiat-acct") }}
              style={{
                background: "rgba(255,255,255,0.12)", borderRadius: 10,
                padding: "8px 14px", cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.7)", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Account Number</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 13, fontFamily: "'SF Mono', monospace", fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>
                  ●●●●●● {fiatLast4}
                </span>
                {copiedField === "fiat-acct" ? <Check style={{ width: 11, height: 11, color: "#fff" }} /> : <Copy style={{ width: 11, height: 11, color: "rgba(255,255,255,0.5)" }} />}
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ position: "relative", zIndex: 1, height: 1, background: "rgba(255,255,255,0.1)", margin: "18px 24px" }} />

          {/* ── ROW 2: Account Holder | Fiat Balance | Bitcoin Balance ── */}
          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: "0 24px" }}>
            {/* Account Holder */}
            <div style={{
              background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Account Holder</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "8px 0 12px" }}>
                {session.user.firstName} {session.user.lastName}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: fiatFrozen ? "#FCA5A5" : "#86EFAC",
                  display: "inline-flex", alignItems: "center", gap: 5, width: "fit-content",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: fiatFrozen ? "#FCA5A5" : "#86EFAC" }} />
                  {fiatFrozen ? "Account Frozen" : "Account Active"}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: session.user.kycStatus === "verified" ? "#86EFAC" : "#FDE68A",
                  display: "inline-flex", alignItems: "center", gap: 5, width: "fit-content",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: session.user.kycStatus === "verified" ? "#86EFAC" : "#FDE68A" }} />
                  {session.user.kycStatus === "verified" ? "Fully Verified" : "Verification Required"}
                </span>
              </div>
            </div>

            {/* Fiat Balance */}
            <div style={{
              background: "rgba(59,158,255,0.08)", borderRadius: 14, padding: "16px 18px",
              border: "1px solid rgba(59,158,255,0.15)", textAlign: "center",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Fiat Balance</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
                <p style={{ fontSize: 30, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -0.5 }}>
                  {balanceHidden ? "●●●●●" : displayFiat}
                </p>
                <div onClick={() => setBalanceHidden((v) => !v)} style={{ cursor: "pointer", padding: 3 }}>
                  {balanceHidden ? <EyeOff style={{ width: 16, height: 16, color: "rgba(255,255,255,0.4)" }} /> : <Eye style={{ width: 16, height: 16, color: "rgba(255,255,255,0.4)" }} />}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "rgba(59,158,255,0.8)", margin: "6px 0 0", fontWeight: 600 }}>Fiat Balance</p>
            </div>

            {/* Bitcoin Balance */}
            <div style={{
              background: "rgba(245,158,11,0.08)", borderRadius: 14, padding: "16px 18px",
              border: "1px solid rgba(245,158,11,0.15)", textAlign: "center",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bitcoin Balance</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "8px 0 0", letterSpacing: -0.3 }}>
                {balanceHidden ? "●●●●●" : `${displayBtc} BTC`}
              </p>
              <p style={{ fontSize: 11, color: "rgba(245,158,11,0.8)", margin: "4px 0 0", fontWeight: 600 }}>
                {balanceHidden ? "" : `≈ ${displayBtcUsd}`}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: "4px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#86EFAC" }} />
                1 BTC = {currencySymbol}{btcRate.toLocaleString()}
              </p>
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ position: "relative", zIndex: 1, height: 1, background: "rgba(255,255,255,0.1)", margin: "18px 24px" }} />

          {/* ── ROW 3: Total Portfolio + Action Buttons ── */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 22px" }}>
            {/* Total Portfolio Badge */}
            <div style={{
              background: "rgba(255,255,255,0.12)", borderRadius: 14,
              padding: "10px 18px", border: "1px solid rgba(255,255,255,0.12)",
            }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Portfolio</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "2px 0 0", letterSpacing: -0.5 }}>
                {balanceHidden ? "●●●●●●●" : (() => {
                  const fiatVal = fiatAccount ? fiatAccount.balance / 100 : 0
                  const btcVal = btcAccount ? (btcAccount.btcBalance / 1e8) * btcRate : 0
                  return formatAmount(fiatVal + btcVal)
                })()}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => navigate("/app/transfer")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 12,
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", transition: "background 150ms",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Send style={{ width: 15, height: 15, transform: "rotate(-45deg)" }} /> Send Money
              </button>
              <button
                onClick={() => navigate("/app/deposit")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 12,
                  background: "#fff", border: "none",
                  color: "#1A7AF8", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", transition: "transform 100ms",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <Plus style={{ width: 15, height: 15 }} /> Add Money
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: QUICK ACTIONS ═══ */}
      {(() => {
        const actions = [
          { label: "Send",       icon: Send,          onClick: () => navigate("/app/transfer"),     color: "#3B9EFF", isPrimary: true },
          { label: "Receive",    icon: ArrowDownLeft, onClick: () => navigate("/app/deposit"),      color: "#00C896", isPrimary: false },
          { label: "Swap",       icon: ArrowUpDown,   onClick: () => navigate("/app/swap"),         color: "#A78BFA", isPrimary: false },
          { label: "Statements", icon: BarChart2,     onClick: () => navigate("/app/statements"), color: "#14B8A6", isPrimary: false },
          { label: "Support",    icon: MessageCircle, onClick: () => navigate("/app/support"),      color: "#EC4899", isPrimary: false },
          { label: "More",       icon: LayoutGrid,    onClick: () => setMoreOpen(true),             color: colors.textSecondary, isPrimary: false },
        ]
        return (
          <>
          {/* Mobile: inline glassmorphism action bar */}
          <div className="dash-actions-mobile-strip">
            <div className="dash-mobile-action-bar">
              {actions.slice(0, 5).map((btn) => {
                const Icon = btn.icon
                return (
                  <div
                    key={btn.label}
                    onClick={btn.onClick}
                    className={`dash-mobile-action-item${btn.isPrimary ? " action-primary" : ""}`}
                  >
                    <div className="dash-mobile-action-icon" style={{ color: btn.color }}>
                      <Icon style={{
                        width: 20, height: 20,
                        ...(btn.label === "Send" ? { transform: "rotate(-45deg)" } : {}),
                      }} />
                    </div>
                    <span className="dash-mobile-action-label">{btn.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Desktop: unified card strip */}
          <div className="dash-section dash-stagger dash-stagger-2 dash-actions-desktop" style={{ paddingTop: 20, paddingBottom: 8 }}>
            <div className="dash-action-strip">
              {actions.map((btn, idx) => {
                const Icon = btn.icon
                return (
                  <div
                    key={btn.label}
                    onClick={btn.onClick}
                    className="dash-strip-item"
                    style={{ "--strip-color": btn.color } as React.CSSProperties}
                  >
                    <div className="dash-strip-icon">
                      <Icon style={{
                        width: 18, height: 18,
                        color: btn.color,
                        ...(btn.label === "Send" ? { transform: "rotate(-45deg)" } : {}),
                      }} />
                    </div>
                    <span className="dash-strip-label">{btn.label}</span>
                    {idx < actions.length - 1 && <div className="dash-strip-divider" />}
                  </div>
                )
              })}
            </div>
          </div>
          </>
        )
      })()}

      </div>{/* end hero zone */}

      {/* ═══ SEND MONEY MODAL ═══ */}
      {(sendOpen || sendClosing) && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeSend}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              animation: sendClosing ? "overlayFadeOut 180ms ease-in forwards" : "overlayFadeIn 250ms ease-out forwards",
            }}
          />

          {/* Modal */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 201,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "24px 20px", pointerEvents: "none",
          }}>
            <div
              key={sendClosing ? "closing" : "open"}
              style={{
                width: "100%", maxWidth: 400, pointerEvents: sendClosing ? "none" : "auto",
                background: "linear-gradient(180deg, #151E30 0%, #111827 100%)",
                borderRadius: 24, padding: "0 20px 20px", position: "relative",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
                willChange: "transform, opacity",
                animation: sendClosing
                  ? "modalSpringOut 180ms ease-in forwards"
                  : "modalSpringIn 450ms cubic-bezier(.15,1,.3,1) forwards",
              }}>

              {/* Header */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", paddingTop: 24, paddingBottom: 16 }}>
                <div
                  onClick={closeSend}
                  style={{ position: "absolute", top: 16, right: 0, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <X style={{ width: 14, height: 14, color: "rgba(255,255,255,0.4)" }} />
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: "linear-gradient(135deg, #3B9EFF 0%, #2563EB 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                  boxShadow: "0 4px 16px rgba(59,158,255,0.3)",
                }}>
                  <Send style={{ width: 24, height: 24, color: "#fff", transform: "rotate(-45deg)" }} />
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Send Money</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Swift &amp; Secure Money Transfer</p>
              </div>

              {/* Local Transfer */}
              <div
                onClick={() => navigate("/app/transfer")}
                className="pressable"
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "14px 14px", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(59,158,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users style={{ width: 18, height: 18, color: "#3B9EFF" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Local Transfer</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>Send money to local accounts instantly</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#F59E0B", display: "flex", alignItems: "center", gap: 3 }}>{"\u26A1"} Instant</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#00C896", background: "rgba(0,200,150,0.1)", padding: "1px 6px", borderRadius: 6 }}>0% Fee</span>
                  </div>
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
              </div>

              {/* International Wire */}
              <div
                onClick={() => navigate("/app/transfer")}
                className="pressable"
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "14px 14px", marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(59,158,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Globe style={{ width: 18, height: 18, color: "#3B9EFF" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>International Wire</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>Global transfers within 72 hours</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#00C896", display: "flex", alignItems: "center", gap: 3 }}>{"\u{1F6E1}\uFE0F"} Secure</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#F59E0B", display: "flex", alignItems: "center", gap: 3 }}>{"\u{1F551}"} 72hrs</span>
                  </div>
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
              </div>

              {/* Security notice */}
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start",
                marginBottom: 14,
              }}>
                <Info style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: 0 }}>
                  All transfers are protected by bank-grade encryption and require verification for your security.
                </p>
              </div>

              {/* Close button */}
              <div
                onClick={closeSend}
                style={{ textAlign: "right", cursor: "pointer", padding: "2px 0" }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Close</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ TOP UP MODAL ═══ */}
      {(topUpOpen || topUpClosing) && (
        <>
          <div
            onClick={closeTopUp}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              animation: topUpClosing ? "overlayFadeOut 180ms ease-in forwards" : "overlayFadeIn 250ms ease-out forwards",
            }}
          />
          <div style={{
            position: "fixed", inset: 0, zIndex: 201,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "16px 16px", pointerEvents: "none",
          }}>
            <div
              key={topUpClosing ? "closing" : "open"}
              style={{
                width: "100%", maxWidth: 400, maxHeight: "calc(100dvh - 32px)",
                display: "flex", flexDirection: "column",
                pointerEvents: topUpClosing ? "none" : "auto",
                background: "linear-gradient(180deg, #151E30 0%, #111827 100%)",
                borderRadius: 24, padding: "0 20px 16px", position: "relative",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
                willChange: "transform, opacity",
                animation: topUpClosing
                  ? "modalSpringOut 180ms ease-in forwards"
                  : "modalSpringIn 450ms cubic-bezier(.15,1,.3,1) forwards",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", paddingTop: 20, paddingBottom: 12, flexShrink: 0 }}>
                <div
                  onClick={closeTopUp}
                  style={{ position: "absolute", top: 14, right: 0, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <X style={{ width: 14, height: 14, color: "rgba(255,255,255,0.4)" }} />
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                  boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
                }}>
                  <Plus style={{ width: 20, height: 20, color: "#fff" }} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Top Up</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Send funds to the details below</p>
              </div>

              {/* Payment Details */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {topUpLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                  <div style={{ width: 24, height: 24, border: "2.5px solid rgba(255,255,255,0.1)", borderTopColor: "#3B9EFF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : (() => {
                const bankMethod = topUpMethods.find((m) => m.type === "bank_transfer")
                const btcMethod  = topUpMethods.find((m) => m.type === "bitcoin")
                const bankLines  = bankMethod?.instructions?.split("\n").filter((l) => l.trim()) || []
                const btcLines   = btcMethod?.instructions?.split("\n").filter((l) => l.trim()) || []

                const parseDetails = (lines: string[]) =>
                  lines.map((line) => {
                    const idx = line.indexOf(":")
                    if (idx > 0) return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
                    return { label: "", value: line.trim() }
                  })

                const bankDetails = parseDetails(bankLines)
                const btcDetails  = parseDetails(btcLines)
                const hasBoth = bankDetails.length > 0 && btcDetails.length > 0
                const activeDetails = topUpTab === "bank" ? bankDetails : btcDetails
                const prefix = topUpTab === "bank" ? "bank" : "btc"

                return (
                  <>
                    {/* Tab switcher */}
                    {hasBoth && (
                      <div style={{
                        display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12,
                        padding: 3, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <button
                          onClick={() => setTopUpTab("bank")}
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                            background: topUpTab === "bank" ? "rgba(59,158,255,0.15)" : "transparent",
                            color: topUpTab === "bank" ? "#3B9EFF" : "rgba(255,255,255,0.4)",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            transition: "all 200ms ease",
                          }}
                        >
                          <Building2 style={{ width: 14, height: 14 }} />
                          Bank Transfer
                        </button>
                        <button
                          onClick={() => setTopUpTab("btc")}
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                            background: topUpTab === "btc" ? "rgba(247,147,26,0.15)" : "transparent",
                            color: topUpTab === "btc" ? "#F7931A" : "rgba(255,255,255,0.4)",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            transition: "all 200ms ease",
                          }}
                        >
                          <Bitcoin style={{ width: 14, height: 14 }} />
                          Bitcoin
                        </button>
                      </div>
                    )}

                    {/* Details card */}
                    {activeDetails.length > 0 && (
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "2px 0", overflow: "hidden", marginBottom: 14 }}>
                        {activeDetails.map((d, i) =>
                          d.label ? (
                            <div
                              key={`${prefix}-${i}`}
                              onClick={() => copyText(d.value, `${prefix}-${i}`)}
                              style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "11px 14px", cursor: "pointer",
                                borderBottom: i < activeDetails.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.label}</p>
                                <p style={{ fontSize: 13, color: "#fff", margin: "2px 0 0", fontWeight: 600, fontFamily: "'SF Mono', 'Fira Code', monospace", wordBreak: "break-all" }}>{d.value}</p>
                              </div>
                              {copiedField === `${prefix}-${i}`
                                ? <Check style={{ width: 14, height: 14, color: "#00C896", flexShrink: 0, marginLeft: 8 }} />
                                : <Copy style={{ width: 14, height: 14, color: "rgba(255,255,255,0.2)", flexShrink: 0, marginLeft: 8 }} />
                              }
                            </div>
                          ) : (
                            <p key={`${prefix}-${i}`} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, padding: "6px 14px", lineHeight: 1.5 }}>{d.value}</p>
                          )
                        )}
                      </div>
                    )}

                    {topUpMethods.length === 0 && !topUpLoading && (
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "16px 0" }}>
                        No payment methods available. Please contact support.
                      </p>
                    )}
                  </>
                )
              })()}
              </div>

              {/* Close button */}
              <div
                onClick={closeTopUp}
                style={{ textAlign: "right", cursor: "pointer", padding: "6px 0 0", flexShrink: 0 }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Close</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ MORE SHEET ═══ */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200 }} />
          <div className="dash-more-modal" style={{
            position: "fixed", zIndex: 201,
            background: "#131B2E",
            animation: "slideUp 250ms ease-out",
          }}>
            <div className="dash-more-handle" style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>More options</p>
              <div onClick={() => setMoreOpen(false)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 14, height: 14, color: "rgba(255,255,255,0.4)" }} />
              </div>
            </div>
            <div className="dash-more-grid">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.label}
                    onClick={() => navigate(item.href)}
                    className="pressable"
                    style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 14, padding: 14, cursor: "pointer",
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <Icon style={{ width: 18, height: 18, color: item.color }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{item.sub}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══ SECTION 5: QUICK TRANSFER ═══ */}
      <div className="dash-section dash-stagger dash-stagger-3" style={{ paddingTop: 24, marginBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Quick Transfer</p>
          <span onClick={() => navigate("/app/beneficiaries")} style={{ fontSize: 13, color: colors.blue, cursor: "pointer" }}>View All &rsaquo;</span>
        </div>
        <div className="scroll-x-hidden dash-transfer-row">
          {/* Add New */}
          <div
            onClick={() => navigate("/app/transfer")}
            className="pressable"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer", width: 56 }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: `1.5px dashed ${colors.borderStrong}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus style={{ width: 18, height: 18, color: colors.textTertiary }} />
            </div>
            <span style={{ fontSize: 10, color: colors.textMuted, whiteSpace: "nowrap" }}>Add New</span>
          </div>
          {/* Saved beneficiaries */}
          {data.beneficiaries && data.beneficiaries.length > 0 ? (
            data.beneficiaries.slice(0, 6).map((b) => (
              <div
                key={b.id}
                onClick={() => navigate(`/app/transfer?beneficiaryId=${b.id}`)}
                className="pressable"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer", width: 56 }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: b.type === "international" ? colors.amberBg || "rgba(245,158,11,0.12)" : colors.blueBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: b.type === "international" ? colors.amber || "#F59E0B" : colors.blue }}>
                    {(b.nickname || b.recipientName || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: colors.textSecondary, whiteSpace: "nowrap", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {b.nickname || b.recipientName || "Saved"}
                </span>
              </div>
            ))
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, width: 56 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: colors.bgHover,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Users style={{ width: 18, height: 18, color: colors.textMuted }} />
              </div>
              <span style={{ fontSize: 10, color: colors.textMuted, whiteSpace: "nowrap" }}>No saved</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 5B: YOUR ACTIVE CARDS ═══ */}
      {(() => {
        const activeUserCards = data.cards.filter((c) => c.status === "active" || c.status === "frozen")
        const placeholderCards = activeUserCards.map((c) => ({
          id: c._id,
          brand: c.cardNetwork === "mastercard" ? "Mastercard" : "Visa",
          last4: c.cardNumber?.replace(/\D/g, "").slice(-4) || "••••",
          holder: session.user.firstName || "user",
          expiry: c.cardNumber ? "••/••" : "••/••",
          balance: formatAmount(c.balance / 100),
          type: `${c.cardNetwork === "mastercard" ? "Mastercard" : "Visa"} ${c.cardType === "credit" ? "Credit" : "Debit"}`,
          status: c.status === "active" ? "Active" : "Frozen",
          network: c.cardNetwork,
        }))
        return (
          <div className="dash-stagger dash-stagger-4" style={{ paddingTop: 24 }}>
            <div className="dash-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Your Active Cards</p>
              <span onClick={() => navigate("/app/cards")} style={{ fontSize: 13, color: colors.blue, cursor: "pointer" }}>Manage &rsaquo;</span>
            </div>

            {placeholderCards.length === 0 ? (
              <div
                className="dash-section"
                onClick={() => navigate("/app/cards")}
                style={{
                  background: colors.bgHover,
                  border: `1.5px dashed ${colors.borderStrong}`,
                  borderRadius: 14, padding: "20px 16px",
                  margin: "0 16px",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", textAlign: "center",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.blueBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <CreditCard style={{ width: 18, height: 18, color: colors.blue }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>No active cards yet</p>
                <p style={{ fontSize: 11, color: colors.textTertiary, margin: "3px 0 10px" }}>Apply for a Visa or Mastercard virtual card</p>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.blue, background: colors.blueBg, padding: "6px 16px", borderRadius: 8 }}>Apply for a Card</span>
              </div>
            ) : (
            <>
            {/* Swipeable cards */}
            <div className="dash-section">
              <div ref={activeCardsRef} className="scroll-x-hidden dash-cards-grid">
              {placeholderCards.map((card, idx) => (
                <div key={card.id} data-active-card-idx={idx} style={{ boxSizing: "border-box" }}>
                  {/* Card visual */}
                  <div style={{
                    borderRadius: 16, padding: "16px 18px", minHeight: 140,
                    position: "relative", overflow: "hidden",
                    background: card.network === "visa"
                      ? "linear-gradient(135deg, #1a4a8a 0%, #0f3060 40%, #0a2040 100%)"
                      : card.network === "amex"
                        ? "linear-gradient(135deg, #006fcf 0%, #004b8d 40%, #002d5a 100%)"
                        : "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
                  }}>
                    {/* Decorative circles */}
                    <div style={{ position: "absolute", width: 200, height: 200, top: -80, right: -60, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", width: 140, height: 140, bottom: -50, left: -30, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

                    {/* Top: branding + chip */}
                    <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{card.brand}</p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{card.type}</p>
                      </div>
                      <div style={{ width: 28, height: 20, borderRadius: 4, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CreditCard style={{ width: 14, height: 14, color: "rgba(255,255,255,0.7)" }} />
                      </div>
                    </div>

                    {/* Card number */}
                    <p style={{ position: "relative", zIndex: 1, fontSize: 15, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.12em", color: "#fff", marginTop: 16, marginBottom: 0 }}>
                      &bull;&bull;&bull;&bull;&ensp;&bull;&bull;&bull;&bull;&ensp;&bull;&bull;&bull;&bull;&ensp;{card.last4}
                    </p>

                    {/* Holder + expiry + Network Logo */}
                    <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 }}>
                      <div>
                        <p style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>Card Holder</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, marginTop: 1 }}>{card.holder}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>Valid</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, marginTop: 1 }}>{card.expiry}</p>
                      </div>
                      <CardNetworkLogo network={card.network} style={{ height: 20 }} />
                    </div>
                  </div>

                  {/* Card info bar below */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{card.brand} Card</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#00C896", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#00C896" }} />
                        {card.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>USD {card.balance}</span>
                  </div>

                  {/* Manage Card button */}
                  <div
                    onClick={() => navigate(`/app/cards/${card.id}`)}
                    style={{
                      marginTop: 8, padding: "8px 0", borderRadius: 10, textAlign: "center", cursor: "pointer",
                      background: "rgba(59,158,255,0.08)", border: "1px solid rgba(59,158,255,0.15)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#3B9EFF" }}>Manage Card</span>
                  </div>
                </div>
              ))}
              </div>
            </div>

            {/* Dots + count */}
            <div className="dash-carousel-dots" style={{ flexDirection: "column", alignItems: "center", marginTop: 10, gap: 4 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {placeholderCards.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === activeCardIdx ? 18 : 5,
                      height: 5,
                      borderRadius: 3,
                      background: i === activeCardIdx ? "#3B9EFF" : "rgba(255,255,255,0.2)",
                      transition: "width 200ms, background 200ms",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{activeCardIdx + 1} of {placeholderCards.length} cards</span>
            </div>
            </>
            )}
          </div>
        )
      })()}

      {/* ═══ SECTION 5C: FINANCIAL SERVICES (dynamic) ═══ */}
      {(() => {
        const STATUS_COLORS: Record<string, string> = {
          available:   "#00C896",
          restricted:  "#EF4444",
          coming_soon: "#F59E0B",
          maintenance: "#F59E0B",
          disabled:    "#6B7280",
        }
        const SERVICE_CARDS = [
          { key: "loans",      label: "Loans",       icon: Landmark,   color: "#3B9EFF", bg: "rgba(59,158,255,0.12)",  href: "/app/loans",       btnLabel: "Apply Now",    btnIcon: Landmark },
          { key: "grants",     label: "Grants",      icon: DollarSign, color: "#00C896", bg: "rgba(0,200,150,0.12)",   href: "/app/grants",      btnLabel: "Manage Grants", btnIcon: Settings },
          { key: "taxRefunds", label: "Tax Refunds", icon: FileText,   color: "#818CF8", bg: "rgba(99,102,241,0.12)",  href: "/app/tax-refunds", btnLabel: "Apply Now",    btnIcon: FileText },
          { key: "cards",      label: "Virtual Cards",icon: CreditCard, color: "#F59E0B", bg: "rgba(245,158,11,0.12)", href: "/app/cards",       btnLabel: "Manage Cards", btnIcon: CreditCard },
        ]
        return (
          <div className="dash-section dash-stagger dash-stagger-5" style={{ paddingTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Financial Services</p>
              <span onClick={() => navigate("/app/services")} style={{ fontSize: 13, color: colors.blue, cursor: "pointer" }}>View All &rsaquo;</span>
            </div>

            <div className="dash-services-grid">
              {SERVICE_CARDS.map((svc) => {
                const cfg = serviceStatuses[svc.key]
                const statusColor = STATUS_COLORS[cfg?.status || "available"] || colors.green
                const statusLabel = cfg?.statusLabel || "Available"
                const description = cfg?.description || ""
                const isDisabled = cfg?.enabled === false || cfg?.status === "disabled"
                const SvcIcon = svc.icon
                const BtnIcon = svc.btnIcon

                return (
                  <div
                    key={svc.key}
                    style={{
                      background: colors.bgElevated, borderRadius: 16, padding: "14px 14px 12px",
                      border: `1px solid ${colors.border}`,
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: svc.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <SvcIcon style={{ width: 18, height: 18, color: svc.color }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{svc.label}</p>
                        <span style={{ fontSize: 9, fontWeight: 600, color: statusColor, display: "inline-flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: statusColor }} />
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: colors.textTertiary, margin: "0 0 10px" }}>{description}</p>
                    <div
                      onClick={() => !isDisabled && navigate(svc.href)}
                      style={{
                        padding: "7px 0", borderRadius: 10, textAlign: "center",
                        cursor: isDisabled ? "default" : "pointer",
                        background: `${svc.color}18`, border: `1px solid ${svc.color}25`,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <BtnIcon style={{ width: 13, height: 13, color: svc.color }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: svc.color }}>{svc.btnLabel}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ═══ SECTION 6: RECENT ACTIVITY ═══ */}
      <div className="dash-section dash-stagger dash-stagger-6" style={{ paddingTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Recent Activity</p>
          <span onClick={() => navigate("/app/transactions")} style={{ fontSize: 13, color: colors.blue, cursor: "pointer" }}>View All &rsaquo;</span>
        </div>

        {data.recentTransactions.length === 0 ? (
          <div style={{
            background: colors.bgElevated, borderRadius: 16, padding: "32px 16px",
            border: `1px solid ${colors.border}`, textAlign: "center",
          }}>
            <BarChart2 style={{ width: 32, height: 32, color: colors.textMuted, margin: "0 auto 12px" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>No recent activity</p>
            <p style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>Make your first deposit to get started</p>
          </div>
        ) : (
          data.recentTransactions.slice(0, 5).map((tx) => (
            <TxRow key={tx._id} tx={tx} onView={() => navigate(`/app/transactions/${tx._id}`)} />
          ))
        )}
      </div>

      {/* ═══ SECTION 7: ACTIVE LOANS ═══ */}
      {data.loans.length > 0 && (
        <div className="dash-section dash-stagger dash-stagger-7" style={{ paddingTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Active Loans</p>
            <span onClick={() => navigate("/app/loans")} style={{ fontSize: 13, color: colors.blue, cursor: "pointer" }}>View All &rsaquo;</span>
          </div>
          {data.loans.slice(0, 2).map((loan) => {
            const progress = loan.amount > 0 ? Math.round((loan.totalPaid / loan.amount) * 100) : 0
            return (
              <div
                key={loan._id}
                onClick={() => navigate("/app/loans")}
                className="pressable"
                style={{
                  background: colors.bgElevated, borderRadius: 16, padding: "14px 16px",
                  border: `1px solid ${colors.border}`,
                  marginBottom: 8, cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, textTransform: "capitalize" }}>{loan.purpose} Loan</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      ${(loan.monthlyPayment / 100).toLocaleString()}/mo
                    </p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 12,
                    background: loan.status === "active" ? "rgba(0,200,150,0.12)" : "rgba(245,158,11,0.12)",
                    color: loan.status === "active" ? "#00C896" : "#F59E0B",
                    textTransform: "capitalize",
                  }}>
                    {loan.status}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ width: `${progress}%`, height: "100%", borderRadius: 3, background: "#3B9EFF" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", minWidth: 36 }}>{progress}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    Remaining: ${(loan.outstandingBalance / 100).toLocaleString()}
                  </span>
                  {loan.nextPaymentDate && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      Next: {new Date(loan.nextPaymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ SECTION 8: MY CARDS ═══ */}
      {data.cards.length > 0 && (
        <div className="dash-section dash-stagger dash-stagger-8" style={{ paddingTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>My Cards</p>
            <span onClick={() => navigate("/app/cards")} style={{ fontSize: 13, color: "#3B9EFF", cursor: "pointer" }}>Manage &rsaquo;</span>
          </div>
          <div className="scroll-x-hidden" style={{ display: "flex", gap: 12, paddingBottom: 4 }}>
            {data.cards.map((card) => (
              <div
                key={card._id}
                onClick={() => navigate(`/app/cards/${card._id}`)}
                className="pressable"
                style={{
                  flex: "0 0 200px",
                  background: card.cardNetwork === "visa" 
                    ? "linear-gradient(135deg, #1a4a8a 0%, #0f3060 100%)" 
                    : card.cardNetwork === "amex"
                      ? "linear-gradient(135deg, #006fcf 0%, #004b8d 100%)"
                      : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
                  borderRadius: 14, padding: 14,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                    {card.cardType}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 8,
                    background: card.status === "active" ? "rgba(0,200,150,0.15)" : "rgba(255,255,255,0.08)",
                    color: card.status === "active" ? "#00C896" : "rgba(255,255,255,0.5)",
                    textTransform: "capitalize",
                  }}>
                    {card.status}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", margin: 0, letterSpacing: 1 }}>
                  •••• {card.cardNumber?.slice(-4) || "0000"}
                </p>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <CardNetworkLogo network={card.cardNetwork} style={{ height: 18 }} />
                </div>
              </div>
            ))}
            {/* Add new card */}
            <div
              onClick={() => navigate("/app/cards")}
              style={{
                flex: "0 0 120px",
                background: "rgba(255,255,255,0.03)",
                border: "2px dashed rgba(255,255,255,0.1)",
                borderRadius: 14, padding: 14,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", minHeight: 80,
              }}
            >
              <Plus style={{ width: 20, height: 20, color: "rgba(255,255,255,0.3)", marginBottom: 6 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Add Card</span>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* ═══ RIGHT PANEL (desktop) ═══ */}
      <aside className="dash-right" style={{ padding: "20px 16px" }}>

        {/* Account overview card */}
        <div style={{
          background: colors.bgElevated, borderRadius: 16, padding: "16px 16px 14px",
          border: `1px solid ${colors.border}`, marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: colors.blue, border: `2px solid ${colors.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: colors.textInverse,
            }}>
              {(session.user.firstName?.[0] || "") + (session.user.lastName?.[0] || "")}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{session.user.firstName} {session.user.lastName}</p>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Personal Account</p>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 12,
              background: session.user.kycStatus === "verified" ? "rgba(0,200,150,0.12)" : "rgba(245,158,11,0.12)",
              color: session.user.kycStatus === "verified" ? "#00C896" : "#F59E0B",
              textTransform: "capitalize",
            }}>{session.user.kycStatus || "unverified"}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: colors.greenBg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: colors.textTertiary, margin: 0 }}>Income</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: colors.green, margin: "4px 0 0" }}>
                ${(data.incomeThisMonth / 100).toLocaleString()}
              </p>
            </div>
            <div style={{ flex: 1, background: colors.redBg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: colors.textTertiary, margin: 0 }}>Expenses</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: colors.red, margin: "4px 0 0" }}>
                ${(data.spendingThisMonth.total / 100).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, marginBottom: 10 }}>Achievements</p>
            {achievements.map((a) => (
              <div
                key={a.title}
                style={{
                  background: colors.bgElevated, borderRadius: 14, padding: "12px 14px",
                  border: `1px solid ${colors.border}`,
                  display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {a.icon}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Smart Tips */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Smart Tips</p>
            <span style={{
              background: colors.blueBg, color: colors.blue,
              fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
            }}>Tip</span>
          </div>
          <div
            style={{
              background: colors.bgElevated, borderRadius: 14, padding: "12px 14px",
              border: `1px solid ${colors.border}`,
              display: "flex", alignItems: "flex-start", gap: 10,
              opacity: tipVisible ? 1 : 0, transition: "opacity 300ms",
            }}
          >
            {(() => {
              const TipIcon = TIPS[tipIdx].icon
              return (
                <>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: colors.blueBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <TipIcon style={{ width: 16, height: 16, color: colors.blue }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{TIPS[tipIdx].title}</p>
                    <p style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{TIPS[tipIdx].body}</p>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Need Help */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Need Help?</p>
            <span onClick={() => navigate("/app/support")} style={{ fontSize: 12, color: colors.blue, cursor: "pointer" }}>Support &rsaquo;</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div
              onClick={() => navigate("/app/support")}
              className="pressable"
              style={{
                background: colors.bgElevated, borderRadius: 14, padding: 14,
                border: `1px solid ${colors.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.blueBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageCircle style={{ width: 18, height: 18, color: colors.blue }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Live Chat</p>
              <p style={{ fontSize: 10, color: colors.textMuted, margin: 0 }}>Instant help</p>
            </div>
            <div
              onClick={() => navigate("/app/support")}
              className="pressable"
              style={{
                background: colors.bgElevated, borderRadius: 14, padding: 14,
                border: `1px solid ${colors.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail style={{ width: 18, height: 18, color: colors.green }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Email</p>
              <p style={{ fontSize: 10, color: colors.textMuted, margin: 0 }}>Detailed message</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ MOBILE-ONLY: Achievements / Tips / Help (below main on small screens) ═══ */}
      <div className="dash-mobile-sections" style={{ paddingBottom: 24, width: "100%" }}>
        <div>

        {/* Achievements (mobile) */}
        {achievements.length > 0 && (
          <div style={{ padding: "24px 16px 0" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, marginBottom: 12 }}>Achievements</p>
            {achievements.map((a) => (
              <div
                key={a.title}
                style={{
                  background: colors.bgElevated, borderRadius: 16, padding: "14px 16px",
                  border: `1px solid ${colors.border}`,
                  display: "flex", alignItems: "center", gap: 14, marginBottom: 8,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>
                  {a.icon}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{a.title}</p>
                  <p style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Smart Tips (mobile) */}
        <div style={{ padding: "24px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Smart Tips</p>
            <span style={{
              background: colors.blueBg, color: colors.blue,
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
            }}>Tip</span>
          </div>
          <div
            style={{
              background: colors.bgElevated, borderRadius: 16, padding: "14px 16px",
              border: `1px solid ${colors.border}`,
              display: "flex", alignItems: "flex-start", gap: 12,
              opacity: tipVisible ? 1 : 0, transition: "opacity 300ms",
            }}
          >
            {(() => {
              const TipIcon = TIPS[tipIdx].icon
              return (
                <>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: colors.blueBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <TipIcon style={{ width: 18, height: 18, color: colors.blue }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{TIPS[tipIdx].title}</p>
                    <p style={{ fontSize: 12, color: colors.textTertiary, marginTop: 3 }}>{TIPS[tipIdx].body}</p>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Need Help (mobile) */}
        <div style={{ padding: "24px 16px 100px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Need Help?</p>
            <span onClick={() => navigate("/app/support")} style={{ fontSize: 13, color: colors.blue, cursor: "pointer" }}>Support Center &rsaquo;</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              onClick={() => navigate("/app/support")}
              className="pressable"
              style={{
                background: colors.bgElevated, borderRadius: 16, padding: 16,
                border: `1px solid ${colors.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.blueBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageCircle style={{ width: 20, height: 20, color: colors.blue }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Live Chat</p>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Get instant help from our team</p>
            </div>
            <div
              onClick={() => navigate("/app/support")}
              className="pressable"
              style={{
                background: colors.bgElevated, borderRadius: 16, padding: 16,
                border: `1px solid ${colors.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail style={{ width: 20, height: 20, color: colors.green }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Email Support</p>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Send us a detailed message</p>
            </div>
          </div>
        </div>

        </div>
      </div>

    </div>
  )
}

// ── Transaction row sub-component ─────────────────────────────────────────────

const TX_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: "rgba(245,158,11,0.12)", text: "#F59E0B", label: "Pending" },
  processing: { bg: "rgba(59,158,255,0.12)", text: "#3B9EFF", label: "Processing" },
  failed:     { bg: "rgba(239,68,68,0.12)",  text: "#EF4444", label: "Failed" },
  reversed:   { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.5)", label: "Reversed" },
  completed:  { bg: "rgba(0,200,150,0.10)",  text: "#00C896", label: "Completed" },
}

function TxRow({ tx, onView }: { tx: SerializedTransaction; onView: () => void }) {
  const colors = useThemeColors()
  const { symbol: currencySymbol, formatAmount } = useCurrency()
  const isCredit = CREDIT_TYPES.includes(tx.type)
  const isBtc = tx.currency === "BTC"
  const divisor = isBtc ? 1e8 : 100
  const displayAmount = tx.amount / divisor
  const amountStr = isBtc 
    ? `${isCredit ? "+" : "-"}₿${displayAmount.toLocaleString("en-US", { minimumFractionDigits: 8, maximumFractionDigits: 8 })}`
    : `${isCredit ? "+" : "-"}${formatAmount(displayAmount)}`
  const statusStyle = TX_STATUS_STYLES[tx.status] || TX_STATUS_STYLES.pending

  return (
    <div
      style={{
        background: colors.bgElevated, borderRadius: 16, padding: "14px 16px",
        border: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: isCredit ? colors.greenBg : colors.redBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {isCredit
          ? <ArrowDownLeft style={{ width: 20, height: 20, color: colors.green }} />
          : <Send style={{ width: 20, height: 20, color: colors.red, transform: "rotate(-45deg)" }} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{isCredit ? "Credit" : "Debit"}</p>
          <span style={{
            fontSize: 10, fontWeight: 600, lineHeight: 1,
            padding: "3px 6px", borderRadius: 6,
            background: statusStyle.bg, color: statusStyle.text,
          }}>
            {statusStyle.label}
          </span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: isCredit ? colors.green : colors.red, marginTop: 1 }}>{amountStr}</p>
        <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{fmtDate(tx.createdAt)}</p>
      </div>

      <span
        onClick={onView}
        style={{ fontSize: 12, fontWeight: 500, color: colors.blue, cursor: "pointer", flexShrink: 0 }}
      >
        View Details
      </span>
    </div>
  )
}
