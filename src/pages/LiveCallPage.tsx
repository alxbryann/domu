import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CallChatInput } from '../components/CallChatInput'
import { LiveAlertToasts } from '../components/LiveAlertToasts'
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
    interimTurn,
    isSpeaking,
    speakingRole,
    volumeLevel,
    elapsedSec,
    liveMonitor,
    isMicMuted,
    isPushToTalkActive,
    isChatMode,
    acceptanceProfile,
    profileSaving,
    endCall,
    startTalking,
    stopTalking,
    openChatMode,
    closeChatMode,
    sendTextMessage,
    setAcceptanceProfile,
    saveAcceptanceProfile,
  } = useVapiCall()

  const isThisCall = callId === id
  const isLive = isThisCall && (state === 'live' || state === 'connecting' || state === 'ending')
  const waitingForSession = state === 'connecting' && !callId
  const pushToTalkEnabled = isThisCall && state === 'live' && !isChatMode

  usePushToTalk(pushToTalkEnabled, startTalking, stopTalking, openChatMode)

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
      <div className="h-full bg-app-bg flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-app-text font-medium">Connecting call…</p>
          <p className="text-sm text-app-muted">Setting up live monitor</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-app-bg">
      {isLive && <LiveAlertToasts alerts={liveMonitor.alerts} />}
      <div className="shrink-0 border-b border-app-border px-6 py-4 flex items-center justify-between gap-4">
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
        <div className="px-6 pt-4 shrink-0">
          <ComplianceAlert variant="danger" title="Call error" message={error} />
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] min-h-0">
        <section className="flex flex-col border-r border-app-border min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 bg-gradient-to-b from-domu-blue/5 to-transparent min-h-0">
            <SectionLabel variant="outline">Voice stream</SectionLabel>
            <VoicePulse
              isSpeaking={isSpeaking}
              speakingRole={speakingRole}
              volumeLevel={volumeLevel}
              className="mt-6"
            />
            {state === 'live' && (
              <div className="mt-6 text-center space-y-2 w-full px-4">
                {isChatMode ? (
                  <CallChatInput
                    onSend={sendTextMessage}
                    onClose={closeChatMode}
                    disabled={state !== 'live'}
                  />
                ) : (
                  <>
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
                      El micrófono está silenciado hasta que presiones espacio.
                      {' '}
                      <button
                        type="button"
                        onClick={openChatMode}
                        className="text-domu-blue hover:underline"
                      >
                        Doble espacio
                      </button>
                      {' '}
                      o clic aquí para escribir.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-app-border p-6 max-h-[38%] overflow-y-auto">
            <h2 className="text-sm font-semibold text-app-text mb-4">Live transcript</h2>
            {turns.length === 0 && !interimTurn ? (
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
                {interimTurn && (
                  <div
                    className={[
                      'rounded-domu-md px-4 py-3 text-sm opacity-70',
                      interimTurn.speaker === 'agent'
                        ? 'bg-app-transcript-agent border-l-2 border-domu-blue/50'
                        : 'bg-app-transcript-customer border-l-2 border-domu-success/50',
                    ].join(' ')}
                  >
                    <span className="text-xs font-mono uppercase tracking-wider text-app-muted flex items-center gap-2 mb-1">
                      {interimTurn.speaker}
                      <span className="inline-flex gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-app-muted animate-pulse" />
                        <span className="h-1 w-1 rounded-full bg-app-muted animate-pulse [animation-delay:150ms]" />
                        <span className="h-1 w-1 rounded-full bg-app-muted animate-pulse [animation-delay:300ms]" />
                      </span>
                    </span>
                    <p className="text-app-text leading-relaxed italic">{interimTurn.text}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="overflow-y-auto p-6 bg-app-card/50 space-y-5">
          {state === 'live' ? (
            <>
              <LiveMonitorPanel
                monitor={liveMonitor}
                elapsedSec={elapsedSec}
                lastLatencyMs={liveMonitor.lastLatencyMs}
              />
              <div className="rounded-domu-lg bg-app-card border border-app-border p-4">
                <AcceptanceProfileEditor
                  profile={acceptanceProfile}
                  onChange={setAcceptanceProfile}
                  onSave={() => saveAcceptanceProfile()}
                  saving={profileSaving}
                  compact
                  lockInputs
                  disabled={false}
                />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-domu-lg bg-app-card border border-app-border p-4">
                <AcceptanceProfileEditor
                  profile={acceptanceProfile}
                  onChange={setAcceptanceProfile}
                  onSave={() => saveAcceptanceProfile()}
                  saving={profileSaving}
                  compact
                  lockInputs={false}
                  disabled={state === 'ending'}
                />
              </div>
              <LiveMonitorPanel
                monitor={liveMonitor}
                elapsedSec={elapsedSec}
                lastLatencyMs={liveMonitor.lastLatencyMs}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
