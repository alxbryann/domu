import { z } from 'zod'

export const GroundTruthFactSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  kind: z.enum(['text', 'amount', 'date', 'name']),
})

export const AcceptanceRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  category: z.enum(['compliance', 'factual', 'procedure']),
})

export const CallAcceptanceProfileSchema = z.object({
  facts: z.array(GroundTruthFactSchema),
  rules: z.array(AcceptanceRuleSchema),
  notes: z.string().optional(),
})

export type GroundTruthFact = z.infer<typeof GroundTruthFactSchema>
export type AcceptanceRule = z.infer<typeof AcceptanceRuleSchema>
export type CallAcceptanceProfile = z.infer<typeof CallAcceptanceProfileSchema>

export function isCustomAcceptanceRule(id: string): boolean {
  return id.startsWith('custom-')
}

export function createCustomAcceptanceRule(
  label: string,
  description: string,
  category: AcceptanceRule['category'] = 'procedure',
): AcceptanceRule {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  return {
    id: `custom-${suffix}`,
    label: label.trim(),
    description: description.trim(),
    enabled: true,
    category,
  }
}

export interface FactCheckResult {
  factId: string
  label: string
  status: 'pass' | 'fail' | 'warning' | 'pending'
  detail: string
  matchedText?: string
}

export interface AcceptanceCheckSnapshot {
  factChecks: FactCheckResult[]
  enabledRules: AcceptanceRule[]
  factualPass: boolean
}

export const DEFAULT_ACCEPTANCE_PROFILE: CallAcceptanceProfile = {
  facts: [
    { id: 'customerName', label: 'Customer name', value: 'Maria Garcia', enabled: true, kind: 'name' },
    { id: 'accountLast4', label: 'Account last 4', value: '4521', enabled: true, kind: 'text' },
    { id: 'creditorName', label: 'Creditor', value: 'ABC Bank', enabled: true, kind: 'text' },
    { id: 'balanceDue', label: 'Balance owed ($)', value: '1240', enabled: true, kind: 'amount' },
    { id: 'minimumPayment', label: 'Minimum payment ($)', value: '200', enabled: true, kind: 'amount' },
    { id: 'dueDate', label: 'Due date', value: '2026-06-20', enabled: true, kind: 'date' },
    { id: 'lastPaymentDate', label: 'Last payment date', value: '2026-03-15', enabled: true, kind: 'date' },
    { id: 'lastPaymentAmount', label: 'Last payment ($)', value: '150', enabled: true, kind: 'amount' },
  ],
  rules: [
    {
      id: 'mini-miranda',
      label: 'Mini-Miranda disclosed',
      description: 'Agent states debt collection purpose and mini-Miranda disclosure',
      enabled: true,
      category: 'compliance',
    },
    {
      id: 'identity',
      label: 'Identity verified before debt details',
      description: 'No balance or account info before confirming right-party contact',
      enabled: true,
      category: 'compliance',
    },
    {
      id: 'no-threats',
      label: 'No threats or arrest claims',
      description: 'Agent must not threaten jail, arrest, or illegal garnishment',
      enabled: true,
      category: 'compliance',
    },
    {
      id: 'no-harassment',
      label: 'No harassing language',
      description: 'Agent avoids shaming or abusive language',
      enabled: true,
      category: 'compliance',
    },
    {
      id: 'correct-balance',
      label: 'Correct balance stated',
      description: 'Any balance mentioned must match the ground-truth amount',
      enabled: true,
      category: 'factual',
    },
    {
      id: 'correct-name',
      label: 'Correct customer name',
      description: 'Agent uses the verified customer name, not a wrong name',
      enabled: true,
      category: 'factual',
    },
    {
      id: 'correct-creditor',
      label: 'Correct creditor named',
      description: 'Creditor / original lender name matches ground truth',
      enabled: true,
      category: 'factual',
    },
    {
      id: 'correct-due-date',
      label: 'Correct due date',
      description: 'Payment due date matches ground truth when mentioned',
      enabled: true,
      category: 'factual',
    },
  ],
  notes: '',
}

const STORAGE_KEY = 'domu-acceptance-profile'

export function loadStoredProfile(): CallAcceptanceProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ACCEPTANCE_PROFILE
    return CallAcceptanceProfileSchema.parse(JSON.parse(raw))
  } catch {
    return DEFAULT_ACCEPTANCE_PROFILE
  }
}

export function saveStoredProfile(profile: CallAcceptanceProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function parseAcceptanceProfile(raw: unknown): CallAcceptanceProfile | undefined {
  if (!raw) return undefined
  const parsed = CallAcceptanceProfileSchema.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}

function normalizeAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const num = Number.parseFloat(cleaned)
  return Number.isFinite(num) ? num : null
}

function extractAmounts(text: string): number[] {
  const matches = text.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\$?\d+(?:\.\d{2})?/g) ?? []
  return matches
    .map((m) => normalizeAmount(m))
    .filter((n): n is number => n !== null)
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z\s]/g, '').trim()
}

function nameTokens(value: string): string[] {
  return normalizeName(value).split(/\s+/).filter(Boolean)
}

function textContainsName(text: string, name: string): boolean {
  const normalized = normalizeName(text)
  const tokens = nameTokens(name)
  if (tokens.length === 0) return false
  return tokens.every((t) => normalized.includes(t))
}

function extractDates(text: string): string[] {
  const found: string[] = []
  const patterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
    /\b(\d{4}-\d{2}-\d{2})\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?\b/gi,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:,?\s+\d{4})?\b/gi,
  ]
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) found.push(...matches)
  }
  return found
}

function datesRoughlyMatch(mentioned: string, expected: string): boolean {
  const m = mentioned.toLowerCase()
  const e = expected.toLowerCase()
  if (m.includes(e) || e.includes(m)) return true

  const expectedParts = expected.split('-')
  if (expectedParts.length === 3) {
    const [, month, day] = expectedParts
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ]
    const monthIdx = Number.parseInt(month, 10) - 1
    const monthName = monthNames[monthIdx]
    const dayNum = Number.parseInt(day, 10)
    if (monthName && m.includes(monthName) && m.includes(String(dayNum))) return true
  }
  return false
}


function checkAmountFact(
  fact: GroundTruthFact,
  agentText: string,
  hasAgentSpeech: boolean,
): FactCheckResult {
  const expected = normalizeAmount(fact.value)
  if (expected === null || !fact.value.trim()) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'No expected value set' }
  }

  const mentioned = extractAmounts(agentText)
  if (!hasAgentSpeech) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'Waiting for agent speech' }
  }

  if (mentioned.length === 0) {
    return {
      factId: fact.id,
      label: fact.label,
      status: 'warning',
      detail: `Expected $${expected.toLocaleString()} — not mentioned yet`,
    }
  }

  const match = mentioned.find((a) => amountsMatch(a, expected))
  if (match != null) {
    return {
      factId: fact.id,
      label: fact.label,
      status: 'pass',
      detail: `Matched $${match.toLocaleString()}`,
      matchedText: `$${match.toLocaleString()}`,
    }
  }

  const wrong = mentioned.find((a) => !amountsMatch(a, expected))
  return {
    factId: fact.id,
    label: fact.label,
    status: 'fail',
    detail: `Expected $${expected.toLocaleString()} — agent said $${wrong?.toLocaleString() ?? 'different amount'}`,
    matchedText: wrong != null ? `$${wrong.toLocaleString()}` : undefined,
  }
}

function checkNameFact(
  fact: GroundTruthFact,
  agentText: string,
  hasAgentSpeech: boolean,
): FactCheckResult {
  if (!fact.value.trim()) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'No expected name set' }
  }
  if (!hasAgentSpeech) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'Waiting for agent speech' }
  }

  if (textContainsName(agentText, fact.value)) {
    return {
      factId: fact.id,
      label: fact.label,
      status: 'pass',
      detail: `Correct name "${fact.value}" used`,
    }
  }

  const greetingMatch = agentText.match(
    /\b(?:speaking with|talking to|this is|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  )
  if (greetingMatch && !textContainsName(greetingMatch[1], fact.value)) {
    return {
      factId: fact.id,
      label: fact.label,
      status: 'fail',
      detail: `Wrong name "${greetingMatch[1]}" — expected "${fact.value}"`,
      matchedText: greetingMatch[1],
    }
  }

  return {
    factId: fact.id,
    label: fact.label,
    status: 'warning',
    detail: `Expected "${fact.value}" — not confirmed yet`,
  }
}

function checkTextFact(
  fact: GroundTruthFact,
  agentText: string,
  hasAgentSpeech: boolean,
): FactCheckResult {
  if (!fact.value.trim()) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'No expected value set' }
  }
  if (!hasAgentSpeech) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'Waiting for agent speech' }
  }

  const haystack = agentText.toLowerCase()
  const needle = fact.value.toLowerCase()
  if (haystack.includes(needle)) {
    return { factId: fact.id, label: fact.label, status: 'pass', detail: `Matched "${fact.value}"` }
  }

  return {
    factId: fact.id,
    label: fact.label,
    status: 'warning',
    detail: `Expected "${fact.value}" — not mentioned yet`,
  }
}

function checkDateFact(
  fact: GroundTruthFact,
  agentText: string,
  hasAgentSpeech: boolean,
): FactCheckResult {
  if (!fact.value.trim()) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'No expected date set' }
  }
  if (!hasAgentSpeech) {
    return { factId: fact.id, label: fact.label, status: 'pending', detail: 'Waiting for agent speech' }
  }

  const dates = extractDates(agentText)
  if (dates.length === 0) {
    return {
      factId: fact.id,
      label: fact.label,
      status: 'warning',
      detail: `Expected ${fact.value} — date not mentioned yet`,
    }
  }

  const match = dates.find((d) => datesRoughlyMatch(d, fact.value))
  if (match) {
    return { factId: fact.id, label: fact.label, status: 'pass', detail: `Matched ${match}` }
  }

  return {
    factId: fact.id,
    label: fact.label,
    status: 'fail',
    detail: `Expected ${fact.value} — agent said ${dates[0]}`,
    matchedText: dates[0],
  }
}

export function checkGroundTruthFacts(
  agentText: string,
  profile: CallAcceptanceProfile | undefined,
  hasAgentSpeech: boolean,
): FactCheckResult[] {
  if (!profile) return []

  return profile.facts
    .filter((f) => f.enabled && f.value.trim())
    .map((fact) => {
      switch (fact.kind) {
        case 'amount':
          return checkAmountFact(fact, agentText, hasAgentSpeech)
        case 'name':
          return checkNameFact(fact, agentText, hasAgentSpeech)
        case 'date':
          return checkDateFact(fact, agentText, hasAgentSpeech)
        default:
          return checkTextFact(fact, agentText, hasAgentSpeech)
      }
    })
}

function formatAmountForAgent(value: string): string {
  const num = normalizeAmount(value)
  if (num === null) return value.trim()
  const hasCents = !Number.isInteger(num) && (num * 100) % 100 !== 0
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDateForAgent(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return trimmed
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatFactValueForAgent(fact: GroundTruthFact): string {
  switch (fact.kind) {
    case 'amount':
      return formatAmountForAgent(fact.value)
    case 'date':
      return formatDateForAgent(fact.value)
    default:
      return fact.value.trim()
  }
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)
}

/** Ground-truth block injected into the Vapi assistant at call start. */
export function formatGroundTruthForAgent(profile: CallAcceptanceProfile): string {
  const facts = profile.facts
    .filter((f) => f.enabled && f.value.trim())
    .map((f) => `- ${f.label}: ${formatFactValueForAgent(f)}`)
    .join('\n')

  const rules = profile.rules
    .filter((r) => r.enabled)
    .map((r) => `- ${r.label}: ${r.description}`)
    .join('\n')

  let text = `ACCOUNT DATA FOR THIS CALL (verified — use exactly, do not invent or contradict):
${facts || '(none configured)'}`

  if (rules) {
    text += `\n\nBEHAVIORAL REQUIREMENTS:\n${rules}`
  }

  if (profile.notes?.trim()) {
    text += `\n\nADDITIONAL CONTEXT: ${profile.notes.trim()}`
  }

  return text
}

/** Variable overrides for Vapi Liquid templates ({{customerName}}, {{groundTruth}}, etc.). */
export function buildVapiVariableValues(profile: CallAcceptanceProfile): Record<string, string> {
  const values: Record<string, string> = {}
  const groundTruth = formatGroundTruthForAgent(profile)
  values.groundTruth = groundTruth
  values.accountContext = groundTruth

  for (const fact of profile.facts) {
    if (!fact.enabled || !fact.value.trim()) continue
    const formatted = formatFactValueForAgent(fact)
    values[fact.id] = formatted
    values[camelToSnake(fact.id)] = formatted
  }

  return values
}

export function formatGroundTruthForJudge(profile: CallAcceptanceProfile | undefined): string {
  if (!profile) return 'No ground-truth account data provided.'

  const facts = profile.facts
    .filter((f) => f.enabled && f.value.trim())
    .map((f) => `- ${f.label}: ${f.value}`)
    .join('\n')

  const rules = profile.rules
    .filter((r) => r.enabled)
    .map((r) => `- ${r.label}: ${r.description}`)
    .join('\n')

  return `GROUND TRUTH (verified account data — agent must NOT invent or contradict these):
${facts || '(none configured)'}

ENABLED ACCEPTANCE RULES:
${rules || '(none configured)'}

${profile.notes ? `QA NOTES: ${profile.notes}` : ''}

Score factual_accuracy strictly: any wrong balance, name, creditor, or date is a significant failure.
If the agent states a dollar amount or date that contradicts ground truth, score factual_accuracy ≤ 2.`
}

export function computeAcceptanceSnapshot(
  agentText: string,
  profile: CallAcceptanceProfile | undefined,
  hasAgentSpeech: boolean,
): AcceptanceCheckSnapshot {
  const factChecks = checkGroundTruthFacts(agentText, profile, hasAgentSpeech)
  const enabledRules = profile?.rules.filter((r) => r.enabled) ?? []
  const factualPass = factChecks.every((c) => c.status !== 'fail')

  return { factChecks, enabledRules, factualPass }
}
