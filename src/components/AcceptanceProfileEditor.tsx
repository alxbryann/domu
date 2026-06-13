import { useState } from 'react'
import type { AcceptanceRule, CallAcceptanceProfile } from '../../shared/acceptance-profile'
import {
  createCustomAcceptanceRule,
  isCustomAcceptanceRule,
} from '../../shared/acceptance-profile'
import { Badge } from '../design-system/components/Badge'
import { Button } from '../design-system/components/Button'
import { SectionLabel } from '../design-system/components/SectionLabel'

interface AcceptanceProfileEditorProps {
  profile: CallAcceptanceProfile
  onChange: (profile: CallAcceptanceProfile) => void
  onSave?: () => void | Promise<void>
  disabled?: boolean
  /** Lock text inputs during live call so Space triggers push-to-talk, not typing. */
  lockInputs?: boolean
  compact?: boolean
  saving?: boolean
}

const RULE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  compliance: 'neutral',
  factual: 'success',
  procedure: 'warning',
}

const RULE_CATEGORIES: AcceptanceRule['category'][] = ['compliance', 'factual', 'procedure']

export function AcceptanceProfileEditor({
  profile,
  onChange,
  onSave,
  disabled = false,
  lockInputs = false,
  compact = false,
  saving = false,
}: AcceptanceProfileEditorProps) {
  const [showRules, setShowRules] = useState(!compact)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRuleLabel, setNewRuleLabel] = useState('')
  const [newRuleDescription, setNewRuleDescription] = useState('')
  const [newRuleCategory, setNewRuleCategory] = useState<AcceptanceRule['category']>('procedure')

  const inputsLocked = disabled || lockInputs

  function updateFact(id: string, patch: Partial<CallAcceptanceProfile['facts'][0]>) {
    onChange({
      ...profile,
      facts: profile.facts.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })
  }

  function updateRule(id: string, enabled: boolean) {
    onChange({
      ...profile,
      rules: profile.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
    })
  }

  function removeRule(id: string) {
    onChange({
      ...profile,
      rules: profile.rules.filter((r) => r.id !== id),
    })
  }

  function addRule() {
    const label = newRuleLabel.trim()
    const description = newRuleDescription.trim()
    if (!label || !description) return

    onChange({
      ...profile,
      rules: [...profile.rules, createCustomAcceptanceRule(label, description, newRuleCategory)],
    })
    setNewRuleLabel('')
    setNewRuleDescription('')
    setNewRuleCategory('procedure')
    setShowAddRule(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel variant="outline">Account data (ground truth)</SectionLabel>
        <p className="text-xs text-app-muted mt-2 mb-3">
          Datos verificados para detectar alucinaciones del agente — montos, nombres, fechas.
          {lockInputs && (
            <span className="block mt-1 text-domu-blue">
              Configura antes de la llamada. Durante la llamada usa Espacio para hablar o doble Espacio para escribir.
            </span>
          )}
        </p>
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {profile.facts.map((fact) => (
            <label key={fact.id} className="block space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-app-text-secondary">{fact.label}</span>
                <input
                  type="checkbox"
                  checked={fact.enabled}
                  disabled={inputsLocked}
                  onChange={(e) => updateFact(fact.id, { enabled: e.target.checked })}
                  className="rounded border-app-border"
                  title="Include in checks"
                />
              </div>
              <input
                type={fact.kind === 'date' ? 'date' : 'text'}
                value={fact.value}
                disabled={inputsLocked || !fact.enabled}
                onChange={(e) => updateFact(fact.id, { value: e.target.value })}
                className="w-full rounded-domu-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text disabled:opacity-50"
                placeholder={fact.label}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-app-text hover:text-domu-blue transition-colors"
        >
          <span>{showRules ? '▼' : '▶'}</span>
          Acceptance rules ({profile.rules.filter((r) => r.enabled).length} active)
        </button>
        {showRules && (
          <div className="mt-3 space-y-2">
            {profile.rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start gap-3 rounded-domu-md bg-app-hover px-3 py-2"
              >
                <label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    disabled={disabled}
                    onChange={(e) => updateRule(rule.id, e.target.checked)}
                    className="mt-1 rounded border-app-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-app-text">{rule.label}</span>
                      <Badge variant={RULE_VARIANT[rule.category] ?? 'neutral'}>{rule.category}</Badge>
                      {isCustomAcceptanceRule(rule.id) && (
                        <Badge variant="neutral">custom</Badge>
                      )}
                    </div>
                    <p className="text-xs text-app-muted mt-0.5">{rule.description}</p>
                  </div>
                </label>
                {isCustomAcceptanceRule(rule.id) && !lockInputs && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeRule(rule.id)}
                    className="text-xs text-app-muted hover:text-domu-danger shrink-0 mt-1"
                    title="Remove custom rule"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {!lockInputs && (
              <div className="pt-2">
                {showAddRule ? (
                  <div className="rounded-domu-md border border-app-border bg-app-bg p-3 space-y-3">
                    <p className="text-xs font-medium text-app-text-secondary">New acceptance rule</p>
                    <input
                      type="text"
                      value={newRuleLabel}
                      disabled={disabled}
                      onChange={(e) => setNewRuleLabel(e.target.value)}
                      placeholder="Rule name (e.g. Payment plan offered)"
                      className="w-full rounded-domu-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text disabled:opacity-50"
                    />
                    <textarea
                      value={newRuleDescription}
                      disabled={disabled}
                      onChange={(e) => setNewRuleDescription(e.target.value)}
                      rows={2}
                      placeholder="What the agent must do or avoid (used by the post-call judge)"
                      className="w-full rounded-domu-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text disabled:opacity-50 resize-none"
                    />
                    <select
                      value={newRuleCategory}
                      disabled={disabled}
                      onChange={(e) =>
                        setNewRuleCategory(e.target.value as AcceptanceRule['category'])
                      }
                      className="w-full rounded-domu-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text disabled:opacity-50"
                    >
                      {RULE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={addRule}
                        disabled={disabled || !newRuleLabel.trim() || !newRuleDescription.trim()}
                      >
                        Add rule
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddRule(false)} disabled={disabled}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowAddRule(true)} disabled={disabled}>
                    + Add custom rule
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-app-text-secondary">QA notes</span>
          <textarea
            value={profile.notes ?? ''}
            disabled={inputsLocked}
            onChange={(e) => onChange({ ...profile, notes: e.target.value })}
            rows={2}
            className="w-full rounded-domu-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text disabled:opacity-50 resize-none"
            placeholder="Context for reviewers…"
          />
        </label>
      )}

      {onSave && (
        <Button variant="outline" onClick={() => void onSave()} disabled={disabled || saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      )}
    </div>
  )
}
