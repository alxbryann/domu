import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../design-system/components/Badge'
import { Button } from '../design-system/components/Button'
import { ComplianceAlert } from '../design-system/components/ComplianceAlert'
import { DataTable } from '../design-system/components/DataTable'
import { SectionLabel } from '../design-system/components/SectionLabel'
import { VapiLiveCallPanel } from '../components/VapiLiveCallPanel'
import { api } from '../lib/api'
import type { CallStatus, CallWithResult } from '../types'

type Filter = 'all' | CallStatus

const STATUS_LABEL: Record<CallStatus, string> = {
  live: 'Live',
  evaluating: 'Evaluating',
  completed: 'Completed',
}

const STATUS_VARIANT: Record<CallStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  live: 'success',
  evaluating: 'warning',
  completed: 'neutral',
}

export function CallsPage() {
  const [calls, setCalls] = useState<CallWithResult[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function loadCalls() {
    return api.getCalls().then(setCalls)
  }

  useEffect(() => {
    loadCalls().catch((e) => setError(e.message))
    const interval = setInterval(() => {
      loadCalls().catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleImportFile(file: File) {
    setImporting(true)
    setImportError('')
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const { imported, calls: importedCalls } = await api.importCalls(payload)
      await loadCalls()
      if (imported === 1 && importedCalls[0]) {
        navigate(`/calls/${importedCalls[0].call.id}`)
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filtered = useMemo(
    () => (filter === 'all' ? calls : calls.filter((c) => c.status === filter)),
    [calls, filter],
  )

  const liveCount = calls.filter((c) => c.status === 'live').length

  if (error) {
    return <div className="p-8 text-domu-danger">Failed to load: {error}</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <SectionLabel variant="outline">Calls</SectionLabel>
          <h1 className="text-2xl font-bold text-app-text mt-3">Agent Calls</h1>
          <p className="text-app-muted text-sm mt-1">
            Live and completed calls from Domu voice agents — eval runs automatically when a call ends
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImportFile(file)
          }}
        />
        <Button
          variant="primary"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? 'Importing…' : 'Import call'}
        </Button>
      </div>

      {importError && (
        <ComplianceAlert variant="danger" title="Import Failed" message={importError} />
      )}

      <VapiLiveCallPanel />

      <div className="flex gap-2 flex-wrap">
        {(['all', 'live', 'evaluating', 'completed'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={[
              'px-3 py-1.5 rounded-domu-md text-xs font-medium transition-colors',
              filter === key
                ? 'bg-domu-blue/15 text-domu-blue border border-domu-blue/30'
                : 'bg-app-hover text-app-muted hover:text-app-text',
            ].join(' ')}
          >
            {key === 'all' ? 'All' : STATUS_LABEL[key]}
            {key === 'live' && liveCount > 0 ? ` (${liveCount})` : ''}
          </button>
        ))}
      </div>

      <div className="rounded-domu-lg bg-app-card border border-app-border p-5 transition-colors">
        <DataTable<CallWithResult>
          data={filtered}
          emptyMessage="No calls yet. Start a live Vapi call or import a Vapi export JSON."
          onRowClick={(c) => navigate(`/calls/${c.id}`)}
          columns={[
            {
              key: 'id',
              header: 'Call ID',
              render: (c) => <span className="text-app-text font-medium">{c.id}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (c) => (
                <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
              ),
            },
            {
              key: 'account',
              header: 'Account',
              render: (c) => (
                <span className="text-app-text-secondary">{c.metadata.accountId ?? '—'}</span>
              ),
            },
            {
              key: 'agent',
              header: 'Agent',
              render: (c) => (
                <span className="text-app-text-secondary">{c.metadata.agentVersion ?? '—'}</span>
              ),
            },
            {
              key: 'score',
              header: 'Score',
              render: (c) =>
                c.result ? (
                  <span className="font-medium">{c.result.weightedScore}/5</span>
                ) : c.status === 'live' ? (
                  <span className="text-app-muted">In progress</span>
                ) : c.status === 'evaluating' ? (
                  <span className="text-domu-warning">Scoring…</span>
                ) : (
                  <span className="text-app-muted">—</span>
                ),
            },
            {
              key: 'compliance',
              header: 'Compliance',
              render: (c) =>
                c.result ? (
                  <Badge variant={c.result.compliancePass ? 'success' : 'danger'}>
                    {c.result.compliancePass ? 'Pass' : 'Fail'}
                  </Badge>
                ) : (
                  <Badge variant="neutral">—</Badge>
                ),
            },
            {
              key: 'date',
              header: 'Started',
              render: (c) => (
                <span className="text-app-muted">
                  {c.metadata.callDate
                    ? new Date(c.metadata.callDate).toLocaleString()
                    : '—'}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
