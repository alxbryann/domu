import type { Transcript, TranscriptTurn } from '../eval/types.js'
import {
  detectEscalationInTurns,
  escalationAlertKey,
  type EscalationTriggerMatch,
} from '../shared/escalation-triggers.js'
import { sendEscalationEmail } from './email-alerts.js'

function dashboardCallUrl(callId: string): string | undefined {
  const base = process.env.DASHBOARD_URL ?? process.env.APP_URL
  if (!base) return undefined
  return `${base.replace(/\/$/, '')}/calls/${callId}/live`
}

async function notifyMatch(callId: string, match: EscalationTriggerMatch): Promise<void> {
  await sendEscalationEmail({
    callId,
    triggerLabel: match.label,
    severity: match.severity,
    description: match.description,
    matchedText: match.matchedText,
    quote: match.quote,
    speaker: match.speaker,
    dashboardUrl: dashboardCallUrl(callId),
  })
}

export async function processEscalationAlerts(
  callId: string,
  turns: TranscriptTurn[],
  previousTurnCount: number,
  sentKeys: string[],
): Promise<string[]> {
  const newMatches = detectEscalationInTurns(turns, previousTurnCount)
  const updatedKeys = [...sentKeys]

  for (const match of newMatches) {
    const key = escalationAlertKey(match)
    if (updatedKeys.includes(key)) continue

    try {
      await notifyMatch(callId, match)
      updatedKeys.push(key)
    } catch (err) {
      console.error('[escalation-alerts] Failed to notify:', key, err)
    }
  }

  return updatedKeys
}

export async function applyEscalationAlerts(
  existing: Transcript | null,
  transcript: Transcript,
): Promise<Transcript> {
  const previousTurnCount = existing?.turns.length ?? 0
  const sentKeys = existing?.metadata.sentEscalationAlerts ?? []

  if (transcript.turns.length <= previousTurnCount) {
    return transcript
  }

  const updatedKeys = await processEscalationAlerts(
    transcript.id,
    transcript.turns,
    previousTurnCount,
    sentKeys,
  )

  if (updatedKeys.length === sentKeys.length) {
    return transcript
  }

  return {
    ...transcript,
    metadata: {
      ...transcript.metadata,
      sentEscalationAlerts: updatedKeys,
    },
  }
}
