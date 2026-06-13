interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-domu-md bg-app-hover ${className}`}
      aria-hidden
    />
  )
}
