/**
 * Domu.ai spacing, radius, shadows, and layout tokens
 */
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  pill: '9999px',
} as const

export const shadows = {
  sm: '0 1px 2px rgba(8, 20, 79, 0.06)',
  md: '0 4px 12px rgba(8, 20, 79, 0.08)',
  lg: '0 8px 24px rgba(8, 20, 79, 0.12)',
  glow: '0 0 60px rgba(1, 69, 242, 0.25)',
  card: '0 2px 8px rgba(0, 0, 0, 0.3)',
} as const

export const layout = {
  maxWidth: '1280px',
  navHeight: '72px',
  sidebarWidth: '220px',
  contentPadding: '2rem',
} as const
