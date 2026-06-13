import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import {
  detectEscalationInTurns,
  escalationAlertKey,
} from '../../shared/escalation-triggers'
import { checkGroundTruthFacts } from '../../shared/acceptance-profile'
import type { EvalResult, Transcript } from '../types'

/** A single alert row in the post-call report. */
export interface ReportAlert {
  /** Time the alert happened (mm:ss into the call, ISO time, or turn reference). */
  time: string
  /** Alert family shown to the reviewer. */
  category: 'Escalación' | 'Cumplimiento' | 'Calidad'
  /** Priority / severity label in Spanish. */
  priority: string
  /** Whether an escalation email/notification was actually sent for this alert. */
  escalated: boolean
  /** Human-readable description of what triggered the alert. */
  message: string
  /** Who said the triggering line, when known. */
  speaker?: string
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  none: 'Informativa',
}

const SPEAKER_LABEL: Record<string, string> = {
  agent: 'Agente',
  customer: 'Cliente',
  system: 'Sistema',
}

function severityRank(priority: string): number {
  const order = ['Crítica', 'Alta', 'Media', 'Baja', 'Informativa']
  const idx = order.indexOf(priority)
  return idx === -1 ? order.length : idx
}

/** First usable wall-clock time for the call, used to compute relative offsets. */
function callStartMs(call: Transcript): number | null {
  const firstStamped = call.turns.find((t) => t.timestamp)?.timestamp
  const ref = firstStamped ?? call.metadata.callDate
  if (!ref) return null
  const ms = new Date(ref).getTime()
  return Number.isFinite(ms) ? ms : null
}

/** Format a turn's time as an offset from call start (mm:ss), falling back gracefully. */
function formatTurnTime(call: Transcript, turnIndex: number): string {
  const turn = call.turns[turnIndex]
  const startMs = callStartMs(call)
  if (turn?.timestamp && startMs != null) {
    const ms = new Date(turn.timestamp).getTime()
    if (Number.isFinite(ms)) {
      const offset = Math.max(0, Math.floor((ms - startMs) / 1000))
      const m = Math.floor(offset / 60)
      const s = offset % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }
  }
  return `Turno ${turnIndex + 1}`
}

/** Find the turn index whose text contains the matched snippet (for judge violations). */
function findTurnByText(call: Transcript, snippet: string): number {
  if (!snippet) return -1
  const needle = snippet.toLowerCase()
  return call.turns.findIndex((t) => t.text.toLowerCase().includes(needle))
}

/**
 * Build the unified alert list for a finished call/script: escalation triggers
 * (with whether an alert email was actually sent) plus compliance rule
 * violations flagged by the judge.
 */
export function buildReportAlerts(call: Transcript, result: EvalResult | null): ReportAlert[] {
  const sentKeys = new Set(call.metadata.sentEscalationAlerts ?? [])
  const alerts: ReportAlert[] = []

  for (const match of detectEscalationInTurns(call.turns)) {
    alerts.push({
      time: formatTurnTime(call, match.turnIndex),
      category: 'Escalación',
      priority: SEVERITY_LABEL[match.severity] ?? match.severity,
      escalated: sentKeys.has(escalationAlertKey(match)),
      message: `${match.label} — "${match.matchedText}"`,
      speaker: SPEAKER_LABEL[match.speaker] ?? match.speaker,
    })
  }

  for (const violation of result?.ruleViolations ?? []) {
    const turnIndex = findTurnByText(call, violation.matchedText)
    alerts.push({
      time: turnIndex >= 0 ? formatTurnTime(call, turnIndex) : '—',
      category: 'Cumplimiento',
      priority: SEVERITY_LABEL[violation.severity] ?? violation.severity,
      escalated: false,
      message: `${violation.description} — "${violation.matchedText}"`,
      speaker: turnIndex >= 0 ? SPEAKER_LABEL[call.turns[turnIndex].speaker] : undefined,
    })
  }

  return alerts.sort((a, b) => severityRank(a.priority) - severityRank(b.priority))
}

function formatDateTime(value: string | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
}

const FACT_STATUS: Record<string, string> = {
  pass: 'Correcto',
  fail: 'Incorrecto',
  warning: 'Advertencia',
  pending: 'Pendiente',
}

// --- Palette (hex without leading '#', as docx expects) ---
const BLUE = '1D4ED8'
const SLATE = '1E293B'
const MUTED = '64748B'
const HEADER_FILL = 'EFF6FF'
const KEY_FILL = 'F8FAFC'
const BORDER = 'CBD5E1'
const GREEN = '15803D'
const RED = 'B91C1C'

function priorityColor(priority: string): string {
  switch (priority) {
    case 'Crítica':
      return RED
    case 'Alta':
      return 'C2410C'
    case 'Media':
      return 'A16207'
    default:
      return '475569'
  }
}

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
} as const

// Usable page width with default 1in margins on Letter ≈ 9360 twips (DXA).
const PAGE_WIDTH_DXA = 9360

// Per-table column widths (DXA); each row must sum to PAGE_WIDTH_DXA.
const COLS_KEY_VALUE = [3000, 6360]
const COLS_ALERTS = [900, 1300, 1300, 1100, 1300, 3460]
const COLS_CRITERIA = [1900, 800, 1000, 1300, 4360]
const COLS_FACTS = [2400, 1800, 5160]
const COLS_TRANSCRIPT = [1000, 1500, 6860]

/** A plain text body cell. Pass styled `TextRun[]` for custom formatting. */
function cell(
  text: string | TextRun[],
  opts: { fill?: string; bold?: boolean; widthDxa?: number } = {},
): TableCell {
  const children = Array.isArray(text)
    ? text
    : [new TextRun({ text, bold: opts.bold, size: 20, color: SLATE })]
  return new TableCell({
    borders: CELL_BORDERS,
    shading: opts.fill ? { fill: opts.fill } : undefined,
    width: opts.widthDxa ? { size: opts.widthDxa, type: WidthType.DXA } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children })],
  })
}

/** A header cell (shaded, bold). */
function headerCell(text: string, widthDxa?: number): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    shading: { fill: HEADER_FILL },
    width: widthDxa ? { size: widthDxa, type: WidthType.DXA } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: SLATE })] })],
  })
}

/**
 * Fixed-layout, full-width table. `columnWidths` (in DXA) are required so Word
 * honors the grid instead of collapsing columns and wrapping text per-character.
 */
function fullWidthTable(rows: TableRow[], columnWidths: number[]): Table {
  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    rows,
  })
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, color: BLUE, bold: true, size: 28 })],
  })
}

function passRun(pass: boolean, labelPass: string, labelFail: string): TextRun {
  return new TextRun({
    text: pass ? labelPass : labelFail,
    bold: true,
    color: pass ? GREEN : RED,
    size: 20,
  })
}

/** Build the full report as an OOXML Word document. */
export function buildCallReportDocument(call: Transcript, result: EvalResult | null): Document {
  const alerts = buildReportAlerts(call, result)
  const agentText = call.turns
    .filter((t) => t.speaker === 'agent')
    .map((t) => t.text)
    .join(' ')
  const profile = call.metadata.acceptanceProfile
  const factChecks = checkGroundTruthFacts(agentText, profile, agentText.length > 0)
  const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })

  const body: (Paragraph | Table)[] = []

  // Title
  body.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'Reporte de evaluación de llamada', bold: true, color: BLUE, size: 40 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: `Generado el ${generatedAt} · Domu QA`, color: MUTED, size: 18 })],
    }),
  )

  // Call data
  const metaRows: Array<[string, string]> = [
    ['ID de llamada', call.id],
    ['Cuenta', call.metadata.accountId ?? '—'],
    ['Versión del agente', call.metadata.agentVersion ?? '—'],
    ['Tipo de llamada', call.metadata.callType ?? '—'],
    ['Fecha de la llamada', formatDateTime(call.metadata.callDate)],
    ['Finalizada', formatDateTime(call.metadata.endedAt)],
    ['Estado', call.status],
  ]
  body.push(heading('Datos de la llamada'))
  body.push(
    fullWidthTable(
      metaRows.map(
        ([k, v]) =>
          new TableRow({
            children: [
              cell(k, { fill: KEY_FILL, bold: true, widthDxa: COLS_KEY_VALUE[0] }),
              cell(v, { widthDxa: COLS_KEY_VALUE[1] }),
            ],
          }),
      ),
      COLS_KEY_VALUE,
    ),
  )

  // In-call alerts
  body.push(heading('Alertas en llamada'))
  const alertHeader = new TableRow({
    tableHeader: true,
    children: ['Tiempo', 'Tipo', 'Prioridad', '¿Escaló?', 'Origen', 'Detalle'].map((t, i) =>
      headerCell(t, COLS_ALERTS[i]),
    ),
  })
  const alertBody = alerts.length
    ? alerts.map(
        (a) =>
          new TableRow({
            children: [
              cell(a.time, { widthDxa: COLS_ALERTS[0] }),
              cell(a.category, { widthDxa: COLS_ALERTS[1] }),
              cell([new TextRun({ text: a.priority, bold: true, color: priorityColor(a.priority), size: 20 })], {
                widthDxa: COLS_ALERTS[2],
              }),
              cell(
                a.escalated
                  ? [new TextRun({ text: 'Sí', bold: true, color: RED, size: 20 })]
                  : 'No',
                { widthDxa: COLS_ALERTS[3] },
              ),
              cell(a.speaker ?? '—', { widthDxa: COLS_ALERTS[4] }),
              cell(a.message, { widthDxa: COLS_ALERTS[5] }),
            ],
          }),
      )
    : [
        new TableRow({
          children: [
            new TableCell({
              borders: CELL_BORDERS,
              columnSpan: 6,
              margins: { top: 60, bottom: 60, left: 90, right: 90 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'No se detectaron alertas durante la llamada.',
                      italics: true,
                      size: 20,
                      color: SLATE,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ]
  body.push(fullWidthTable([alertHeader, ...alertBody], COLS_ALERTS))

  // Score & compliance
  body.push(heading('Puntaje y cumplimiento'))
  if (result) {
    body.push(
      fullWidthTable(
        [
          new TableRow({
            children: [
              cell('Puntaje ponderado', { fill: KEY_FILL, bold: true, widthDxa: COLS_KEY_VALUE[0] }),
              cell([new TextRun({ text: `${result.weightedScore.toFixed(1)} / 5`, bold: true, size: 20, color: SLATE })], {
                widthDxa: COLS_KEY_VALUE[1],
              }),
            ],
          }),
          new TableRow({
            children: [
              cell('Resultado general', { fill: KEY_FILL, bold: true, widthDxa: COLS_KEY_VALUE[0] }),
              cell([passRun(result.overallPass, 'Aprobado', 'Reprobado')], { widthDxa: COLS_KEY_VALUE[1] }),
            ],
          }),
          new TableRow({
            children: [
              cell('Cumplimiento (FDCPA)', { fill: KEY_FILL, bold: true, widthDxa: COLS_KEY_VALUE[0] }),
              cell([passRun(result.compliancePass, 'Cumple', 'No cumple')], { widthDxa: COLS_KEY_VALUE[1] }),
            ],
          }),
          new TableRow({
            children: [
              cell('Desacuerdo entre jueces', { fill: KEY_FILL, bold: true, widthDxa: COLS_KEY_VALUE[0] }),
              cell(result.judgeDisagreement ? 'Sí — se recomienda revisión humana' : 'No', {
                widthDxa: COLS_KEY_VALUE[1],
              }),
            ],
          }),
          new TableRow({
            children: [
              cell('Versión del evaluador', { fill: KEY_FILL, bold: true, widthDxa: COLS_KEY_VALUE[0] }),
              cell(result.judgeVersion, { widthDxa: COLS_KEY_VALUE[1] }),
            ],
          }),
          new TableRow({
            children: [
              cell('Evaluado', { fill: KEY_FILL, bold: true, widthDxa: COLS_KEY_VALUE[0] }),
              cell(formatDateTime(result.evaluatedAt), { widthDxa: COLS_KEY_VALUE[1] }),
            ],
          }),
        ],
        COLS_KEY_VALUE,
      ),
    )
    body.push(heading('Resumen de la evaluación'))
    body.push(
      new Paragraph({
        spacing: { after: 80, line: 300 },
        children: [new TextRun({ text: result.summary || 'Sin resumen.', size: 20, color: SLATE })],
      }),
    )
  } else {
    body.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Esta llamada aún no ha sido evaluada por el juez QA.', italics: true, size: 20, color: SLATE }),
        ],
      }),
    )
  }

  // Per-criterion scores
  if (result?.criteria.length) {
    body.push(heading('Puntaje por criterio'))
    const rows = [
      new TableRow({
        tableHeader: true,
        children: ['Criterio', 'Peso', 'Puntaje', 'Resultado', 'Justificación'].map((t, i) =>
          headerCell(t, COLS_CRITERIA[i]),
        ),
      }),
      ...result.criteria.map(
        (c) =>
          new TableRow({
            children: [
              cell(c.criterionName ?? c.criterionId, { widthDxa: COLS_CRITERIA[0] }),
              cell(c.weight != null ? c.weight.toFixed(1) : '—', { widthDxa: COLS_CRITERIA[1] }),
              cell([new TextRun({ text: `${c.score} / 5`, bold: true, size: 20, color: SLATE })], {
                widthDxa: COLS_CRITERIA[2],
              }),
              cell([passRun(c.pass, 'Aprobado', 'Reprobado')], { widthDxa: COLS_CRITERIA[3] }),
              cell(c.reasoning, { widthDxa: COLS_CRITERIA[4] }),
            ],
          }),
      ),
    ]
    body.push(fullWidthTable(rows, COLS_CRITERIA))
  }

  // Ground-truth fact checks
  if (factChecks.length) {
    body.push(heading('Verificación de datos (ground truth)'))
    const rows = [
      new TableRow({
        tableHeader: true,
        children: ['Dato', 'Estado', 'Detalle'].map((t, i) => headerCell(t, COLS_FACTS[i])),
      }),
      ...factChecks.map(
        (f) =>
          new TableRow({
            children: [
              cell(f.label, { widthDxa: COLS_FACTS[0] }),
              cell(FACT_STATUS[f.status] ?? f.status, { widthDxa: COLS_FACTS[1] }),
              cell(f.detail, { widthDxa: COLS_FACTS[2] }),
            ],
          }),
      ),
    ]
    body.push(fullWidthTable(rows, COLS_FACTS))
  }

  // Transcript
  body.push(heading('Transcripción'))
  const transcriptRows = [
    new TableRow({
      tableHeader: true,
      children: ['Tiempo', 'Interlocutor', 'Texto'].map((t, i) => headerCell(t, COLS_TRANSCRIPT[i])),
    }),
    ...call.turns.map(
      (t, i) =>
        new TableRow({
          children: [
            cell(formatTurnTime(call, i), { widthDxa: COLS_TRANSCRIPT[0] }),
            cell(SPEAKER_LABEL[t.speaker] ?? t.speaker, { widthDxa: COLS_TRANSCRIPT[1] }),
            cell(t.text, { widthDxa: COLS_TRANSCRIPT[2] }),
          ],
        }),
    ),
  ]
  body.push(fullWidthTable(transcriptRows, COLS_TRANSCRIPT))

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: SLATE },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: body,
      },
    ],
  })
}

/** Trigger a browser download of the Word (.docx) report for a finished call. */
export async function downloadCallReport(
  call: Transcript,
  result: EvalResult | null,
): Promise<void> {
  const doc = buildCallReportDocument(call, result)
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-llamada-${call.id}.docx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
