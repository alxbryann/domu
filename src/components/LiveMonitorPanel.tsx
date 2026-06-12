import { Badge } from '../design-system/components/Badge'
import { ComplianceAlert } from '../design-system/components/ComplianceAlert'
import { ScoreRing } from '../design-system/components/ScoreRing'
import { SectionLabel } from '../design-system/components/SectionLabel'
import type { LiveMonitorSnapshot } from '../lib/live-monitor'

interface LiveMonitorPanelProps {
  monitor: LiveMonitorSnapshot
  elapsedSec: number
  lastLatencyMs: number | null
}

const RULE_STATUS: Record<string, string> = {
  pass: 'Pass',
  warning: 'Watch',
  fail: 'Fail',
  pending: 'Pending',
}

const RULE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pass: 'success',
  warning: 'warning',
  fail: 'danger',
  pending: 'neutral',
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function LiveMonitorPanel({ monitor, elapsedSec, lastLatencyMs }: LiveMonitorPanelProps) {
  const scoreForRing = monitor.weightedScore > 0 ? monitor.weightedScore : 3

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      <div className="rounded-domu-lg bg-app-card border border-app-border p-5">
        <SectionLabel variant="outline">Live Score</SectionLabel>
        <div className="flex items-center gap-5 mt-4">
          <ScoreRing score={scoreForRing} label="Running avg" size={100} />
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-app-muted">Duration</span>
              <span className="font-mono text-app-text">{formatDuration(elapsedSec)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-app-muted">Last latency</span>
              <span
                className={`font-mono ${
                  lastLatencyMs != null && lastLatencyMs > 3000
                    ? 'text-domu-warning'
                    : 'text-app-text'
                }`}
              >
                {lastLatencyMs != null ? `${(lastLatencyMs / 1000).toFixed(1)}s` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-app-muted">Avg latency</span>
              <span className="font-mono text-app-text">
                {monitor.avgLatencyMs != null
                  ? `${(monitor.avgLatencyMs / 1000).toFixed(1)}s`
                  : '—'}
              </span>
            </div>
            <Badge variant={monitor.compliancePass ? 'success' : 'danger'}>
              {monitor.compliancePass ? 'Compliance OK' : 'Compliance risk'}
            </Badge>
            {monitor.factChecks.length > 0 && (
              <Badge variant={monitor.factualPass ? 'success' : 'danger'}>
                {monitor.factualPass ? 'Facts OK' : 'Fact mismatch'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {monitor.alerts.length > 0 && (
        <div className="rounded-domu-lg bg-app-card border border-app-border p-5 space-y-3">
          <SectionLabel variant="outline">Alerts</SectionLabel>
          {monitor.alerts.slice(0, 6).map((alert) => (
            <ComplianceAlert
              key={alert.id}
              variant={
                alert.severity === 'critical' || alert.severity === 'high'
                  ? 'danger'
                  : alert.severity === 'medium'
                    ? 'warning'
                    : 'info'
              }
              title={alert.type === 'latency' ? 'Latency' : alert.type === 'compliance' ? 'Compliance' : 'Quality'}
              message={alert.message}
            />
          ))}
        </div>
      )}

      <div className="rounded-domu-lg bg-app-card border border-app-border p-5">
        <SectionLabel variant="outline">FDCPA Rules</SectionLabel>
        <div className="mt-4 space-y-2">
          {monitor.rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start justify-between gap-3 rounded-domu-md bg-app-hover px-3 py-2"
            >
              <div>
                <p className="text-sm text-app-text">{rule.label}</p>
                {rule.detail && (
                  <p className="text-xs text-app-muted mt-0.5">{rule.detail}</p>
                )}
              </div>
              <Badge variant={RULE_VARIANT[rule.status]}>{RULE_STATUS[rule.status]}</Badge>
            </div>
          ))}
        </div>
      </div>

      {monitor.factChecks.length > 0 && (
        <div className="rounded-domu-lg bg-app-card border border-app-border p-5">
          <SectionLabel variant="outline">Ground truth checks</SectionLabel>
          <div className="mt-4 space-y-2">
            {monitor.factChecks.map((check) => (
              <div
                key={check.factId}
                className="flex items-start justify-between gap-3 rounded-domu-md bg-app-hover px-3 py-2"
              >
                <div>
                  <p className="text-sm text-app-text">{check.label}</p>
                  <p className="text-xs text-app-muted mt-0.5">{check.detail}</p>
                </div>
                <Badge variant={RULE_VARIANT[check.status]}>{RULE_STATUS[check.status]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-domu-lg bg-app-card border border-app-border p-5">
        <SectionLabel variant="outline">Criteria (live estimate)</SectionLabel>
        <div className="mt-4 space-y-3">
          {monitor.criteria.map((c) => {
            const pct = c.score > 0 ? (c.score / 5) * 100 : 0
            const barColor =
              c.status === 'fail'
                ? 'bg-domu-danger'
                : c.status === 'warning'
                  ? 'bg-domu-warning'
                  : c.status === 'pending'
                    ? 'bg-app-muted'
                    : 'bg-domu-success'

            return (
              <div key={c.criterionId}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-app-text-secondary truncate">{c.name}</span>
                  <span className="text-xs font-mono text-app-text shrink-0">
                    {c.score > 0 ? `${c.score}/5` : '—'}
                  </span>
                </div>
                <div className="h-1.5 bg-app-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-app-muted mt-1">{c.hint}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
