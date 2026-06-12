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
      <span className="text-lg shrink-0">
        {variant === 'danger' ? '⛔' : variant === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm opacity-80 mt-1">{message}</p>
      </div>
    </div>
  )
}
