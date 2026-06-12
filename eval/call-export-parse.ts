import type { CallWebhookPayload } from './call-ingest.js'
import { messagesToTurns, type CallMessage } from './call-ingest.js'
import type { TranscriptTurn } from './types.js'

export interface CallsExportRecord {
  id?: string
  orgId?: string
  assistantId?: string
  customerId?: string | null
  startedAt?: string
  endedAt?: string
  transcript?: string
  summary?: string
  type?: string
  status?: string
  recordingUrl?: string
  messages?: CallMessage[]
  artifact?: {
    messages?: CallMessage[]
    transcript?: string
  }
}

function roleToSpeaker(role: string): TranscriptTurn['speaker'] | null {
  const normalized = role.toLowerCase()
  if (normalized === 'system') return null
  if (normalized === 'user' || normalized === 'customer') return 'customer'
  if (
    normalized === 'bot' ||
    normalized === 'assistant' ||
    normalized === 'ai' ||
    normalized === 'agent'
  ) {
    return 'agent'
  }
  return 'agent'
}

export function exportMessagesToTurns(messages: CallMessage[]): TranscriptTurn[] {
  return messages
    .filter((m) => m.message || m.content || m.text)
    .map((m) => {
      const speaker = roleToSpeaker(m.role ?? 'assistant')
      if (speaker === null) return null
      const text = (m.message ?? m.content ?? m.text ?? '').trim()
      if (!text) return null
      return {
        speaker,
        text,
        timestamp: m.time ? new Date(m.time).toISOString() : undefined,
      }
    })
    .filter((turn): turn is TranscriptTurn => turn !== null)
}

export function parseVapiTranscriptText(text: string): TranscriptTurn[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(AI|User|Agent|Customer|Bot|Assistant)\s*:\s*(.+)$/i)
      if (!match) return null
      const role = match[1].toLowerCase()
      const speaker: TranscriptTurn['speaker'] =
        role === 'user' || role === 'customer' ? 'customer' : 'agent'
      return { speaker, text: match[2].trim() }
    })
    .filter((turn): turn is TranscriptTurn => turn !== null)
}

function resolveExportTurns(record: CallsExportRecord): TranscriptTurn[] {
  const messages =
    record.messages ??
    record.artifact?.messages ??
    []

  const fromMessages = exportMessagesToTurns(messages)
  if (fromMessages.length > 0) return fromMessages

  const text = record.transcript ?? record.artifact?.transcript ?? ''
  if (text.trim()) return parseVapiTranscriptText(text)

  return []
}

export function isCallsExportRecord(value: unknown): value is CallsExportRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as CallsExportRecord
  return Boolean(
    record.id &&
      (record.messages?.length ||
        record.artifact?.messages?.length ||
        record.transcript?.trim() ||
        record.artifact?.transcript?.trim()),
  )
}

export function exportRecordToWebhookPayload(
  record: CallsExportRecord,
  fallbackId?: string,
): CallWebhookPayload {
  const id = record.id ?? fallbackId ?? `import-${Date.now()}`
  const turns = resolveExportTurns(record)

  return {
    event: 'call.ended',
    call: {
      id,
      source: 'vapi',
      companyId: record.orgId,
      agentVersion: record.assistantId,
      accountId: record.customerId ?? undefined,
      startedAt: record.startedAt,
      endedAt: record.endedAt ?? record.startedAt,
      turns,
      description: record.summary,
      callType: record.type,
      recordingUrl: record.recordingUrl,
    },
  }
}

export function parseCallsExport(raw: unknown, filename?: string): CallWebhookPayload[] {
  if (Array.isArray(raw)) {
    return raw
      .filter(isCallsExportRecord)
      .map((record, index) =>
        exportRecordToWebhookPayload(record, filename ? `${filename}-${index}` : undefined),
      )
  }

  if (isCallsExportRecord(raw)) {
    return [exportRecordToWebhookPayload(raw, filename)]
  }

  const legacy = raw as CallsExportRecord
  if (legacy.messages?.length || legacy.artifact?.messages?.length || legacy.transcript) {
    return [exportRecordToWebhookPayload(legacy, filename)]
  }

  throw new Error('Unrecognized call export format')
}
