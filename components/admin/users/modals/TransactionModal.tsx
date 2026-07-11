"use client"

import { useState, useEffect } from "react"
import { useForm }        from "react-hook-form"
import { zodResolver }    from "@hookform/resolvers/zod"
import { z }              from "zod"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Input }          from "@/components/ui/input"
import { Label }          from "@/components/ui/label"
import { Button }         from "@/components/ui/button"
import { Select, SelectItem } from "@/components/ui/select"
import { Checkbox }       from "@/components/ui/checkbox"
import { toast }          from "@/components/ui/use-toast"
import { cn }             from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/currency"
import { ArrowDownCircle, ArrowUpCircle, Calendar, Mail } from "lucide-react"
import type { AccountData, UserDetail } from "@/lib/services/user.service"

const TRANSFER_SCOPES = [
  { value: "local_transfer", label: "Local Transfer" },
  { value: "international_transfer", label: "International Transfer" },
  { value: "check", label: "Check" },
  { value: "crypto", label: "Crypto" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "ach_transfer", label: "ACH Transfer" },
  { value: "internal", label: "Internal Transfer" },
] as const

const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || "NovaPay"

const Schema = z.object({
  accountId:     z.string().min(1, "Select an account"),
  amount:        z.string().min(1, "Amount is required"),
  senderName:    z.string().min(1, "Sender name is required").max(200),
  senderBank:    z.string().max(200).optional(),
  receiverName:  z.string().min(1, "Receiver name is required").max(200),
  receiverBank:  z.string().max(200).optional(),
  transferScope: z.string().min(1, "Select transfer scope"),
  description:   z.string().max(500).optional(),
  transactionDate: z.string().min(1, "Date is required"),
  sendEmail:     z.boolean(),
})

type FormValues = z.infer<typeof Schema>

interface Props {
  open:          boolean
  onClose:       () => void
  onSuccess:     () => void
  user:          UserDetail
  preselect?:    string
  mode:          "credit" | "debit"
}

function fmtBalance(account: AccountData, currency: string): string {
  if (account.walletType === "bitcoin") {
    return `${account.btcBalance.toFixed(8)} BTC`
  }
  return formatCurrency(account.balance, currency)
}

function fmtAccountLabel(account: AccountData, currency: string): string {
  if (account.walletType === "bitcoin") return `Bitcoin wallet (${account.btcAddress?.slice(0, 10)}…)`
  return `${currency} — ${account.accountNumber}`
}

function getDefaultDateTime(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export function TransactionModal({ open, onClose, onSuccess, user, preselect, mode }: Props) {
  const isCredit = mode === "credit"
  const userFullName = `${user.firstName} ${user.lastName}`
  // Display fiat amounts in the user's preferred currency (matches their portal)
  const userCurrency = user.preferredCurrency || "USD"

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(Schema),
      defaultValues: {
        accountId: preselect ?? "",
        amount: "",
        senderName: isCredit ? "" : userFullName,
        senderBank: isCredit ? "" : BANK_NAME,
        receiverName: isCredit ? userFullName : "",
        receiverBank: isCredit ? BANK_NAME : "",
        transferScope: "local_transfer",
        description: "",
        transactionDate: getDefaultDateTime(),
        sendEmail: false,
      },
    })

  useEffect(() => {
    if (open) {
      reset({
        accountId: preselect ?? (user.accounts || [])[0]?.id ?? "",
        amount: "",
        senderName: isCredit ? "" : userFullName,
        senderBank: isCredit ? "" : BANK_NAME,
        receiverName: isCredit ? userFullName : "",
        receiverBank: isCredit ? BANK_NAME : "",
        transferScope: "local_transfer",
        description: "",
        transactionDate: getDefaultDateTime(),
        sendEmail: false,
      })
    }
  }, [open, preselect, user.accounts, reset, isCredit, userFullName])

  const watchAccountId = watch("accountId")
  const watchAmount    = watch("amount")
  const accounts = user.accounts || []
  const selectedAccount = accounts.find((a) => a.id === watchAccountId)
  const isBitcoin       = selectedAccount?.walletType === "bitcoin"
  const amountNum       = parseFloat(watchAmount) || 0

  const previewNewBalance = (): string | null => {
    if (!selectedAccount || !watchAmount || amountNum <= 0) return null
    const delta = isCredit ? amountNum : -amountNum
    if (isBitcoin) {
      const newBal = selectedAccount.btcBalance + delta
      if (newBal < 0) return null
      return `${newBal.toFixed(8)} BTC`
    }
    const newBal = selectedAccount.balance + delta
    if (newBal < 0) return null
    return formatCurrency(newBal, userCurrency)
  }

  const onSubmit = async (values: FormValues) => {
    const parsedAmount = parseFloat(values.amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Amount must be a positive number", variant: "destructive" })
      return
    }

    // Convert to smallest unit: cents for fiat, satoshis for BTC
    // For debit, make it negative
    const amountInSmallestUnit = isBitcoin
      ? Math.round(parsedAmount * 1e8) * (isCredit ? 1 : -1)
      : Math.round(parsedAmount * 100) * (isCredit ? 1 : -1)

    const res = await fetch(`/api/admin/users/${user.id}/transaction`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId:       values.accountId,
        amount:          amountInSmallestUnit,
        senderName:      values.senderName,
        senderBank:      values.senderBank || "",
        receiverName:    values.receiverName,
        receiverBank:    values.receiverBank || "",
        transferScope:   values.transferScope,
        description:     values.description || "",
        transactionDate: values.transactionDate,
        sendEmail:       values.sendEmail,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: "Transaction failed", description: data.error ?? "Unknown error", variant: "destructive" })
      return
    }

    toast({ title: `${isCredit ? "Credit" : "Debit"} successful`, variant: "success" })
    onSuccess()
    onClose()
  }

  const newBalance = previewNewBalance()
  const insufficientFunds = !isCredit && selectedAccount && amountNum > 0 && (
    (isBitcoin && selectedAccount.btcBalance < amountNum) ||
    (!isBitcoin && selectedAccount.balance < amountNum)
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isCredit ? "bg-emerald-100" : "bg-red-100"
            )}>
              {isCredit
                ? <ArrowDownCircle className="h-6 w-6 text-emerald-600" />
                : <ArrowUpCircle className="h-6 w-6 text-red-600" />
              }
            </div>
            <div>
              <DialogTitle className="text-xl">{isCredit ? "Credit Account" : "Debit Account"}</DialogTitle>
              <DialogDescription className="text-sm">
                {isCredit
                  ? "Add funds to the user's account"
                  : "Remove funds from the user's account"
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Account Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Account</Label>
            <Select value={watchAccountId} onValueChange={(v) => setValue("accountId", v)}>
              {(user.accounts || []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {fmtAccountLabel(a, userCurrency)} — {fmtBalance(a, userCurrency)}
                </SelectItem>
              ))}
            </Select>
            {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="tx-amount" className="text-sm font-medium text-gray-700">
              Amount {isBitcoin ? "(BTC)" : `(${userCurrency})`}
            </Label>
            <Input
              id="tx-amount"
              type="number"
              step={isBitcoin ? "0.00000001" : "0.01"}
              min="0"
              placeholder={isBitcoin ? "e.g. 0.005" : "e.g. 100.00"}
              className="bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-11"
              {...register("amount")}
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          {/* Sender */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">From (Sender)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tx-sender-name" className="text-xs font-medium text-gray-700">Name</Label>
                <Input
                  id="tx-sender-name"
                  type="text"
                  placeholder="Sender name"
                  className="bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-11"
                  {...register("senderName")}
                />
                {errors.senderName && <p className="text-xs text-red-500">{errors.senderName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-sender-bank" className="text-xs font-medium text-gray-700">Bank <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="tx-sender-bank"
                  type="text"
                  placeholder="Bank name"
                  className="bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-11"
                  {...register("senderBank")}
                />
              </div>
            </div>
          </div>

          {/* Receiver */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">To (Receiver)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tx-receiver-name" className="text-xs font-medium text-gray-700">Name</Label>
                <Input
                  id="tx-receiver-name"
                  type="text"
                  placeholder="Receiver name"
                  className="bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-11"
                  {...register("receiverName")}
                />
                {errors.receiverName && <p className="text-xs text-red-500">{errors.receiverName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-receiver-bank" className="text-xs font-medium text-gray-700">Bank <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="tx-receiver-bank"
                  type="text"
                  placeholder="Bank name"
                  className="bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-11"
                  {...register("receiverBank")}
                />
              </div>
            </div>
          </div>

          {/* Transfer Scope */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Transfer Scope</Label>
            <Select
              value={watch("transferScope")}
              onValueChange={(v) => setValue("transferScope", v)}
            >
              {TRANSFER_SCOPES.map((scope) => (
                <SelectItem key={scope.value} value={scope.value}>
                  {scope.label}
                </SelectItem>
              ))}
            </Select>
            {errors.transferScope && <p className="text-xs text-red-500">{errors.transferScope.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tx-desc" className="text-sm font-medium text-gray-700">Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <Input
              id="tx-desc"
              placeholder="Transaction description..."
              className="bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-11"
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label htmlFor="tx-date" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date & Time
            </Label>
            <Input
              id="tx-date"
              type="datetime-local"
              className="bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-11"
              {...register("transactionDate")}
            />
            <p className="text-[11px] text-gray-400">Can be backdated if needed</p>
            {errors.transactionDate && <p className="text-xs text-red-500">{errors.transactionDate.message}</p>}
          </div>

          {/* Send Email Option */}
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
            <Checkbox
              id="tx-email"
              checked={watch("sendEmail")}
              onCheckedChange={(v) => setValue("sendEmail", !!v)}
            />
            <Label htmlFor="tx-email" className="flex items-center gap-1.5 cursor-pointer text-sm font-normal text-gray-700">
              <Mail className="h-3.5 w-3.5 text-gray-500" />
              Send email notification to user
            </Label>
          </div>

          {/* Preview */}
          {selectedAccount && amountNum > 0 && (
            <div className={cn(
              "rounded-lg border p-4 text-sm",
              insufficientFunds
                ? "border-red-300 bg-red-50 text-red-800"
                : isCredit
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            )}>
              {insufficientFunds ? (
                <span className="font-medium">⚠️ Insufficient funds for this debit</span>
              ) : (
                <>
                  This will <strong>{isCredit ? "credit" : "debit"}</strong>{" "}
                  <strong>{fmtAccountLabel(selectedAccount, userCurrency)}</strong>{" "}
                  by <strong>{amountNum.toFixed(isBitcoin ? 8 : 2)} {isBitcoin ? "BTC" : userCurrency}</strong>.
                  {newBalance && (
                    <> New balance: <strong>{newBalance}</strong>.</>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-3 sm:flex-row pt-5 border-t border-gray-200 mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-11">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || insufficientFunds}
              className={cn(
                "h-11",
                isCredit
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isSubmitting ? "Processing…" : isCredit ? "Credit Account" : "Debit Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
