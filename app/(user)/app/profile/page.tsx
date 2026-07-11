"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  User, Mail, Shield, Key, LogOut,
  ChevronRight, CheckCircle2, AlertTriangle, Clock,
  Eye, EyeOff, Lock,
} from "lucide-react"
import { UserHeader } from "@/components/user/UserHeader"
import { useThemeColors } from "@/components/shared/ThemeProvider"

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const colors = useThemeColors()

  const KYC_STATUS: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    verified:   { icon: CheckCircle2,  color: colors.green, bg: colors.greenBg,  label: "Verified" },
    unverified: { icon: AlertTriangle, color: colors.yellow || "#F59E0B", bg: colors.yellowBg || "rgba(245,158,11,0.12)", label: "Unverified" },
    pending:    { icon: Clock,         color: colors.blue, bg: colors.blueBg, label: "Pending" },
    rejected:   { icon: AlertTriangle, color: colors.red, bg: colors.redBg,  label: "Rejected" },
  }
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const user = session?.user

  const handleChangePassword = async () => {
    setPwLoading(true)
    setPwError("")
    setPwSuccess(false)
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      })
      if (res.ok) {
        setPwSuccess(true)
        setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" })
        setTimeout(() => setShowPasswordForm(false), 2000)
      } else {
        const data = await res.json()
        setPwError(data.error || "Failed to change password")
      }
    } catch {
      setPwError("Network error")
    }
    setPwLoading(false)
  }

  const kycStatus = user?.kycStatus ? (KYC_STATUS[user.kycStatus] || KYC_STATUS.unverified) : KYC_STATUS.unverified
  const KycIcon = kycStatus.icon

  return (
    <>
      <UserHeader title="Profile" />

      <div className="px-4 py-5 lg:px-6 space-y-5 max-w-[600px] mx-auto">
        {/* Avatar + name */}
        <div className="text-center py-4">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.isDark ? '#1a6fcc' : '#2563eb'} 100%)` }}
          >
            {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
          </div>
          <p className="mt-3 text-[18px] font-semibold" style={{ color: colors.textPrimary }}>
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-[14px] mt-0.5" style={{ color: colors.textTertiary }}>
            {user?.email}
          </p>
        </div>

        {/* Info card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: colors.bgElevated, border: `1px solid ${colors.border}` }}>
          <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={`${user?.firstName || ""} ${user?.lastName || ""}`} colors={colors} />
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email || ""} colors={colors} />
          <InfoRow
            icon={<Shield className="h-4 w-4" />}
            label="KYC Status"
            value={
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: kycStatus.bg }}>
                <KycIcon className="h-3 w-3" style={{ color: kycStatus.color }} />
                <span className="text-[11px] font-semibold" style={{ color: kycStatus.color }}>{kycStatus.label}</span>
              </span>
            }
            colors={colors}
          />
        </div>

        {/* Actions */}
        <div className="rounded-2xl overflow-hidden" style={{ background: colors.bgElevated, border: `1px solid ${colors.border}` }}>
          <ActionRow
            icon={<Key className="h-4 w-4" style={{ color: colors.blue }} />}
            label="Change Password"
            onClick={() => setShowPasswordForm((v) => !v)}
            colors={colors}
          />
          <ActionRow
            icon={<Shield className="h-4 w-4" style={{ color: colors.yellow || "#F59E0B" }} />}
            label="Verify Identity"
            onClick={() => router.push("/app/kyc")}
            colors={colors}
          />
          <ActionRow
            icon={<LogOut className="h-4 w-4" style={{ color: colors.red }} />}
            label="Sign Out"
            onClick={() => signOut({ callbackUrl: "/login" })}
            danger
            colors={colors}
          />
        </div>

        {/* Change password form */}
        {showPasswordForm && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: colors.bgElevated, border: `1px solid ${colors.border}` }}>
            <p className="text-[15px] font-semibold" style={{ color: colors.textPrimary }}>Change Password</p>

            <div>
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>Current password</label>
              <div className="relative mt-1.5">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="w-full h-11 rounded-xl px-4 text-[14px] outline-none pr-10"
                  style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: colors.textMuted }}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>New password</label>
              <div className="relative mt-1.5">
                <input
                  type={showNew ? "text" : "password"}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  className="w-full h-11 rounded-xl px-4 text-[14px] outline-none pr-10"
                  style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: colors.textMuted }}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>Confirm new password</label>
              <input
                type="password"
                value={pwForm.confirmNewPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmNewPassword: e.target.value }))}
                className="w-full h-11 rounded-xl px-4 text-[14px] outline-none mt-1.5"
                style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
              />
            </div>

            {pwError && <p className="text-[13px]" style={{ color: colors.red }}>{pwError}</p>}
            {pwSuccess && <p className="text-[13px]" style={{ color: colors.green }}>Password changed successfully!</p>}

            <button
              onClick={handleChangePassword}
              disabled={!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmNewPassword || pwLoading}
              className="w-full h-11 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.98]"
              style={{
                background: pwForm.currentPassword && pwForm.newPassword ? colors.blue : colors.bgHover,
                opacity: pwForm.currentPassword && pwForm.newPassword && !pwLoading ? 1 : 0.5,
              }}
            >
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

interface RowColors {
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textMuted: string
  border: string
  red: string
}

function InfoRow({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: React.ReactNode; colors: RowColors }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ color: colors.textMuted }}>{icon}</span>
      <span className="text-[13px]" style={{ color: colors.textTertiary }}>{label}</span>
      <span className="ml-auto text-[13px] font-medium text-right" style={{ color: colors.textPrimary }}>{value}</span>
    </div>
  )
}

function ActionRow({ icon, label, onClick, danger, colors }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; colors: RowColors }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
      style={{ borderBottom: `1px solid ${colors.border}` }}
    >
      {icon}
      <span className="flex-1 text-[14px] font-medium" style={{ color: danger ? colors.red : colors.textPrimary }}>{label}</span>
      <ChevronRight className="h-4 w-4" style={{ color: colors.textMuted }} />
    </button>
  )
}
