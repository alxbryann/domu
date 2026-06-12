/**
 * Domu.ai color tokens — extracted from domu.ai (Framer site)
 * Primary brand: navy hero + electric blue CTA
 */
export const colors = {
  brand: {
    navy: '#08144F',
    navyMuted: 'rgba(8, 20, 79, 0.8)',
    navySubtle: 'rgba(8, 20, 79, 0.2)',
    blue: '#0145F2',
    blueHover: '#0034B8',
    blueDeep: '#0021A4',
    blueGlow: 'rgba(54, 92, 246, 0.2)',
    blueSoft: '#EFF4FF',
    blueLighter: '#F7FAFF',
    blueTint: '#EBF0FE',
    blueBorder: '#E1EAFD',
    periwinkle: '#AEB2EB',
    lavender: '#9A9FE3',
    sky: '#53D4FF',
  },

  surface: {
    white: '#FFFFFF',
    offWhite: '#FFFFFE',
    gray50: '#F3F4F6',
    gray100: '#F0F0F0',
    dashboard: '#0B0B0D',
    dashboardCard: '#141416',
    dashboardSidebar: '#0E0E10',
    dashboardBorder: 'rgba(255, 255, 255, 0.1)',
  },

  text: {
    primary: '#08144F',
    secondary: '#646E95',
    tertiary: '#A2A9C5',
    onDark: '#FFFFFF',
    onDarkMuted: 'rgba(255, 255, 255, 0.7)',
    onLight: '#383838',
    nav: '#414970',
  },

  status: {
    success: '#00AD7D',
    successBg: 'rgba(0, 173, 125, 0.12)',
    successLight: '#7FCBAE',
    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    danger: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.12)',
    info: '#00A1E0',
    infoBg: 'rgba(0, 161, 224, 0.12)',
  },

  chart: {
    line: '#0145F2',
    area: 'rgba(1, 69, 242, 0.15)',
    grid: 'rgba(255, 255, 255, 0.06)',
  },
} as const

export type ColorToken = typeof colors
