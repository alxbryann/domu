import { useState } from 'react'
import { AcceptanceProfileEditor } from './AcceptanceProfileEditor'
import { Badge } from '../design-system/components/Badge'
import { Button } from '../design-system/components/Button'
import { ComplianceAlert } from '../design-system/components/ComplianceAlert'
import { useVapiCall } from '../context/VapiCallContext'

const STATE_LABEL = {
  idle: 'Ready',
  connecting: 'Connecting…',
  live: 'Live',
  ending: 'Ending…',
  error: 'Error',
} as const

export function VapiLiveCallPanel() {
  const {
    isConfigured,
    configError,
    state,
    callId,
    error,
    isActive,
    acceptanceProfile,
    setAcceptanceProfile,
    saveAcceptanceProfile,
    profileSaving,
    startCall,
    endCall,
  } = useVapiCall()
  const [showProfile, setShowProfile] = useState(false)

  if (configError) {
    return (
      <ComplianceAlert
        variant="warning"
        title="Vapi not configured"
        message={`Add VAPI_PUBLIC_KEY and VAPI_ASSISTANT_ID to .env and restart the server. (${configError})`}
      />
    )
  }

  if (!isConfigured) return null

  return (
    <div className="rounded-domu-lg bg-app-card border border-app-border p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-app-text">Live Vapi Call</h2>
            <Badge variant={state === 'live' ? 'success' : state === 'error' ? 'danger' : 'neutral'}>
              {STATE_LABEL[state]}
            </Badge>
          </div>
          <p className="text-app-muted text-sm mt-1">
            Configura los datos de la cuenta y las reglas de aceptación antes de iniciar. Hold{' '}
            <kbd className="font-mono text-xs">Space</kbd> to talk during the call.
          </p>
          {callId && <p className="text-xs text-app-muted mt-2 font-mono">Call: {callId}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {!isActive ? (
            <Button variant="primary" onClick={() => void startCall()}>
              Start live call
            </Button>
          ) : (
            <Button variant="outline" disabled={state === 'ending'} onClick={() => void endCall()}>
              {state === 'ending' ? 'Ending…' : 'End call'}
            </Button>
          )}
        </div>
      </div>

      {!isActive && (
        <div className="border-t border-app-border pt-4">
          <button
            type="button"
            onClick={() => setShowProfile((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-app-text hover:text-domu-blue mb-3 transition-colors"
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showProfile ? 'rotate-90' : ''}`}
            >
              <path d="M5 3l4 4-4 4" />
            </svg>
            Acceptance profile & ground truth
          </button>
          {showProfile && (
            <AcceptanceProfileEditor
              profile={acceptanceProfile}
              onChange={setAcceptanceProfile}
              onSave={() => saveAcceptanceProfile()}
              saving={profileSaving}
            />
          )}
        </div>
      )}

      {error && <ComplianceAlert variant="danger" title="Call Error" message={error} />}
    </div>
  )
}
