"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Receipt, Clock, Search, CheckCircle2, XCircle, Banknote,
  AlertCircle, Building, Calendar, ArrowDownLeft, FileText, Download,
} from "lucide-react"
import { UserHeader } from "@/components/user/UserHeader"
import { useThemeColors } from "@/components/shared/ThemeProvider"
import { useCurrency } from "@/components/shared/PlatformSettingsProvider"

// ── Types ────────────────────────────────────────────────────────────────────

interface TaxDocument {
  name:    string
  docType: string
  taxYear: number
}

interface RefundDetail {
  _id:                  string
  taxYear:              number
  filingType:           string
  totalReportedIncome:  number
  totalTaxWithheld:     number
  refundAmount:         number
  ssnLast4:             string
  employer:             string | null
  status:               string
  referenceNumber:      string
  documents:            TaxDocument[]
  filingDate:           string
  estimatedDepositDate: string | null
  actualDepositDate:    string | null
  adminNote:            string | null
  rejectedReason:       string | null
  depositedAt:          string | null
}

interface DepositAccount {
  accountNumber: string
  accountType:   string
  currency:      string
}

interface DepositTransaction {
  amount:    number
  reference: string
  createdAt: string
}

interface TimelineStep {
  step:      string
  label:     string
  date:      string | null
  active:    boolean
  completed: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  pending:      { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", label: "Filed",        icon: Clock },
  under_review: { color: "#3B9EFF", bg: "rgba(59,158,255,0.12)", label: "Under Review", icon: Search },
  approved:     { color: "#00C896", bg: "rgba(0,200,150,0.12)",  label: "Approved",     icon: CheckCircle2 },
  deposited:    { color: "#00C896", bg: "rgba(0,200,150,0.12)",  label: "Deposited",    icon: Banknote },
  rejected:     { color: "#EF4444", bg: "rgba(239,68,68,0.12)",  label: "Rejected",     icon: XCircle },
}

const FILING_LABELS: Record<string, string> = {
  individual: "Individual",
  joint:      "Joint Filing",
  business:   "Business",
}

const STEP_ICONS: Record<string, React.ElementType> = {
  pending:      Clock,
  under_review: Search,
  approved:     CheckCircle2,
  deposited:    Banknote,
  rejected:     XCircle,
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function TaxRefundDetailPage() {
  const router = useRouter()
  const params = useParams()
  const refundId = params.id as string
  const { formatAmount } = useCurrency()
  const fmt = (n: number) => formatAmount(n)

  const [refund, setRefund] = useState<RefundDetail | null>(null)
  const [account, setAccount] = useState<DepositAccount | null>(null)
  const [depositTx, setDepositTx] = useState<DepositTransaction | null>(null)
  const [timeline, setTimeline] = useState<TimelineStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/user/tax-refunds/${refundId}`)
      if (!res.ok) { setError("Refund not found"); setLoading(false); return }
      const data = await res.json()
      setRefund(data.refund)
      setAccount(data.depositAccount)
      setDepositTx(data.depositTransaction)
      setTimeline(data.timeline || [])
    } catch {
      setError("Failed to load refund details")
    }
    setLoading(false)
  }, [refundId])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const cfg = STATUS_CFG[refund?.status || "pending"] || STATUS_CFG.pending

  return (
    <div style={{ background: "#0A1628", minHeight: "100vh" }}>
      <UserHeader title="Refund Details" showBack onBack={() => router.push("/app/tax-refunds")} />

      <div className="px-4 py-5 lg:px-6 max-w-[800px] mx-auto space-y-5">
        {loading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-2xl skeleton-shimmer" />
            <div className="h-32 rounded-2xl skeleton-shimmer" />
          </div>
        ) : error && !refund ? (
          <div className="py-20 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "#EF4444" }} />
            <p className="text-[15px] text-white font-semibold">{error}</p>
            <button
              onClick={() => router.push("/app/tax-refunds")}
              className="mt-4 h-10 rounded-xl px-6 text-[14px] font-medium text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Back to Tax Refunds
            </button>
          </div>
        ) : refund ? (
          <>
            {/* ── Header Card ──────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(59,158,255,0.12)" }}>
                      <Receipt className="h-5 w-5" style={{ color: "#3B9EFF" }} />
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-white">Tax Year {refund.taxYear}</p>
                      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {FILING_LABELS[refund.filingType] || refund.filingType}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                <div className="text-center py-4">
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {refund.status === "deposited" ? "Refund Deposited" : "Expected Refund"}
                  </p>
                  <p className="text-[32px] font-bold text-white tabular-nums mt-1">{fmt(refund.refundAmount)}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.06)" }}>
                <StatCell label="Filed" value={new Date(refund.filingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <StatCell
                  label="Est. Deposit"
                  value={refund.estimatedDepositDate
                    ? new Date(refund.estimatedDepositDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"
                  }
                />
                <StatCell label="Ref" value={refund.referenceNumber.split("-").pop() || "—"} />
              </div>
            </div>

            {/* ── Status Timeline ──────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Refund Status
                </p>
              </div>
              <div className="px-4 py-4">
                {timeline.map((t, i) => {
                  const StepIcon = STEP_ICONS[t.step] || Clock
                  const isLast = i === timeline.length - 1
                  const isRejected = t.step === "rejected"

                  let dotColor = "rgba(255,255,255,0.1)"
                  let lineColor = "rgba(255,255,255,0.06)"
                  if (t.completed) { dotColor = "#00C896"; lineColor = "#00C896" }
                  else if (t.active && !isRejected) dotColor = "#3B9EFF"
                  else if (t.active && isRejected) dotColor = "#EF4444"

                  return (
                    <div key={t.step} className="flex gap-3">
                      {/* Dot + Line */}
                      <div className="flex flex-col items-center">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                          style={{ background: `${dotColor}20`, border: `2px solid ${dotColor}` }}
                        >
                          <StepIcon className="h-3.5 w-3.5" style={{ color: dotColor }} />
                        </div>
                        {!isLast && (
                          <div className="w-0.5 flex-1 min-h-[24px]" style={{ background: lineColor }} />
                        )}
                      </div>
                      {/* Content */}
                      <div className={`pb-${isLast ? "0" : "4"} pt-1`}>
                        <p className="text-[14px] font-medium text-white">{t.label}</p>
                        {t.date && (
                          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {new Date(t.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                        {t.active && !t.completed && !isRejected && (
                          <p className="text-[11px] mt-0.5" style={{ color: "#3B9EFF" }}>In progress</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Rejection Reason ─────────────────────────────────── */}
            {refund.status === "rejected" && refund.rejectedReason && (
              <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.1)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: "#EF4444" }}>Reason for Rejection</p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{refund.rejectedReason}</p>
              </div>
            )}

            {/* ── Admin Note ───────────────────────────────────────── */}
            {refund.adminNote && refund.status !== "rejected" && (
              <div className="rounded-2xl p-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.1)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: "#F59E0B" }}>Note from Admin</p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{refund.adminNote}</p>
              </div>
            )}

            {/* ── Tax Summary ──────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Tax Summary</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <DetailRow label="Total reported income" value={fmt(refund.totalReportedIncome)} />
                <DetailRow label="Total tax withheld" value={fmt(refund.totalTaxWithheld)} />
                <DetailRow label="Eligible refund" value={fmt(refund.refundAmount)} highlight />
                <DetailRow label="Filed date" value={new Date(refund.filingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} valueColor="#3B9EFF" />
              </div>
            </div>

            {/* ── Filing Details ────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Filing Details</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <DetailRow label="Tax Year" value={String(refund.taxYear)} />
                <DetailRow label="Filing Type" value={FILING_LABELS[refund.filingType] || refund.filingType} />
                {refund.employer && <DetailRow label="Employer" value={refund.employer} />}
                <DetailRow label="SSN (last 4)" value={`····${refund.ssnLast4}`} />
                <DetailRow label="Reference" value={refund.referenceNumber} />
                {refund.estimatedDepositDate && (
                  <DetailRow label="Est. Deposit" value={new Date(refund.estimatedDepositDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} />
                )}
                {refund.actualDepositDate && (
                  <DetailRow label="Actual Deposit" value={new Date(refund.actualDepositDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} />
                )}
              </div>
            </div>

            {/* ── Tax Documents ──────────────────────────────────────── */}
            {refund.documents && refund.documents.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Tax Documents</p>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {refund.documents.map((doc: TaxDocument, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(59,158,255,0.08)" }}>
                        <FileText className="h-4 w-4" style={{ color: "#3B9EFF" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white">{doc.name}</p>
                        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{doc.docType}</p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <Download className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Deposit Account ───────────────────────────────────── */}
            {account && (
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(59,158,255,0.12)" }}>
                  <Building className="h-4 w-4" style={{ color: "#3B9EFF" }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white capitalize">{account.accountType} Account</p>
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    ····{account.accountNumber.slice(-4)} · {account.currency}
                  </p>
                </div>
                <p className="ml-auto text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Deposit account</p>
              </div>
            )}

            {/* ── Deposit Transaction ──────────────────────────────── */}
            {depositTx && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Deposit Transaction</p>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(0,200,150,0.12)" }}>
                    <ArrowDownLeft className="h-3.5 w-3.5" style={{ color: "#00C896" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white">Tax Refund Deposit</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {new Date(depositTx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {depositTx.reference}
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: "#00C896" }}>+{fmt(depositTx.amount)}</p>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 text-center">
      <p className="text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      <p className="text-[13px] font-semibold text-white mt-0.5 tabular-nums">{value}</p>
    </div>
  )
}

function DetailRow({ label, value, highlight, valueColor }: { label: string; value: string; highlight?: boolean; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <span className="text-[14px] font-semibold tabular-nums" style={{ color: highlight ? "#00C896" : valueColor || "white" }}>{value}</span>
    </div>
  )
}
