"use client"

import { useState }       from "react"
import { useForm }        from "react-hook-form"
import { zodResolver }    from "@hookform/resolvers/zod"
import { z }              from "zod"
import { Eye, EyeOff }   from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Input }          from "@/components/ui/input"
import { Label }          from "@/components/ui/label"
import { Button }         from "@/components/ui/button"
import { toast }          from "@/components/ui/use-toast"
import { cn }             from "@/lib/utils"

const Schema = z
  .object({
    newPassword:     z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path:    ["confirmPassword"],
  })

type FormValues = z.infer<typeof Schema>

interface Props {
  open:      boolean
  onClose:   () => void
  userId:    string
  userName:  string
}

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: "Weak",   color: "bg-red-400" }
  if (score <= 3) return { score, label: "Fair",   color: "bg-amber-400" }
  return               { score, label: "Strong", color: "bg-emerald-500" }
}

export function ResetPasswordModal({ open, onClose, userId, userName }: Props) {
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(Schema) })

  const pw       = watch("newPassword") ?? ""
  const strength = getStrength(pw)

  const onSubmit = async (values: FormValues) => {
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: values.newPassword }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: "Reset failed", description: data.error ?? "Unknown error", variant: "destructive" })
      return
    }

    toast({ title: "Password reset successfully", variant: "success" })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>Set a new password for {userName}. They will need to use it on next login.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="rp-new">New password</Label>
            <div className="relative">
              <Input
                id="rp-new"
                type={showNew ? "text" : "password"}
                className="pr-10"
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}

            {/* Strength indicator */}
            {pw.length > 0 && (
              <div className="space-y-1">
                <div className="flex h-1.5 gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        i < strength.score ? strength.color : "bg-slate-200"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">{strength.label}</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="rp-confirm"
                type={showConfirm ? "text" : "password"}
                className="pr-10"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
