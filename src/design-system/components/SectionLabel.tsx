import { type ReactNode } from 'react'

interface SectionLabelProps {
  children: ReactNode
  variant?: 'outline' | 'filled'
  className?: string
}

export function SectionLabel({
  children,
  variant = 'filled',
  className = '',
}: SectionLabelProps) {
  const base =
    'inline-flex items-center px-3 py-1.5 text-xs font-mono font-normal tracking-[0.12em] uppercase rounded-domu-sm'

  const variants = {
    outline:
      'border border-app-border text-app-text-secondary bg-transparent',
    filled:
      'border border-domu-blue/20 text-domu-blue bg-domu-blue-soft dark:bg-domu-blue/10 dark:text-domu-blue dark:border-domu-blue/30',
  }

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
