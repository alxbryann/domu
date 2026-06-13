import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import {
  computeLiveMonitor,
  createLiveMonitorMetrics,
  recordTurnLatency,
  type LiveMonitorSnapshot,
} from '../lib/live-monitor'
import { getVapiClient, isValidCallId } from '../lib/vapi-session'
import type { VapiClient } from '../lib/vapi-client'
import type { TranscriptTurn } from '../types'
import type { CallAcceptanceProfile } from '../../shared/acceptance-profile'
import {
  loadStoredProfile,
  saveStoredProfile,
} from '../../shared/acceptance-profile'

type VapiCallState = 'idle' | 'connecting' | 'live' | 'ending' | 'error'

interface VapiConfig {
  publicKey: string
  assistantId: string
}

interface VapiTranscriptMessage {
  role?: string
  message?: string
  time?: number
}

interface VapiConversationMessage {
  role?: string
  message?: string
  time?: number
}

function conversationMessagesToEntries(
  messages: VapiConversationMessage[],
): VapiTranscriptMessage[] {
  return messages
    .filter((message) => {
      const role = (message.role ?? '').toLowerCase()
      return (
        (role === 'user' || role === 'bot' || role === 'assistant') &&
        Boolean(message.message?.trim())
      )
    })
    .map((message) => {
      const role = (message.role ?? '').toLowerCase()
      return {
        role: role === 'user' ? 'user' : 'assistant',
        message: message.message!.trim(),
        time: message.time ?? Date.now(),
      }
    })
}

function messageToTurn(message: VapiTranscriptMessage): TranscriptTurn | null {
  const text = message.message?.trim()
  if (!text) return null
  const role = (message.role ?? 'assistant').toLowerCase()
  const speaker =
    role === 'user' || role === 'customer'
      ? 'customer'
      : role === 'system'
        ? 'system'
        : 'agent'
  return {
    speaker,
    text,
    timestamp: message.time ? new Date(message.time).toISOString() : new Date().toISOString(),
  }
}

function messagesToTurns(messages: VapiTranscriptMessage[]): TranscriptTurn[] {
  return messages.map(messageToTurn).filter((t): t is TranscriptTurn => t !== null)
}

interface VapiCallContextValue {
  configError: string
  state: VapiCallState
  callId: string | null
  error: string
  turns: TranscriptTurn[]
  isSpeaking: boolean
  speakingRole: 'agent' | 'customer' | null
  volumeLevel: number
  elapsedSec: number
  liveMonitor: LiveMonitorSnapshot
  isConfigured: boolean
  isActive: boolean
  isMicMuted: boolean
  isPushToTalkActive: boolean
  isChatMode: boolean
  acceptanceProfile: CallAcceptanceProfile
  profileSaving: boolean
  startCall: () => Promise<void>
  endCall: () => void
  startTalking: () => void
  stopTalking: () => void
  openChatMode: () => void
  closeChatMode: () => void
  sendTextMessage: (text: string) => void
  setAcceptanceProfile: (profile: CallAcceptanceProfile) => void
  saveAcceptanceProfile: () => Promise<void>
}

const VapiCallContext = createContext<VapiCallContextValue | null>(null)

export function VapiCallProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [config, setConfig] = useState<VapiConfig | null>(null)
  const [configError, setConfigError] = useState('')
  const [state, setState] = useState<VapiCallState>('idle')
  const [callId, setCallId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingRole, setSpeakingRole] = useState<'agent' | 'customer' | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [isMicMuted, setIsMicMuted] = useState(true)
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false)
  const [isChatMode, setIsChatMode] = useState(false)
  const [acceptanceProfile, setAcceptanceProfileState] = useState<CallAcceptanceProfile>(
    () => loadStoredProfile(),
  )
  const [profileSaving, setProfileSaving] = useState(false)

  const vapiRef = useRef<VapiClient | null>(null)
  const acceptanceProfileRef = useRef(acceptanceProfile)
  acceptanceProfileRef.current = acceptanceProfile
  const callIdRef = useRef<string | null>(null)
  const messagesRef = useRef<VapiTranscriptMessage[]>([])
  const startedAtRef = useRef<string | null>(null)
  const assistantIdRef = useRef<string | null>(null)
  const metricsRef = useRef(createLiveMonitorMetrics(null))
  const listenersBoundRef = useRef(false)
  const finalizingRef = useRef(false)
  const endFallbackTimerRef = useRef<number | null>(null)

  useEffect(() => {
    api
      .getVapiConfig()
      .then(setConfig)
      .catch((e) => setConfigError(e instanceof Error ? e.message : 'Failed to load Vapi config'))
  }, [])

  const syncCall = useCallback(
    async (event: 'call.started' | 'call.updated' | 'call.ended') => {
      const id = callIdRef.current
      if (!id) return

      await api.syncCall({
        event,
        call: {
          id,
          source: 'vapi',
          agentVersion: assistantIdRef.current ?? undefined,
          startedAt: startedAtRef.current ?? undefined,
          endedAt: event === 'call.ended' ? new Date().toISOString() : undefined,
          callType: 'web',
          acceptanceProfile: acceptanceProfileRef.current,
          messages: messagesRef.current,
        },
      })
    },
    [],
  )

  const clearEndFallbackTimer = useCallback(() => {
    if (endFallbackTimerRef.current !== null) {
      window.clearTimeout(endFallbackTimerRef.current)
      endFallbackTimerRef.current = null
    }
  }, [])

  const finalizeEndedCall = useCallback(async () => {
    if (finalizingRef.current) return
    finalizingRef.current = true
    clearEndFallbackTimer()

    const id = callIdRef.current
    setState('ending')

    try {
      if (id) await syncCall('call.ended')
      setState('idle')
      setCallId(null)
      setTurns([])
      setIsSpeaking(false)
      setSpeakingRole(null)
      setVolumeLevel(0)
      setIsMicMuted(true)
      setIsPushToTalkActive(false)
      setIsChatMode(false)
      if (id) navigate(`/calls/${id}`, { replace: true })
    } catch (e) {
      setState('error')
      setError(e instanceof Error ? e.message : 'Failed to sync call')
    } finally {
      callIdRef.current = null
      messagesRef.current = []
      startedAtRef.current = null
      metricsRef.current = createLiveMonitorMetrics(null)
      finalizingRef.current = false
    }
  }, [clearEndFallbackTimer, navigate, syncCall])

  const setMicMuted = useCallback((muted: boolean) => {
    vapiRef.current?.setMuted(muted)
    setIsMicMuted(muted)
    if (muted) setIsPushToTalkActive(false)
  }, [])

  const startTalking = useCallback(() => {
    vapiRef.current?.setMuted(false)
    setIsMicMuted(false)
    setIsPushToTalkActive(true)
  }, [])

  const stopTalking = useCallback(() => {
    vapiRef.current?.setMuted(true)
    setIsMicMuted(true)
    setIsPushToTalkActive(false)
  }, [])

  const openChatMode = useCallback(() => {
    setIsChatMode(true)
    stopTalking()
  }, [stopTalking])

  const closeChatMode = useCallback(() => {
    setIsChatMode(false)
    stopTalking()
  }, [stopTalking])

  const sendTextMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !vapiRef.current) return

      vapiRef.current.send({
        type: 'add-message',
        message: { role: 'user', content: trimmed },
        triggerResponseEnabled: true,
      })
    },
    [],
  )

  const setAcceptanceProfile = useCallback((profile: CallAcceptanceProfile) => {
    setAcceptanceProfileState(profile)
    saveStoredProfile(profile)
  }, [])

  const saveAcceptanceProfile = useCallback(async () => {
    const profile = acceptanceProfileRef.current
    saveStoredProfile(profile)
    const id = callIdRef.current
    if (!id) return

    setProfileSaving(true)
    try {
      await api.updateCallProfile(id, profile)
      if (state === 'live') {
        await syncCall('call.updated')
      }
    } finally {
      setProfileSaving(false)
    }
  }, [state, syncCall])

  const beginLiveCall = useCallback(
    (id: string) => {
      if (!isValidCallId(id) || callIdRef.current === id) return

      const startedAt = new Date().toISOString()
      callIdRef.current = id
      startedAtRef.current = startedAt
      metricsRef.current = createLiveMonitorMetrics(startedAt)
      messagesRef.current = []
      setCallId(id)
      setTurns([])
      setState('live')
      setElapsedSec(0)
      setMicMuted(true)
      void syncCall('call.started')
      navigate(`/calls/${id}/live`, { replace: true })
    },
    [navigate, setMicMuted, syncCall],
  )

  const bindVapiListeners = useCallback(
    (vapi: VapiClient) => {
      vapi.removeAllListeners()

      vapi.on('call-start-success', (event) => {
        if (isValidCallId(event.callId)) beginLiveCall(event.callId)
      })

      vapi.on('call-start-failed', (event) => {
        setState('error')
        setError(event.error || 'Failed to start call')
      })

      vapi.on('speech-start', () => {
        setIsSpeaking(true)
        setSpeakingRole('agent')
      })

      vapi.on('speech-end', () => {
        setIsSpeaking(false)
        setSpeakingRole(null)
      })

      vapi.on('volume-level', (level) => {
        setVolumeLevel(level)
        if (level > 0.08) {
          setSpeakingRole((prev) => (prev === 'agent' ? 'agent' : 'customer'))
        }
      })

      vapi.on('message', (message) => {
        if (message.type === 'transcript' && message.transcriptType === 'partial') {
          const role = (message.role ?? '').toLowerCase()
          if (role === 'user') {
            setIsSpeaking(true)
            setSpeakingRole('customer')
          }
          return
        }

        if (message.type === 'conversation-update' && Array.isArray(message.messages)) {
          const entries = conversationMessagesToEntries(message.messages)
          if (entries.length === 0) return

          messagesRef.current = entries
          const nextTurns = messagesToTurns(entries)
          setTurns(nextTurns)

          const lastEntry = entries[entries.length - 1]
          const lastTurn = messageToTurn(lastEntry)
          if (lastTurn && (lastTurn.speaker === 'agent' || lastTurn.speaker === 'customer')) {
            metricsRef.current = recordTurnLatency(
              metricsRef.current,
              lastTurn.speaker,
              lastEntry.time,
            )
          }

          setIsSpeaking(false)
          setSpeakingRole(null)
          void syncCall('call.updated')
          return
        }

        if (message.type !== 'transcript') return
        if (message.transcriptType && message.transcriptType !== 'final') return
        if (!message.transcript?.trim()) return

        const entry: VapiTranscriptMessage = {
          role: message.role,
          message: message.transcript.trim(),
          time: Date.now(),
        }
        messagesRef.current = [...messagesRef.current, entry]
        const nextTurns = messagesToTurns(messagesRef.current)
        setTurns(nextTurns)

        const turn = messageToTurn(entry)
        if (turn && (turn.speaker === 'agent' || turn.speaker === 'customer')) {
          metricsRef.current = recordTurnLatency(metricsRef.current, turn.speaker, entry.time)
        }

        setIsSpeaking(false)
        setSpeakingRole(null)
        void syncCall('call.updated')
      })

      vapi.on('call-end', () => {
        void finalizeEndedCall()
      })

      vapi.on('error', (err) => {
        setState('error')
        setError(err instanceof Error ? err.message : 'Vapi error')
      })
    },
    [beginLiveCall, finalizeEndedCall, syncCall],
  )

  useEffect(() => {
    if (!config) return

    assistantIdRef.current = config.assistantId
    let cancelled = false

    void getVapiClient(config.publicKey)
      .then((vapi) => {
        if (cancelled) return
        vapiRef.current = vapi
        if (!listenersBoundRef.current) {
          bindVapiListeners(vapi)
          listenersBoundRef.current = true
        }
      })
      .catch((e) => {
        setConfigError(e instanceof Error ? e.message : 'Failed to load Vapi SDK')
      })

    return () => {
      cancelled = true
    }
  }, [config, bindVapiListeners])

  useEffect(() => {
    if (state !== 'live' && state !== 'connecting') return
    const interval = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(
          Math.floor((Date.now() - new Date(startedAtRef.current).getTime()) / 1000),
        )
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [state])

  const liveMonitor = useMemo(
    () => computeLiveMonitor(turns, metricsRef.current, acceptanceProfile),
    [turns, elapsedSec, acceptanceProfile],
  )

  const startCall = useCallback(async () => {
    if (!config) return

    setError('')
    setState('connecting')

    try {
      const vapi = vapiRef.current ?? (await getVapiClient(config.publicKey))
      vapiRef.current = vapi
      if (!listenersBoundRef.current) {
        bindVapiListeners(vapi)
        listenersBoundRef.current = true
      }

      const webCall = await vapi.start(config.assistantId)
      const id = webCall?.id
      if (isValidCallId(id)) {
        beginLiveCall(id)
        return
      }

      if (!callIdRef.current) {
        setState('error')
        setError('Call connected but no call ID was returned from Vapi')
      }
    } catch (e) {
      setState('error')
      setError(e instanceof Error ? e.message : 'Failed to start call')
    }
  }, [config, beginLiveCall, bindVapiListeners])

  const endCall = useCallback(() => {
    const vapi = vapiRef.current
    const id = callIdRef.current
    if (!vapi || !id || state === 'ending' || state === 'idle') return

    setState('ending')
    clearEndFallbackTimer()
    vapi.end()

    endFallbackTimerRef.current = window.setTimeout(() => {
      endFallbackTimerRef.current = null
      if (callIdRef.current === id) {
        void finalizeEndedCall()
      }
    }, 2500)
  }, [clearEndFallbackTimer, finalizeEndedCall, state])

  const isConfigured = Boolean(config?.publicKey && config?.assistantId)
  const isActive = state === 'connecting' || state === 'live' || state === 'ending'

  return (
    <VapiCallContext.Provider
      value={{
        configError,
        state,
        callId,
        error,
        turns,
        isSpeaking,
        speakingRole,
        volumeLevel,
        elapsedSec,
        liveMonitor,
        isConfigured,
        isActive,
        isMicMuted,
        isPushToTalkActive,
        isChatMode,
        acceptanceProfile,
        profileSaving,
        startCall,
        endCall,
        startTalking,
        stopTalking,
        openChatMode,
        closeChatMode,
        sendTextMessage,
        setAcceptanceProfile,
        saveAcceptanceProfile,
      }}
    >
      {children}
    </VapiCallContext.Provider>
  )
}

export function useVapiCall() {
  const ctx = useContext(VapiCallContext)
  if (!ctx) throw new Error('useVapiCall must be used within VapiCallProvider')
  return ctx
}
