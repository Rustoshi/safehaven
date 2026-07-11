"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Users, Plus, Trash2, Send, Building, Globe, Search,
  Loader2, ChevronRight, User, CreditCard, MapPin,
} from "lucide-react"
import { UserHeader } from "@/components/user/UserHeader"
import { useThemeColors } from "@/components/shared/ThemeProvider"

interface Beneficiary {
  id: string
  type: "local" | "international"
  nickname: string
  accountNumber?: string
  recipientName?: string
  bankName?: string
  iban?: string
  swiftCode?: string
  routingNumber?: string
  bankAddress?: string
  country?: string
  currency?: string
  lastUsedAt?: string
  transferCount: number
  createdAt: string
}

export default function BeneficiariesPage() {
  const router = useRouter()
  const colors = useThemeColors()

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "local" | "international">("all")
  const [search, setSearch] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchBeneficiaries = useCallback(async () => {
    setLoading(true)
    try {
      const typeParam = filter !== "all" ? `?type=${filter}` : ""
      const res = await fetch(`/api/user/beneficiaries${typeParam}`)
      if (res.ok) {
        const data = await res.json()
        setBeneficiaries(data.beneficiaries || [])
      }
    } catch { /* */ }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchBeneficiaries()
  }, [fetchBeneficiaries])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this beneficiary?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/user/beneficiaries/${id}`, { method: "DELETE" })
      if (res.ok) {
        setBeneficiaries((prev) => prev.filter((b) => b.id !== id))
      }
    } catch { /* */ }
    setDeleting(null)
  }

  const handleTransfer = (beneficiary: Beneficiary) => {
    // Navigate to transfer page with beneficiary data
    const params = new URLSearchParams({
      beneficiaryId: beneficiary.id,
      type: beneficiary.type,
    })
    router.push(`/app/transfer?${params.toString()}`)
  }

  const filtered = beneficiaries.filter((b) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      b.nickname.toLowerCase().includes(q) ||
      b.recipientName?.toLowerCase().includes(q) ||
      b.accountNumber?.toLowerCase().includes(q) ||
      b.bankName?.toLowerCase().includes(q)
    )
  })

  const localCount = beneficiaries.filter((b) => b.type === "local").length
  const intlCount = beneficiaries.filter((b) => b.type === "international").length

  return (
    <>
      <UserHeader title="Beneficiaries" showBack />

      <div style={{ padding: "0 16px 100px", maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(147,51,234,0.15) 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users style={{ width: 24, height: 24, color: "#3B82F6" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                Saved Beneficiaries
              </h1>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
                {beneficiaries.length} saved • {localCount} local • {intlCount} international
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: colors.bgElevated, border: `1px solid ${colors.border}`,
          borderRadius: 12, padding: "0 14px", marginBottom: 16,
        }}>
          <Search style={{ width: 18, height: 18, color: colors.textMuted }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search beneficiaries..."
            style={{
              flex: 1, padding: "12px 0", background: "transparent", border: "none",
              outline: "none", color: colors.textPrimary, fontSize: 14,
            }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["all", "local", "international"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                background: filter === f ? colors.blue : colors.bgElevated,
                border: `1px solid ${filter === f ? colors.blue : colors.border}`,
                color: filter === f ? "#fff" : colors.textSecondary,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {f === "all" ? "All" : f === "local" ? "Local" : "International"}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: colors.textMuted }}>
            <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14 }}>Loading beneficiaries...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: colors.bgElevated, borderRadius: 16,
          }}>
            <Users style={{ width: 48, height: 48, color: colors.textMuted, margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, margin: "0 0 8px" }}>
              {search ? "No matching beneficiaries" : "No saved beneficiaries"}
            </p>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: "0 0 20px" }}>
              {search
                ? "Try a different search term"
                : "Save beneficiaries when making transfers to quickly send money again"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/app/transfer")}
                style={{
                  padding: "12px 24px", borderRadius: 10,
                  background: colors.blue, border: "none",
                  color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <Send style={{ width: 16, height: 16 }} /> Make a Transfer
              </button>
            )}
          </div>
        )}

        {/* Beneficiary list */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((b) => (
              <div
                key={b.id}
                style={{
                  background: colors.bgElevated,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 16, padding: 16,
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: b.type === "local"
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(59,130,246,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {b.type === "local" ? (
                      <Building style={{ width: 20, height: 20, color: "#10B981" }} />
                    ) : (
                      <Globe style={{ width: 20, height: 20, color: "#3B82F6" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 15, fontWeight: 600, color: colors.textPrimary,
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {b.nickname}
                    </p>
                    <p style={{ fontSize: 13, color: colors.textMuted, margin: "2px 0 0" }}>
                      {b.recipientName}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                    padding: "4px 8px", borderRadius: 6,
                    background: b.type === "local" ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)",
                    color: b.type === "local" ? "#10B981" : "#3B82F6",
                  }}>
                    {b.type}
                  </span>
                </div>

                {/* Details */}
                <div style={{
                  background: colors.bgHover, borderRadius: 10, padding: 12,
                  marginBottom: 12,
                }}>
                  {b.type === "local" ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <CreditCard style={{ width: 14, height: 14, color: colors.textMuted }} />
                        <span style={{ fontSize: 12, color: colors.textMuted }}>Account:</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, fontFamily: "monospace" }}>
                          {b.accountNumber}
                        </span>
                      </div>
                      {b.bankName && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Building style={{ width: 14, height: 14, color: colors.textMuted }} />
                          <span style={{ fontSize: 12, color: colors.textMuted }}>Bank:</span>
                          <span style={{ fontSize: 13, color: colors.textSecondary }}>{b.bankName}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {b.bankName && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Building style={{ width: 14, height: 14, color: colors.textMuted }} />
                          <span style={{ fontSize: 12, color: colors.textMuted }}>Bank:</span>
                          <span style={{ fontSize: 13, color: colors.textSecondary }}>{b.bankName}</span>
                        </div>
                      )}
                      {(b.iban || b.accountNumber) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <CreditCard style={{ width: 14, height: 14, color: colors.textMuted }} />
                          <span style={{ fontSize: 12, color: colors.textMuted }}>{b.iban ? "IBAN:" : "Account:"}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, fontFamily: "monospace" }}>
                            {b.iban || b.accountNumber}
                          </span>
                        </div>
                      )}
                      {b.swiftCode && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Globe style={{ width: 14, height: 14, color: colors.textMuted }} />
                          <span style={{ fontSize: 12, color: colors.textMuted }}>SWIFT:</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, fontFamily: "monospace" }}>
                            {b.swiftCode}
                          </span>
                        </div>
                      )}
                      {b.country && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <MapPin style={{ width: 14, height: 14, color: colors.textMuted }} />
                          <span style={{ fontSize: 12, color: colors.textMuted }}>Country:</span>
                          <span style={{ fontSize: 13, color: colors.textSecondary }}>{b.country}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: colors.textMuted }}>Transfers</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                      {b.transferCount}
                    </p>
                  </div>
                  {b.lastUsedAt && (
                    <div>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>Last used</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                        {new Date(b.lastUsedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleTransfer(b)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10,
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      border: "none", color: "#fff",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Send style={{ width: 14, height: 14 }} /> Send Money
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deleting === b.id}
                    style={{
                      padding: "10px 14px", borderRadius: 10,
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#EF4444",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {deleting === b.id ? (
                      <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    ) : (
                      <Trash2 style={{ width: 16, height: 16 }} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
