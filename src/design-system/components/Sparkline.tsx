import { useId } from 'react'

interface SparklineProps {
  data?: number[]
  color?: string
  height?: number
  className?: string
}

function normalizeSeries(data: number[]): number[] {
  if (data.length === 0) return [0, 0]
  if (data.length === 1) return [data[0], data[0]]
  return data
}

export function Sparkline({
  data = [],
  color = '#0145F2',
  height = 40,
  className = '',
}: SparklineProps) {
  const gradientId = useId()
  const series = normalizeSeries(data)
  const width = 120
  const max = Math.max(...series)
  const min = Math.min(...series)
  const range = max - min || 1

  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
