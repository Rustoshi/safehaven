"use client"

import { useState, useCallback, createContext, useContext, Suspense } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"
import { BANK_NAME } from "@/lib/brand"
import { useTheme } from "@/components/shared/ThemeProvider"
import { PlatformSettingsProvider } from "@/components/shared/PlatformSettingsProvider"
import { NavigationLoader } from "@/components/user/NavigationLoader"
import {
  Home, Send, CreditCard, ArrowLeftRight,
  Landmark, DollarSign, FileText, Receipt, ClipboardList,
  ShieldCheck, MessageCircle, LogOut, Settings, Bell,
  X, LayoutGrid, MoreHorizontal,
} from "lucide-react"

// ── Sidebar context (so child components like UserHeader can open it) ────────
const SidebarContext = createContext<{ open: () => void }>({ open: () => {} })
export const useSidebar = () => useContext(SidebarContext)

// ── Nav config ────────────────────────────────────────────────────────────────

const BOTTOM_TABS = [
  { label: "Transactions", icon: ArrowLeftRight, href: "/app/transactions" },
  { label: "Transfer",     icon: Send,           href: "/app/transfer" },
  { label: "Dashboard",    icon: LayoutGrid,     href: "/app/dashboard", center: true },
  { label: "Cards",        icon: CreditCard,     href: "/app/cards" },
  { label: "More",         icon: MoreHorizontal, href: "/app/profile" },
] as const

const SIDEBAR_ITEMS = [
  { label: "Dashboard",          icon: Home,          href: "/app/dashboard" },
  { label: "Transfers",          icon: Send,          href: "/app/transfer" },
  { label: "Cards",              icon: CreditCard,    href: "/app/cards" },
  { label: "Loans",              icon: Landmark,      href: "/app/loans" },
  { label: "Grants",             icon: DollarSign,    href: "/app/grants" },
  { label: "Tax refund",         icon: FileText,      href: "/app/tax-refunds" },
  { label: "Statements",         icon: ClipboardList, href: "/app/statements" },
  { label: "Transactions",       icon: Receipt,       href: "/app/transactions" },
  { label: "KYC verification",   icon: ShieldCheck,   href: "/app/kyc" },
  { label: "Support",            icon: MessageCircle, href: "/app/support" },
  { label: "Notifications",      icon: Bell,          href: "/app/notifications" },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  session: Session
  children: React.ReactNode
}

export function UserAppShell({ session, children }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Theme-aware colors
  const colors = {
    bgBase: isDark ? "#0a1628" : "#F8FAFC",
    bgSidebar: isDark ? "#0d1f3c" : "#FFFFFF",
    bgHover: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    bgActive: isDark ? "rgba(59,158,255,0.12)" : "rgba(0,102,204,0.08)",
    border: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
    textPrimary: isDark ? "#FFFFFF" : "#0F172A",
    textSecondary: isDark ? "rgba(255,255,255,0.5)" : "#64748B",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#94A3B8",
    blue: isDark ? "#3B9EFF" : "#0066CC",
    blueBg: isDark ? "rgba(59,158,255,0.12)" : "rgba(0,102,204,0.08)",
    avatarBg: isDark ? "#1a4a8a" : "#0066CC",
    bottomBarBg: isDark 
      ? "rgba(10,22,40,0.85)" 
      : "rgba(255,255,255,0.92)",
  }

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  )

  const navigate = (href: string) => {
    setMoreOpen(false)
    setSidebarOpen(false)
    router.push(href)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const initials = `${session.user.firstName?.[0] || ""}${session.user.lastName?.[0] || ""}`
  const displayName = `${session.user.firstName} ${session.user.lastName}`.slice(0, 20)

  return (
    <PlatformSettingsProvider initialCurrency={session.user.preferredCurrency}>
    <Suspense fallback={null}>
      <NavigationLoader minDuration={350} />
    </Suspense>
    <SidebarContext.Provider value={{ open: () => setSidebarOpen(true) }}>
    <div className="flex h-[100dvh]" style={{ background: colors.bgBase, transition: "background-color 200ms" }}>
      {/* ── Sidebar — desktop: static 240px, mobile: slide-in drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col flex-shrink-0 overflow-hidden lg:static lg:z-auto lg:w-[240px] lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ 
          background: colors.bgSidebar, 
          borderRight: `1px solid ${colors.border}`, 
          transition: "transform 350ms cubic-bezier(0.32, 0.72, 0, 1), background-color 200ms, border-color 200ms",
          willChange: "transform",
        }}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-end px-4 pt-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: colors.bgHover }}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" style={{ color: colors.textSecondary }} />
          </button>
        </div>
        {/* Logo - desktop only */}
        <div className="px-5 pt-6 pb-2 hidden lg:block">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: colors.blue }}
            >
              <span className="text-sm font-bold text-white">{BANK_NAME[0]}</span>
            </div>
            <span className="text-[18px] font-bold" style={{ color: colors.textPrimary }}>{BANK_NAME}</span>
          </div>
        </div>

        {/* User */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: colors.avatarBg, border: `2px solid ${colors.border}` }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium" style={{ color: colors.textPrimary }}>{displayName}</p>
            <p className="truncate text-[11px]" style={{ color: colors.textMuted }}>
              {session.user.email?.slice(0, 24)}
            </p>
          </div>
        </div>

        <div className="mx-5 h-px" style={{ background: colors.border }} />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-hide">
          <ul className="space-y-0.5">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <button
                    onClick={() => navigate(item.href)}
                    className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
                    style={{
                      background: active ? colors.bgActive : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = colors.bgHover
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent"
                    }}
                  >
                    {active && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: colors.blue }}
                      />
                    )}
                    <Icon
                      className="h-[18px] w-[18px] flex-shrink-0"
                      style={{ color: active ? colors.blue : colors.textSecondary }}
                    />
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: active ? colors.textPrimary : colors.textSecondary }}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 space-y-0.5">
          <div className="mx-2 mb-2 h-px" style={{ background: colors.border }} />
          <button
            onClick={() => navigate("/app/profile")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgHover }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
          >
            <Settings className="h-[18px] w-[18px]" />
            <span className="text-[13px] font-medium">Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
          >
            <LogOut className="h-[18px] w-[18px]" style={{ color: colors.textSecondary }} />
            <span className="text-[13px] font-medium" style={{ color: "#EF4444" }}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ 
          background: "rgba(0,0,0,0.5)", 
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: sidebarOpen ? 1 : 0,
          transition: "opacity 350ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: colors.bgBase, transition: "background-color 200ms" }}>
        <div className="flex-1 overflow-y-auto pb-36 lg:pb-0 scrollbar-hide">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        style={{
          background: colors.bottomBarBg,
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: `1px solid ${colors.border}`,
          boxShadow: isDark ? "0 -4px 30px rgba(0,0,0,0.3)" : "0 -4px 20px rgba(0,0,0,0.08)",
          transition: "background-color 200ms, border-color 200ms",
        }}
      >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              padding: "8px 8px 0",
              paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {BOTTOM_TABS.map((tab) => {
              const Icon = tab.icon
              const active = isActive(tab.href)
              const isCenter = "center" in tab && tab.center

              if (isCenter) {
                return (
                  <div
                    key={tab.label}
                    onClick={() => navigate(tab.href)}
                    className="mobile-tab-center"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      marginTop: -22,
                      position: "relative",
                    }}
                  >
                    {/* Glow ring */}
                    <div style={{
                      position: "absolute",
                      top: -3, left: "50%", transform: "translateX(-50%)",
                      width: 62, height: 62, borderRadius: 20,
                      background: isDark ? "rgba(59,158,255,0.15)" : "rgba(0,102,204,0.12)",
                      filter: "blur(10px)",
                      pointerEvents: "none",
                    }} />
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 18,
                        background: isDark 
                          ? "linear-gradient(135deg, #3B9EFF 0%, #2563EB 100%)"
                          : "linear-gradient(135deg, #0066CC 0%, #0052A3 100%)",
                        boxShadow: isDark 
                          ? "0 6px 24px rgba(59,158,255,0.45), inset 0 1px 0 rgba(255,255,255,0.2)"
                          : "0 6px 24px rgba(0,102,204,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "transform 150ms cubic-bezier(.4,0,.2,1), box-shadow 150ms",
                        position: "relative",
                        zIndex: 1,
                        border: isDark ? "2px solid rgba(10,22,40,0.9)" : "2px solid rgba(255,255,255,0.9)",
                      }}
                      className="active:scale-[0.88]"
                    >
                      <Icon style={{ width: 23, height: 23, color: "#fff" }} />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        marginTop: 4,
                        color: colors.blue,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {tab.label}
                    </span>
                  </div>
                )
              }

              return (
                <div
                  key={tab.label}
                  onClick={() => navigate(tab.href)}
                  className="mobile-tab-item"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    minWidth: 56,
                    minHeight: 50,
                    transition: "transform 150ms cubic-bezier(.4,0,.2,1)",
                    position: "relative",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: active ? colors.blueBg : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 200ms ease",
                  }}>
                    <Icon
                      style={{
                        width: 21,
                        height: 21,
                        color: active ? colors.blue : colors.textMuted,
                        transition: "color 200ms ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: active ? 600 : 500,
                      marginTop: 2,
                      color: active ? colors.blue : colors.textMuted,
                      transition: "color 200ms ease",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {tab.label}
                  </span>
                  {/* Active indicator dot */}
                  {active && (
                    <div style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: colors.blue,
                      boxShadow: isDark ? "0 0 6px rgba(59,158,255,0.6)" : "0 0 6px rgba(0,102,204,0.4)",
                      marginTop: 3,
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </nav>
    </div>
    </SidebarContext.Provider>
    </PlatformSettingsProvider>
  )
}
