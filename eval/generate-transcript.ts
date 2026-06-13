import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  DEFAULT_ACCEPTANCE_PROFILE,
  formatGroundTruthForAgent,
  type CallAcceptanceProfile,
} from '../shared/acceptance-profile.js'
import type { TranscriptTurn } from './types.js'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_MODEL = 'deepseek-chat'
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

function getGeneratorConfig() {
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  if (deepseekKey) {
    return { provider: 'deepseek' as const, apiKey: deepseekKey, model: DEEPSEEK_MODEL }
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    return { provider: 'anthropic' as const, apiKey: anthropicKey, model: ANTHROPIC_MODEL }
  }
  return null
}

/** Which model will write the synthetic transcript, for surfacing in the UI. */
export function getGeneratorProvider(): 'deepseek' | 'anthropic' | null {
  return getGeneratorConfig()?.provider ?? null
}

const SYSTEM_PROMPT = `You generate realistic SYNTHETIC debt-collection call transcripts used as test fixtures for Domu's QA evaluation system. These are never placed to real people — their only purpose is to test whether an automated evaluator correctly catches good and bad agent behavior.

Write a transcript that matches the requested scenario:
- If the scenario asks for a non-compliant or low-quality call, write it that way (threats, harassment, hallucinated balances/terms, missed escalation, premature disclosure) so the evaluator has something to catch.
- If it asks for a good call, follow FDCPA best practices: verify right-party contact, give the mini-Miranda, state only accurate facts, stay empathetic, and drive a clear outcome.

The conversation is between an "agent" (Domu collections agent) and a "customer". Write 6-14 natural turns, alternating speakers, starting with the agent. Use the provided ground-truth account data for any facts UNLESS the scenario explicitly calls for the agent to get them wrong.

Return JSON only, no prose:
{"turns": [{"speaker": "agent" | "customer", "text": "..."}]}`

const GeneratedTurnSchema = z.object({
  speaker: z.enum(['agent', 'customer']),
  text: z.string().min(1),
})

const GeneratedTranscriptSchema = z.object({
  turns: z.array(GeneratedTurnSchema).min(2),
})

function buildUserPrompt(
  scenario: string,
  profile: CallAcceptanceProfile,
  expectedLabel?: 'good' | 'bad' | 'edge',
): string {
  const labelHint = expectedLabel
    ? `\nINTENDED QUALITY: write this as a "${expectedLabel}" call.`
    : ''

  return `SCENARIO: ${scenario}${labelHint}

GROUND-TRUTH ACCOUNT DATA (use these exact values unless the scenario says the agent gets them wrong):
${formatGroundTruthForAgent(profile)}

Write the transcript now as JSON.`
}

async function callDeepSeek(apiKey: string, model: string, userPrompt: string): Promise<string> {
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
        { role: 'user', content: userPrompt },
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
  if (!text) throw new Error('No text response from DeepSeek generator')
  return text
}

async function callAnthropic(apiKey: string, model: string, userPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from generator')
  }
  return textBlock.text
}

/**
 * Uses an LLM to invent a synthetic collections-call transcript from a free-text
 * scenario. Returns the turns; the caller wraps them into a Transcript and runs
 * the eval. Reuses the same provider precedence as the judge (DeepSeek → Anthropic).
 */
export async function generateTranscriptTurns(
  scenario: string,
  profile: CallAcceptanceProfile = DEFAULT_ACCEPTANCE_PROFILE,
  expectedLabel?: 'good' | 'bad' | 'edge',
): Promise<TranscriptTurn[]> {
  const trimmed = scenario.trim()
  if (!trimmed) throw new Error('Scenario is required to generate a transcript')

  const config = getGeneratorConfig()
  if (!config) {
    throw new Error('DEEPSEEK_API_KEY or ANTHROPIC_API_KEY is required to generate transcripts')
  }

  const userPrompt = buildUserPrompt(trimmed, profile, expectedLabel)
  const text =
    config.provider === 'deepseek'
      ? await callDeepSeek(config.apiKey, config.model, userPrompt)
      : await callAnthropic(config.apiKey, config.model, userPrompt)

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse generated transcript JSON')

  const parsed = GeneratedTranscriptSchema.parse(JSON.parse(jsonMatch[0]))
  return parsed.turns.map((turn) => ({ speaker: turn.speaker, text: turn.text.trim() }))
}
