interface ComplianceAlertProps {
  title: string
  message: string
  variant?: 'warning' | 'danger' | 'info'
  className?: string
}

const variants = {
  warning: 'bg-domu-warning/10 border-domu-warning/30 text-domu-warning',
  danger: 'bg-domu-danger/10 border-domu-danger/30 text-domu-danger',
  info: 'bg-domu-info/10 border-domu-info/30 text-domu-info',
}

const DangerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M10 6l-4 4M6 6l4 4" />
  </svg>
)

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2L1.5 13.5h13L8 2z" />
    <path d="M8 6.5v3M8 11h.01" />
  </svg>
)

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 7v4M8 5h.01" />
  </svg>
)

const icons = {
  danger: <DangerIcon />,
  warning: <WarningIcon />,
  info: <InfoIcon />,
}

export function ComplianceAlert({
  title,
  message,
  variant = 'warning',
  className = '',
}: ComplianceAlertProps) {
  return (
    <div
      className={[
        'rounded-domu-lg border p-4 flex gap-3',
        variants[variant],
        className,
      ].join(' ')}
    >
      <span className="shrink-0 mt-0.5">{icons[variant]}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm opacity-80 mt-1">{message}</p>
      </div>
    </div>
  )
}
