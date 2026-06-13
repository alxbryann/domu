import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { colors } from '../src/design-system/tokens/colors.js'
import { typography } from '../src/design-system/tokens/typography.js'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

let cachedLogoDataUri: string | null = null

/** Design tokens for HTML emails — sourced from src/design-system/tokens */
export const emailBrand = {
  colors,
  typography,
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    pill: '9999px',
  },
  font: {
    sans: typography.fontFamily.sans,
    mono: typography.fontFamily.mono,
  },
} as const

export function getEmailLogoSrc(): string {
  const explicit = process.env.EMAIL_LOGO_URL
  if (explicit) return explicit

  const base = process.env.DASHBOARD_URL ?? process.env.APP_URL
  if (base?.startsWith('https://')) {
    return `${base.replace(/\/$/, '')}/domu-logo.webp`
  }

  if (!cachedLogoDataUri) {
    const logoPath = join(projectRoot, 'public/domu-logo.webp')
    const buffer = readFileSync(logoPath)
    cachedLogoDataUri = `data:image/webp;base64,${buffer.toString('base64')}`
  }

  return cachedLogoDataUri
}
