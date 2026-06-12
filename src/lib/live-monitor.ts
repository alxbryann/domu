import type { CallAcceptanceProfile, FactCheckResult } from '../../shared/acceptance-profile'
import { checkGroundTruthFacts } from '../../shared/acceptance-profile'
import type { RuleViolation, TranscriptTurn } from '../types'

export type LiveAlertType = 'compliance' | 'latency' | 'quality' | 'system'
export type LiveAlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface LiveAlert {
  id: string
  type: LiveAlertType
  severity: LiveAlertSeverity
  message: string
  timestamp: string
}

export interface LiveRuleCheck {
  id: string
  label: string
  status: 'pass' | 'warning' | 'fail' | 'pending'
  detail?: string
}

export interface LiveCriterionSnapshot {
  criterionId: string
  name: string
  weight: number
  score: number
  pass: boolean
  status: 'ok' | 'warning' | 'fail' | 'pending'
  hint: string
}

export interface LiveMonitorSnapshot {
  weightedScore: number
  compliancePass: boolean
  factualPass: boolean
  criteria: LiveCriterionSnapshot[]
  ruleViolations: RuleViolation[]
  rules: LiveRuleCheck[]
  factChecks: FactCheckResult[]
  alerts: LiveAlert[]
  lastLatencyMs: number | null
  avgLatencyMs: number | null
}

export interface LiveMonitorMetrics {
  startedAt: string | null
  latencies: number[]
  lastCustomerAt: number | null
}

interface ComplianceRule {
  id: string
  pattern: RegExp
  description: string
  severity: RuleViolation['severity']
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'threat-arrest',
    pattern: /\b(go to jail|arrest you|criminal charges|police will)\b/i,
    description: 'Threat of arrest or criminal action',
    severity: 'critical',
  },
  {
    id: 'threat-garnish',
    pattern: /\b(garnish (your )?wages|seize (your )?property|take (your )?house)\b/i,
    description: 'Unauthorized threat of wage garnishment or property seizure',
    severity: 'critical',
  },
  {
    id: 'harassment',
    pattern: /\b(you have no excuse|you're irresponsible|deadbeat|pathetic)\b/i,
    description: 'Harassing or shaming language',
    severity: 'high',
  },
  {
    id: 'third-party',
    pattern: /\b(tell (him|her|them) to pay|your (wife|husband|spouse|employer) owes)\b/i,
    description: 'Discussing debt with or through third party',
    severity: 'high',
  },
  {
    id: 'misrepresentation',
    pattern: /\b(legal action (has been|will be) filed|lawsuit (is|has been) filed)\b/i,
    description: 'Potentially false legal action claim',
    severity: 'medium',
  },
]

const CRITERIA_META = [
  { id: 'compliance', name: 'FDCPA Compliance', weight: 1.5, passThreshold: 3 },
  { id: 'empathy_tone', name: 'Empathy & Tone', weight: 1.0, passThreshold: 3 },
  { id: 'factual_accuracy', name: 'Factual Accuracy', weight: 1.2, passThreshold: 3 },
  { id: 'promise_to_pay', name: 'Outcome / Promise-to-Pay', weight: 1.0, passThreshold: 3 },
  { id: 'escalation', name: 'Escalation Handling', weight: 1.0, passThreshold: 3 },
  { id: 'objection_handling', name: 'Objection Handling', weight: 1.0, passThreshold: 3 },
  { id: 'identity_verification', name: 'Identity Verification', weight: 1.0, passThreshold: 3 },
] as const

const HARSH_PHRASES =
  /\b(you have no excuse|not our problem|should have planned|your fault|irresponsible)\b/i
const EMPATHY_PHRASES =
  /\b(understand|i hear you|unexpected|work together|appreciate|sorry to hear)\b/i
const MINI_MIRANDA =
  /\b(debt collector|attempt to collect a debt|information obtained will be used)\b/i
const IDENTITY_CHECK =
  /\b(verify|confirm your (name|identity|zip|date of birth)|may i speak with|am i speaking with)\b/i
const DEBT_DISCLOSURE =
  /\b(\$[\d,]+|balance|outstanding|past.?due|amount owed|credit account)\b/i
const PTP_SIGNAL =
  /\b(promise to pay|payment (on|by)|pay (on|by)|schedule|commitment|agreed to pay)\b/i
const ESCALATION_SIGNAL =
  /\b(attorney|lawyer|bankruptcy|cease.?and.?desist|supervisor|stop calling)\b/i
const OBJECTION_SIGNAL =
  /\b(already paid|wrong (person|number)|can't afford|dispute|not my debt)\b/i

function agentText(turns: TranscriptTurn[]): string {
  return turns
    .filter((t) => t.speaker === 'agent')
    .map((t) => t.text)
    .join(' ')
}

function fullText(turns: TranscriptTurn[]): string {
  return turns.map((t) => t.text).join(' ')
}

function runComplianceRules(turns: TranscriptTurn[]): RuleViolation[] {
  const text = fullText(turns)
  const violations: RuleViolation[] = []
  for (const rule of COMPLIANCE_RULES) {
    const match = text.match(rule.pattern)
    if (match) {
      violations.push({
        ruleId: rule.id,
        description: rule.description,
        matchedText: match[0],
        severity: rule.severity,
      })
    }
  }
  return violations
}

function scoreStatus(score: number, pass: boolean): LiveCriterionSnapshot['status'] {
  if (score <= 0) return 'pending'
  if (!pass) return 'fail'
  if (score < 4) return 'warning'
  return 'ok'
}

function computeWeightedScore(criteria: LiveCriterionSnapshot[]): number {
  const scored = criteria.filter((c) => c.score > 0)
  if (scored.length === 0) return 0
  const totalWeight = scored.reduce((s, c) => s + c.weight, 0)
  const weighted = scored.reduce((s, c) => s + c.score * c.weight, 0)
  return Math.round((weighted / totalWeight) * 10) / 10
}

function isRuleEnabled(profile: CallAcceptanceProfile | undefined, ruleId: string): boolean {
  if (!profile) return true
  return profile.rules.find((r) => r.id === ruleId)?.enabled ?? false
}

function buildRules(
  turns: TranscriptTurn[],
  violations: RuleViolation[],
  factChecks: FactCheckResult[],
  profile?: CallAcceptanceProfile,
): LiveRuleCheck[] {
  const agent = agentText(turns)
  const all = fullText(turns)
  const hasMiniMiranda = MINI_MIRANDA.test(agent)
  const askedIdentity = IDENTITY_CHECK.test(agent)
  const disclosedDebt = DEBT_DISCLOSURE.test(agent)
  const identityOk = !disclosedDebt || askedIdentity

  const allRules: LiveRuleCheck[] = [
    {
      id: 'mini-miranda',
      label: 'Mini-Miranda disclosed',
      status: turns.length < 2 ? 'pending' : hasMiniMiranda ? 'pass' : 'fail',
      detail: hasMiniMiranda ? 'Detected in agent speech' : 'Not yet stated',
    },
    {
      id: 'identity',
      label: 'Identity verified before debt details',
      status: turns.length < 2 ? 'pending' : identityOk ? 'pass' : 'fail',
      detail: identityOk ? 'No premature disclosure' : 'Balance mentioned before verification',
    },
    {
      id: 'no-threats',
      label: 'No threats or arrest claims',
      status: violations.some((v) => v.ruleId.startsWith('threat'))
        ? 'fail'
        : turns.length < 1
          ? 'pending'
          : 'pass',
    },
    {
      id: 'no-harassment',
      label: 'No harassing language',
      status: violations.some((v) => v.ruleId === 'harassment')
        ? 'fail'
        : turns.length < 1
          ? 'pending'
          : 'pass',
    },
    {
      id: 'correct-balance',
      label: 'Correct balance stated',
      status: factChecks.find((f) => f.factId === 'balanceDue')?.status ?? 'pending',
      detail: factChecks.find((f) => f.factId === 'balanceDue')?.detail,
    },
    {
      id: 'correct-name',
      label: 'Correct customer name',
      status: factChecks.find((f) => f.factId === 'customerName')?.status ?? 'pending',
      detail: factChecks.find((f) => f.factId === 'customerName')?.detail,
    },
    {
      id: 'correct-creditor',
      label: 'Correct creditor named',
      status: factChecks.find((f) => f.factId === 'creditorName')?.status ?? 'pending',
      detail: factChecks.find((f) => f.factId === 'creditorName')?.detail,
    },
    {
      id: 'correct-due-date',
      label: 'Correct due date',
      status: factChecks.find((f) => f.factId === 'dueDate')?.status ?? 'pending',
      detail: factChecks.find((f) => f.factId === 'dueDate')?.detail,
    },
    {
      id: 'escalation',
      label: 'Escalation triggers handled',
      status: !ESCALATION_SIGNAL.test(all)
        ? 'pending'
        : /\b(transfer|supervisor|document|noted|attorney)\b/i.test(agent)
          ? 'pass'
          : 'warning',
    },
  ]

  if (!profile) return allRules
  return allRules.filter((rule) => isRuleEnabled(profile, rule.id))
}

function buildAlerts(
  turns: TranscriptTurn[],
  violations: RuleViolation[],
  factChecks: FactCheckResult[],
  metrics: LiveMonitorMetrics,
  elapsedSec: number,
): LiveAlert[] {
  const alerts: LiveAlert[] = []
  const now = new Date().toISOString()

  for (const v of violations) {
    alerts.push({
      id: `rule-${v.ruleId}`,
      type: 'compliance',
      severity: v.severity === 'critical' ? 'critical' : v.severity === 'high' ? 'high' : 'medium',
      message: `${v.description} — "${v.matchedText}"`,
      timestamp: now,
    })
  }

  const lastLatency = metrics.latencies.at(-1) ?? null
  if (lastLatency != null && lastLatency > 5000) {
    alerts.push({
      id: `latency-${lastLatency}`,
      type: 'latency',
      severity: 'high',
      message: `Agent response latency ${(lastLatency / 1000).toFixed(1)}s — customer may perceive delay`,
      timestamp: now,
    })
  } else if (lastLatency != null && lastLatency > 3000) {
    alerts.push({
      id: `latency-warn-${lastLatency}`,
      type: 'latency',
      severity: 'medium',
      message: `Elevated response time ${(lastLatency / 1000).toFixed(1)}s`,
      timestamp: now,
    })
  }

  const agent = agentText(turns)
  if (elapsedSec > 90 && turns.length >= 4 && !MINI_MIRANDA.test(agent)) {
    alerts.push({
      id: 'missing-miranda',
      type: 'compliance',
      severity: 'critical',
      message: 'Mini-Miranda not detected — FDCPA disclosure required',
      timestamp: now,
    })
  }

  if (DEBT_DISCLOSURE.test(agent) && !IDENTITY_CHECK.test(agent)) {
    alerts.push({
      id: 'identity-risk',
      type: 'compliance',
      severity: 'high',
      message: 'Account details discussed before identity verification',
      timestamp: now,
    })
  }

  if (HARSH_PHRASES.test(agent)) {
    alerts.push({
      id: 'tone-risk',
      type: 'quality',
      severity: 'medium',
      message: 'Agent tone may sound dismissive or harsh',
      timestamp: now,
    })
  }

  if (ESCALATION_SIGNAL.test(fullText(turns)) && !/\b(transfer|supervisor|document)\b/i.test(agent)) {
    alerts.push({
      id: 'escalation-missed',
      type: 'quality',
      severity: 'high',
      message: 'Customer signaled escalation — agent should route or document',
      timestamp: now,
    })
  }

  for (const check of factChecks) {
    if (check.status !== 'fail') continue
    alerts.push({
      id: `fact-${check.factId}`,
      type: 'quality',
      severity: 'high',
      message: `${check.label}: ${check.detail}`,
      timestamp: now,
    })
  }

  return alerts
}

function estimateCriteria(
  turns: TranscriptTurn[],
  violations: RuleViolation[],
  factChecks: FactCheckResult[],
): LiveCriterionSnapshot[] {
  const agent = agentText(turns)
  const all = fullText(turns)
  const hasTurns = turns.length > 0

  const critical = violations.some((v) => v.severity === 'critical' || v.severity === 'high')
  const complianceScore = !hasTurns ? 0 : critical ? 1 : violations.length > 0 ? 2 : MINI_MIRANDA.test(agent) ? 5 : 3
  const empathyScore = !hasTurns
    ? 0
    : HARSH_PHRASES.test(agent)
      ? 2
      : EMPATHY_PHRASES.test(agent)
        ? 5
        : 3
  const identityScore = !hasTurns
    ? 0
    : DEBT_DISCLOSURE.test(agent) && !IDENTITY_CHECK.test(agent)
      ? 1
      : IDENTITY_CHECK.test(agent)
        ? 5
        : 3
  const ptpScore = !hasTurns ? 0 : PTP_SIGNAL.test(all) ? 5 : turns.length > 6 ? 2 : 3
  const escalationScore = !hasTurns
    ? 0
    : !ESCALATION_SIGNAL.test(all)
      ? 3
      : /\b(transfer|supervisor|document|attorney)\b/i.test(agent)
        ? 5
        : 2
  const objectionScore = !hasTurns
    ? 0
    : !OBJECTION_SIGNAL.test(all)
      ? 3
      : EMPATHY_PHRASES.test(agent)
        ? 4
        : 2
  const factualFails = factChecks.filter((f) => f.status === 'fail').length
  const factualScore = !hasTurns
    ? 0
    : factualFails > 0
      ? 1
      : violations.some((v) => v.ruleId === 'misrepresentation')
        ? 2
        : factChecks.some((f) => f.status === 'pass')
          ? 5
          : 4

  const scores: Record<string, { score: number; hint: string }> = {
    compliance: {
      score: complianceScore,
      hint: critical ? 'Compliance risk detected' : MINI_MIRANDA.test(agent) ? 'Disclosures on track' : 'Monitoring disclosures',
    },
    empathy_tone: {
      score: empathyScore,
      hint: HARSH_PHRASES.test(agent) ? 'Tone needs softening' : 'Tone acceptable so far',
    },
    factual_accuracy: {
      score: factualScore,
      hint:
        factualFails > 0
          ? `${factualFails} ground-truth mismatch(es)`
          : factChecks.length > 0
            ? 'Ground-truth checks on track'
            : 'Watching for unverified claims',
    },
    promise_to_pay: {
      score: ptpScore,
      hint: PTP_SIGNAL.test(all) ? 'Forward progress captured' : 'No commitment yet',
    },
    escalation: {
      score: escalationScore,
      hint: ESCALATION_SIGNAL.test(all) ? 'Escalation signal active' : 'No escalation triggers',
    },
    objection_handling: {
      score: objectionScore,
      hint: OBJECTION_SIGNAL.test(all) ? 'Objection in play' : 'No objections yet',
    },
    identity_verification: {
      score: identityScore,
      hint: identityScore >= 4 ? 'Verification flow OK' : 'Check identity before details',
    },
  }

  return CRITERIA_META.map((meta) => {
    const { score, hint } = scores[meta.id]
    const pass = score > 0 && score >= meta.passThreshold
    return {
      criterionId: meta.id,
      name: meta.name,
      weight: meta.weight,
      score,
      pass,
      status: scoreStatus(score, pass),
      hint,
    }
  })
}

export function recordTurnLatency(
  metrics: LiveMonitorMetrics,
  speaker: 'agent' | 'customer',
  at = Date.now(),
): LiveMonitorMetrics {
  if (speaker === 'customer') {
    return { ...metrics, lastCustomerAt: at }
  }
  if (speaker === 'agent' && metrics.lastCustomerAt != null) {
    const latency = at - metrics.lastCustomerAt
    return {
      ...metrics,
      lastCustomerAt: null,
      latencies: [...metrics.latencies, latency],
    }
  }
  return metrics
}

export function createLiveMonitorMetrics(startedAt: string | null): LiveMonitorMetrics {
  return { startedAt, latencies: [], lastCustomerAt: null }
}

export function computeLiveMonitor(
  turns: TranscriptTurn[],
  metrics: LiveMonitorMetrics,
  profile?: CallAcceptanceProfile,
): LiveMonitorSnapshot {
  const agent = agentText(turns)
  const hasAgentSpeech = turns.some((t) => t.speaker === 'agent')
  const factChecks = checkGroundTruthFacts(agent, profile, hasAgentSpeech)
  const violations = runComplianceRules(turns)
  const criteria = estimateCriteria(turns, violations, factChecks)
  const weightedScore = computeWeightedScore(criteria)
  const compliance = criteria.find((c) => c.criterionId === 'compliance')
  const factualPass = factChecks.every((f) => f.status !== 'fail')
  const elapsedSec = metrics.startedAt
    ? Math.floor((Date.now() - new Date(metrics.startedAt).getTime()) / 1000)
    : 0
  const latencies = metrics.latencies
  const avgLatencyMs =
    latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null

  return {
    weightedScore,
    compliancePass: compliance ? compliance.pass : true,
    factualPass,
    criteria,
    ruleViolations: violations,
    rules: buildRules(turns, violations, factChecks, profile),
    factChecks,
    alerts: buildAlerts(turns, violations, factChecks, metrics, elapsedSec),
    lastLatencyMs: latencies.at(-1) ?? null,
    avgLatencyMs,
  }
}
