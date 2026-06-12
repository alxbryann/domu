import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { EvalResult } from './types.js'

export interface GoldenLabel {
  transcriptId: string
  expectedCompliancePass: boolean
  expectedOverallPass: boolean
  label: 'good' | 'bad' | 'edge'
  notes: string
}

const GOLDEN_LABELS_PATH = join(process.cwd(), 'data', 'golden-labels.json')

export function loadGoldenLabels(): GoldenLabel[] {
  if (!existsSync(GOLDEN_LABELS_PATH)) return []
  return JSON.parse(readFileSync(GOLDEN_LABELS_PATH, 'utf-8')) as GoldenLabel[]
}

export interface ValidationReport {
  total: number
  agreement: number
  agreementPct: number
  disagreements: Array<{
    transcriptId: string
    field: string
    expected: boolean
    actual: boolean
    notes: string
  }>
}

export function validateAgainstGoldenSet(
  results: EvalResult[],
  labels: GoldenLabel[] = loadGoldenLabels(),
): ValidationReport {
  const disagreements: ValidationReport['disagreements'] = []
  let agreement = 0
  let total = 0

  for (const label of labels) {
    const result = results.find((r) => r.transcriptId === label.transcriptId)
    if (!result) continue

    const checks = [
      {
        field: 'compliancePass',
        expected: label.expectedCompliancePass,
        actual: result.compliancePass,
      },
      {
        field: 'overallPass',
        expected: label.expectedOverallPass,
        actual: result.overallPass,
      },
    ]

    for (const check of checks) {
      total++
      if (check.expected === check.actual) {
        agreement++
      } else {
        disagreements.push({
          transcriptId: label.transcriptId,
          field: check.field,
          expected: check.expected,
          actual: check.actual,
          notes: label.notes,
        })
      }
    }
  }

  return {
    total,
    agreement,
    agreementPct: total > 0 ? Math.round((agreement / total) * 100) : 0,
    disagreements,
  }
}

export function summarizeValidation(report: ValidationReport): string {
  if (report.total === 0) {
    return 'No golden labels configured. Add entries to data/golden-labels.json to run validation.'
  }

  const lines = [
    `Golden set validation: ${report.agreement}/${report.total} checks passed (${report.agreementPct}%)`,
  ]
  if (report.disagreements.length > 0) {
    lines.push('Disagreements:')
    for (const d of report.disagreements) {
      lines.push(
        `  - ${d.transcriptId}.${d.field}: expected ${d.expected}, got ${d.actual} (${d.notes})`,
      )
    }
  }
  return lines.join('\n')
}
