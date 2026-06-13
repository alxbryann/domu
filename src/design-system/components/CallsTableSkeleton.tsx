import { Skeleton } from './Skeleton'
import { DataTableSkeleton } from './DataTableSkeleton'

export function CallsTableSkeleton() {
  return (
    <div className="rounded-domu-lg bg-app-card border border-app-border p-5">
      <DataTableSkeleton columns={8} rows={6} />
    </div>
  )
}

export function CallsPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-40 mt-3" />
          <Skeleton className="h-4 w-96 max-w-full mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-domu-md" />
          <Skeleton className="h-9 w-28 rounded-domu-md" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-domu-md" />
        ))}
      </div>

      <CallsTableSkeleton />
    </div>
  )
}
