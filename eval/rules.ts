import type { RuleViolation, Transcript } from './types.js'
import { formatTranscript } from './types.js'

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

export function runComplianceRules(transcript: Transcript): RuleViolation[] {
  const text = formatTranscript(transcript)
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

export function detectJudgeDisagreement(
  ruleViolations: RuleViolation[],
  complianceScore: number,
  compliancePass: boolean,
): boolean {
  const hasCritical = ruleViolations.some((v) => v.severity === 'critical' || v.severity === 'high')
  if (hasCritical && compliancePass) return true
  if (ruleViolations.length > 0 && complianceScore >= 4) return true
  return false
}
