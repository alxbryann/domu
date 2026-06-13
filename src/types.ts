import type { CallAcceptanceProfile } from '../shared/acceptance-profile'

export interface TranscriptTurn {
  speaker: 'agent' | 'customer' | 'system'
  text: string
  timestamp?: string
}

export type CallStatus = 'live' | 'evaluating' | 'completed'

export interface Transcript {
  id: string
  source: 'domu' | 'vapi'
  status: CallStatus
  metadata: {
    companyId?: string
    agentVersion?: string
    callDate?: string
    endedAt?: string
    accountId?: string
    description?: string
    callType?: string
    recordingUrl?: string
    recordingStoragePath?: string
    expectedLabel?: 'good' | 'bad' | 'edge'
    acceptanceProfile?: CallAcceptanceProfile
    sentEscalationAlerts?: string[]
  }
  turns: TranscriptTurn[]
}

export interface CriterionResult {
  criterionId: string
  criterionName?: string
  weight?: number
  score: number
  pass: boolean
  evidence: string[]
  reasoning: string
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

export interface RuleViolation {
  ruleId: string
  description: string
  matchedText: string
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

export interface EvalResult {
  id: string
  transcriptId: string
  evaluatedAt: string
  judgeVersion: string
  criteriaProfileId?: string
  criteria: CriterionResult[]
  ruleViolations: RuleViolation[]
  judgeDisagreement: boolean
  weightedScore: number
  overallPass: boolean
  compliancePass: boolean
  summary: string
  flaggedQuotes: string[]
}

export interface CallWithResult extends Transcript {
  result: EvalResult | null
}

export interface OverviewTrends {
  callVolume: number[]
  qualityScores: number[]
  complianceFailures: number[]
  passRates: number[]
}

export interface OverviewData {
  liveCalls: number
  evaluatingCalls: number
  totalEvals: number
  avgScore: number
  complianceFailures: number
  passRate: number
  judgeDisagreements: number
  recent: EvalResult[]
  trends: OverviewTrends
}
