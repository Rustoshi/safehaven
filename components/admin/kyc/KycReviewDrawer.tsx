"use client"

import { useState, useEffect } from "react"
import Link                    from "next/link"
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetClose } from "@/components/ui/sheet"
import { Button }              from "@/components/ui/button"
import { useToast }            from "@/components/ui/use-toast"
import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import { DocumentReviewPanel } from "./DocumentReviewPanel"
import { RequestDocumentsModal } from "./modals/RequestDocumentsModal"

// ── Types ─────────────────────────────────────────────────────────────────────

interface KycDoc {
  _id?:        string
  id?:         string
  docType:     string
  docUrl?:     string
  status:      string
  reviewNote?: string
  reviewedBy?: string
  reviewedAt?: string
  submittedAt: string
  dateOfBirth?: string
  address?: {
    street?:  string
    city?:    string
    state?:   string
    zip?:     string
    country?: string
  }
}

interface UserDetail {
  user:             Record<string, unknown>
  documents:        KycDoc[]
  accounts:         Record<string, unknown>[]
  requiredDocTypes: string[]
  completionStatus: {
    tier2Complete:   boolean
    tier3Complete:   boolean
    missingDocTypes: string[]
  }
}

interface Props {
  userId:   string
  open:     boolean
  onClose:  () => void
  onAction: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  pending:  <Clock        className="w-4 h-4 text-amber-500" />,
  rejected: <XCircle      className="w-4 h-4 text-red-500"  />,
}

const DOC_TYPE_LABELS: Record<string, string> = {
  passport:        "Passport",
  drivers_license: "Driver's License",
  national_id:     "National ID",
  selfie:          "Selfie",
  address_proof:   "Address Proof",
  utility_bill:    "Utility Bill",
}

const KYC_STATUS_STYLES: Record<string, string> = {
  unverified: "bg-gray-100 text-gray-700",
  pending:    "bg-amber-100 text-amber-700",
  verified:   "bg-green-100 text-green-700",
  rejected:   "bg-red-100 text-red-700",
}

const TIER2_ID_TYPES = ["passport", "drivers_license", "national_id"]

// ── Component ─────────────────────────────────────────────────────────────────

export function KycReviewDrawer({ userId, open, onClose, onAction }: Props) {
  const { toast }                      = useToast()
  const [detail,       setDetail]      = useState<UserDetail | null>(null)
  const [loading,      setLoading]     = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [reqDocsOpen,  setReqDocsOpen] = useState(false)
  const [bulkLoading,  setBulkLoading] = useState(false)

  // Override state
  const [ovStatus, setOvStatus] = useState("verified")
  const [ovTier,   setOvTier]   = useState(2)
  const [ovReason, setOvReason] = useState("")
  const [ovSubmit, setOvSubmit] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    setLoading(true)
    fetch(`/api/admin/kyc/${userId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d as UserDetail))
      .catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [open, userId, toast])

  function refresh() {
    setLoading(true)
    fetch(`/api/admin/kyc/${userId}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d as UserDetail); onAction() })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  async function handleBulkApprove() {
    if (!detail) return
    const pendingIds = detail.documents
      .filter((d) => d.status === "pending")
      .map((d) => String(d._id ?? d.id))
    if (pendingIds.length === 0) return

    setBulkLoading(true)
    try {
      const res  = await fetch("/api/admin/kyc/documents/bulk-approve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ documentIds: pendingIds }),
      })
      const data = await res.json() as { approved: number; errors: number }
      if (!res.ok) throw new Error("Failed")
      toast({ title: `Approved ${data.approved} document${data.approved !== 1 ? "s" : ""}${data.errors > 0 ? `, ${data.errors} failed` : ""}` })
      refresh()
    } catch {
      toast({ title: "Bulk approve failed", variant: "destructive" })
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleOverride() {
    if (!ovReason.trim()) return
    setOvSubmit(true)
    try {
      const res  = await fetch(`/api/admin/kyc/${userId}/override`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ kycStatus: ovStatus, kycTier: ovTier, reason: ovReason }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error((data.error as string) ?? "Failed")
      toast({ title: "KYC status overridden" })
      setOverrideOpen(false)
      setOvReason("")
      refresh()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
    } finally {
      setOvSubmit(false)
    }
  }

  async function handleRecalculate() {
    setBulkLoading(true)
    try {
      const res = await fetch(`/api/admin/kyc/${userId}/recalculate`, { method: "POST" })
      const data = await res.json() as { newStatus: string; newTier: number; updated: boolean }
      if (!res.ok) throw new Error("Failed")
      if (data.updated) {
        toast({ title: `Status updated to ${data.newStatus} (Tier ${data.newTier})` })
      } else {
        toast({ title: "No changes needed" })
      }
      refresh()
    } catch {
      toast({ title: "Recalculate failed", variant: "destructive" })
    } finally {
      setBulkLoading(false)
    }
  }

  const user        = detail?.user
  const docs        = detail?.documents ?? []
  const firstName   = String(user?.firstName ?? "")
  const lastName    = String(user?.lastName  ?? "")
  const email       = String(user?.email     ?? "")
  const kycStatus   = String(user?.kycStatus ?? "unverified")
  const kycTier     = Number(user?.kycTier   ?? 1)
  const userCreated = user?.createdAt ? new Date(user.createdAt as string).toLocaleDateString() : ""

  const required    = detail?.requiredDocTypes ?? []
  const completion  = detail?.completionStatus
  const approvedTypes = docs.filter((d) => d.status === "approved").map((d) => d.docType)
  const pendingCount  = docs.filter((d) => d.status === "pending").length

  // Sort: pending first, then rejected, then approved
  const sortedDocs = [...docs].sort((a, b) => {
    const sp = (s: string) => s === "pending" ? 0 : s === "rejected" ? 1 : 2
    return sp(a.status) - sp(b.status)
  })

  // ID doc URL for selfie comparison
  const idDoc = docs.find((d) => TIER2_ID_TYPES.includes(d.docType) && d.docUrl)

  const approvedCount = required.filter((t) => {
    if (TIER2_ID_TYPES.includes(t)) return TIER2_ID_TYPES.some((id) => approvedTypes.includes(id))
    return approvedTypes.includes(t)
  }).length

  return (
    <>
      <Sheet open={open} onClose={onClose} width="680px">
          <SheetHeader>
            <SheetTitle>KYC Review</SheetTitle>
            <SheetClose onClose={onClose} />
          </SheetHeader>

          {loading || !detail ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              {loading ? "Loading…" : "No data"}
            </div>
          ) : (
            <SheetBody className="space-y-6 px-4 sm:px-6">
              {/* User card */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1A2CCE] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {firstName.charAt(0)}{lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900">{firstName} {lastName}</h2>
                  <p className="text-sm text-gray-500">{email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${KYC_STATUS_STYLES[kycStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {kycStatus}
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      Tier {kycTier}
                    </span>
                    <span className="text-xs text-gray-400">Account created {userCreated}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Link href={`/admin/users/${userId}`} target="_blank"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Full profile
                  </Link>
                  {kycStatus !== "verified" && (
                    <button
                      onClick={handleRecalculate}
                      disabled={bulkLoading}
                      className="text-xs text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      {bulkLoading ? "Updating..." : "Recalculate status"}
                    </button>
                  )}
                </div>
              </div>

              {/* Completion status */}
              {required.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Required documents</p>
                    <span className="text-xs text-gray-500">{approvedCount} of {required.length > 0 ? (required.length > 3 ? required.length - 2 : required.length) : 0} approved</span>
                  </div>
                  <div className="space-y-1.5">
                    {["passport|drivers_license|national_id", "selfie", "address_proof"].filter((key) => {
                      if (key.includes("|")) return kycTier >= 2
                      if (key === "address_proof") return kycTier >= 3
                      return kycTier >= 2
                    }).map((key) => {
                      const types   = key.split("|")
                      const primary = types[0]
                      const label   = primary === "passport" ? "Photo ID (Passport / License / National ID)" : DOC_TYPE_LABELS[primary] ?? primary
                      const isApproved = types.some((t) => approvedTypes.includes(t))
                      const isPending  = !isApproved && docs.some((d) => types.includes(d.docType) && d.status === "pending")
                      const isRejected = !isApproved && !isPending && docs.some((d) => types.includes(d.docType) && d.status === "rejected")
                      const notSub     = !isApproved && !isPending && !isRejected

                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {isApproved  ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                           isPending   ? <Clock        className="w-4 h-4 text-amber-500" /> :
                           isRejected  ? <XCircle      className="w-4 h-4 text-red-500"   /> :
                                         <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300" />}
                          <span className={isApproved ? "text-green-700" : isPending ? "text-amber-700" : isRejected ? "text-red-600" : "text-gray-400"}>
                            {label}
                          </span>
                          {isRejected && completion?.missingDocTypes.includes(primary) && (
                            <span className="text-xs text-red-500">(rejected)</span>
                          )}
                          {notSub && <span className="text-xs text-gray-400">Not submitted</span>}
                        </div>
                      )
                    })}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#12B76A] rounded-full transition-all"
                        style={{ width: `${required.length > 0 ? (approvedCount / Math.max(1, required.length > 3 ? required.length - 2 : required.length)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk action bar */}
              {pendingCount > 0 && (
                <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm text-amber-700 flex-1 min-w-[8rem]">{pendingCount} document{pendingCount !== 1 ? "s" : ""} awaiting review</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button size="sm" onClick={handleBulkApprove} disabled={bulkLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex-1 sm:flex-none">
                      {bulkLoading ? "Approving…" : "Approve all pending"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReqDocsOpen(true)} className="text-xs flex-1 sm:flex-none">
                      Request documents
                    </Button>
                  </div>
                </div>
              )}

              {/* Document panels */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-700">Submitted documents ({docs.length})</p>
                {sortedDocs.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No documents submitted yet.</p>
                )}
                {sortedDocs.map((doc) => (
                  <DocumentReviewPanel
                    key={String(doc._id ?? doc.id)}
                    document={doc}
                    idDocUrl={doc.docType === "selfie" ? idDoc?.docUrl : undefined}
                    onApprove={refresh}
                    onReject={refresh}
                  />
                ))}
              </div>

              {/* Manual override */}
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOverrideOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 text-left"
                >
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Manual override</span>
                  </div>
                  {overrideOpen ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
                </button>
                {overrideOpen && (
                  <div className="px-4 pb-4 pt-2 space-y-3 bg-white border-t border-amber-200">
                    <p className="text-xs text-gray-500">Override KYC status directly, bypassing document review. Use with caution.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">KYC status</label>
                        <select value={ovStatus} onChange={(e) => setOvStatus(e.target.value)}
                          className="w-full h-8 text-sm border border-gray-300 rounded px-2 bg-white">
                          <option value="unverified">Unverified</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">KYC tier</label>
                        <select value={ovTier} onChange={(e) => setOvTier(Number(e.target.value))}
                          className="w-full h-8 text-sm border border-gray-300 rounded px-2 bg-white">
                          <option value={1}>Tier 1</option>
                          <option value={2}>Tier 2</option>
                          <option value={3}>Tier 3</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Reason (required)</label>
                      <textarea
                        value={ovReason}
                        onChange={(e) => setOvReason(e.target.value)}
                        rows={2}
                        placeholder="Reason for manual override…"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleOverride}
                      disabled={!ovReason.trim() || ovSubmit}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {ovSubmit ? "Overriding…" : "Override status"}
                    </Button>
                  </div>
                )}
              </div>
            </SheetBody>
          )}
      </Sheet>

      <RequestDocumentsModal
        userId={userId}
        userName={`${firstName} ${lastName}`}
        open={reqDocsOpen}
        onOpenChange={setReqDocsOpen}
        onSuccess={refresh}
      />
    </>
  )
}
