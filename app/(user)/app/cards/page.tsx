"use client"

import { useState, useEffect, useCallback } from "react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { useRouter } from "next/navigation"
import {
  CreditCard, Plus, Snowflake, CheckCircle2, XCircle,
  Clock, Wifi, Eye, EyeOff, AlertTriangle, ChevronLeft,
  Shield, ArrowRight, Copy, Check, MapPin, Lock, Delete,
  DollarSign, Loader2, Settings,
} from "lucide-react"
import { UserHeader } from "@/components/user/UserHeader"
import { useThemeColors } from "@/components/shared/ThemeProvider"
import { useCurrency } from "@/components/shared/PlatformSettingsProvider"

// ── Types ────────────────────────────────────────────────────────────────────

interface CardData {
  _id:            string
  cardNetwork:    string
  cardType:       string
  status:         string
  cardNumber:     string | null
  cvv:            string | null
  creditLimit:    number
  spendingLimit:  number
  preferredLimit: number
  balance:        number
  expiryMonth:    number | null
  expiryYear:     number | null
  cardholderName: string | null
  isVirtual:      boolean
  applicationFee: number
  referenceNumber: string | null
  adminNote:      string | null
  appliedAt:      string
  approvedAt:     string | null
}

interface CardSettings {
  applicationFee:   number
  maxPerUser:       number
  requiredKycTier:  number
}

interface Eligibility {
  fullName:     string
  kycStatus:    string
  kycTier:      number
  fiatBalance:  number
  currency:     string
  meetsKyc:     boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending:   { icon: Clock,         color: "#F59E0B", bg: "rgba(245,158,11,0.12)", label: "Pending Review" },
  active:    { icon: CheckCircle2,  color: "#00C896", bg: "rgba(0,200,150,0.12)",  label: "Active" },
  frozen:    { icon: Snowflake,     color: "#3B9EFF", bg: "rgba(59,158,255,0.12)", label: "Frozen" },
  rejected:  { icon: XCircle,       color: "#EF4444", bg: "rgba(239,68,68,0.12)",  label: "Rejected" },
  cancelled: { icon: XCircle,       color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)", label: "Cancelled" },
}

function formatCardLabel(network: string, type: string): string {
  const n = network === "mastercard" ? "Mastercard" : network === "amex" ? "Amex" : "Visa"
  const t = type === "credit" ? "Credit" : "Debit"
  return `${n} ${t}`
}

// ── SVG Logos ────────────────────────────────────────────────────────────────

function VisaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M293.2 348.7l33.4-195.8h53.4l-33.4 195.8h-53.4zm246.8-191c-10.6-4-27.2-8.3-47.9-8.3-52.8 0-90 26.5-90.3 64.5-.3 28.1 26.6 43.8 46.9 53.1 20.8 9.6 27.8 15.7 27.7 24.3-.1 13.1-16.6 19.1-31.9 19.1-21.4 0-32.7-3-50.3-10.2l-6.9-3.1-7.5 43.8c12.5 5.4 35.6 10.1 59.6 10.4 56.2 0 92.6-26.2 93-66.7.2-22.2-14-39.1-44.8-53.1-18.7-9-30.1-15-30-24.1 0-8.1 9.7-16.7 30.6-16.7 17.5-.3 30.1 3.5 40 7.5l4.8 2.2 7.2-42.7zm137.3-4.8h-41.3c-12.8 0-22.4 3.5-28 16.2l-79.4 179.4h56.2s9.2-24.1 11.3-29.4h68.6c1.6 6.9 6.5 29.4 6.5 29.4h49.7l-43.6-195.6zm-65.8 126.2c4.4-11.3 21.4-54.7 21.4-54.7-.3.5 4.4-11.4 7.1-18.7l3.6 16.9s10.3 46.8 12.4 56.5h-44.5zM313 152.9l-52.5 133.6-5.6-27.1c-9.7-31.2-40-65-73.9-81.9l47.9 170.9h56.6l84.2-195.5H313z" fill="white"/>
      <path d="M146.9 152.9H60.3l-.7 3.9c67.1 16.2 111.5 55.3 129.9 102.2l-18.7-89.9c-3.2-12.3-12.8-15.7-24.9-16.2z" fill="rgba(255,255,255,0.7)"/>
    </svg>
  )
}

function MastercardLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="310" cy="250" r="160" fill="#EB001B" opacity="0.9"/>
      <circle cx="470" cy="250" r="160" fill="#F79E1B" opacity="0.9"/>
      <path d="M390 130.7c32.5 25.7 53.5 65.2 53.5 109.3s-21 83.6-53.5 109.3c-32.5-25.7-53.5-65.2-53.5-109.3s21-83.6 53.5-109.3z" fill="#FF5F00" opacity="0.85"/>
    </svg>
  )
}

function AmexLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="780" height="500" rx="40" fill="transparent"/>
      <text x="390" y="280" textAnchor="middle" fill="white" fontSize="120" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
      <path d="M100 350h580" stroke="rgba(255,255,255,0.5)" strokeWidth="4"/>
      <path d="M100 150h580" stroke="rgba(255,255,255,0.5)" strokeWidth="4"/>
    </svg>
  )
}

// ── Step type ────────────────────────────────────────────────────────────────

type ApplyStep = "closed" | "eligibility" | "network" | "type" | "details" | "security" | "confirm" | "success"

const LIMIT_OPTIONS = [500, 1000, 2500, 5000, 10000, 25000]
const DAILY_LIMIT_OPTIONS = [200, 500, 1000, 2500, 5000, 10000]

// ── Main Component ───────────────────────────────────────────────────────────

export default function CardsPage() {
  const router = useRouter()
  const colors = useThemeColors()
  const { symbol: currencySymbol, formatAmount } = useCurrency()
  const [cards, setCards] = useState<CardData[]>()
  const [cardSettings, setCardSettings] = useState<CardSettings>({ applicationFee: 0, maxPerUser: 5, requiredKycTier: 1 })
  const [eligibility, setEligibility] = useState<Eligibility | null>(null)
  const [loading, setLoading] = useState(true)

  // Application form state
  const [step, setStep] = useState<ApplyStep>("closed")
  const [applying, setApplying] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<"visa" | "mastercard" | "amex" | "">("")
  const [selectedType, setSelectedType] = useState<"debit" | "credit" | "">("")
  const [cardholderName, setCardholderName] = useState("")
  const [preferredLimit, setPreferredLimit] = useState<number>(1000)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [error, setError] = useState("")
  const [successRef, setSuccessRef] = useState("")
  const [copiedRef, setCopiedRef] = useState(false)

  // Billing address
  const [billingStreet, setBillingStreet] = useState("")
  const [billingCity, setBillingCity] = useState("")
  const [billingState, setBillingState] = useState("")
  const [billingZip, setBillingZip] = useState("")
  const [billingCountry, setBillingCountry] = useState("")

  // Daily spend limit
  const [dailySpendLimit, setDailySpendLimit] = useState<number>(500)

  // Card PIN
  const [cardPin, setCardPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter")

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch("/api/user/cards")
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards)
        if (data.cardSettings) setCardSettings(data.cardSettings)
        if (data.eligibility) {
          setEligibility(data.eligibility)
          setCardholderName(data.eligibility.fullName || "")
        }
      }
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  const activeOrPending = cards?.filter((c) => ["pending", "active", "frozen"].includes(c.status)) || []
  const canApply = activeOrPending.length < cardSettings.maxPerUser

  const openApply = () => {
    setStep("eligibility")
    setSelectedNetwork("")
    setSelectedType("")
    setPreferredLimit(1000)
    setDailySpendLimit(500)
    setAgreedTerms(false)
    setError("")
    setSuccessRef("")
    setBillingStreet(""); setBillingCity(""); setBillingState(""); setBillingZip(""); setBillingCountry("")
    setCardPin(""); setConfirmPin(""); setPinStep("enter")
    if (eligibility) setCardholderName(eligibility.fullName)
  }

  const handleApply = async () => {
    if (!selectedNetwork || !selectedType || !agreedTerms) return
    setApplying(true)
    setError("")
    try {
      const res = await fetch("/api/user/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNetwork: selectedNetwork,
          cardType: selectedType,
          cardholderName: cardholderName.trim(),
          preferredLimit,
          dailySpendLimit,
          cardPin: cardPin || undefined,
          billingAddress: billingStreet ? {
            street: billingStreet.trim(),
            city: billingCity.trim(),
            state: billingState.trim(),
            zip: billingZip.trim(),
            country: billingCountry.trim(),
          } : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessRef(data.card?.referenceNumber || "")
        setStep("success")
        fetchCards()
      } else {
        setError(data.error || "Failed to apply")
      }
    } catch {
      setError("Network error. Please try again.")
    }
    setApplying(false)
  }

  const closeApply = () => setStep("closed")

  useBodyScrollLock(step !== "closed")

  const activeCards = cards?.filter((c) => c.status === "active" || c.status === "frozen") || []
  const otherCards = cards?.filter((c) => c.status !== "active" && c.status !== "frozen") || []

  return (
    <>
      <UserHeader
        title="Cards"
        rightElement={
          canApply ? (
            <button
              onClick={openApply}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: colors.blueBg }}
            >
              <Plus className="h-4 w-4" style={{ color: colors.blue }} />
            </button>
          ) : undefined
        }
      />

      <div className="px-4 py-5 lg:px-6 space-y-5 max-w-[800px] mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-52 rounded-2xl" style={{ background: colors.bgElevated }} />
            ))}
          </div>
        ) : !cards || cards.length === 0 ? (
          <div className="py-20 text-center">
            <div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: colors.blueBg }}
            >
              <CreditCard className="h-9 w-9" style={{ color: colors.blue }} />
            </div>
            <p className="text-[17px] font-semibold" style={{ color: colors.textPrimary }}>No cards yet</p>
            <p className="mt-1 text-[14px]" style={{ color: colors.textTertiary }}>
              Apply for your first virtual card
            </p>
            <button
              onClick={openApply}
              className="mt-5 h-11 rounded-xl px-6 text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: colors.blue }}
            >
              Apply for a card
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium" style={{ color: colors.textTertiary }}>
                {activeOrPending.length} of {cardSettings.maxPerUser} cards
              </p>
              {canApply && (
                <button
                  onClick={openApply}
                  className="text-[12px] font-semibold flex items-center gap-1"
                  style={{ color: colors.blue }}
                >
                  <Plus className="h-3 w-3" /> New Card
                </button>
              )}
            </div>

            {activeCards.map((card) => (
              <CardVisual key={card._id} card={card} colors={colors} accountBalance={eligibility?.fiatBalance} onPayment={fetchCards} />
            ))}

            {otherCards.length > 0 && (
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.06em] mb-3" style={{ color: colors.textTertiary }}>
                  Applications
                </p>
                <div className="space-y-2">
                  {otherCards.map((card) => {
                    const cfg = STATUS_CONFIG[card.status] || STATUS_CONFIG.pending
                    const Icon = cfg.icon
                    return (
                      <div
                        key={card._id}
                        className="flex items-center gap-3 rounded-2xl p-4"
                        style={{ background: colors.bgElevated, border: `1px solid ${colors.border}` }}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: cfg.bg }}>
                          <Icon className="h-[18px] w-[18px]" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium truncate" style={{ color: colors.textPrimary }}>
                            {formatCardLabel(card.cardNetwork, card.cardType)}
                          </p>
                          <p className="text-[12px] mt-0.5" style={{ color: colors.textTertiary }}>
                            {card.referenceNumber && <span className="font-mono">{card.referenceNumber} · </span>}
                            Applied {new Date(card.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Multi-step Apply Modal ─────────────────────────────────────── */}
      {step !== "closed" && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.7)" }} onClick={step === "success" ? closeApply : undefined} />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{
              background: colors.bgElevated,
              borderRadius: "24px 24px 0 0",
              maxHeight: "90vh",
              animation: "slideUp 300ms ease-out",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border }} />
            </div>

            {/* Header with back button */}
            <div className="px-5 py-3 flex items-center gap-3">
              {step !== "eligibility" && step !== "success" && (
                <button
                  onClick={() => {
                    const prev: Record<ApplyStep, ApplyStep> = { closed: "closed", eligibility: "closed", network: "eligibility", type: "network", details: "type", security: "details", confirm: "security", success: "success" }
                    setStep(prev[step])
                    setError("")
                    if (step === "security") { setPinStep("enter"); setCardPin(""); setConfirmPin("") }
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: colors.bgHover }}
                >
                  <ChevronLeft className="h-4 w-4" style={{ color: colors.textPrimary }} />
                </button>
              )}
              <div className="flex-1">
                <h2 className="text-[17px] font-semibold" style={{ color: colors.textPrimary }}>
                  {step === "eligibility" && "Card Application"}
                  {step === "network" && "Select Network"}
                  {step === "type" && "Select Card Type"}
                  {step === "details" && "Card Details"}
                  {step === "security" && "Security & Limits"}
                  {step === "confirm" && "Review & Confirm"}
                  {step === "success" && "Application Submitted"}
                </h2>
                {step !== "success" && (
                  <p className="text-[12px] mt-0.5" style={{ color: colors.textMuted }}>
                    Step {["eligibility", "network", "type", "details", "security", "confirm"].indexOf(step) + 1} of 6
                  </p>
                )}
              </div>
              <button onClick={closeApply} className="text-[13px] font-medium" style={{ color: colors.textTertiary }}>
                Cancel
              </button>
            </div>

            {/* Progress bar */}
            {step !== "success" && (
              <div className="px-5 pb-3">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: colors.border }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((["eligibility", "network", "type", "details", "security", "confirm"].indexOf(step) + 1) * (100 / 6))}%`,
                      background: colors.blue,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
              {/* ─── STEP 1: Eligibility ─── */}
              {step === "eligibility" && eligibility && (
                <>
                  <div className="rounded-xl p-4 space-y-3" style={{ background: colors.bgHover, border: `1px solid ${colors.border}` }}>
                    <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                      Eligibility Check
                    </p>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>KYC Verification</span>
                        <span className="text-[13px] font-semibold" style={{ color: eligibility.meetsKyc ? colors.green : colors.red }}>
                          {eligibility.meetsKyc ? "Verified" : `Tier ${cardSettings.requiredKycTier} Required`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Account Balance</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>{formatAmount(eligibility.fiatBalance)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Cards Available</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>{cardSettings.maxPerUser - activeOrPending.length} of {cardSettings.maxPerUser}</span>
                      </div>
                      {cardSettings.applicationFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[13px]" style={{ color: colors.textSecondary }}>Application Fee</span>
                          <span className="text-[13px] font-semibold" style={{ color: colors.yellow || "#F59E0B" }}>{formatAmount(cardSettings.applicationFee)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: colors.blueBg, border: `1px solid ${colors.blue}1A` }}>
                    <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: colors.blue }} />
                    <p className="text-[12px]" style={{ color: colors.textSecondary }}>
                      Virtual cards are issued for online transactions only. Processing takes 1-3 business days after submission.
                    </p>
                  </div>

                  {!eligibility.meetsKyc && (
                    <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: colors.redBg, border: `1px solid ${colors.red}1A` }}>
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: colors.red }} />
                      <p className="text-[12px]" style={{ color: colors.textSecondary }}>
                        Your KYC verification does not meet the minimum requirement. Please complete identity verification to apply for a card.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => eligibility.meetsKyc ? setStep("network") : router.push("/app/kyc")}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: eligibility.meetsKyc ? colors.blue : colors.bgHover }}
                  >
                    {eligibility.meetsKyc ? (
                      <>Continue<ArrowRight className="h-4 w-4" /></>
                    ) : (
                      "Complete KYC Verification"
                    )}
                  </button>
                </>
              )}

              {/* ─── STEP 2: Network Selection ─── */}
              {step === "network" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {(["visa", "mastercard", "amex"] as const).map((net) => {
                      const sel = selectedNetwork === net
                      const color = net === "visa" ? colors.blue : net === "mastercard" ? (colors.yellow || "#F59E0B") : "#2E77BC"
                      return (
                        <button
                          key={net}
                          onClick={() => setSelectedNetwork(net)}
                          className="relative rounded-xl p-4 transition-all text-center"
                          style={{
                            background: sel ? `${color}12` : colors.bgHover,
                            border: sel ? `1.5px solid ${color}4D` : `1px solid ${colors.border}`,
                          }}
                        >
                          {net === "visa" && <VisaLogo className="h-8 mx-auto mb-2" />}
                          {net === "mastercard" && <MastercardLogo className="h-8 mx-auto mb-2" />}
                          {net === "amex" && <AmexLogo className="h-8 mx-auto mb-2" />}
                          <p className="text-[13px] font-semibold" style={{ color: sel ? colors.textPrimary : colors.textSecondary }}>
                            {net === "visa" ? "Visa" : net === "mastercard" ? "Mastercard" : "Amex"}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                            {net === "visa" ? "Worldwide" : net === "mastercard" ? "Global" : "Premium"}
                          </p>
                          {sel && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4" style={{ color }} />}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => selectedNetwork && setStep("type")}
                    disabled={!selectedNetwork}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: selectedNetwork ? colors.blue : colors.bgHover, opacity: selectedNetwork ? 1 : 0.5 }}
                  >
                    Continue<ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* ─── STEP 3: Card Type ─── */}
              {step === "type" && (
                <>
                  <div className="space-y-3">
                    {(["debit", "credit"] as const).map((type) => {
                      const sel = selectedType === type
                      return (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className="w-full rounded-xl p-4 transition-all text-left flex items-center gap-4"
                          style={{
                            background: sel ? colors.greenBg : colors.bgHover,
                            border: sel ? `1.5px solid ${colors.green}4D` : `1px solid ${colors.border}`,
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-[15px] font-semibold" style={{ color: sel ? colors.green : colors.textPrimary }}>
                              {type === "debit" ? "Debit Card" : "Credit Card"}
                            </p>
                            <p className="text-[12px] mt-1" style={{ color: colors.textTertiary }}>
                              {type === "debit"
                                ? "Spend directly from your account balance. No credit line."
                                : "Get a credit line with rewards. Subject to approval and credit assessment."}
                            </p>
                          </div>
                          {sel && <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: colors.green }} />}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => selectedType && setStep("details")}
                    disabled={!selectedType}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: selectedType ? colors.blue : colors.bgHover, opacity: selectedType ? 1 : 0.5 }}
                  >
                    Continue<ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* ─── STEP 4: Details (name + billing address) ─── */}
              {step === "details" && (
                <>
                  <div>
                    <label className="text-[12px] font-medium uppercase tracking-wide block mb-2" style={{ color: colors.textTertiary }}>
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      placeholder="NAME AS ON CARD"
                      className="w-full h-12 rounded-xl px-4 text-[15px] font-medium outline-none uppercase"
                      style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                    />
                    <p className="text-[11px] mt-1.5" style={{ color: colors.textMuted }}>
                      This name will be printed on your virtual card
                    </p>
                  </div>

                  {/* Billing Address */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4" style={{ color: colors.blue }} />
                      <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                        Billing Address
                      </label>
                    </div>
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={billingStreet}
                        onChange={(e) => setBillingStreet(e.target.value)}
                        placeholder="Street address"
                        className="w-full h-11 rounded-xl px-4 text-[14px] outline-none"
                        style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          placeholder="City"
                          className="w-full h-11 rounded-xl px-4 text-[14px] outline-none"
                          style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                        />
                        <input
                          type="text"
                          value={billingState}
                          onChange={(e) => setBillingState(e.target.value)}
                          placeholder="State / Province"
                          className="w-full h-11 rounded-xl px-4 text-[14px] outline-none"
                          style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={billingZip}
                          onChange={(e) => setBillingZip(e.target.value)}
                          placeholder="ZIP / Postal code"
                          className="w-full h-11 rounded-xl px-4 text-[14px] outline-none"
                          style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                        />
                        <input
                          type="text"
                          value={billingCountry}
                          onChange={(e) => setBillingCountry(e.target.value)}
                          placeholder="Country"
                          className="w-full h-11 rounded-xl px-4 text-[14px] outline-none"
                          style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: colors.textMuted }}>
                      Used for card verification and transaction authorization
                    </p>
                  </div>

                  {error && <p className="text-[13px] text-center" style={{ color: colors.red }}>{error}</p>}

                  <button
                    onClick={() => {
                      if (cardholderName.trim().length < 2) { setError("Please enter a valid cardholder name"); return }
                      if (!billingStreet.trim() || !billingCity.trim() || !billingZip.trim() || !billingCountry.trim()) { setError("Please fill in all required billing address fields"); return }
                      setError(""); setStep("security")
                    }}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: colors.blue }}
                  >
                    Continue<ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* ─── STEP 5: Security & Limits ─── */}
              {step === "security" && (
                <>
                  {/* Preferred Limit */}
                  <div>
                    <label className="text-[12px] font-medium uppercase tracking-wide block mb-2" style={{ color: colors.textTertiary }}>
                      Preferred {selectedType === "credit" ? "Credit" : "Spending"} Limit
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {LIMIT_OPTIONS.map((limit) => (
                        <button
                          key={limit}
                          onClick={() => setPreferredLimit(limit)}
                          className="h-10 rounded-lg text-[13px] font-semibold transition-all"
                          style={{
                            background: preferredLimit === limit ? colors.blueBg : colors.bgHover,
                            border: preferredLimit === limit ? `1px solid ${colors.blue}4D` : `1px solid ${colors.border}`,
                            color: preferredLimit === limit ? colors.blue : colors.textSecondary,
                          }}
                        >
                          {currencySymbol}{limit.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: colors.textMuted }}>
                      Final limit is subject to approval and may differ from your preference
                    </p>
                  </div>

                  {/* Daily Spend Limit */}
                  <div>
                    <label className="text-[12px] font-medium uppercase tracking-wide block mb-2" style={{ color: colors.textTertiary }}>
                      Daily Spending Limit
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DAILY_LIMIT_OPTIONS.map((limit) => (
                        <button
                          key={limit}
                          onClick={() => setDailySpendLimit(limit)}
                          className="h-10 rounded-lg text-[13px] font-semibold transition-all"
                          style={{
                            background: dailySpendLimit === limit ? colors.greenBg : colors.bgHover,
                            border: dailySpendLimit === limit ? `1px solid ${colors.green}4D` : `1px solid ${colors.border}`,
                            color: dailySpendLimit === limit ? colors.green : colors.textSecondary,
                          }}
                        >
                          {currencySymbol}{limit.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: colors.textMuted }}>
                      Maximum amount you can spend per day. Can be changed later.
                    </p>
                  </div>

                  {/* Card PIN */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="h-4 w-4" style={{ color: colors.blue }} />
                      <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                        {pinStep === "enter" ? "Set Card PIN" : "Confirm Card PIN"}
                      </label>
                    </div>
                    <p className="text-[12px] mb-4" style={{ color: colors.textTertiary }}>
                      {pinStep === "enter" ? "Choose a 4-digit PIN for ATM & POS transactions" : "Re-enter your PIN to confirm"}
                    </p>

                    {/* PIN dots */}
                    <div className="flex justify-center gap-4 mb-5">
                      {[0, 1, 2, 3].map((i) => {
                        const currentPin = pinStep === "enter" ? cardPin : confirmPin
                        const filled = i < currentPin.length
                        return (
                          <div
                            key={i}
                            className="transition-all duration-200"
                            style={{
                              width: 18, height: 18, borderRadius: "50%",
                              background: filled ? colors.blue : "transparent",
                              border: `2.5px solid ${filled ? colors.blue : colors.border}`,
                              transform: filled ? "scale(1.1)" : "scale(1)",
                              boxShadow: filled && colors.isDark ? "0 0 10px rgba(59,158,255,0.35)" : "none",
                            }}
                          />
                        )
                      })}
                    </div>

                    {/* PIN error */}
                    {error && <p className="text-[13px] text-center mb-3" style={{ color: colors.red }}>{error}</p>}

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
                        if (key === "") return <div key="empty" />
                        const isDel = key === "del"
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setError("")
                              if (isDel) {
                                if (pinStep === "enter") setCardPin((p) => p.slice(0, -1))
                                else setConfirmPin((p) => p.slice(0, -1))
                              } else {
                                if (pinStep === "enter") {
                                  setCardPin((p) => {
                                    const next = p.length < 4 ? p + key : p
                                    if (next.length === 4) setTimeout(() => setPinStep("confirm"), 300)
                                    return next
                                  })
                                } else {
                                  setConfirmPin((p) => p.length < 4 ? p + key : p)
                                }
                              }
                            }}
                            className="flex items-center justify-center h-12 rounded-xl text-[18px] font-semibold transition-all active:scale-95"
                            style={{ background: colors.bgHover, border: "none", color: colors.textPrimary }}
                          >
                            {isDel ? <Delete className="h-5 w-5" style={{ color: colors.textSecondary }} /> : key}
                          </button>
                        )
                      })}
                    </div>

                    {pinStep === "confirm" && (
                      <button
                        onClick={() => { setPinStep("enter"); setCardPin(""); setConfirmPin(""); setError("") }}
                        className="mt-3 text-[12px] font-medium block mx-auto"
                        style={{ color: colors.textTertiary, background: "none", border: "none", cursor: "pointer" }}
                      >
                        Reset PIN
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (cardPin.length !== 4) { setError("Please enter a 4-digit PIN"); return }
                      if (pinStep === "enter") { setError("Please confirm your PIN"); return }
                      if (confirmPin.length !== 4) { setError("Please confirm your 4-digit PIN"); return }
                      if (cardPin !== confirmPin) { setError("PINs do not match. Please try again."); setConfirmPin(""); return }
                      setError(""); setStep("confirm")
                    }}
                    disabled={cardPin.length !== 4 || confirmPin.length !== 4}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{
                      background: (cardPin.length === 4 && confirmPin.length === 4) ? colors.blue : colors.bgHover,
                      opacity: (cardPin.length === 4 && confirmPin.length === 4) ? 1 : 0.5,
                    }}
                  >
                    Review Application<ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* ─── STEP 6: Confirmation ─── */}
              {step === "confirm" && (
                <>
                  <div className="rounded-xl p-4 space-y-3" style={{ background: colors.bgHover, border: `1px solid ${colors.border}` }}>
                    <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                      Application Summary
                    </p>
                    <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Card Network</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>{selectedNetwork === "visa" ? "Visa" : selectedNetwork === "amex" ? "American Express" : "Mastercard"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Card Type</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>{selectedType === "credit" ? "Credit Card" : "Debit Card"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Cardholder Name</span>
                        <span className="text-[13px] font-semibold font-mono" style={{ color: colors.textPrimary }}>{cardholderName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Preferred Limit</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>{currencySymbol}{preferredLimit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Daily Spend Limit</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>{currencySymbol}{dailySpendLimit.toLocaleString()}/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Card PIN</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.green }}>••••  Set</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: colors.textSecondary }}>Card Format</span>
                        <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>Virtual</span>
                      </div>
                      {billingStreet && (
                        <div className="flex justify-between">
                          <span className="text-[13px]" style={{ color: colors.textSecondary }}>Billing Address</span>
                          <span className="text-[13px] font-semibold text-right max-w-[55%]" style={{ color: colors.textPrimary }}>
                            {billingStreet}, {billingCity}{billingState ? `, ${billingState}` : ""} {billingZip}
                          </span>
                        </div>
                      )}
                      {cardSettings.applicationFee > 0 && (
                        <div className="flex justify-between pt-2 border-t" style={{ borderColor: colors.border }}>
                          <span className="text-[13px] font-medium" style={{ color: colors.yellow || "#F59E0B" }}>Application Fee</span>
                          <span className="text-[13px] font-bold" style={{ color: colors.yellow || "#F59E0B" }}>{formatAmount(cardSettings.applicationFee)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div
                    onClick={() => setAgreedTerms(!agreedTerms)}
                    className="rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all"
                    style={{
                      background: agreedTerms ? colors.greenBg : colors.bgHover,
                      border: agreedTerms ? `1px solid ${colors.green}33` : `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded"
                      style={{
                        background: agreedTerms ? colors.green : colors.bgHover,
                        border: agreedTerms ? "none" : `1px solid ${colors.border}`,
                      }}
                    >
                      {agreedTerms && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: colors.textSecondary }}>
                      I agree to the <span style={{ color: colors.blue }}>Terms & Conditions</span> and <span style={{ color: colors.blue }}>Cardholder Agreement</span>. I understand that the application fee is non-refundable and my preferred limit is subject to approval.
                    </p>
                  </div>

                  {error && <p className="text-[13px] text-center" style={{ color: colors.red }}>{error}</p>}

                  <button
                    onClick={handleApply}
                    disabled={!agreedTerms || applying}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
                    style={{
                      background: agreedTerms ? colors.green : colors.bgHover,
                      opacity: agreedTerms && !applying ? 1 : 0.5,
                    }}
                  >
                    {applying
                      ? "Processing..."
                      : cardSettings.applicationFee > 0
                        ? `Confirm & Pay ${formatAmount(cardSettings.applicationFee)}`
                        : "Submit Application"}
                  </button>
                </>
              )}

              {/* ─── STEP 6: Success ─── */}
              {step === "success" && (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: colors.greenBg }}>
                    <CheckCircle2 className="h-8 w-8" style={{ color: colors.green }} />
                  </div>
                  <p className="text-[18px] font-semibold" style={{ color: colors.textPrimary }}>Application Submitted</p>
                  <p className="text-[13px] mt-1.5" style={{ color: colors.textTertiary }}>
                    Your card application is being reviewed
                  </p>

                  {successRef && (
                    <div className="mt-5 rounded-xl p-4" style={{ background: colors.bgHover, border: `1px solid ${colors.border}` }}>
                      <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: colors.textMuted }}>Reference Number</p>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-[16px] font-mono font-semibold" style={{ color: colors.textPrimary }}>{successRef}</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(successRef); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000) }}
                          className="p-1"
                        >
                          {copiedRef ? <Check className="h-4 w-4" style={{ color: colors.green }} /> : <Copy className="h-4 w-4" style={{ color: colors.textTertiary }} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl p-3 text-left" style={{ background: colors.blueBg, border: `1px solid ${colors.blue}1A` }}>
                    <p className="text-[12px] font-medium" style={{ color: colors.blue }}>What happens next?</p>
                    <ul className="text-[12px] mt-2 space-y-1.5" style={{ color: colors.textSecondary }}>
                      <li>• Your application will be reviewed within 1-3 business days</li>
                      <li>• You will be notified once your card is approved</li>
                      <li>• Card details will appear on this page when active</li>
                    </ul>
                  </div>

                  <button
                    onClick={closeApply}
                    className="mt-5 w-full h-12 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
                    style={{ background: colors.blue }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Visual card component ────────────────────────────────────────────────────

interface CardVisualProps {
  card: CardData
  colors: ReturnType<typeof useThemeColors>
  accountBalance?: number  // For debit cards - linked to account balance
  onPayment?: () => void   // Callback after successful payment
}

function CardVisual({ card, colors, accountBalance, onPayment }: CardVisualProps) {
  const isVisa = card.cardNetwork === "visa"
  const isAmex = card.cardNetwork === "amex"
  const isFrozen = card.status === "frozen"
  const { symbol: currencySymbol } = useCurrency()
  const [showCvv, setShowCvv] = useState(false)

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [paySuccess, setPaySuccess] = useState<{ amount: number; newBalance: number } | null>(null)

  const handlePay = async () => {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) {
      setPayError("Enter a valid amount")
      return
    }
    if (amount > card.balance) {
      setPayError(`Amount exceeds balance owed (${currencySymbol}${card.balance.toLocaleString()})`)
      return
    }
    if (accountBalance !== undefined && amount > accountBalance) {
      setPayError(`Insufficient account balance (${currencySymbol}${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })})`)
      return
    }

    setPaying(true)
    setPayError("")
    try {
      const res = await fetch(`/api/user/cards/${card._id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Payment failed")
      
      setPaySuccess({ amount: data.paymentAmount, newBalance: data.newCardBalance })
      onPayment?.()
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setPaying(false)
    }
  }

  const closePayModal = () => {
    setShowPayModal(false)
    setPayAmount("")
    setPayError("")
    setPaySuccess(null)
  }

  return (
    <div className="space-y-0">
      <div
        className="relative overflow-hidden text-white"
        style={{
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px 20px",
          minHeight: 200,
          background: isVisa
            ? "linear-gradient(135deg, #1a4a8a 0%, #0f3060 40%, #0a2040 100%)"
            : isAmex
              ? "linear-gradient(135deg, #006fcf 0%, #004b8d 40%, #002d5a 100%)"
              : "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
        }}
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 160, height: 160,
            top: -40, right: -40,
            background: isVisa ? "rgba(59,158,255,0.15)" : isAmex ? "rgba(0,111,207,0.2)" : "rgba(255,95,0,0.12)",
            filter: "blur(40px)",
          }}
        />

        {/* Top row: label + logo */}
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.6)" }}>
              VIRTUAL {card.cardType === "credit" ? "CREDIT" : "DEBIT"} CARD
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 rotate-90" style={{ color: "rgba(255,255,255,0.4)" }} />
          </div>
        </div>

        {/* Card number */}
        <p className="relative mt-6 font-mono text-[18px] sm:text-[20px] tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.9)" }}>
          {card.cardNumber || "•••• **** **** ••••"}
        </p>

        {/* Name + expiry + CVV */}
        <div className="relative mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Card Holder</p>
            <p className="text-[14px] font-medium mt-0.5">{card.cardholderName || "CARDHOLDER"}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>CVV</p>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[14px] font-medium font-mono">{showCvv ? (card.cvv || "•••") : "•••"}</p>
              <button onClick={() => setShowCvv(!showCvv)} className="p-0.5">
                {showCvv
                  ? <EyeOff className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} />
                  : <Eye className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Expires</p>
            <p className="text-[14px] font-medium mt-0.5">
              {card.expiryMonth ? `${String(card.expiryMonth).padStart(2, "0")}/${String(card.expiryYear).slice(-2)}` : "••/••"}
            </p>
          </div>
        </div>

        {/* Brand logo */}
        <div className="relative mt-3 flex items-center justify-between">
          {isVisa ? (
            <VisaLogo className="h-7" />
          ) : isAmex ? (
            <AmexLogo className="h-7" />
          ) : (
            <MastercardLogo className="h-7" />
          )}
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            {formatCardLabel(card.cardNetwork, card.cardType)}
          </span>
        </div>

        {/* Frozen overlay */}
        {isFrozen && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", borderRadius: "20px 20px 0 0" }}>
            <Snowflake className="h-8 w-8 mb-1" style={{ color: colors.blue }} />
            <span className="text-xs font-bold uppercase tracking-widest text-white">Frozen</span>
          </div>
        )}
      </div>

      {/* Card stats below the visual */}
      <div
        className="p-4"
        style={{
          background: colors.bgElevated,
          borderRadius: card.cardType === "credit" && card.balance > 0 && card.status === "active" ? "0" : "0 0 20px 20px",
          border: `1px solid ${colors.border}`,
          borderTop: "none",
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px]" style={{ color: colors.textTertiary }}>
              {card.cardType === "credit" ? "Credit Limit" : "Spending Limit"}
            </p>
            <p className="text-[14px] font-semibold tabular-nums mt-0.5" style={{ color: colors.textPrimary }}>
              {currencySymbol}{(card.cardType === "credit" ? card.creditLimit : card.spendingLimit).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: colors.textTertiary }}>
              {card.cardType === "credit" ? "Balance Owed" : "Available Balance"}
            </p>
            <p className="text-[14px] font-semibold tabular-nums mt-0.5" style={{ color: colors.textPrimary }}>
              {currencySymbol}{card.cardType === "credit"
                ? card.balance.toLocaleString()
                : (accountBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: colors.textTertiary }}>Status</p>
            <p className="text-[14px] font-semibold mt-0.5" style={{ color: isFrozen ? colors.blue : colors.green }}>
              {isFrozen ? "Frozen" : "Active"}
            </p>
          </div>
        </div>
        {/* Manage Button */}
        <button
          onClick={() => window.location.href = `/app/cards/${card._id}`}
          className="w-full mt-3 py-2.5 flex items-center justify-center gap-2 text-[13px] font-semibold rounded-xl transition-all active:scale-[0.98]"
          style={{ 
            background: colors.blueBg, 
            color: colors.blue,
            border: `1px solid ${colors.blue}33`,
          }}
        >
          <Settings className="h-4 w-4" />
          Manage Card
        </button>
      </div>

      {/* Pay Balance Button - Only for credit cards with balance */}
      {card.cardType === "credit" && card.balance > 0 && card.status === "active" && (
        <button
          onClick={() => setShowPayModal(true)}
          className="w-full py-3 flex items-center justify-center gap-2 text-[13px] font-semibold transition-all active:scale-[0.98]"
          style={{ 
            background: colors.greenBg, 
            color: colors.green,
            borderRadius: "0 0 20px 20px",
            border: `1px solid ${colors.border}`,
            borderTop: "none",
          }}
        >
          <DollarSign className="h-4 w-4" />
          Pay Balance
        </button>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={closePayModal} />
          <div 
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] rounded-2xl p-5"
            style={{ background: colors.bgElevated, border: `1px solid ${colors.border}` }}
          >
            {paySuccess ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: colors.greenBg }}>
                  <CheckCircle2 className="h-7 w-7" style={{ color: colors.green }} />
                </div>
                <p className="text-[17px] font-semibold" style={{ color: colors.textPrimary }}>Payment Successful</p>
                <p className="text-[14px] mt-2" style={{ color: colors.textSecondary }}>
                  You paid <span className="font-semibold">{currencySymbol}{paySuccess.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
                <p className="text-[13px] mt-1" style={{ color: colors.textTertiary }}>
                  New balance: {currencySymbol}{paySuccess.newBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <button
                  onClick={closePayModal}
                  className="mt-5 w-full h-11 rounded-xl text-[14px] font-semibold text-white"
                  style={{ background: colors.blue }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[16px] font-semibold" style={{ color: colors.textPrimary }}>Pay Credit Card</p>
                  <button onClick={closePayModal} className="p-1">
                    <XCircle className="h-5 w-5" style={{ color: colors.textTertiary }} />
                  </button>
                </div>

                <div className="rounded-xl p-3 mb-4" style={{ background: colors.bgHover, border: `1px solid ${colors.border}` }}>
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: colors.textSecondary }}>Balance Owed</span>
                    <span className="font-semibold" style={{ color: colors.textPrimary }}>{currencySymbol}{card.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[13px] mt-1.5">
                    <span style={{ color: colors.textSecondary }}>Account Balance</span>
                    <span className="font-semibold" style={{ color: colors.textPrimary }}>{currencySymbol}{(accountBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: colors.textSecondary }}>
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: colors.textTertiary }}>{currencySymbol}</span>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 pl-7 pr-3 rounded-xl text-[15px] outline-none"
                      style={{ 
                        background: colors.bgHover, 
                        border: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                      }}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setPayAmount(String(Math.min(card.balance, accountBalance ?? card.balance)))}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: colors.blueBg, color: colors.blue }}
                    >
                      Pay Full Balance
                    </button>
                    <button
                      onClick={() => setPayAmount(String(Math.min(card.balance / 2, accountBalance ?? card.balance)))}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: colors.bgHover, color: colors.textSecondary, border: `1px solid ${colors.border}` }}
                    >
                      Pay Half
                    </button>
                  </div>
                </div>

                {payError && (
                  <div className="mb-4 p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                    <p className="text-[13px]" style={{ color: "#EF4444" }}>{payError}</p>
                  </div>
                )}

                <button
                  onClick={handlePay}
                  disabled={paying || !payAmount}
                  className="w-full h-11 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: colors.green }}
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      Pay Now
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
