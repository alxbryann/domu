import { evaluateTranscript } from '../eval/judge.js'
import { buildTranscript, type CallWebhookPayload } from '../eval/call-ingest.js'
import { parseCallsExport } from '../eval/call-export-parse.js'
import { TranscriptSchema, type Transcript, type EvalResult } from '../eval/types.js'
import { persistCallRecording } from './call-recording.js'
import { getSupabase } from './supabase.js'
import { applyEscalationAlerts } from './escalation-alerts.js'

type CallRow = {
  id: string
  source: Transcript['source']
  status: Transcript['status']
  metadata: Transcript['metadata']
  turns: Transcript['turns']
}

type EvalResultRow = {
  id: string
  transcript_id: string
  evaluated_at: string
  judge_version: string
  criteria_profile_id: string | null
  criteria: EvalResult['criteria']
  rule_violations: EvalResult['ruleViolations']
  judge_disagreement: boolean
  weighted_score: number
  overall_pass: boolean
  compliance_pass: boolean
  summary: string
  flagged_quotes: EvalResult['flaggedQuotes']
}

function rowToTranscript(row: CallRow): Transcript {
  return TranscriptSchema.parse({
    id: row.id,
    source: row.source,
    status: row.status,
    metadata: row.metadata ?? {},
    turns: row.turns ?? [],
  })
}

function transcriptToRow(transcript: Transcript): CallRow {
  return {
    id: transcript.id,
    source: transcript.source,
    status: transcript.status,
    metadata: transcript.metadata,
    turns: transcript.turns,
  }
}

function rowToResult(row: EvalResultRow): EvalResult {
  return {
    id: row.id,
    transcriptId: row.transcript_id,
    evaluatedAt: row.evaluated_at,
    judgeVersion: row.judge_version,
    criteriaProfileId: row.criteria_profile_id ?? undefined,
    criteria: row.criteria ?? [],
    ruleViolations: row.rule_violations ?? [],
    judgeDisagreement: row.judge_disagreement,
    weightedScore: Number(row.weighted_score),
    overallPass: row.overall_pass,
    compliancePass: row.compliance_pass,
    summary: row.summary ?? '',
    flaggedQuotes: row.flagged_quotes ?? [],
  }
}

function resultToRow(result: EvalResult): EvalResultRow {
  return {
    id: result.id,
    transcript_id: result.transcriptId,
    evaluated_at: result.evaluatedAt,
    judge_version: result.judgeVersion,
    criteria_profile_id: result.criteriaProfileId ?? null,
    criteria: result.criteria,
    rule_violations: result.ruleViolations,
    judge_disagreement: result.judgeDisagreement,
    weighted_score: result.weightedScore,
    overall_pass: result.overallPass,
    compliance_pass: result.compliancePass,
    summary: result.summary,
    flagged_quotes: result.flaggedQuotes,
  }
}

export async function saveTranscript(transcript: Transcript): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('calls').upsert(transcriptToRow(transcript), {
    onConflict: 'id',
  })
  if (error) throw new Error(`Failed to save call ${transcript.id}: ${error.message}`)
}

export async function loadTranscript(id: string): Promise<Transcript | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('calls').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load call ${id}: ${error.message}`)
  if (!data) return null
  return rowToTranscript(data as CallRow)
}

export async function saveResult(result: EvalResult): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('eval_results').upsert(resultToRow(result), {
    onConflict: 'transcript_id',
  })
  if (error) throw new Error(`Failed to save eval result ${result.transcriptId}: ${error.message}`)
}

export async function loadResult(transcriptId: string): Promise<EvalResult | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('eval_results')
    .select('*')
    .eq('transcript_id', transcriptId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load eval result ${transcriptId}: ${error.message}`)
  if (!data) return null
  return rowToResult(data as EvalResultRow)
}

export async function listTranscripts(): Promise<Transcript[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`Failed to list calls: ${error.message}`)
  return (data as CallRow[]).map(rowToTranscript)
}

export async function listResults(): Promise<EvalResult[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('eval_results')
    .select('*')
    .order('evaluated_at', { ascending: false })
  if (error) throw new Error(`Failed to list eval results: ${error.message}`)
  return (data as EvalResultRow[]).map(rowToResult)
}

export async function ingestCallEvent(payload: CallWebhookPayload): Promise<{
  transcript: Transcript
  result: EvalResult | null
}> {
  const existing = await loadTranscript(payload.call.id)
  let transcript = buildTranscript(payload, existing ?? undefined)
  transcript = await applyEscalationAlerts(existing, transcript)
  await saveTranscript(transcript)

  if (payload.event !== 'call.ended') {
    return { transcript, result: await loadResult(transcript.id) }
  }

  transcript = await persistCallRecording(transcript)
  await saveTranscript(transcript)

  if (transcript.turns.length === 0) {
    const completed: Transcript = { ...transcript, status: 'completed' }
    await saveTranscript(completed)
    return { transcript: completed, result: null }
  }

  const result = await evaluateTranscript(transcript)
  await saveResult(result)

  const completed: Transcript = { ...transcript, status: 'completed' }
  await saveTranscript(completed)

  return { transcript: completed, result }
}

export async function importCallsExport(raw: unknown): Promise<
  Array<{ call: Transcript; result: EvalResult | null }>
> {
  const payloads = parseCallsExport(raw)
  const imported = []
  for (const payload of payloads) {
    imported.push(await ingestCallEvent(payload))
  }
  return imported
}
