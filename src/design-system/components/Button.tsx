import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-domu-blue text-white hover:bg-domu-blue-hover border-transparent shadow-sm',
  secondary:
    'bg-domu-blue-soft text-domu-navy hover:bg-domu-blue-tint border-transparent',
  outline:
    'bg-transparent text-domu-navy border-domu-navy/30 hover:border-domu-navy hover:bg-domu-blue-lighter dark:text-app-text dark:border-app-border dark:hover:bg-app-hover',
  ghost:
    'bg-transparent text-app-text-secondary hover:text-app-text hover:bg-app-hover border-transparent',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-2',
  md: 'h-11 px-5 text-sm gap-2.5',
  lg: 'h-12 px-6 text-base gap-3',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-medium rounded-domu-md border transition-colors duration-200 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
      {icon && (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
          {icon}
        </span>
      )}
    </button>
  )
}

export function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${className}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}
