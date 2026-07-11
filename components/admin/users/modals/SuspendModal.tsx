"use client"

import { useEffect }      from "react"
import { useForm }        from "react-hook-form"
import { zodResolver }    from "@hookform/resolvers/zod"
import { z }              from "zod"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Textarea }       from "@/components/ui/textarea"
import { Label }          from "@/components/ui/label"
import { Button }         from "@/components/ui/button"
import { toast }          from "@/components/ui/use-toast"

const SuspendSchema   = z.object({ reason: z.string().min(1, "Reason is required") })
const UnsuspendSchema = z.object({})

type SuspendValues   = z.infer<typeof SuspendSchema>
type UnsuspendValues = z.infer<typeof UnsuspendSchema>

interface Props {
  open:          boolean
  onClose:       () => void
  onSuccess:     () => void
  userId:        string
  isSuspended:   boolean
  suspendReason?: string
  userName:      string
}

export function SuspendModal({ open, onClose, onSuccess, userId, isSuspended, suspendReason, userName }: Props) {
  const suspendForm = useForm<SuspendValues>({
    resolver: zodResolver(SuspendSchema),
    defaultValues: { reason: "" },
  })

  const unsuspendForm = useForm<UnsuspendValues>({
    resolver: zodResolver(UnsuspendSchema),
  })

  useEffect(() => {
    if (open) {
      suspendForm.reset({ reason: "" })
    }
  }, [open, suspendForm])

  const handleSuspend = async (values: SuspendValues) => {
    const res = await fetch(`/api/admin/users/${userId}/suspend`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: values.reason }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: "Failed to suspend", description: data.error, variant: "destructive" })
      return
    }
    toast({ title: `${userName} has been suspended`, variant: "success" })
    onSuccess()
    onClose()
  }

  const handleUnsuspend = async () => {
    const res = await fetch(`/api/admin/users/${userId}/unsuspend`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: "Failed to unsuspend", description: data.error, variant: "destructive" })
      return
    }
    toast({ title: `${userName} has been unsuspended`, variant: "success" })
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isSuspended ? "Unsuspend User" : "Suspend User"}</DialogTitle>
          <DialogDescription>
            {isSuspended
              ? `Remove the suspension on ${userName}'s account.`
              : `Suspend ${userName}'s account. They will not be able to log in.`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          {isSuspended ? (
            <div className="space-y-4">
              {suspendReason && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Current suspension reason</p>
                  <p className="text-sm text-slate-700">{suspendReason}</p>
                </div>
              )}
              <p className="text-sm text-slate-600">
                Confirming will restore {userName}&apos;s access immediately.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  onClick={handleUnsuspend}
                  disabled={unsuspendForm.formState.isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {unsuspendForm.formState.isSubmitting ? "Processing…" : "Unsuspend account"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={suspendForm.handleSubmit(handleSuspend)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="suspend-reason">Reason for suspension</Label>
                <Textarea
                  id="suspend-reason"
                  placeholder="Describe why this account is being suspended…"
                  {...suspendForm.register("reason")}
                />
                {suspendForm.formState.errors.reason && (
                  <p className="text-xs text-red-500">{suspendForm.formState.errors.reason.message}</p>
                )}
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                The user will be immediately blocked from logging in. This action is reversible.
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={suspendForm.formState.isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {suspendForm.formState.isSubmitting ? "Suspending…" : "Suspend account"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
