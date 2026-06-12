import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  variant?: 'light' | 'dark'
  padding?: 'sm' | 'md' | 'lg'
  className?: string
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({
  children,
  variant = 'light',
  padding = 'md',
  className = '',
}: CardProps) {
  const variants = {
    light: 'bg-white border border-domu-blue-border rounded-domu-lg shadow-sm',
    dark: 'bg-domu-dashboard-card border border-white/10 rounded-domu-lg',
  }

  return (
    <div className={`${variants[variant]} ${paddingMap[padding]} ${className}`}>
      {children}
    </div>
  )
}
