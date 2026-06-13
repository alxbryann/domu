import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AcceptanceProfileEditor } from '../components/AcceptanceProfileEditor'
import { Badge } from '../design-system/components/Badge'
import { Button } from '../design-system/components/Button'
import { ScoreRing } from '../design-system/components/ScoreRing'
import { CriterionCard } from '../design-system/components/CriterionCard'
import { TranscriptViewer } from '../design-system/components/TranscriptViewer'
import { ComplianceAlert } from '../design-system/components/ComplianceAlert'
import { SectionLabel } from '../design-system/components/SectionLabel'
import { EvalDetailSkeleton } from '../design-system/components/EvalDetailSkeleton'
import { api } from '../lib/api'
import { downloadCallReport } from '../lib/call-report'
import type { CallStatus, EvalResult, Transcript } from '../types'
import {
  DEFAULT_ACCEPTANCE_PROFILE,
  type CallAcceptanceProfile,
} from '../../shared/acceptance-profile'

const STATUS_LABEL: Record<CallStatus, string> = {
  live: 'Live',
  evaluating: 'Evaluating',
  completed: 'Completed',
}

export function EvalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [call, setCall] = useState<Transcript | null>(null)
  const [result, setResult] = useState<EvalResult | null>(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<CallAcceptanceProfile>(DEFAULT_ACCEPTANCE_PROFILE)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingError, setRecordingError] = useState('')

  useEffect(() => {
    if (!id) return

    function load() {
      api.getCall(id!).then((data) => {
        setCall(data.call)
        setResult(data.result)
        if (!profileDirty) {
          setProfile(data.call.metadata.acceptanceProfile ?? DEFAULT_ACCEPTANCE_PROFILE)
        }
      }).catch((e) => setError(e.message))
    }

    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id, profileDirty])

  useEffect(() => {
    if (!id || !call?.metadata.recordingStoragePath) {
      setRecordingUrl(null)
      return
    }

    let cancelled = false
    setRecordingError('')

    api
      .getCallRecordingUrl(id)
      .then(({ url }) => {
        if (!cancelled) setRecordingUrl(url)
      })
      .catch((e) => {
        if (!cancelled) {
          setRecordingUrl(null)
          setRecordingError(e instanceof Error ? e.message : 'Failed to load recording')
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, call?.metadata.recordingStoragePath])

  async function saveProfile() {
    if (!id) return
    setProfileSaving(true)
    try {
      const { call: updated } = await api.updateCallProfile(id, profile)
      setCall(updated)
      setProfileDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  if (error) return <div className="p-8 text-domu-danger">{error}</div>
  if (!call) return <EvalDetailSkeleton />

  const allQuotes = [
    ...(result?.flaggedQuotes ?? []),
    ...(result?.criteria.flatMap((c) => c.evidence) ?? []),
  ]

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/calls" className="text-xs text-domu-blue hover:underline">
            ← Back to calls
          </Link>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="text-2xl font-bold text-app-text">
              {call.metadata.name ?? call.id}
            </h1>
            {call.metadata.name && (
              <span className="text-xs font-mono text-app-muted">{call.id}</span>
            )}
            <Badge
              variant={
                call.status === 'live'
                  ? 'success'
                  : call.status === 'evaluating'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {STATUS_LABEL[call.status]}
            </Badge>
          </div>
          <p className="text-app-muted text-sm mt-1">
            {call.metadata.accountId ? `Account ${call.metadata.accountId}` : 'Collections call'}
            {call.metadata.agentVersion ? ` · Agent ${call.metadata.agentVersion}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {result && (
            <div className="flex items-center gap-4">
              <ScoreRing score={result.weightedScore} label="Weighted Score" />
              <div className="space-y-2">
                <Badge variant={result.compliancePass ? 'success' : 'danger'}>
                  {result.compliancePass ? 'Compliance: Pass' : 'Compliance: Fail'}
                </Badge>
                <Badge variant={result.overallPass ? 'success' : 'danger'}>
                  {result.overallPass ? 'Overall: Pass' : 'Overall: Fail'}
                </Badge>
              </div>
            </div>
          )}
          {call.status !== 'live' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCallReport(call, result)}
            >
              Descargar reporte (Word)
            </Button>
          )}
        </div>
      </div>

      {call.status === 'live' && (
        <div className="space-y-3">
          <ComplianceAlert
            variant="warning"
            title="Call in progress"
            message="Transcript updates as the conversation continues. QA eval runs automatically when the call ends."
          />
          <Link
            to={`/calls/${call.id}/live`}
            className="inline-flex text-sm text-domu-blue hover:underline font-medium"
          >
            Open live monitor →
          </Link>
        </div>
      )}

      {call.status === 'evaluating' && (
        <ComplianceAlert
          variant="warning"
          title="Evaluating call"
          message="The LLM judge is scoring this call. Results will appear shortly."
        />
      )}

      {result?.judgeDisagreement && (
        <ComplianceAlert
          variant="warning"
          title="Judge Disagreement Detected"
          message="Rule-based checks or the second judge disagreed with the primary judge's verdict. Human review recommended."
        />
      )}

      {result?.crossJudge && (
        <ComplianceAlert
          variant={result.crossJudge.agreement ? 'success' : 'warning'}
          title={
            result.crossJudge.agreement
              ? `Second judge agrees (${result.crossJudge.judgeVersion})`
              : `Second judge disagrees (${result.crossJudge.judgeVersion})`
          }
          message={
            result.crossJudge.agreement
              ? `Independent cross-check confirmed the verdict. Both judges agree on compliance and overall pass/fail (max criterion gap: ${result.crossJudge.maxScoreDelta} pts).`
              : `Primary: overall ${result.overallPass ? 'PASS' : 'FAIL'} / compliance ${result.compliancePass ? 'PASS' : 'FAIL'}. ` +
                `Second judge: overall ${result.crossJudge.overallPass ? 'PASS' : 'FAIL'} / compliance ${result.crossJudge.compliancePass ? 'PASS' : 'FAIL'} ` +
                `(max criterion gap: ${result.crossJudge.maxScoreDelta} pts). Human review recommended.`
          }
        />
      )}

      {result && !result.compliancePass && (
        <ComplianceAlert
          variant="danger"
          title="Compliance Failure"
          message={result.summary}
        />
      )}

      {(recordingUrl || call.metadata.recordingStoragePath) && (
        <div className="rounded-domu-lg bg-app-card border border-app-border p-5 transition-colors">
          <SectionLabel variant="outline">Call recording</SectionLabel>
          {recordingUrl ? (
            <audio controls preload="metadata" className="mt-3 w-full" src={recordingUrl}>
              Your browser does not support audio playback.
            </audio>
          ) : (
            <p className="text-xs text-app-muted mt-3">
              {recordingError || 'Processing recording…'}
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-domu-lg bg-app-card border border-app-border p-5 transition-colors">
          <SectionLabel variant="outline">Summary</SectionLabel>
          <p className="text-app-text-secondary text-sm mt-3 leading-relaxed">{result.summary}</p>
          {result.ruleViolations.length > 0 && (
            <div className="mt-4 space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-app-muted">
                Rule Violations
              </span>
              {result.ruleViolations.map((v, i) => (
                <div key={i} className="text-xs text-domu-danger bg-domu-danger/10 rounded-domu-md p-2">
                  <strong>{v.ruleId}:</strong> {v.description} — matched "{v.matchedText}"
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-domu-lg bg-app-card border border-app-border p-5 transition-colors">
        <SectionLabel variant="outline">Acceptance profile</SectionLabel>
        <p className="text-xs text-app-muted mt-2 mb-4">
          Edita los datos de referencia y reglas usados para medir esta llamada. Guarda cambios para
          futuras revisiones.
        </p>
        <AcceptanceProfileEditor
          profile={profile}
          onChange={(next) => {
            setProfile(next)
            setProfileDirty(true)
          }}
          onSave={() => saveProfile()}
          saving={profileSaving}
          disabled={call.status === 'evaluating'}
        />
        {profileDirty && (
          <p className="text-xs text-domu-warning mt-2">Unsaved changes — save to persist.</p>
        )}
      </div>

      <div className="rounded-domu-lg bg-app-card border border-app-border p-5 transition-colors">
        <h2 className="text-sm font-semibold text-app-text mb-4">Transcript</h2>
        <TranscriptViewer turns={call.turns} highlightedQuotes={allQuotes} />
      </div>

      {result && (
        <div>
          <h2 className="text-sm font-semibold text-app-text mb-4">Criterion Scores</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.criteria.map((c) => (
              <CriterionCard
                key={c.criterionId}
                name={c.criterionName ?? c.criterionId}
                weight={c.weight}
                result={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
