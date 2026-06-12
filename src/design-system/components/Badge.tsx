type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  children: string
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-domu-blue-soft text-domu-blue',
  success: 'bg-domu-success/12 text-domu-success',
  warning: 'bg-domu-warning/12 text-domu-warning',
  danger: 'bg-domu-danger/12 text-domu-danger',
  info: 'bg-domu-info/12 text-domu-info',
  neutral: 'bg-app-hover text-app-text-secondary',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-domu-pill',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

export function StatusPill({
  status,
  className = '',
}: {
  status: 'low' | 'medium' | 'high' | 'active' | 'inactive'
  className?: string
}) {
  const map = {
    low: { label: 'Low', variant: 'success' as const },
    medium: { label: 'Medium', variant: 'warning' as const },
    high: { label: 'High', variant: 'danger' as const },
    active: { label: 'Active', variant: 'success' as const },
    inactive: { label: 'Inactive', variant: 'neutral' as const },
  }

  const { label, variant } = map[status]
  return <Badge variant={variant} className={className}>{label}</Badge>
}
