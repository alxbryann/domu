import { useState } from 'react'
import { Button } from '../design-system/components/Button'
import { ComplianceAlert } from '../design-system/components/ComplianceAlert'
import { api } from '../lib/api'

type Label = 'auto' | 'good' | 'bad' | 'edge'

const LABELS: { key: Label; text: string }[] = [
  { key: 'auto', text: 'Auto' },
  { key: 'good', text: 'Good' },
  { key: 'bad', text: 'Bad' },
  { key: 'edge', text: 'Edge' },
]

const EXAMPLES = [
  'A fully compliant call where the agent verifies identity, gives the mini-Miranda, and secures a promise to pay.',
  'A non-compliant call where the agent threatens wage garnishment and jail.',
  'The agent stays polite but invents a wrong balance and offers a fake settlement plan.',
  'The customer says they have retained an attorney, but the agent keeps demanding payment.',
]

interface GenerateCallPanelProps {
  onGenerated: (id: string) => void
  onClose: () => void
}

export function GenerateCallPanel({ onGenerated, onClose }: GenerateCallPanelProps) {
  const [scenario, setScenario] = useState('')
  const [label, setLabel] = useState<Label>('auto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!scenario.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const { call } = await api.generateCall({
        scenario: scenario.trim(),
        expectedLabel: label === 'auto' ? undefined : label,
      })
      onGenerated(call.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-domu-lg bg-app-card border border-domu-blue/30 p-5 space-y-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Generate a synthetic call</p>
          <p className="text-xs text-app-muted mt-1">
            Describe a scenario — an LLM invents the transcript, then the eval scores it automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="text-xs text-app-muted hover:text-app-text transition-colors disabled:opacity-50"
        >
          Close
        </button>
      </div>

      <textarea
        value={scenario}
        disabled={loading}
        onChange={(e) => setScenario(e.target.value)}
        rows={3}
        placeholder="e.g. The agent threatens the customer with arrest if they don't pay today."
        className="w-full rounded-domu-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-muted resize-y disabled:opacity-50"
      />

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => setScenario(ex)}
            className="px-2.5 py-1 rounded-domu-md text-[11px] bg-app-hover text-app-muted hover:text-app-text transition-colors disabled:opacity-50 text-left max-w-full truncate"
            title={ex}
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-app-muted">Intended:</span>
          <div className="flex gap-1.5">
            {LABELS.map(({ key, text }) => (
              <button
                key={key}
                type="button"
                disabled={loading}
                onClick={() => setLabel(key)}
                className={[
                  'px-3 py-1.5 rounded-domu-md text-xs font-medium transition-colors disabled:opacity-50',
                  label === key
                    ? 'bg-domu-blue/15 text-domu-blue border border-domu-blue/30'
                    : 'bg-app-hover text-app-muted hover:text-app-text',
                ].join(' ')}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" disabled={loading || !scenario.trim()} onClick={handleGenerate}>
          {loading ? 'Generating & scoring…' : 'Generate & score'}
        </Button>
      </div>

      {error && <ComplianceAlert variant="danger" title="Generation Failed" message={error} />}
    </div>
  )
}
