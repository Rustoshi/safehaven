export default function AdminLoginLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel skeleton */}
      <div
        className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden p-12"
        style={{ backgroundColor: "#0F4C81" }}
      >
        <div className="h-9 w-32 animate-pulse rounded-lg bg-white/10" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 w-72 animate-pulse rounded bg-white/10" />
          <div className="h-10 w-56 animate-pulse rounded bg-white/10" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-48 animate-pulse rounded bg-white/10" />
            ))}
          </div>
        </div>
        <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
      </div>

      {/* Form panel skeleton */}
      <div className="flex flex-1 items-center justify-center bg-surface-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-surface-200 bg-white p-8 shadow-sm">
            <div className="animate-pulse space-y-6">
              {/* Heading */}
              <div className="space-y-2">
                <div className="h-7 w-52 rounded bg-surface-200" />
                <div className="h-4 w-72 rounded bg-surface-100" />
              </div>

              {/* Email field */}
              <div className="space-y-1.5">
                <div className="h-4 w-24 rounded bg-surface-200" />
                <div className="h-10 rounded-md bg-surface-100" />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="h-4 w-20 rounded bg-surface-200" />
                <div className="h-10 rounded-md bg-surface-100" />
              </div>

              {/* Button */}
              <div className="h-11 rounded-md bg-surface-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
