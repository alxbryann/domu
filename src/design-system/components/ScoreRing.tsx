interface ScoreRingProps {
  score: number
  max?: number
  size?: number
  label?: string
  className?: string
}

export function ScoreRing({
  score,
  max = 5,
  size = 120,
  label,
  className = '',
}: ScoreRingProps) {
  const pct = Math.min(score / max, 1)
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  const color =
    score >= 4 ? '#00AD7D' : score >= 3 ? '#0145F2' : score >= 2 ? '#F59E0B' : '#EF4444'

  return (
    <div className={`relative inline-flex flex-col items-center gap-2 ${className}`}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--app-border)"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-app-text">{score.toFixed(1)}</span>
        <span className="text-xs text-app-muted">{`/ ${max}`}</span>
      </div>
      {label && <span className="text-xs text-app-muted font-medium">{label}</span>}
    </div>
  )
}
