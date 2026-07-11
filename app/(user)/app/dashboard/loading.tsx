function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Wallet card skeleton */}
      <Skeleton className="h-48 w-full rounded-2xl" />

      {/* Net worth skeleton */}
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] w-[72px] rounded-2xl" />
        ))}
      </div>

      {/* Banner skeleton */}
      <Skeleton className="h-14 w-full rounded-xl" />

      {/* Spending summary */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-28 flex-shrink-0 rounded-full" />
        ))}
      </div>

      {/* Transaction list */}
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-16" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-[180px] w-full" />
      </div>
    </div>
  )
}
