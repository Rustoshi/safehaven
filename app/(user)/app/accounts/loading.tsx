function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function AccountsLoading() {
  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* Header */}
      <Skeleton className="h-8 w-32" />

      {/* Portfolio card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Account cards */}
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
