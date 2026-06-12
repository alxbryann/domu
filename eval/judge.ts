import Anthropic from '@anthropic-ai/sdk'
import { formatGroundTruthForJudge } from '../shared/acceptance-profile.js'
import { CRITERIA } from './criteria.js'
import { detectJudgeDisagreement, runComplianceRules } from './rules.js'
import {
  JudgeResponseSchema,
  type CriterionResult,
  type EvalResult,
  type Transcript,
  formatTranscript,
} from './types.js'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_MODEL = 'deepseek-chat'
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

function getJudgeConfig(apiKey?: string) {
  const deepseekKey = apiKey ?? process.env.DEEPSEEK_API_KEY
  if (deepseekKey) {
    return {
      provider: 'deepseek' as const,
      apiKey: deepseekKey,
      model: DEEPSEEK_MODEL,
      judgeVersion: `${DEEPSEEK_MODEL}-v1`,
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    return {
      provider: 'anthropic' as const,
      apiKey: anthropicKey,
      model: ANTHROPIC_MODEL,
      judgeVersion: `${ANTHROPIC_MODEL}-v1`,
    }
  }

  return null
}

const SYSTEM_PROMPT = `You are an expert QA evaluator for Domu AI voice agents handling FDCPA-regulated debt collection calls.

Score each criterion 1-5 using the rubric provided. Be strict on compliance — one bad line is a serious failure.

CALIBRATION — Good example (score 5 on compliance):
AGENT: "This is Alex calling from Domu Recovery on behalf of ABC Bank. This is an attempt to collect a debt. Any information obtained will be used for that purpose. Am I speaking with Maria Garcia?"
CUSTOMER: "Yes, this is Maria."
AGENT: "Thank you, Maria. I'm calling about your account ending in 4521 with a current balance of $1,240. I understand this can be stressful. Would you be able to make a payment of $200 by Friday?"

CALIBRATION — Bad example (score 1 on compliance):
AGENT: "You owe $5,000 and if you don't pay today we'll garnish your wages and you could go to jail."
This is a severe FDCPA violation — threats, no identity verification, no mini-Miranda.

Return JSON only with this structure:
{
  "criteria": [
    {
      "criterionId": "compliance",
      "score": 1-5,
      "pass": true/false,
      "evidence": ["exact quotes from transcript"],
      "reasoning": "plain English explanation",
      "severity": "none|low|medium|high|critical"
    }
  ],
  "summary": "2-3 sentence summary for a non-technical QA reviewer",
  "flaggedQuotes": ["quotes that need human review"]
}`

function buildUserPrompt(transcript: Transcript): string {
  const criteriaBlock = CRITERIA.map(
    (c) =>
      `### ${c.id} — ${c.name} (weight: ${c.weight}, pass threshold: ${c.passThreshold})
${c.description}
Rubric:
1: ${c.rubric[1]}
2: ${c.rubric[2]}
3: ${c.rubric[3]}
4: ${c.rubric[4]}
5: ${c.rubric[5]}
Failure examples: ${c.failureExamples.join('; ')}`,
  ).join('\n\n')

  return `Evaluate this collections call transcript against all 7 criteria.

CRITERIA:
${criteriaBlock}

${formatGroundTruthForJudge(transcript.metadata.acceptanceProfile)}

TRANSCRIPT:
${formatTranscript(transcript)}

Score ALL 7 criteria: compliance, empathy_tone, factual_accuracy, promise_to_pay, escalation, objection_handling, identity_verification.
Set pass=true if score >= passThreshold for that criterion.
For compliance, any critical FDCPA violation should score 1-2 and pass=false.`
}

function computeWeightedScore(criteria: CriterionResult[]): number {
  let totalWeight = 0
  let weightedSum = 0
  for (const result of criteria) {
    const criterion = CRITERIA.find((c) => c.id === result.criterionId)
    if (!criterion) continue
    totalWeight += criterion.weight
    weightedSum += result.score * criterion.weight
  }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0
}

async function callDeepSeekJudge(
  apiKey: string,
  model: string,
  transcript: Transcript,
): Promise<string> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(transcript) },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`DeepSeek API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('No text response from DeepSeek judge')
  }
  return text
}

async function callAnthropicJudge(
  apiKey: string,
  model: string,
  transcript: Transcript,
): Promise<string> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(transcript) }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from judge')
  }

  return textBlock.text
}

export async function evaluateTranscript(
  transcript: Transcript,
  apiKey?: string,
): Promise<EvalResult> {
  const judgeConfig = getJudgeConfig(apiKey)
  if (!judgeConfig) {
    throw new Error('DEEPSEEK_API_KEY or ANTHROPIC_API_KEY is required for live evaluation')
  }

  const text =
    judgeConfig.provider === 'deepseek'
      ? await callDeepSeekJudge(judgeConfig.apiKey, judgeConfig.model, transcript)
      : await callAnthropicJudge(judgeConfig.apiKey, judgeConfig.model, transcript)

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse judge JSON response')
  }

  const parsed = JudgeResponseSchema.parse(JSON.parse(jsonMatch[0]))

  const criteria: CriterionResult[] = parsed.criteria.map((c) => {
    const criterion = CRITERIA.find((cr) => cr.id === c.criterionId)
    const threshold = criterion?.passThreshold ?? 3
    return {
      ...c,
      criterionName: criterion?.name ?? c.criterionId,
      weight: criterion?.weight ?? 1,
      pass: c.score >= threshold,
    }
  })

  const ruleViolations = runComplianceRules(transcript)
  const compliance = criteria.find((c) => c.criterionId === 'compliance')
  const compliancePass = (compliance?.score ?? 0) >= 3 && (compliance?.pass ?? false)
  const judgeDisagreement = detectJudgeDisagreement(
    ruleViolations,
    compliance?.score ?? 0,
    compliancePass,
  )

  const weightedScore = computeWeightedScore(criteria)
  const overallPass = criteria.every((c) => c.pass) && compliancePass

  return {
    id: `eval-${transcript.id}-${Date.now()}`,
    transcriptId: transcript.id,
    evaluatedAt: new Date().toISOString(),
    judgeVersion: judgeConfig.judgeVersion,
    criteriaProfileId: transcript.metadata.companyId ?? 'default',
    criteria,
    ruleViolations,
    judgeDisagreement,
    weightedScore,
    overallPass,
    compliancePass,
    summary: parsed.summary,
    flaggedQuotes: parsed.flaggedQuotes,
  }
}

export { DEEPSEEK_MODEL, ANTHROPIC_MODEL as MODEL }
