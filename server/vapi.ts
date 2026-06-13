import type { CallAcceptanceProfile } from '../shared/acceptance-profile.js'
import {
  buildVapiFirstMessage,
  buildVapiVariableValues,
} from '../shared/acceptance-profile.js'

type VapiCallResponse = {
  recordingUrl?: string
  stereoRecordingUrl?: string
  artifact?: {
    recordingUrl?: string
    stereoRecordingUrl?: string
  }
}

type VapiAssistant = {
  model?: Record<string, unknown> & {
    messages?: Array<{ role?: string; content?: string }>
  }
}

export type VapiCallOverrides = {
  variableValues: Record<string, string>
  firstMessage?: string
  firstMessageMode?: 'assistant-speaks-first'
}

function extractRecordingUrl(data: VapiCallResponse): string | null {
  return (
    data.artifact?.recordingUrl ??
    data.recordingUrl ??
    data.artifact?.stereoRecordingUrl ??
    data.stereoRecordingUrl ??
    null
  )
}

export async function fetchVapiRecordingUrl(callId: string): Promise<string | null> {
  const key = process.env.VAPI_PRIVATE_KEY
  if (!key) return null

  const delaysMs = [0, 2000, 5000]

  for (const delayMs of delaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })

    if (!res.ok) continue

    const data = (await res.json()) as VapiCallResponse
    const url = extractRecordingUrl(data)
    if (url) return url
  }

  return null
}

const GROUND_TRUTH_PLACEHOLDER_RE = /\{\{\s*groundTruth\s*\}\}/
const ensuredAssistants = new Set<string>()

/**
 * Ground-truth account data is injected per call via the `{{groundTruth}}`
 * Liquid variable (filled from `variableValues`). For substitution to happen,
 * the assistant's system prompt must contain that placeholder.
 *
 * We intentionally do NOT inject ground truth through a `model` override:
 * sending `model.messages` in assistantOverrides makes Vapi generate the first
 * message from the model and ignore our personalized `firstMessage` greeting
 * (the model ends up reading field labels aloud — "am I speaking with customer
 * name?"). Instead we make sure the placeholder exists, patching the assistant
 * once per process if it's missing.
 */
async function ensureGroundTruthPlaceholder(assistantId: string, key: string): Promise<void> {
  if (ensuredAssistants.has(assistantId)) return

  try {
    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return

    const assistant = (await res.json()) as VapiAssistant
    const messages = assistant.model?.messages ?? []
    const sysIndex = messages.findIndex((m) => (m.role ?? '') === 'system')
    const sysContent = sysIndex >= 0 ? (messages[sysIndex].content ?? '') : ''

    if (GROUND_TRUTH_PLACEHOLDER_RE.test(sysContent)) {
      ensuredAssistants.add(assistantId)
      return
    }

    const addition =
      '\n\n# VERIFIED ACCOUNT DATA FOR THIS CALL\n' +
      'Use these exact values; never read a field label out loud.\n{{groundTruth}}'
    const nextMessages =
      sysIndex >= 0
        ? messages.map((m, i) =>
            i === sysIndex ? { ...m, content: (m.content ?? '') + addition } : m,
          )
        : [{ role: 'system', content: addition.trimStart() }, ...messages]

    const patch = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: { ...assistant.model, messages: nextMessages } }),
    })
    if (patch.ok) ensuredAssistants.add(assistantId)
  } catch {
    // Best-effort: if the patch fails, ground truth just isn't injected this
    // call — the personalized greeting still works.
  }
}

export async function buildVapiCallOverrides(
  profile: CallAcceptanceProfile,
  assistantId: string,
): Promise<VapiCallOverrides> {
  const variableValues = buildVapiVariableValues(profile)
  const firstMessage = buildVapiFirstMessage(profile)

  const overrides: VapiCallOverrides = { variableValues }
  if (firstMessage) {
    // Speak our personalized greeting verbatim at call start.
    overrides.firstMessage = firstMessage
    overrides.firstMessageMode = 'assistant-speaks-first'
  }

  const key = process.env.VAPI_PRIVATE_KEY
  if (key) {
    // Make sure {{groundTruth}} exists in the prompt so variableValues can fill
    // it; await it so the placeholder is in place before the call starts.
    await ensureGroundTruthPlaceholder(assistantId, key)
  }

  return overrides
}
