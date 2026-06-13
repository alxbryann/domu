import { useEffect, useRef, useState } from 'react'
import { Button } from '../design-system/components/Button'

interface CallChatInputProps {
  onSend: (message: string) => void
  onClose: () => void
  disabled?: boolean
}

export function CallChatInput({ onSend, onClose, disabled = false }: CallChatInputProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSend() {
    const text = draft.trim()
    if (!text || disabled) return
    onSend(text)
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div className="w-full max-w-lg mx-auto rounded-domu-lg border border-domu-blue/30 bg-app-card p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-app-text">Escribir al agente</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-app-muted hover:text-app-text transition-colors"
        >
          Esc para volver a voz
        </button>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Escribe tu mensaje…"
          className="flex-1 rounded-domu-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text disabled:opacity-50"
        />
        <Button variant="primary" onClick={handleSend} disabled={disabled || !draft.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  )
}
