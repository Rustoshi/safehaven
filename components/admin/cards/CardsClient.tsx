"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MoreHorizontal, CheckCircle2, Search, ChevronLeft, ChevronRight,
  CreditCard, Wifi,
} from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { CardReviewDrawer }  from "./CardReviewDrawer"
import { UpdateLimitsModal } from "./UpdateLimitsModal"
import type { CardListItem, CardStats, CardDetail } from "@/lib/services/card.service"

interface InitialData {
  cards: CardListItem[]
  total: number
  pages: number
  stats: CardStats
}

const TABS = ["pending", "active", "frozen", "rejected", "cancelled", "all"] as const
type Tab   = typeof TABS[number]

const CARD_TYPE_TABS = [
  { value: "", label: "All types" },
  { value: "virtual_debit",   label: "Virtual debit" },
  { value: "physical_debit",  label: "Physical debit" },
  { value: "virtual_credit",  label: "Virtual credit" },
  { value: "physical_credit", label: "Physical credit" },
]

const STATUS_PILL: Record<string, string> = {
  pending:   "bg-amber-100  text-amber-700",
  active:    "bg-emerald-100 text-emerald-700",
  frozen:    "bg-blue-100   text-blue-700",
  rejected:  "bg-red-100    text-red-700",
  cancelled: "bg-gray-100   text-gray-500",
  approved:  "bg-emerald-100 text-emerald-700",
}

const CARD_TYPE_PILL: Record<string, string> = {
  virtual_debit:   "bg-slate-100  text-slate-700",
  physical_debit:  "bg-blue-100   text-blue-700",
  virtual_credit:  "bg-amber-100  text-amber-700",
  physical_credit: "bg-orange-100 text-orange-700",
}

const KYC_PILL: Record<string, string> = {
  verified:   "bg-emerald-100 text-emerald-700",
  pending:    "bg-amber-100   text-amber-700",
  rejected:   "bg-red-100     text-red-700",
  unverified: "bg-gray-100    text-gray-500",
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" })

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30)  return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function CardsClient({ initialData }: { initialData: InitialData }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const [data,        setData]        = useState(initialData)
  const [loading,     setLoading]     = useState(false)
  const [reviewId,    setReviewId]    = useState<string | null>(null)
  const [limitsCard,  setLimitsCard]  = useState<CardDetail | null>(null)
  const [newBanner,   setNewBanner]   = useState(false)
  const prevCountRef                   = useRef(initialData.stats.pendingCount)
  const debounceRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeTab = (searchParams.get("tab")      as Tab) ?? "pending"
  const cardType  = searchParams.get("cardType")  ?? ""
  const search    = searchParams.get("search")    ?? ""
  const page      = Number(searchParams.get("page") ?? 1)
  const sortOrder = searchParams.get("sortOrder") ?? "desc"

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== "page") params.set("page", "1")
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: "20",
        sortBy: "appliedAt", sortOrder,
        ...(activeTab !== "all" ? { status: activeTab } : {}),
        ...(cardType ? { cardType }  : {}),
        ...(search   ? { search }    : {}),
      })
      const res  = await fetch(`/api/admin/cards?${params}`, { signal })
      if (!res.ok) return
      const json = await res.json()
      setData(json)
      if (activeTab === "pending") {
        const curr = json.stats.pendingCount as number
        if (curr > prevCountRef.current) setNewBanner(true)
        prevCountRef.current = curr
      }
    } catch (err) {
      // Ignore abort errors - these are expected when component unmounts
      if (err instanceof Error && err.name === "AbortError") return
      console.error("Failed to fetch cards:", err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, cardType, search, page, sortOrder])

  useEffect(() => {
    const ctrl = new AbortController()
    fetchData(ctrl.signal)
    return () => ctrl.abort()
  }, [fetchData])

  useEffect(() => {
    if (activeTab !== "pending") return
    const id = setInterval(() => fetchData(), 60_000)
    return () => clearInterval(id)
  }, [activeTab, fetchData])

  async function doAction(
    cardId:   string,
    endpoint: string,
    method:   "POST" | "PATCH",
    body?:    Record<string, unknown>
  ) {
    const res  = await fetch(`/api/admin/cards/${cardId}/${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Action failed")
    return data
  }

  async function fetchCardDetail(id: string): Promise<CardDetail> {
    const res  = await fetch(`/api/admin/cards/${id}`)
    return res.json()
  }

  const statsBar = [
    { label: "Pending",      value: data.stats.pendingCount,   highlight: data.stats.pendingCount > 0 ? "amber" : "" },
    { label: "Active",       value: data.stats.activeCount,    highlight: "" },
    { label: "Frozen",       value: data.stats.frozenCount,    highlight: data.stats.frozenCount > 0 ? "amber" : "" },
    { label: "Rejected",     value: data.stats.rejectedCount,  highlight: "" },
    { label: "Cancelled",    value: data.stats.cancelledCount, highlight: "" },
    { label: "Credit issued",value: fmt(data.stats.totalCreditIssued), highlight: "" },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Card Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage debit and credit card applications</p>
      </div>

      {newBanner && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-amber-700">New pending card applications arrived.</span>
          <button onClick={() => { setNewBanner(false); fetchData() }} className="text-xs text-amber-600 underline ml-auto">Refresh</button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {statsBar.map((s) => (
          <div key={s.label} className={[
            "rounded-xl border p-3 text-center",
            s.highlight === "amber" ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white",
          ].join(" ")}>
            <p className={`text-lg font-semibold ${s.highlight === "amber" ? "text-amber-700" : "text-gray-900"}`}>
              {s.value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setParam("tab", tab)}
            className={[
              "px-3 py-2 text-sm rounded-t capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-[#0F4C81] text-[#0F4C81] font-medium"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}>
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input className="pl-8 h-8 text-sm w-48" placeholder="Search cards…" defaultValue={search}
            onChange={(e) => {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              debounceRef.current = setTimeout(() => setParam("search", e.target.value), 400)
            }} />
        </div>
        <div className="flex gap-1">
          {CARD_TYPE_TABS.map((ct) => (
            <button key={ct.value} onClick={() => setParam("cardType", ct.value)}
              className={[
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                cardType === ct.value
                  ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
              ].join(" ")}>
              {ct.label}
            </button>
          ))}
        </div>
        <button onClick={() => setParam("sortOrder", sortOrder === "asc" ? "desc" : "asc")}
          className="h-8 px-2 text-xs border border-gray-200 rounded-md bg-white ml-auto">
          {sortOrder === "asc" ? "↑ Oldest" : "↓ Newest"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading && <div className="h-1 bg-[#0F4C81] animate-pulse" />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Applicant", "Card type", "Card number", "Credit limit", "Spending limit", "Status", "Applied", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.cards.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-sm">
                      {activeTab === "pending" ? "No pending applications. All caught up." : `No ${activeTab} cards.`}
                    </p>
                  </td>
                </tr>
              )}
              {data.cards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50 transition-colors">
                  {/* Applicant */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-xs font-semibold">
                        {card.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{card.userName}</p>
                        <p className="text-gray-400 text-xs">{card.userEmail}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${KYC_PILL[card.userKycStatus] ?? "bg-gray-100 text-gray-500"}`}>
                        {card.userKycStatus}
                      </span>
                    </div>
                  </td>
                  {/* Card type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {card.cardType.includes("virtual") ? (
                        <Wifi className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CARD_TYPE_PILL[card.cardType] ?? "bg-gray-100 text-gray-500"}`}>
                        {card.cardType.replace("_", " ")}
                      </span>
                    </div>
                  </td>
                  {/* Card number */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {card.cardNumber ?? <span className="text-gray-300">Pending</span>}
                  </td>
                  {/* Credit limit */}
                  <td className="px-4 py-3 text-gray-600">
                    {card.creditLimit != null ? fmt(card.creditLimit) : "—"}
                  </td>
                  {/* Spending limit */}
                  <td className="px-4 py-3 text-gray-600">
                    {card.spendingLimit != null ? fmt(card.spendingLimit) : "—"}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[card.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {card.status}
                    </span>
                  </td>
                  {/* Applied */}
                  <td className="px-4 py-3 text-xs text-gray-400">{relativeDate(card.appliedAt)}</td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    {card.status === "pending" ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs bg-[#0F4C81] hover:bg-[#0F4C81]/90"
                          onClick={() => setReviewId(card.id)}>
                          Review
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={async () => {
                            const reason = prompt("Rejection reason (min 10 chars):")
                            if (!reason || reason.length < 10) return
                            try {
                              await doAction(card.id, "reject", "POST", { reason })
                              toast({ title: "Rejected" })
                              fetchData()
                            } catch (err) {
                              toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
                            }
                          }}>
                          Reject
                        </Button>
                      </div>
                    ) : card.status === "active" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={async () => {
                            const reason = prompt("Freeze reason:")
                            if (!reason) return
                            try {
                              await doAction(card.id, "freeze", "POST", { reason })
                              toast({ title: "Card frozen" })
                              fetchData()
                            } catch (err) {
                              toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
                            }
                          }}>Freeze card</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            const detail = await fetchCardDetail(card.id)
                            setLimitsCard(detail)
                          }}>Update limits</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={async () => {
                            const reason = prompt("Cancel reason:")
                            if (!reason) return
                            try {
                              await doAction(card.id, "cancel", "POST", { reason })
                              toast({ title: "Card cancelled" })
                              fetchData()
                            } catch (err) {
                              toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
                            }
                          }}>Cancel card</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : card.status === "frozen" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={async () => {
                            try {
                              await doAction(card.id, "unfreeze", "POST")
                              toast({ title: "Card unfrozen" })
                              fetchData()
                            } catch (err) {
                              toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
                            }
                          }}>Unfreeze card</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={async () => {
                            const reason = prompt("Cancel reason:")
                            if (!reason) return
                            try {
                              await doAction(card.id, "cancel", "POST", { reason })
                              toast({ title: "Card cancelled" })
                              fetchData()
                            } catch (err) {
                              toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
                            }
                          }}>Cancel card</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {((page - 1) * 20) + 1}–{Math.min(page * 20, data.total)} of {data.total} cards
            </p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="flex items-center px-3 text-xs">{page} / {data.pages}</span>
              <Button size="sm" variant="outline" disabled={page >= data.pages} onClick={() => setParam("page", String(page + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Drawers + modals */}
      <CardReviewDrawer
        cardId={reviewId}
        onClose={() => setReviewId(null)}
        onAction={fetchData}
      />
      {limitsCard && (
        <UpdateLimitsModal
          card={limitsCard}
          open={!!limitsCard}
          onOpenChange={(v) => { if (!v) setLimitsCard(null) }}
          onSuccess={() => { setLimitsCard(null); fetchData() }}
        />
      )}
    </div>
  )
}
