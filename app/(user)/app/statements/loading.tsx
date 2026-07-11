export default function StatementsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-14 bg-gray-200 dark:bg-gray-800" />
      <div className="px-4 py-5 max-w-[800px] mx-auto space-y-5">
        <div className="flex gap-2">
          <div className="flex-1 h-11 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1 h-11 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 bg-gray-100 dark:bg-gray-800/50">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
