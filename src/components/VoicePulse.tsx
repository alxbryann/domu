interface VoicePulseProps {
  isSpeaking: boolean
  speakingRole: 'agent' | 'customer' | null
  volumeLevel: number
  className?: string
}

export function VoicePulse({
  isSpeaking,
  speakingRole,
  volumeLevel,
  className = '',
}: VoicePulseProps) {
  const intensity = isSpeaking ? 0.55 + volumeLevel * 0.45 : 0.18 + volumeLevel * 0.2
  const roleColor =
    speakingRole === 'agent'
      ? '#0145F2'
      : speakingRole === 'customer'
        ? '#00AD7D'
        : '#646E95'

  const bars = Array.from({ length: 24 }, (_, i) => {
    const offset = Math.abs(12 - i) / 12
    const wave = isSpeaking
      ? intensity * (1 - offset * 0.35) * (0.7 + Math.sin(i * 0.9) * 0.3)
      : 0.12 + volumeLevel * 0.08
    return Math.max(0.08, Math.min(1, wave))
  })

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <div
        className="absolute rounded-full blur-3xl transition-all duration-300"
        style={{
          width: 220 + intensity * 80,
          height: 220 + intensity * 80,
          background: `radial-gradient(circle, ${roleColor}33 0%, transparent 70%)`,
          transform: `scale(${1 + intensity * 0.15})`,
        }}
      />

      <div
        className="relative rounded-full border transition-all duration-300 flex items-center justify-center"
        style={{
          width: 180,
          height: 180,
          borderColor: `${roleColor}55`,
          boxShadow: isSpeaking
            ? `0 0 ${30 + intensity * 40}px ${roleColor}44, inset 0 0 40px ${roleColor}22`
            : `0 0 20px ${roleColor}22`,
          background: `radial-gradient(circle at 30% 30%, ${roleColor}33, transparent 60%)`,
          transform: `scale(${1 + intensity * 0.08})`,
        }}
      >
        <div className="flex items-end justify-center gap-1 h-16">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full transition-all duration-150"
              style={{
                height: `${h * 64}px`,
                backgroundColor: roleColor,
                opacity: 0.35 + h * 0.65,
              }}
            />
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-app-text-secondary">
        {speakingRole === 'agent'
          ? 'Agent speaking'
          : speakingRole === 'customer'
            ? 'Customer speaking'
            : isSpeaking
              ? 'Voice activity'
              : 'Listening…'}
      </p>
    </div>
  )
}
