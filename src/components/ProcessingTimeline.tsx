export type StepStatus = 'pending' | 'active' | 'done'

export interface ProcessingStep {
  id: string
  label: string
  status: StepStatus
}

export function ProcessingTimeline({ steps }: { steps: ProcessingStep[] }) {
  return (
    <ol className="rounded-domu-md border border-app-border bg-app-bg p-4 space-y-2.5">
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-3">
          <StepIcon status={step.status} />
          <span
            className={[
              'text-sm transition-colors',
              step.status === 'done'
                ? 'text-app-text'
                : step.status === 'active'
                  ? 'text-app-text font-medium'
                  : 'text-app-muted',
            ].join(' ')}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-domu-success/15 text-domu-success">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-domu-blue" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full border border-app-border bg-transparent" />
    </span>
  )
}
