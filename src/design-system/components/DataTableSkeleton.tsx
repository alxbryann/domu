import { Skeleton } from './Skeleton'

interface DataTableSkeletonProps {
  columns?: number
  rows?: number
  className?: string
}

const CELL_WIDTHS = ['w-24', 'w-16', 'w-20', 'w-14', 'w-28', 'w-12']

export function DataTableSkeleton({
  columns = 5,
  rows = 6,
  className = '',
}: DataTableSkeletonProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app-border">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="py-3 px-4 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, row) => (
            <tr key={row} className="border-b border-app-border">
              {Array.from({ length: columns }).map((_, col) => (
                <td key={col} className="py-3 px-4">
                  <Skeleton className={`h-4 ${CELL_WIDTHS[col % CELL_WIDTHS.length]}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
