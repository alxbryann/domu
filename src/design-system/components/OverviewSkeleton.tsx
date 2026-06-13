import { MetricCardSkeleton } from './MetricCardSkeleton'
import { DataTableSkeleton } from './DataTableSkeleton'
import { Skeleton } from './Skeleton'

export function OverviewSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-64 mt-3" />
        <Skeleton className="h-4 w-96 max-w-full mt-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <div className="rounded-domu-lg bg-app-card border border-app-border p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <DataTableSkeleton columns={5} rows={5} />
      </div>
    </div>
  )
}
