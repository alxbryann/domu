import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

interface CallNameCellProps {
  callId: string
  name?: string
  onSaved: (name: string | undefined) => void
}

export function CallNameCell({ callId, name, onSaved }: CallNameCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(name ?? '')
  }, [name, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function commit() {
    const trimmed = draft.trim()
    const next = trimmed || undefined
    if (next === name) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      const { call } = await api.updateCallName(callId, trimmed)
      onSaved(call.metadata.name)
      setEditing(false)
    } catch {
      setDraft(name ?? '')
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={120}
        disabled={saving}
        placeholder="Ej. PTP aceptado, amenaza legal…"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            void commit()
          }
          if (e.key === 'Escape') {
            setDraft(name ?? '')
            setEditing(false)
          }
        }}
        className="w-full min-w-[10rem] max-w-[16rem] rounded-domu-md border border-domu-blue/40 bg-app-bg px-2 py-1 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-domu-blue/50"
      />
    )
  }

  return (
    <button
      type="button"
      title="Click to edit label"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      className={[
        'text-left text-sm max-w-[16rem] truncate rounded-domu-md px-2 py-1 -mx-2 transition-colors',
        name
          ? 'text-app-text font-medium hover:bg-app-hover'
          : 'text-app-muted italic hover:bg-app-hover hover:text-app-text-secondary',
      ].join(' ')}
    >
      {name || 'Add label…'}
    </button>
  )
}
