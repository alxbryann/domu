/**
 * Domu.ai typography — Inter + Fragment Mono + Helvetica Neue
 */
export const typography = {
  fontFamily: {
    sans: '"Inter", "Helvetica Neue", system-ui, sans-serif',
    display: '"Inter", "Helvetica Neue", system-ui, sans-serif',
    mono: '"Fragment Mono", ui-monospace, monospace',
  },

  fontSize: {
    xs: '0.75rem',     // 12px — labels, pills
    sm: '0.875rem',    // 14px — nav, body small
    base: '1rem',      // 16px — body
    lg: '1.125rem',    // 18px — lead
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '2rem',     // 32px
    '4xl': '2.5rem',   // 40px
    '5xl': '3rem',     // 48px
    hero: '3.5rem',    // 56px — hero headlines
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },

  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },

  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
    label: '0.12em',
  },
} as const

export type TypographyToken = typeof typography
