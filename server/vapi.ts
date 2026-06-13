import type { CallAcceptanceProfile } from '../shared/acceptance-profile.js'
import {
  buildVapiVariableValues,
  formatGroundTruthForAgent,
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
  model?: {
    provider?: string
    model?: string
    messages?: Array<{ role?: string; content?: string }>
  }
}

export type VapiCallOverrides = {
  variableValues: Record<string, string>
  model?: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
  }
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

export async function buildVapiCallOverrides(
  profile: CallAcceptanceProfile,
  assistantId: string,
): Promise<VapiCallOverrides> {
  const variableValues = buildVapiVariableValues(profile)
  const groundTruth = formatGroundTruthForAgent(profile)
  const key = process.env.VAPI_PRIVATE_KEY

  if (!key) {
    return { variableValues }
  }

  try {
    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      return { variableValues }
    }

    const assistant = (await res.json()) as VapiAssistant
    const provider = assistant.model?.provider
    const modelName = assistant.model?.model
    if (!provider || !modelName) {
      return { variableValues }
    }

    const existingMessages = (assistant.model?.messages ?? [])
      .filter((message) => message.role && message.content)
      .map((message) => ({ role: message.role!, content: message.content! }))

    return {
      variableValues,
      model: {
        provider,
        model: modelName,
        messages: [...existingMessages, { role: 'system', content: groundTruth }],
      },
    }
  } catch {
    return { variableValues }
  }
}
