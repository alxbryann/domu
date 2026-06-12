import type { TranscriptTurn } from '../../types'

interface TranscriptViewerProps {
  turns: TranscriptTurn[]
  highlightedQuotes?: string[]
  className?: string
}

function isHighlighted(text: string, quotes: string[]): boolean {
  const lower = text.toLowerCase()
  return quotes.some((q) => lower.includes(q.toLowerCase()) || q.toLowerCase().includes(lower))
}

export function TranscriptViewer({
  turns,
  highlightedQuotes = [],
  className = '',
}: TranscriptViewerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {turns.map((turn, i) => {
        const highlighted = isHighlighted(turn.text, highlightedQuotes)
        const isAgent = turn.speaker === 'agent'
        const isSystem = turn.speaker === 'system'

        return (
          <div
            key={i}
            className={[
              'flex gap-3 p-3 rounded-domu-md border transition-colors',
              isAgent
                ? 'bg-domu-blue/8 border-domu-blue/20 dark:bg-domu-blue/15 dark:border-domu-blue/30'
                : isSystem
                  ? 'bg-domu-warning/8 border-domu-warning/20'
                  : 'bg-app-hover border-app-border',
              highlighted ? 'ring-2 ring-domu-danger/50 bg-domu-danger/8' : '',
            ].join(' ')}
          >
            <span className="text-xs font-mono font-medium uppercase tracking-wider w-20 shrink-0 pt-0.5 text-app-muted">
              {turn.speaker}
            </span>
            <p className={`text-sm leading-relaxed text-app-text ${highlighted ? 'font-medium' : ''}`}>
              {turn.text}
            </p>
          </div>
        )
      })}
    </div>
  )
}
