import { Skeleton } from './Skeleton'

interface MetricCardSkeletonProps {
  className?: string
}

export function MetricCardSkeleton({ className = '' }: MetricCardSkeletonProps) {
  return (
    <div
      className={[
        'rounded-domu-lg p-4 flex flex-col gap-2 bg-app-card border border-app-border',
        className,
      ].join(' ')}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-full mt-1" />
    </div>
  )
}
