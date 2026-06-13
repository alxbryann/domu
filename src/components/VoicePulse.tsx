interface VoicePulseProps {
  isSpeaking: boolean
  speakingRole: 'agent' | 'customer' | null
  volumeLevel: number
  className?: string
}

const BAR_COUNT = 24

export function VoicePulse({ isSpeaking, speakingRole, volumeLevel, className = '' }: VoicePulseProps) {
  const isAgent = speakingRole === 'agent'
  const isUser = speakingRole === 'customer'

  const roleColor = isAgent ? '#0145F2' : isUser ? '#00AD7D' : '#A2A9C5'

  // Agent: slower, center-out ripple (AI "broadcasting" feel)
  // User: faster, left-to-right wave (natural human voice)
  const baseDuration = isAgent ? 1100 : 720
  const duration = isSpeaking ? Math.max(450, baseDuration - volumeLevel * 320) : 2800

  const animName = isSpeaking
    ? (isAgent ? 'voice-bar-agent' : 'voice-bar-user')
    : 'voice-bar-idle'

  const getBarDelay = (i: number) => {
    if (!isSpeaking) return (i / BAR_COUNT) * 1200
    if (isAgent) {
      // center-out: bars closest to center lead, edges trail
      const distFromCenter = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2)
      return distFromCenter * duration * 0.5
    }
    // user: left-to-right + slight organic offset using prime-ish spread
    return (i / BAR_COUNT) * duration * 0.55 + (i % 3) * 25
  }

  const label = isAgent
    ? 'Agent speaking'
    : isUser
      ? 'You'
      : isSpeaking
        ? 'Voice activity'
        : 'Listening…'

  const ringDuration = isAgent ? '2s' : '1.3s'

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-500"
        style={{
          width: 280,
          height: 280,
          background: `radial-gradient(circle, ${roleColor}${isSpeaking ? '28' : '12'} 0%, transparent 70%)`,
          filter: 'blur(24px)',
          transform: `scale(${1 + volumeLevel * 0.12})`,
        }}
      />

      {/* Expanding ring — only when speaking */}
      {isSpeaking && (
        <>
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 196,
              height: 196,
              border: `1px solid ${roleColor}50`,
              animation: `voice-ring-pulse ${ringDuration} ease-out infinite`,
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 196,
              height: 196,
              border: `1px solid ${roleColor}30`,
              animation: `voice-ring-pulse ${ringDuration} ease-out ${isAgent ? '0.9s' : '0.55s'} infinite`,
            }}
          />
        </>
      )}

      {/* Orb */}
      <div
        className="relative rounded-full border flex items-center justify-center transition-all duration-400"
        style={{
          width: 180,
          height: 180,
          borderColor: `${roleColor}${isSpeaking ? '60' : '28'}`,
          boxShadow: isSpeaking
            ? `0 0 ${20 + volumeLevel * 36}px ${roleColor}40, inset 0 0 28px ${roleColor}18`
            : `0 0 10px ${roleColor}14`,
          background: `radial-gradient(circle at 32% 32%, ${roleColor}${isSpeaking ? '20' : '10'}, transparent 60%)`,
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease, background 0.5s ease',
        }}
      >
        <div className="flex items-end justify-center gap-1 h-16">
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 64,
                borderRadius: 3,
                backgroundColor: roleColor,
                transformOrigin: 'bottom center',
                animation: `${animName} ${duration}ms ease-in-out ${getBarDelay(i)}ms infinite`,
                transition: 'background-color 0.4s ease',
              }}
            />
          ))}
        </div>
      </div>

      <p
        className="mt-5 text-sm font-medium transition-all duration-300"
        style={{ color: isSpeaking ? roleColor : undefined }}
      >
        {label}
      </p>
    </div>
  )
}
