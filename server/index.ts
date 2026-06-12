import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { CallAcceptanceProfileSchema } from '../shared/acceptance-profile.js'
import { CallWebhookSchema } from '../eval/call-ingest.js'
import {
  ingestCallEvent,
  importCallsExport,
  listResults,
  listTranscripts,
  loadResult,
  loadTranscript,
  saveTranscript,
} from './call-store.js'
import { isSupabaseConfigured } from './supabase.js'

config()

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

app.use(cors())
app.use(express.json({ limit: '2mb' }))

async function enrichCalls() {
  const transcripts = await listTranscripts()
  const results = await listResults()
  return transcripts
    .map((t) => {
      const result = results.find((r) => r.transcriptId === t.id) ?? null
      return { ...t, result }
    })
    .sort((a, b) => {
      const statusOrder = { live: 0, evaluating: 1, completed: 2 }
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      const aTime = a.metadata.endedAt ?? a.metadata.callDate ?? ''
      const bTime = b.metadata.endedAt ?? b.metadata.callDate ?? ''
      return bTime.localeCompare(aTime)
    })
}

app.get('/api/health', async (_req, res) => {
  try {
    const calls = await listTranscripts()
    const results = await listResults()
    res.json({
      status: 'ok',
      storage: 'supabase',
      liveCalls: calls.filter((c) => c.status === 'live').length,
      completedCalls: calls.filter((c) => c.status === 'completed').length,
      results: results.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Health check failed'
    res.status(500).json({ status: 'error', error: message })
  }
})

app.get('/api/calls', async (_req, res) => {
  try {
    res.json(await enrichCalls())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list calls'
    res.status(500).json({ error: message })
  }
})

app.get('/api/calls/:id', async (req, res) => {
  try {
    const transcript = await loadTranscript(req.params.id)
    if (!transcript) return res.status(404).json({ error: 'Call not found' })
    res.json({ call: transcript, result: await loadResult(transcript.id) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load call'
    res.status(500).json({ error: message })
  }
})

app.get('/api/vapi/config', (_req, res) => {
  const publicKey = process.env.VAPI_PUBLIC_KEY
  const assistantId = process.env.VAPI_ASSISTANT_ID

  if (!publicKey || !assistantId) {
    return res.status(503).json({
      error: 'Vapi is not configured. Set VAPI_PUBLIC_KEY and VAPI_ASSISTANT_ID in .env',
    })
  }

  res.json({ publicKey, assistantId })
})

app.post('/api/calls/sync', async (req, res) => {
  try {
    const payload = CallWebhookSchema.parse(req.body)
    const { transcript, result } = await ingestCallEvent(payload)
    res.json({ call: transcript, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Call sync failed'
    res.status(400).json({ error: message })
  }
})

app.patch('/api/calls/:id/profile', async (req, res) => {
  try {
    const acceptanceProfile = CallAcceptanceProfileSchema.parse(req.body.acceptanceProfile)
    const existing = await loadTranscript(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Call not found' })

    const updated = {
      ...existing,
      metadata: { ...existing.metadata, acceptanceProfile },
    }
    await saveTranscript(updated)
    res.json({ call: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Profile update failed'
    res.status(400).json({ error: message })
  }
})

app.get('/api/overview', async (_req, res) => {
  try {
    const calls = await listTranscripts()
    const results = await listResults()
    const total = results.length
    const avgScore = total > 0 ? results.reduce((s, r) => s + r.weightedScore, 0) / total : 0
    const complianceFailures = results.filter((r) => !r.compliancePass).length
    const passRate = total > 0 ? (results.filter((r) => r.overallPass).length / total) * 100 : 0
    const disagreements = results.filter((r) => r.judgeDisagreement).length
    const recent = results
      .sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())
      .slice(0, 5)

    res.json({
      liveCalls: calls.filter((c) => c.status === 'live').length,
      evaluatingCalls: calls.filter((c) => c.status === 'evaluating').length,
      totalEvals: total,
      avgScore: Math.round(avgScore * 10) / 10,
      complianceFailures,
      passRate: Math.round(passRate),
      judgeDisagreements: disagreements,
      recent,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load overview'
    res.status(500).json({ error: message })
  }
})

app.post('/api/calls/import', async (req, res) => {
  try {
    const imported = await importCallsExport(req.body)
    res.json({
      imported: imported.length,
      calls: imported.map(({ call, result }) => ({ call, result })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    res.status(400).json({ error: message })
  }
})

app.post('/api/webhooks/call', async (req, res) => {
  if (WEBHOOK_SECRET) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    const payload = CallWebhookSchema.parse(req.body)
    const { transcript, result } = await ingestCallEvent(payload)
    res.json({ call: transcript, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    res.status(400).json({ error: message })
  }
})

if (!isSupabaseConfigured()) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`Domu Eval API running on http://localhost:${PORT}`)
  console.log(`Storage: Supabase`)
  console.log(`Webhook: POST /api/webhooks/call`)
})
