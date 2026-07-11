"use client"

import { useEffect, useState } from "react"
import { useForm }        from "react-hook-form"
import { zodResolver }    from "@hookform/resolvers/zod"
import { z }              from "zod"
import { X, User, MapPin, Shield, Settings, AlertTriangle, Wallet } from "lucide-react"
import { toast }          from "@/components/ui/use-toast"
import { getCurrencySymbol } from "@/lib/utils/currency"
import type { UserDetail } from "@/lib/services/user.service"

// Fallback list if the platform settings fetch is unavailable.
const FALLBACK_CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY", "INR", "NGN",
  "GHS", "KES", "ZAR", "BRL", "MXN", "AED", "SAR", "MUR", "SCR", "SRD",
]

const Schema = z.object({
  firstName:     z.string().min(1, "First name is required"),
  lastName:      z.string().min(1, "Last name is required"),
  email:         z.string().email("Invalid email"),
  phone:         z.string().optional(),
  dateOfBirth:   z.string().optional(),
  street:        z.string().optional(),
  city:          z.string().optional(),
  state:         z.string().optional(),
  zip:           z.string().optional(),
  country:       z.string().optional(),
  role:          z.enum(["user", "admin"]),
  kycStatus:     z.enum(["unverified", "pending", "verified", "rejected"]),
  kycTier:       z.coerce.number().int().min(1).max(3),
  isActive:      z.boolean(),
  isSuspended:   z.boolean(),
  suspendReason: z.string().optional(),
  emailVerified: z.boolean(),
  twoFactorEnabled: z.boolean(),
  transferPin:   z.string().optional(),
  preferredCurrency: z.string().min(1, "Currency is required"),
})

type FormValues = z.infer<typeof Schema>

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
  user:      UserDetail
}

export function EditUserModal({ open, onClose, onSuccess, user }: Props) {
  const [activeTab, setActiveTab] = useState<"profile" | "address" | "security" | "settings" | "balances">("profile")
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [savingBalances, setSavingBalances] = useState(false)
  const [currencies, setCurrencies] = useState<string[]>(FALLBACK_CURRENCIES)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(Schema),
      defaultValues: getDefaults(user),
    })

  function getDefaults(u: UserDetail): FormValues {
    return {
      firstName:     u.firstName,
      lastName:      u.lastName,
      email:         u.email,
      phone:         u.phone ?? "",
      dateOfBirth:   u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : "",
      street:        u.address?.street  ?? "",
      city:          u.address?.city    ?? "",
      state:         u.address?.state   ?? "",
      zip:           u.address?.zip     ?? "",
      country:       u.address?.country ?? "",
      role:          u.role as "user" | "admin",
      kycStatus:     u.kycStatus as FormValues["kycStatus"],
      kycTier:       u.kycTier,
      isActive:      u.isActive,
      isSuspended:   u.isSuspended,
      suspendReason: u.suspendReason ?? "",
      emailVerified: u.emailVerified,
      twoFactorEnabled: u.twoFactorEnabled,
      transferPin:   (u as any).transferPin ?? "",
      preferredCurrency: u.preferredCurrency || "USD",
    }
  }

  const watchedRole       = watch("role")
  const watchedKycStatus  = watch("kycStatus")
  const watchedSuspended  = watch("isSuspended")
  const watchedCurrency   = watch("preferredCurrency")

  useEffect(() => {
    if (open) {
      reset(getDefaults(user))
      setActiveTab("profile")
      // Initialize balances from user accounts
      const initialBalances: Record<string, string> = {}
      user.accounts?.forEach((acc) => {
        if (acc.walletType === "bitcoin") {
          initialBalances[acc.id] = acc.btcBalance.toString()
        } else {
          initialBalances[acc.id] = (acc.balance / 100).toFixed(2) // Convert cents to dollars
        }
      })
      setBalances(initialBalances)
    }
  }, [open, user, reset])

  // Load the platform's supported currencies for the selector
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const res = await fetch("/api/public/settings")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.supportedCurrencies) && data.supportedCurrencies.length > 0) {
            setCurrencies(data.supportedCurrencies)
          }
        }
      } catch { /* keep fallback list */ }
    })()
  }, [open])

  const onSubmit = async (values: FormValues) => {
    const body = {
      firstName:     values.firstName,
      lastName:      values.lastName,
      email:         values.email,
      phone:         values.phone || undefined,
      dateOfBirth:   values.dateOfBirth || undefined,
      address: {
        street:  values.street  || undefined,
        city:    values.city    || undefined,
        state:   values.state   || undefined,
        zip:     values.zip     || undefined,
        country: values.country || undefined,
      },
      role:          values.role,
      kycStatus:     values.kycStatus,
      kycTier:       values.kycTier,
      isActive:      values.isActive,
      isSuspended:   values.isSuspended,
      suspendReason: values.isSuspended ? values.suspendReason : undefined,
      emailVerified: values.emailVerified,
      transferPin:   values.transferPin || undefined,
      preferredCurrency: values.preferredCurrency,
    }

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: "Update failed", description: data.error ?? "Unknown error", variant: "destructive" })
      return
    }

    toast({ title: "User updated", variant: "success" })
    onSuccess()
    onClose()
  }

  if (!open) return null

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "address", label: "Address", icon: MapPin },
    { id: "security", label: "Security", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "balances", label: "Balances", icon: Wallet },
  ] as const

  const handleBalanceChange = (accountId: string, value: string) => {
    setBalances((prev) => ({ ...prev, [accountId]: value }))
  }

  const saveBalance = async (accountId: string, isBitcoin: boolean) => {
    const value = balances[accountId]
    if (value === undefined || value === "") return

    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      toast({ title: "Invalid balance", description: "Please enter a valid positive number", variant: "destructive" })
      return
    }

    // Convert to cents/satoshis for storage
    const newBalance = isBitcoin ? numValue : Math.round(numValue * 100)

    setSavingBalances(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/set-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, newBalance }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Failed to update balance", description: data.error ?? "Unknown error", variant: "destructive" })
        return
      }

      toast({ title: "Balance updated", description: "Account balance has been set directly", variant: "success" })
      onSuccess()
    } catch {
      toast({ title: "Error", description: "Failed to update balance", variant: "destructive" })
    } finally {
      setSavingBalances(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
  const selectClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
  const checkboxClass = "w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-hidden">
      <div 
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none">
          <div className="p-4 sm:p-6 space-y-5 min-w-0">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input {...register("firstName")} className={inputClass} placeholder="John" />
                    {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input {...register("lastName")} className={inputClass} placeholder="Doe" />
                    {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input {...register("email")} type="email" className={inputClass} placeholder="john@example.com" />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input {...register("phone")} className={inputClass} placeholder="+1 555 123 4567" />
                  </div>
                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input {...register("dateOfBirth")} type="date" className={inputClass} />
                  </div>
                </div>
              </>
            )}

            {/* Address Tab */}
            {activeTab === "address" && (
              <>
                <div>
                  <label className={labelClass}>Street Address</label>
                  <input {...register("street")} className={inputClass} placeholder="123 Main Street" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>City</label>
                    <input {...register("city")} className={inputClass} placeholder="New York" />
                  </div>
                  <div>
                    <label className={labelClass}>State / Province</label>
                    <input {...register("state")} className={inputClass} placeholder="NY" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>ZIP / Postal Code</label>
                    <input {...register("zip")} className={inputClass} placeholder="10001" />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input {...register("country")} className={inputClass} placeholder="United States" />
                  </div>
                </div>
              </>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Role</label>
                    <select {...register("role")} className={selectClass}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    {watchedRole === "admin" && (
                      <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">Admin role grants full portal access</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>KYC Tier</label>
                    <select {...register("kycTier")} className={selectClass}>
                      <option value={1}>Tier 1 - Basic</option>
                      <option value={2}>Tier 2 - Standard</option>
                      <option value={3}>Tier 3 - Premium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>KYC Status</label>
                  <select {...register("kycStatus")} className={selectClass}>
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending Review</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  {watchedKycStatus !== user.kycStatus && (
                    <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">Changing KYC status overrides the review process</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Transfer PIN</label>
                  <input
                    {...register("transferPin")}
                    type="text"
                    maxLength={4}
                    className={inputClass}
                    placeholder="4-digit PIN"
                  />
                  <p className="mt-1 text-xs text-gray-500">4-digit PIN used for authorizing transfers (leave empty to keep current)</p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register("emailVerified")} className={checkboxClass} />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Email Verified</span>
                      <p className="text-xs text-gray-500">User has confirmed their email address</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register("twoFactorEnabled")} className={checkboxClass} disabled />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</span>
                      <p className="text-xs text-gray-500">User manages this setting themselves</p>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <>
                <div>
                  <label className={labelClass}>Preferred Currency</label>
                  <select {...register("preferredCurrency")} className={selectClass}>
                    {/* Ensure the user's current currency is always selectable */}
                    {!currencies.includes(watchedCurrency) && watchedCurrency && (
                      <option value={watchedCurrency}>
                        {getCurrencySymbol(watchedCurrency)} {watchedCurrency}
                      </option>
                    )}
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {getCurrencySymbol(c)} {c}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Currency used to display this user&apos;s balances and amounts across the app
                  </p>
                  {errors.preferredCurrency && <p className="mt-1 text-xs text-red-500">{errors.preferredCurrency.message}</p>}
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register("isActive")} className={checkboxClass} />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Account Active</span>
                      <p className="text-xs text-gray-500">User can log in and use the platform</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register("isSuspended")} className={checkboxClass} />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Account Suspended</span>
                      <p className="text-xs text-gray-500">Temporarily block user access</p>
                    </div>
                  </label>
                </div>

                {watchedSuspended && (
                  <div className="mt-4">
                    <label className={labelClass}>Suspension Reason</label>
                    <textarea
                      {...register("suspendReason")}
                      rows={3}
                      className={`${inputClass} resize-none`}
                      placeholder="Reason for suspension..."
                    />
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Account Info</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">User ID</span>
                      <p className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{user.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Referral Code</span>
                      <p className="font-mono text-xs text-gray-700 dark:text-gray-300">{user.referralCode}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Joined</span>
                      <p className="text-gray-700 dark:text-gray-300">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Accounts</span>
                      <p className="text-gray-700 dark:text-gray-300">{user.accounts?.length ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Currency</span>
                      <p className="text-gray-700 dark:text-gray-300">{getCurrencySymbol(watchedCurrency)} {watchedCurrency}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Balances Tab */}
            {activeTab === "balances" && (
              <>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Direct Balance Edit</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Changes here will NOT create transactions. Use for corrections only.</p>
                  </div>
                </div>

                {(!user.accounts || user.accounts.length === 0) ? (
                  <p className="text-sm text-gray-500 text-center py-8">No accounts found for this user.</p>
                ) : (
                  <div className="space-y-4">
                    {user.accounts.map((account) => {
                      const isBitcoin = account.walletType === "bitcoin"
                      const currencySymbol = isBitcoin ? "₿" : getCurrencySymbol(watchedCurrency)
                      const accountLabel = isBitcoin
                        ? "Bitcoin Wallet"
                        : `${watchedCurrency} ${account.accountType || "Account"}`

                      return (
                        <div 
                          key={account.id} 
                          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{accountLabel}</p>
                              <p className="text-xs text-gray-500 font-mono">{account.accountNumber}</p>
                            </div>
                            {account.isFrozen && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Frozen
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                step={isBitcoin ? "0.00000001" : "0.01"}
                                min="0"
                                value={balances[account.id] ?? ""}
                                onChange={(e) => handleBalanceChange(account.id, e.target.value)}
                                className={`${inputClass} pl-7`}
                                placeholder={isBitcoin ? "0.00000000" : "0.00"}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => saveBalance(account.id, isBitcoin)}
                              disabled={savingBalances}
                              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
                            >
                              {savingBalances ? "..." : "Set"}
                            </button>
                          </div>

                          <p className="mt-2 text-xs text-gray-500">
                            Current: {currencySymbol}{isBitcoin ? account.btcBalance.toFixed(8) : (account.balance / 100).toFixed(2)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
