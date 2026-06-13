import { Sparkline } from './Sparkline'

interface MetricCardProps {
  label: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  sparklineData?: number[]
  sparklineColor?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  change,
  changeType = 'positive',
  sparklineData,
  sparklineColor = '#0145F2',
  className = '',
}: MetricCardProps) {
  const changeColors = {
    positive: 'text-domu-success',
    negative: 'text-domu-danger',
    neutral: 'text-app-muted',
  }

  return (
    <div
      className={[
        'rounded-domu-lg p-4 flex flex-col gap-2 bg-app-card border border-app-border transition-colors',
        className,
      ].join(' ')}
    >
      <span className="text-xs text-app-muted">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold text-app-text">{value}</p>
          {change && (
            <span className={`text-xs font-medium ${changeColors[changeType]}`}>
              {change}
            </span>
          )}
        </div>
      </div>
      <Sparkline
        data={sparklineData}
        color={sparklineColor}
        height={32}
        className="mt-1 opacity-80"
      />
    </div>
  )
}
