"use client"

import { useState, useCallback, createContext, useContext, Suspense } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Image from "next/image"
import type { Session } from "next-auth"
import { BANK_NAME } from "@/lib/brand"
import { PlatformSettingsProvider } from "@/components/shared/PlatformSettingsProvider"
import { NavigationLoader } from "@/components/user/NavigationLoader"
import {
  Home, Send, CreditCard, ArrowLeftRight,
  Landmark, DollarSign, FileText, Receipt, ClipboardList,
  ShieldCheck, MessageCircle, LogOut, Settings, Bell,
  X, LayoutGrid, MoreHorizontal,
} from "lucide-react"

/* ══════════════════════════════════════════════════════════════════════════
   Safe Haven — dashboard shell (per dashboard-design.md, Grey style).
   White sidebar on a grey canvas; active nav = blue tint pill.
   ══════════════════════════════════════════════════════════════════════════ */

const SidebarContext = createContext<{ open: () => void }>({ open: () => {} })
export const useSidebar = () => useContext(SidebarContext)

const FONT = "var(--dash-font)"

const BOTTOM_TABS = [
  { label: "Transactions", icon: ArrowLeftRight, href: "/app/transactions" },
  { label: "Transfer",     icon: Send,           href: "/app/transfer" },
  { label: "Dashboard",    icon: LayoutGrid,     href: "/app/dashboard", center: true },
  { label: "Cards",        icon: CreditCard,     href: "/app/cards" },
  { label: "More",         icon: MoreHorizontal, href: "/app/profile" },
] as const

const SIDEBAR_ITEMS = [
  { label: "Dashboard",        icon: Home,          href: "/app/dashboard" },
  { label: "Transfers",        icon: Send,          href: "/app/transfer" },
  { label: "Cards",            icon: CreditCard,    href: "/app/cards" },
  { label: "Loans",            icon: Landmark,      href: "/app/loans" },
  { label: "Grants",           icon: DollarSign,    href: "/app/grants" },
  { label: "Tax refund",       icon: FileText,      href: "/app/tax-refunds" },
  { label: "Statements",       icon: ClipboardList, href: "/app/statements" },
  { label: "Transactions",     icon: Receipt,       href: "/app/transactions" },
  { label: "KYC verification", icon: ShieldCheck,   href: "/app/kyc" },
  { label: "Support",          icon: MessageCircle, href: "/app/support" },
  { label: "Notifications",    icon: Bell,          href: "/app/notifications" },
] as const

interface Props {
  session: Session
  children: React.ReactNode
}

export function UserAppShell({ session, children }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  )

  const navigate = (href: string) => {
    setSidebarOpen(false)
    router.push(href)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const initials = `${session.user.firstName?.[0] || ""}${session.user.lastName?.[0] || ""}`
  const displayName = `${session.user.firstName} ${session.user.lastName}`.slice(0, 22)

  return (
    <PlatformSettingsProvider initialCurrency={session.user.preferredCurrency}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <Suspense fallback={null}>
        <NavigationLoader minDuration={350} />
      </Suspense>
      <SidebarContext.Provider value={{ open: () => setSidebarOpen(true) }}>
        <div className="flex h-[100dvh]" style={{ backgroundColor: "var(--dash-bg)", fontFamily: FONT, color: "var(--dash-text)" }}>

          {/* ── Sidebar (white) ── */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col flex-shrink-0 overflow-hidden lg:static lg:z-auto lg:w-[248px] lg:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            style={{
              backgroundColor: "var(--dash-surface)",
              borderRight: "1px solid var(--dash-border)",
              transition: "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
              willChange: "transform",
            }}
          >
            {/* Mobile close */}
            <div className="flex items-center justify-end px-4 pt-4 lg:hidden">
              <button onClick={() => setSidebarOpen(false)} className="flex items-center justify-center w-9 h-9" style={{ backgroundColor: "var(--dash-surface-2)", borderRadius: 10 }} aria-label="Close menu">
                <X className="h-5 w-5" style={{ color: "var(--dash-text-2)" }} />
              </button>
            </div>

            {/* Logo */}
            <div className="px-6 pt-6 pb-5 hidden lg:block">
              <button onClick={() => navigate("/app/dashboard")} aria-label={BANK_NAME} className="inline-flex">
                <Image src="/images/logo.png" alt={BANK_NAME} width={256} height={128} className="h-6 w-auto" priority />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-2 px-3 scrollbar-hide">
              <ul className="space-y-1">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <button
                        onClick={() => navigate(item.href)}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 transition-colors duration-150"
                        style={{ backgroundColor: active ? "var(--dash-primary-bg)" : "transparent", borderRadius: 10 }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "var(--dash-surface-2)" }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent" }}
                      >
                        <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} style={{ color: active ? "var(--dash-primary)" : "var(--dash-text-2)" }} />
                        <span className="text-[14px]" style={{ color: active ? "var(--dash-primary)" : "var(--dash-text-2)", fontWeight: active ? 600 : 500 }}>
                          {item.label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Bottom: user + settings + sign out */}
            <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid var(--dash-border)" }}>
              <div className="flex items-center gap-3 px-2.5 py-2 mb-1">
                <div className="flex h-9 w-9 items-center justify-center text-[12px] flex-shrink-0" style={{ borderRadius: "50%", backgroundColor: "var(--dash-primary-bg)", color: "var(--dash-primary)", fontWeight: 600 }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px]" style={{ color: "var(--dash-text)", fontWeight: 600 }}>{displayName}</p>
                  <p className="truncate text-[11px]" style={{ color: "var(--dash-text-3)" }}>{session.user.email?.slice(0, 24)}</p>
                </div>
              </div>
              <button onClick={() => navigate("/app/profile")} className="flex w-full items-center gap-3 px-3.5 py-2.5 transition-colors" style={{ color: "var(--dash-text-2)", borderRadius: 10 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--dash-surface-2)" }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}>
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="text-[14px]" style={{ fontWeight: 500 }}>Settings</span>
              </button>
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-3.5 py-2.5 transition-colors" style={{ color: "var(--dash-danger)", borderRadius: 10 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--dash-danger-bg)" }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}>
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="text-[14px]" style={{ fontWeight: 500 }}>Sign out</span>
              </button>
            </div>
          </aside>

          {/* Mobile backdrop */}
          <div
            className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}
            style={{ backgroundColor: "rgba(16,24,40,0.4)", opacity: sidebarOpen ? 1 : 0, transition: "opacity 300ms" }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />

          {/* ── Main content ── */}
          <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--dash-bg)" }}>
            <div className="flex-1 overflow-y-auto pb-28 lg:pb-0 scrollbar-hide">
              {children}
            </div>
          </main>

          {/* ── Mobile bottom tab bar (white) ── */}
          <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={{ backgroundColor: "var(--dash-surface)", borderTop: "1px solid var(--dash-border)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "8px 8px 0", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}>
              {BOTTOM_TABS.map((tab) => {
                const Icon = tab.icon
                const active = isActive(tab.href)
                const isCenter = "center" in tab && tab.center
                if (isCenter) {
                  return (
                    <div key={tab.label} onClick={() => navigate(tab.href)} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", marginTop: -18 }}>
                      <div style={{ width: 50, height: 50, borderRadius: "50%", backgroundColor: "var(--dash-primary)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(26,44,206,0.35)" }} className="active:scale-90">
                        <Icon style={{ width: 22, height: 22, color: "#fff" }} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color: active ? "var(--dash-primary)" : "var(--dash-text-3)" }}>{tab.label}</span>
                    </div>
                  )
                }
                return (
                  <div key={tab.label} onClick={() => navigate(tab.href)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 56, minHeight: 50 }} className="active:scale-95">
                    <Icon style={{ width: 21, height: 21, color: active ? "var(--dash-primary)" : "var(--dash-text-3)" }} strokeWidth={active ? 2.2 : 1.8} />
                    <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, marginTop: 3, color: active ? "var(--dash-primary)" : "var(--dash-text-3)" }}>{tab.label}</span>
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
