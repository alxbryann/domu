import type { CallAcceptanceProfile } from '../../shared/acceptance-profile'
import type {
  CallWithResult,
  EvalResult,
  OverviewData,
  Transcript,
} from '../types'

const BASE = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

export interface VapiConfig {
  publicKey: string
  assistantId: string
}

export interface VapiCallOverrides {
  variableValues: Record<string, string>
  firstMessage?: string
  firstMessageMode?: 'assistant-speaks-first'
}

export interface CallSyncPayload {
  event: 'call.started' | 'call.updated' | 'call.ended'
  call: {
    id: string
    source?: 'domu' | 'vapi'
    companyId?: string
    agentVersion?: string
    accountId?: string
    startedAt?: string
    endedAt?: string
    description?: string
    callType?: string
    recordingUrl?: string
    acceptanceProfile?: CallAcceptanceProfile
    messages?: Array<{ role?: string; message?: string; time?: number }>
  }
}

export const api = {
  getOverview: () => fetchJson<OverviewData>('/overview'),
  getCalls: () => fetchJson<CallWithResult[]>('/calls'),
  getCall: (id: string) =>
    fetchJson<{ call: Transcript; result: EvalResult | null }>(`/calls/${id}`),
  getCallRecordingUrl: (id: string) => fetchJson<{ url: string }>(`/calls/${id}/recording`),
  getVapiConfig: () => fetchJson<VapiConfig>('/vapi/config'),
  getVapiCallOverrides: (acceptanceProfile: CallAcceptanceProfile) =>
    fetchJson<VapiCallOverrides>('/vapi/call-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptanceProfile }),
    }),
  syncCall: (body: CallSyncPayload) =>
    fetchJson<{ call: Transcript; result: EvalResult | null }>('/calls/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  updateCallProfile: (id: string, acceptanceProfile: CallAcceptanceProfile) =>
    fetchJson<{ call: Transcript }>(`/calls/${id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptanceProfile }),
    }),
  updateCallName: (id: string, name: string) =>
    fetchJson<{ call: Transcript }>(`/calls/${id}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  deleteCall: (id: string) =>
    fetchJson<{ ok: true }>(`/calls/${id}`, { method: 'DELETE' }),
  importCalls: (body: unknown) =>
    fetchJson<{ imported: number; calls: Array<{ call: Transcript; result: EvalResult | null }> }>(
      '/calls/import',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    ),
  generateCall: (body: {
    scenario: string
    expectedLabel?: 'good' | 'bad' | 'edge'
    acceptanceProfile?: CallAcceptanceProfile
  }) =>
    fetchJson<{ call: Transcript; result: EvalResult | null }>('/calls/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  generateCallStream: (
    body: {
      scenario: string
      expectedLabel?: 'good' | 'bad' | 'edge'
      acceptanceProfile?: CallAcceptanceProfile
    },
    onEvent: (event: GenerateStreamEvent) => void,
    signal?: AbortSignal,
  ) => streamSse('/calls/generate/stream', body, onEvent, signal),
}

export type GenerateStreamEvent =
  | { type: 'plan'; steps: { id: string; label: string }[] }
  | { type: 'step'; id: string; status: 'start' | 'done' }
  | { type: 'done'; call: Transcript; result: EvalResult | null }
  | { type: 'error'; error: string }

/**
 * POSTs a body and consumes a Server-Sent Events response, invoking onEvent for
 * each parsed event. Used by the synthetic-call generator to drive a live
 * progress timeline (EventSource can't POST, so we read the stream by hand).
 */
async function streamSse(
  url: string,
  body: unknown,
  onEvent: (event: GenerateStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line; each frame has event:/data: lines.
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      let eventName = 'message'
      let data = ''
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (!data) continue
      onEvent({ type: eventName, ...JSON.parse(data) } as GenerateStreamEvent)
    }
  }
}
