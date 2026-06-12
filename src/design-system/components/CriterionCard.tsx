import { Badge } from './Badge'
import type { CriterionResult } from '../../types'

interface CriterionCardProps {
  name: string
  weight?: number
  result: CriterionResult
  className?: string
}

const severityVariant = {
  none: 'success',
  low: 'info',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
} as const

export function CriterionCard({ name, weight, result, className = '' }: CriterionCardProps) {
  const pct = (result.score / 5) * 100
  const barColor =
    result.score >= 4 ? 'bg-domu-success' : result.score >= 3 ? 'bg-domu-blue' : result.score >= 2 ? 'bg-domu-warning' : 'bg-domu-danger'

  return (
    <div
      className={[
        'rounded-domu-lg bg-app-card border border-app-border p-5 flex flex-col gap-3 transition-colors',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-app-text">{name}</h3>
          {weight != null && (
            <span className="text-xs text-app-muted">{`Weight: ${weight}x`}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={result.pass ? 'success' : 'danger'}>
            {result.pass ? 'Pass' : 'Fail'}
          </Badge>
          <span className="text-lg font-bold text-app-text">{`${result.score}/5`}</span>
        </div>
      </div>

      <div className="h-1.5 bg-app-hover rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-sm text-app-text-secondary leading-relaxed">{result.reasoning}</p>

      {result.evidence.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-app-muted">Evidence</span>
          {result.evidence.map((quote, i) => (
            <blockquote
              key={i}
              className="text-xs text-app-text-secondary border-l-2 border-domu-blue/50 pl-3 italic"
            >
              "{quote}"
            </blockquote>
          ))}
        </div>
      )}

      {result.severity !== 'none' && (
        <Badge variant={severityVariant[result.severity]}>
          {`${result.severity} severity`}
        </Badge>
      )}
    </div>
  )
}
