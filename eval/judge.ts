import Anthropic from '@anthropic-ai/sdk'
import { formatGroundTruthForJudge } from '../shared/acceptance-profile.js'
import { CRITERIA } from './criteria.js'
import { detectJudgeDisagreement, runComplianceRules } from './rules.js'
import {
  JudgeResponseSchema,
  type CriterionResult,
  type CrossJudgeReport,
  type EvalResult,
  type Transcript,
  formatTranscript,
} from './types.js'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_MODEL = 'deepseek-chat'
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

// A divergence of >= 2 points on any single criterion between the two judges
// is treated as a material disagreement worth a human's attention.
const SCORE_DELTA_THRESHOLD = 2

type JudgeProvider = 'deepseek' | 'anthropic'

interface JudgeConfig {
  provider: JudgeProvider
  apiKey: string
  model: string
  judgeVersion: string
}

export function providerLabel(provider: JudgeProvider): string {
  return provider === 'deepseek' ? 'DeepSeek' : 'Claude'
}

/** Phase emitted while an eval is running so callers can surface live progress. */
export type EvalProgress =
  | { phase: 'primary'; status: 'start' | 'done'; provider: JudgeProvider }
  | { phase: 'secondary'; status: 'start' | 'done'; provider: JudgeProvider }
  | { phase: 'rules'; status: 'start' | 'done' }

/**
 * Describes the judge phases an eval will run given the configured keys, without
 * exposing secrets. Lets the UI render the timeline before work begins.
 */
export function getJudgePhases(
  apiKey?: string,
): { phase: 'primary' | 'secondary'; provider: JudgeProvider }[] {
  return resolveJudges(apiKey).map((judge, i) => ({
    phase: i === 0 ? ('primary' as const) : ('secondary' as const),
    provider: judge.provider,
  }))
}

/**
 * Resolves the ordered list of judges. DeepSeek runs first (primary, canonical
 * scores); Anthropic runs second as an independent cross-check when its key is
 * set. When only one key is present we fall back to a single-judge run.
 */
function resolveJudges(apiKey?: string): JudgeConfig[] {
  const judges: JudgeConfig[] = []

  const deepseekKey = apiKey ?? process.env.DEEPSEEK_API_KEY
  if (deepseekKey) {
    judges.push({
      provider: 'deepseek',
      apiKey: deepseekKey,
      model: DEEPSEEK_MODEL,
      judgeVersion: `${DEEPSEEK_MODEL}-v1`,
    })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    judges.push({
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: ANTHROPIC_MODEL,
      judgeVersion: `${ANTHROPIC_MODEL}-v1`,
    })
  }

  return judges
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

// Tool schema mirroring JudgeResponseSchema. Forcing the Anthropic judge to
// emit its verdict through a tool call guarantees the SDK hands back a parsed
// object — there is no free-text JSON to mis-escape and crash JSON.parse.
const JUDGE_TOOL = {
  name: 'submit_evaluation',
  description: 'Submit the structured QA evaluation for the call transcript.',
  input_schema: {
    type: 'object' as const,
    properties: {
      criteria: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            criterionId: { type: 'string' },
            score: { type: 'integer', minimum: 1, maximum: 5 },
            pass: { type: 'boolean' },
            evidence: { type: 'array', items: { type: 'string' } },
            reasoning: { type: 'string' },
            severity: {
              type: 'string',
              enum: ['none', 'low', 'medium', 'high', 'critical'],
            },
          },
          required: ['criterionId', 'score', 'pass', 'evidence', 'reasoning', 'severity'],
        },
      },
      summary: { type: 'string' },
      flaggedQuotes: { type: 'array', items: { type: 'string' } },
    },
    required: ['criteria', 'summary', 'flaggedQuotes'],
  },
}

/**
 * Robustly extract a JSON object from an LLM's text response. LLMs occasionally
 * wrap JSON in markdown fences or emit trailing commas; a single malformed line
 * must not crash call finalization. Throws a descriptive error if unrecoverable.
 */
function parseJudgeJson(text: string, provider: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced ? fenced[1] : text).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate

  try {
    return JSON.parse(slice)
  } catch {
    // Last-ditch repair: strip trailing commas before a closing } or ].
    try {
      return JSON.parse(slice.replace(/,(\s*[}\]])/g, '$1'))
    } catch (e) {
      throw new Error(
        `Could not parse ${provider} judge JSON response: ${
          e instanceof Error ? e.message : 'invalid JSON'
        }`,
      )
    }
  }
}

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
): Promise<unknown> {
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
  return parseJudgeJson(text, 'DeepSeek')
}

async function callAnthropicJudge(
  apiKey: string,
  model: string,
  transcript: Transcript,
): Promise<unknown> {
  const client = new Anthropic({ apiKey })

  // Force a tool call so the SDK returns an already-parsed object. This removes
  // the brittle free-text JSON path that previously crashed call finalization
  // when the model emitted an unescaped quote or trailing comma.
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [JUDGE_TOOL],
    tool_choice: { type: 'tool', name: JUDGE_TOOL.name },
    messages: [{ role: 'user', content: buildUserPrompt(transcript) }],
  })

  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool_use response from Anthropic judge')
  }

  return toolUse.input
}

/** The deterministic verdict derived from one judge's raw scores. */
interface JudgeVerdict {
  judgeVersion: string
  provider: JudgeProvider
  criteria: CriterionResult[]
  weightedScore: number
  overallPass: boolean
  compliancePass: boolean
  summary: string
  flaggedQuotes: string[]
}

/** Calls one judge and turns its raw JSON into a code-computed verdict. */
async function runJudge(config: JudgeConfig, transcript: Transcript): Promise<JudgeVerdict> {
  const raw =
    config.provider === 'deepseek'
      ? await callDeepSeekJudge(config.apiKey, config.model, transcript)
      : await callAnthropicJudge(config.apiKey, config.model, transcript)

  const parsed = JudgeResponseSchema.parse(raw)

  const criteria: CriterionResult[] = parsed.criteria.map((c) => {
    const criterion = CRITERIA.find((cr) => cr.id === c.criterionId)
    const threshold = criterion?.passThreshold ?? 3
    return {
      ...c,
      criterionName: criterion?.name ?? c.criterionId,
      weight: criterion?.weight ?? 1,
      // pass/fail is recomputed in code from the threshold — never trusted from the LLM.
      pass: c.score >= threshold,
    }
  })

  const compliance = criteria.find((c) => c.criterionId === 'compliance')
  const compliancePass = (compliance?.score ?? 0) >= 3 && (compliance?.pass ?? false)

  return {
    judgeVersion: config.judgeVersion,
    provider: config.provider,
    criteria,
    weightedScore: computeWeightedScore(criteria),
    overallPass: criteria.every((c) => c.pass) && compliancePass,
    compliancePass,
    summary: parsed.summary,
    flaggedQuotes: parsed.flaggedQuotes,
  }
}

/**
 * Compares the canonical (primary) verdict against an independent second judge.
 * They "agree" only when both pass/fail verdicts match AND no single criterion
 * diverges by more than SCORE_DELTA_THRESHOLD points.
 */
function compareJudges(primary: JudgeVerdict, secondary: JudgeVerdict): CrossJudgeReport {
  const scoreDeltas = primary.criteria.map((pc) => {
    const sc = secondary.criteria.find((s) => s.criterionId === pc.criterionId)
    return {
      criterionId: pc.criterionId,
      primaryScore: pc.score,
      secondaryScore: sc?.score ?? null,
      delta: sc ? Math.abs(pc.score - sc.score) : null,
    }
  })

  const maxDelta = scoreDeltas.reduce((max, d) => (d.delta !== null && d.delta > max ? d.delta : max), 0)
  const bigGap = maxDelta >= SCORE_DELTA_THRESHOLD
  const agreement =
    primary.compliancePass === secondary.compliancePass &&
    primary.overallPass === secondary.overallPass &&
    !bigGap

  return {
    provider: secondary.provider,
    judgeVersion: secondary.judgeVersion,
    compliancePass: secondary.compliancePass,
    overallPass: secondary.overallPass,
    weightedScore: secondary.weightedScore,
    agreement,
    maxScoreDelta: maxDelta,
    scoreDeltas,
    summary: secondary.summary,
  }
}

export async function evaluateTranscript(
  transcript: Transcript,
  apiKey?: string,
  onProgress?: (event: EvalProgress) => void,
): Promise<EvalResult> {
  const judges = resolveJudges(apiKey)
  if (judges.length === 0) {
    throw new Error('DEEPSEEK_API_KEY or ANTHROPIC_API_KEY is required for live evaluation')
  }

  // Primary judge (DeepSeek when configured) produces the canonical scores.
  onProgress?.({ phase: 'primary', status: 'start', provider: judges[0].provider })
  const primary = await runJudge(judges[0], transcript)
  onProgress?.({ phase: 'primary', status: 'done', provider: judges[0].provider })

  // Second judge runs independently as a cross-check when a second key exists.
  let secondary: JudgeVerdict | null = null
  if (judges[1]) {
    onProgress?.({ phase: 'secondary', status: 'start', provider: judges[1].provider })
    try {
      secondary = await runJudge(judges[1], transcript)
    } catch (e) {
      // The second judge is an optional cross-check. If it fails (bad JSON, API
      // error, rate limit), keep the primary verdict rather than failing the
      // whole call finalization — the user still gets a score.
      console.error(
        `[judge] secondary (${judges[1].provider}) failed; using primary only:`,
        e instanceof Error ? e.message : e,
      )
    }
    onProgress?.({ phase: 'secondary', status: 'done', provider: judges[1].provider })
  }
  const crossJudge = secondary ? compareJudges(primary, secondary) : undefined

  onProgress?.({ phase: 'rules', status: 'start' })
  const ruleViolations = runComplianceRules(transcript)
  const compliance = primary.criteria.find((c) => c.criterionId === 'compliance')

  // Disagreement routes a call to human review if EITHER the deterministic rules
  // contradict the primary judge, OR the two judges disagree with each other.
  const ruleDisagreement = detectJudgeDisagreement(
    ruleViolations,
    compliance?.score ?? 0,
    primary.compliancePass,
  )
  const judgeDisagreement = ruleDisagreement || (crossJudge ? !crossJudge.agreement : false)
  onProgress?.({ phase: 'rules', status: 'done' })

  return {
    id: `eval-${transcript.id}-${Date.now()}`,
    transcriptId: transcript.id,
    evaluatedAt: new Date().toISOString(),
    judgeVersion: primary.judgeVersion,
    criteriaProfileId: transcript.metadata.companyId ?? 'default',
    criteria: primary.criteria,
    ruleViolations,
    judgeDisagreement,
    crossJudge,
    weightedScore: primary.weightedScore,
    overallPass: primary.overallPass,
    compliancePass: primary.compliancePass,
    summary: primary.summary,
    flaggedQuotes: primary.flaggedQuotes,
  }
}

export { DEEPSEEK_MODEL, ANTHROPIC_MODEL as MODEL }
