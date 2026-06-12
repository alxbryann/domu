import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LiveMonitorPanel } from '../components/LiveMonitorPanel'
import { AcceptanceProfileEditor } from '../components/AcceptanceProfileEditor'
import { VoicePulse } from '../components/VoicePulse'
import { Badge } from '../design-system/components/Badge'
import { Button } from '../design-system/components/Button'
import { ComplianceAlert } from '../design-system/components/ComplianceAlert'
import { SectionLabel } from '../design-system/components/SectionLabel'
import { useVapiCall } from '../context/VapiCallContext'
import { usePushToTalk } from '../hooks/usePushToTalk'

export function LiveCallPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    callId,
    state,
    error,
    turns,
    isSpeaking,
    speakingRole,
    volumeLevel,
    elapsedSec,
    liveMonitor,
    isMicMuted,
    isPushToTalkActive,
    acceptanceProfile,
    profileSaving,
    endCall,
    startTalking,
    stopTalking,
    setAcceptanceProfile,
    saveAcceptanceProfile,
  } = useVapiCall()

  const isThisCall = callId === id
  const isLive = isThisCall && (state === 'live' || state === 'connecting' || state === 'ending')
  const waitingForSession = state === 'connecting' && !callId
  const pushToTalkEnabled = isThisCall && state === 'live'

  usePushToTalk(pushToTalkEnabled, startTalking, stopTalking)

  useEffect(() => {
    if (isThisCall || state !== 'idle') return

    const timer = window.setTimeout(() => {
      navigate('/calls', { replace: true })
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [isThisCall, state, navigate, id])

  if (!id) return null

  if (waitingForSession) {
    return (
      <div className="min-h-full bg-app-bg flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-app-text font-medium">Connecting call…</p>
          <p className="text-sm text-app-muted">Setting up live monitor</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-app-bg">
      <div className="border-b border-app-border px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <Link to="/calls" className="text-xs text-domu-blue hover:underline">
            ← Calls
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-lg font-bold text-app-text font-mono">{id}</h1>
            <Badge variant={isLive ? 'success' : state === 'ending' ? 'warning' : 'neutral'}>
              {state === 'connecting' ? 'Connecting' : state === 'live' ? 'Live' : state}
            </Badge>
          </div>
        </div>
        {isLive && (
          <Button variant="outline" onClick={() => endCall()} disabled={state === 'ending'}>
            {state === 'ending' ? 'Ending…' : 'End call'}
          </Button>
        )}
      </div>

      {error && (
        <div className="px-6 pt-4">
          <ComplianceAlert variant="danger" title="Call error" message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-0 xl:gap-0 min-h-[calc(100vh-5rem)]">
        <section className="flex flex-col border-r border-app-border xl:min-h-[calc(100vh-5rem)]">
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-b from-domu-blue/5 to-transparent">
            <SectionLabel variant="outline">Voice stream</SectionLabel>
            <VoicePulse
              isSpeaking={isSpeaking}
              speakingRole={speakingRole}
              volumeLevel={volumeLevel}
              className="mt-8"
            />
            {state === 'live' && (
              <div className="mt-8 text-center space-y-2">
                <div
                  className={[
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isPushToTalkActive
                      ? 'bg-domu-success/15 text-domu-success border border-domu-success/30'
                      : isMicMuted
                        ? 'bg-app-card text-app-muted border border-app-border'
                        : 'bg-domu-blue/10 text-domu-blue border border-domu-blue/30',
                  ].join(' ')}
                >
                  <kbd className="rounded bg-app-bg px-2 py-0.5 text-xs font-mono border border-app-border">
                    Space
                  </kbd>
                  <span>
                    {isPushToTalkActive
                      ? 'Escuchando… suelta para pausar'
                      : 'Mantén presionado para hablar'}
                  </span>
                </div>
                <p className="text-xs text-app-muted">
                  El micrófono está silenciado hasta que presiones espacio
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-app-border p-6 max-h-[40vh] overflow-y-auto">
            <h2 className="text-sm font-semibold text-app-text mb-4">Live transcript</h2>
            {turns.length === 0 ? (
              <p className="text-sm text-app-muted">Waiting for speech…</p>
            ) : (
              <div className="space-y-3">
                {turns.map((turn, i) => (
                  <div
                    key={i}
                    className={[
                      'rounded-domu-md px-4 py-3 text-sm',
                      turn.speaker === 'agent'
                        ? 'bg-app-transcript-agent border-l-2 border-domu-blue'
                        : 'bg-app-transcript-customer border-l-2 border-domu-success',
                    ].join(' ')}
                  >
                    <span className="text-xs font-mono uppercase tracking-wider text-app-muted block mb-1">
                      {turn.speaker}
                    </span>
                    <p className="text-app-text leading-relaxed">{turn.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="p-6 bg-app-card/50 xl:min-h-[calc(100vh-5rem)] space-y-5">
          <div className="rounded-domu-lg bg-app-card border border-app-border p-4">
            <AcceptanceProfileEditor
              profile={acceptanceProfile}
              onChange={setAcceptanceProfile}
              onSave={() => saveAcceptanceProfile()}
              saving={profileSaving}
              compact
              disabled={state === 'ending'}
            />
          </div>
          <LiveMonitorPanel
            monitor={liveMonitor}
            elapsedSec={elapsedSec}
            lastLatencyMs={liveMonitor.lastLatencyMs}
          />
        </aside>
      </div>
    </div>
  )
}
