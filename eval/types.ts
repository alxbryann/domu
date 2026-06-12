import { z } from 'zod'
import { CallAcceptanceProfileSchema } from '../shared/acceptance-profile.js'

export const SeveritySchema = z.enum(['none', 'low', 'medium', 'high', 'critical'])
export type Severity = z.infer<typeof SeveritySchema>

export const CriterionResultSchema = z.object({
  criterionId: z.string(),
  criterionName: z.string().optional(),
  weight: z.number().optional(),
  score: z.number().min(1).max(5),
  pass: z.boolean(),
  evidence: z.array(z.string()),
  reasoning: z.string(),
  severity: SeveritySchema,
})

export type CriterionResult = z.infer<typeof CriterionResultSchema>

export const RuleViolationSchema = z.object({
  ruleId: z.string(),
  description: z.string(),
  matchedText: z.string(),
  severity: SeveritySchema,
})

export type RuleViolation = z.infer<typeof RuleViolationSchema>

export const TranscriptTurnSchema = z.object({
  speaker: z.enum(['agent', 'customer', 'system']),
  text: z.string(),
  timestamp: z.string().optional(),
})

export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>

export const TranscriptSchema = z.object({
  id: z.string(),
  source: z.enum(['domu', 'vapi']),
  status: z.enum(['live', 'evaluating', 'completed']).default('completed'),
  metadata: z.object({
    companyId: z.string().optional(),
    agentVersion: z.string().optional(),
    callDate: z.string().optional(),
    endedAt: z.string().optional(),
    accountId: z.string().optional(),
    description: z.string().optional(),
    callType: z.string().optional(),
    recordingUrl: z.string().optional(),
    expectedLabel: z.enum(['good', 'bad', 'edge']).optional(),
    acceptanceProfile: CallAcceptanceProfileSchema.optional(),
  }),
  turns: z.array(TranscriptTurnSchema),
})

export type Transcript = z.infer<typeof TranscriptSchema>

export const EvalResultSchema = z.object({
  id: z.string(),
  transcriptId: z.string(),
  evaluatedAt: z.string(),
  judgeVersion: z.string(),
  criteriaProfileId: z.string().optional(),
  criteria: z.array(CriterionResultSchema),
  ruleViolations: z.array(RuleViolationSchema),
  judgeDisagreement: z.boolean(),
  weightedScore: z.number(),
  overallPass: z.boolean(),
  compliancePass: z.boolean(),
  summary: z.string(),
  flaggedQuotes: z.array(z.string()),
})

export type EvalResult = z.infer<typeof EvalResultSchema>

export const EvalResponseSchema = z.object({
  criterionId: z.string(),
  score: z.number().min(1).max(5),
  pass: z.boolean(),
  evidence: z.array(z.string()),
  reasoning: z.string(),
  severity: SeveritySchema,
})

export const JudgeResponseSchema = z.object({
  criteria: z.array(EvalResponseSchema),
  summary: z.string(),
  flaggedQuotes: z.array(z.string()),
})

export type JudgeResponse = z.infer<typeof JudgeResponseSchema>

export function formatTranscript(transcript: Transcript): string {
  return transcript.turns
    .map((turn) => `${turn.speaker.toUpperCase()}: ${turn.text}`)
    .join('\n')
}
