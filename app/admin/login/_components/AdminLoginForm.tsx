"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { BANK_NAME } from "@/lib/brand"
import { Button }                          from "@/components/ui/button"
import { Input }                           from "@/components/ui/input"
import { Label }                           from "@/components/ui/label"
import { Alert, AlertDescription }         from "@/components/ui/alert"

// ── Validation ──────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})
type LoginFormValues = z.infer<typeof loginSchema>

// ── Error code → human message map ──────────────────────────────────────────
const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "Invalid email or password. Please check your credentials and try again.",
  account_suspended:   "This account has been suspended. Contact your system administrator.",
  account_inactive:    "This account is inactive. Contact your system administrator.",
  not_admin:           "Access denied — this portal is for administrators only.",
  CredentialsSignin:   "Invalid email or password. Please try again.",
}
const FALLBACK_ERROR = "Something went wrong. Please try again later."

// ── Brand panel — CSS-only geometric decoration ──────────────────────────────
function BrandPanel() {
  return (
    <div
      className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden p-12"
      style={{ backgroundColor: "#0F4C81" }}
    >
      {/* Dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.13) 1.5px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Decorative rings */}
      <div
        className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full"
        style={{
          background: "rgba(255,255,255,0.03)",
          border:     "1px solid rgba(255,255,255,0.07)",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-20 h-56 w-56 rounded-full"
        style={{
          background: "transparent",
          border:     "1px solid rgba(0,200,150,0.18)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-36 -left-20 h-[26rem] w-[26rem] rounded-full"
        style={{
          background: "rgba(0,200,150,0.06)",
          border:     "1px solid rgba(0,200,150,0.1)",
        }}
      />

      {/* ── Top: wordmark ── */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: "#00C896" }}
        >
          <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">{BANK_NAME}</span>
      </div>

      {/* ── Middle: headline ── */}
      <div className="relative z-10">
        <span
          className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
          style={{
            backgroundColor: "rgba(0,200,150,0.18)",
            color:           "#00C896",
          }}
        >
          Admin Portal
        </span>

        <h2 className="text-[2.6rem] font-bold leading-[1.15] text-white">
          Welcome back,<br />Administrator
        </h2>

        <p className="mt-4 text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
          Manage accounts, review transactions, approve deposits, and maintain full control of the {BANK_NAME} platform.
        </p>

        {/* Feature bullets */}
        <ul className="mt-8 space-y-3">
          {[
            "Real-time transaction monitoring",
            "KYC review & compliance tools",
            "User management & access control",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5" style={{ color: "rgba(255,255,255,0.75)" }}>
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: "#00C896" }}
              />
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Bottom: security badge ── */}
      <div
        className="relative z-10 flex items-center gap-2"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <span className="text-xs">Secured with 256-bit TLS encryption</span>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function AdminLoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [authError,    setAuthError]    = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null)

    const result = await signIn("credentials", {
      redirect:  false,
      email:     data.email,
      password:  data.password,
    })

    if (result?.error) {
      setAuthError(AUTH_ERRORS[result.error] ?? FALLBACK_ERROR)
      return
    }

    if (result?.ok) {
      router.push("/admin/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      {/* ── Form panel ── */}
      <div className="flex flex-1 items-center justify-center bg-surface-50 px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile-only logo (brand panel hidden on small screens) */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: "#0F4C81" }}
              >
                <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight text-surface-900">{BANK_NAME}</span>
            </div>
            <span className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-surface-400">
              Admin Portal
            </span>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-surface-200 bg-white p-8 shadow-sm">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-surface-900">Sign in to {BANK_NAME}</h1>
              <p className="mt-1.5 text-sm text-surface-500">
                Enter your administrator credentials to continue
              </p>
            </div>

            {/* Auth error banner */}
            {authError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="admin@novapay.io"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    {...register("email")}
                    className={cn(
                      errors.email &&
                        "border-red-400 focus-visible:ring-red-400"
                    )}
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" className="text-xs text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      {...register("password")}
                      className={cn(
                        "pr-10",
                        errors.password &&
                          "border-red-400 focus-visible:ring-red-400"
                      )}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 transition-colors hover:text-surface-600"
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye    className="h-4 w-4" />
                      }
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" role="alert" className="text-xs text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full text-sm font-semibold"
                  style={{ backgroundColor: "#0F4C81" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-surface-400">
            Protected area — unauthorised access is strictly prohibited
          </p>
        </div>
      </div>
    </div>
  )
}
