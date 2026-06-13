import { useEffect, useRef, useState } from 'react'
import type { LiveAlert } from '../lib/live-monitor'

/** Alerts important enough to interrupt with a toast (vs. the side panel list). */
function isImportant(alert: LiveAlert): boolean {
  return alert.type === 'escalation' || alert.severity === 'critical' || alert.severity === 'high'
}

const TYPE_TITLE: Record<LiveAlert['type'], string> = {
  escalation: 'Escalación',
  compliance: 'Cumplimiento',
  latency: 'Latencia',
  quality: 'Calidad',
  system: 'Sistema',
}

const AUTO_DISMISS_MS = 12000

/**
 * Surfaces critical/high live-call alerts (lawsuit threat, fraud dispute, FDCPA
 * risk, …) as prominent toasts so the operator notices them in real time. The
 * full history still lives in the side panel; this only "pops" what's urgent.
 */
export function LiveAlertToasts({ alerts }: { alerts: LiveAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const timersRef = useRef<Map<string, number>>(new Map())

  const visible = alerts.filter((a) => isImportant(a) && !dismissed.has(a.id))

  const dismiss = (id: string) =>
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

  // Auto-dismiss non-critical toasts after a while; critical ones stay until
  // the operator acknowledges them.
  useEffect(() => {
    for (const alert of visible) {
      if (alert.severity === 'critical') continue
      if (timersRef.current.has(alert.id)) continue
      const timer = window.setTimeout(() => {
        timersRef.current.delete(alert.id)
        dismiss(alert.id)
      }, AUTO_DISMISS_MS)
      timersRef.current.set(alert.id, timer)
    }
  }, [visible])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer)
    }
  }, [])

  if (visible.length === 0) return null

  return (
    <div className="pointer-events-none fixed top-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] flex-col gap-3">
      {visible.slice(0, 4).map((alert) => {
        const critical = alert.severity === 'critical'
        return (
          <div
            key={alert.id}
            role="alert"
            style={{ animation: 'domu-toast-in 0.25s ease-out' }}
            className={[
              'pointer-events-auto rounded-domu-lg border p-4 backdrop-blur-sm',
              'shadow-[0_8px_24px_rgba(0,0,0,0.25)]',
              critical
                ? 'border-domu-danger/50 bg-domu-danger/10'
                : 'border-domu-warning/50 bg-domu-warning/10',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'h-2 w-2 rounded-full',
                    critical ? 'bg-domu-danger animate-pulse' : 'bg-domu-warning',
                  ].join(' ')}
                />
                <span
                  className={[
                    'text-xs font-semibold uppercase tracking-wider',
                    critical ? 'text-domu-danger' : 'text-domu-warning',
                  ].join(' ')}
                >
                  {TYPE_TITLE[alert.type]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismiss(alert.id)}
                className="text-app-muted hover:text-app-text text-sm leading-none"
                aria-label="Cerrar alerta"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-app-text leading-snug">{alert.message}</p>
          </div>
        )
      })}
    </div>
  )
}
