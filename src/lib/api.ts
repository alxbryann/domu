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
  model?: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
  }
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
  importCalls: (body: unknown) =>
    fetchJson<{ imported: number; calls: Array<{ call: Transcript; result: EvalResult | null }> }>(
      '/calls/import',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    ),
}
