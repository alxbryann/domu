import { z } from 'zod'
import { CallAcceptanceProfileSchema } from '../shared/acceptance-profile.js'
import {
  TranscriptSchema,
  TranscriptTurnSchema,
  type Transcript,
  type TranscriptTurn,
} from './types.js'

export const CallMessageSchema = z.object({
  role: z.string().optional(),
  message: z.string().optional(),
  content: z.string().optional(),
  text: z.string().optional(),
  time: z.number().optional(),
})

export type CallMessage = z.infer<typeof CallMessageSchema>

export const CallWebhookSchema = z.object({
  event: z.enum(['call.started', 'call.updated', 'call.ended']),
  call: z.object({
    id: z.string(),
    source: z.enum(['domu', 'vapi']).optional(),
    companyId: z.string().optional(),
    agentVersion: z.string().optional(),
    accountId: z.string().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
    description: z.string().optional(),
    callType: z.string().optional(),
    recordingUrl: z.string().optional(),
    acceptanceProfile: CallAcceptanceProfileSchema.optional(),
    messages: z.array(CallMessageSchema).optional(),
    turns: z.array(TranscriptTurnSchema).optional(),
  }),
})

export type CallWebhookPayload = z.infer<typeof CallWebhookSchema>

export function messagesToTurns(messages: CallMessage[]): TranscriptTurn[] {
  return messages
    .filter((m) => m.message || m.content || m.text)
    .map((m) => {
      const role = (m.role ?? 'assistant').toLowerCase()
      const speaker =
        role === 'user' || role === 'customer'
          ? 'customer'
          : role === 'system'
            ? 'system'
            : 'agent'
      return {
        speaker: speaker as TranscriptTurn['speaker'],
        text: (m.message ?? m.content ?? m.text ?? '').trim(),
        timestamp: m.time ? new Date(m.time).toISOString() : undefined,
      }
    })
}

export function resolveTurns(call: CallWebhookPayload['call']): TranscriptTurn[] {
  if (call.turns?.length) return call.turns
  if (call.messages?.length) return messagesToTurns(call.messages)
  return []
}

export function callStatusForEvent(
  event: CallWebhookPayload['event'],
): 'live' | 'evaluating' | 'completed' {
  if (event === 'call.started' || event === 'call.updated') return 'live'
  return 'evaluating'
}

export function buildTranscript(
  payload: CallWebhookPayload,
  existing?: Transcript,
): Transcript {
  const { event, call } = payload
  const turns = resolveTurns(call)
  const mergedTurns = turns.length > 0 ? turns : (existing?.turns ?? [])

  return TranscriptSchema.parse({
    id: call.id,
    source: call.source ?? existing?.source ?? 'domu',
    status: callStatusForEvent(event),
    metadata: {
      companyId: call.companyId ?? existing?.metadata.companyId,
      agentVersion: call.agentVersion ?? existing?.metadata.agentVersion,
      accountId: call.accountId ?? existing?.metadata.accountId,
      callDate: call.startedAt ?? existing?.metadata.callDate ?? new Date().toISOString(),
      endedAt: event === 'call.ended' ? (call.endedAt ?? new Date().toISOString()) : existing?.metadata.endedAt,
      description: call.description ?? existing?.metadata.description,
      callType: call.callType ?? existing?.metadata.callType,
      recordingUrl: call.recordingUrl ?? existing?.metadata.recordingUrl,
      recordingStoragePath: existing?.metadata.recordingStoragePath,
      acceptanceProfile: call.acceptanceProfile ?? existing?.metadata.acceptanceProfile,
    },
    turns: mergedTurns,
  })
}
