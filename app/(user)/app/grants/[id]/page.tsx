"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  DollarSign, Clock, Search, CheckCircle2, XCircle, Banknote,
  AlertCircle, Building, ArrowDownLeft, FileText, Download,
} from "lucide-react"
import { UserHeader } from "@/components/user/UserHeader"
import { useThemeColors } from "@/components/shared/ThemeProvider"
import { useCurrency } from "@/components/shared/PlatformSettingsProvider"

// ── Types ────────────────────────────────────────────────────────────────────

interface GrantDetail {
  _id:             string
  grantType:       string
  grantTypeLabel:  string
  amount:          number
  approvedAmount:  number | null
  purpose:         string
  supportingInfo:  string | null
  documents:       { name: string; docUrl: string }[]
  status:          string
  referenceNumber: string
  adminNote:       string | null
  rejectedReason:  string | null
  appliedAt:       string
  reviewedAt:      string | null
  disbursedAt:     string | null
}

interface DepositAccount { accountNumber: string; accountType: string; currency: string }
interface DisbursementTx { amount: number; reference: string; createdAt: string }
interface TimelineStep { step: string; label: string; date: string | null; completed: boolean; active: boolean }

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  pending:      { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", label: "Pending" },
  under_review: { color: "#3B9EFF", bg: "rgba(59,158,255,0.12)", label: "Under Review" },
  approved:     { color: "#00C896", bg: "rgba(0,200,150,0.12)",  label: "Approved" },
  rejected:     { color: "#EF4444", bg: "rgba(239,68,68,0.12)",  label: "Rejected" },
  disbursed:    { color: "#00C896", bg: "rgba(0,200,150,0.12)",  label: "Disbursed" },
}

const STEP_ICONS: Record<string, React.ElementType> = {
  submitted: Clock, under_review: Search, approved: CheckCircle2,
  rejected: XCircle, disbursed: Banknote,
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GrantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { formatAmount } = useCurrency()
  const [grant, setGrant] = useState<GrantDetail | null>(null)
  const [account, setAccount] = useState<DepositAccount | null>(null)
  const [disbursementTx, setDisbursementTx] = useState<DisbursementTx | null>(null)
  const [timeline, setTimeline] = useState<TimelineStep[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/grants/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setGrant(data.grant)
        setAccount(data.depositAccount)
        setDisbursementTx(data.disbursementTx)
        setTimeline(data.timeline)
      }
    } catch { /* */ }
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const cfg = grant ? STATUS_CFG[grant.status] || STATUS_CFG.pending : STATUS_CFG.pending

  return (
    <div style={{ background: "#0A1628", minHeight: "100vh" }}>
      <UserHeader title="Grant Details" />

      <div className="px-4 py-5 lg:px-6 space-y-5 max-w-[600px] mx-auto">
        {loading ? (
          <div className="space-y-3">
            <div className="h-40 rounded-2xl skeleton-shimmer" />
            <div className="h-32 rounded-2xl skeleton-shimmer" />
          </div>
        ) : grant ? (
          <>
            {/* ── Hero Card ──────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(0,200,150,0.12)" }}>
                      <DollarSign className="h-5 w-5" style={{ color: "#00C896" }} />
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-white">{grant.grantTypeLabel} Grant</p>
                      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{grant.referenceNumber}</p>
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                <div className="text-center py-4">
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {grant.status === "disbursed" ? "Disbursed Amount" : grant.approvedAmount ? "Approved Amount" : "Requested Amount"}
                  </p>
                  <p className="text-[32px] font-bold text-white tabular-nums mt-1">
                    {formatAmount(grant.approvedAmount || grant.amount)}
                  </p>
                  {grant.approvedAmount && grant.approvedAmount !== grant.amount && (
                    <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Requested: {formatAmount(grant.amount)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.06)" }}>
                <StatCell label="Applied" value={new Date(grant.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <StatCell label="Type" value={grant.grantTypeLabel} />
                <StatCell label="Ref" value={grant.referenceNumber.split("-").pop() || "—"} />
              </div>
            </div>

            {/* ── Status Timeline ────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Application Status</p>
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
                      <div className="flex flex-col items-center">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                          style={{ background: `${dotColor}20`, border: `2px solid ${dotColor}` }}
                        >
                          <StepIcon className="h-3.5 w-3.5" style={{ color: dotColor }} />
                        </div>
                        {!isLast && <div className="w-0.5 flex-1 min-h-[24px]" style={{ background: lineColor }} />}
                      </div>
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

            {/* ── Rejection Reason ────────────────────────────────── */}
            {grant.status === "rejected" && grant.rejectedReason && (
              <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.1)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: "#EF4444" }}>Reason for Rejection</p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{grant.rejectedReason}</p>
              </div>
            )}

            {/* ── Admin Note ──────────────────────────────────────── */}
            {grant.adminNote && grant.status !== "rejected" && (
              <div className="rounded-2xl p-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.1)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: "#F59E0B" }}>Note from Admin</p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{grant.adminNote}</p>
              </div>
            )}

            {/* ── Application Details ─────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Application Details</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <DetailRow label="Grant Type" value={grant.grantTypeLabel} />
                <DetailRow label="Requested Amount" value={formatAmount(grant.amount)} />
                {grant.approvedAmount && <DetailRow label="Approved Amount" value={formatAmount(grant.approvedAmount)} highlight />}
                <DetailRow label="Reference" value={grant.referenceNumber} />
                <DetailRow label="Applied On" value={new Date(grant.appliedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                {grant.disbursedAt && (
                  <DetailRow label="Disbursed On" value={new Date(grant.disbursedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                )}
              </div>
            </div>

            {/* ── Purpose ─────────────────────────────────────────── */}
            <div className="rounded-2xl p-4" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Purpose</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{grant.purpose}</p>
              {grant.supportingInfo && (
                <>
                  <p className="text-[11px] font-medium uppercase tracking-wide mt-4 mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Additional Information</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{grant.supportingInfo}</p>
                </>
              )}
            </div>

            {/* ── Documents ───────────────────────────────────────── */}
            {grant.documents && grant.documents.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Supporting Documents</p>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {grant.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(59,158,255,0.08)" }}>
                        <FileText className="h-4 w-4" style={{ color: "#3B9EFF" }} />
                      </div>
                      <p className="text-[13px] font-medium text-white flex-1 truncate">{doc.name}</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <Download className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Deposit Account ─────────────────────────────────── */}
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

            {/* ── Disbursement Transaction ────────────────────────── */}
            {disbursementTx && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Disbursement Transaction</p>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(0,200,150,0.12)" }}>
                    <ArrowDownLeft className="h-3.5 w-3.5" style={{ color: "#00C896" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white">Grant Disbursement</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {new Date(disbursementTx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {disbursementTx.reference}
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: "#00C896" }}>+{formatAmount(disbursementTx.amount)}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: "#0D1F3C", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[15px] font-semibold text-white">Grant not found</p>
          </div>
        )}
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

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <span className="text-[14px] font-semibold tabular-nums" style={{ color: highlight ? "#00C896" : "white" }}>{value}</span>
    </div>
  )
}
