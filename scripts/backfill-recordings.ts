import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { persistCallRecording } from '../server/call-recording.js'

config()

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  })

  const { data: calls, error } = await supabase
    .from('calls')
    .select('id, source, status, metadata')
    .eq('source', 'vapi')
    .eq('status', 'completed')

  if (error) throw error

  const missing = (calls ?? []).filter((c) => !c.metadata?.recordingStoragePath)
  console.log(`Vapi completed calls missing storage: ${missing.length}`)

  let saved = 0
  for (const call of missing) {
    const transcript = {
      id: call.id,
      source: call.source as 'vapi',
      status: call.status as 'completed',
      metadata: call.metadata ?? {},
      turns: [],
    }
    const updated = await persistCallRecording(transcript)
    if (updated.metadata.recordingStoragePath) {
      const { error: updateErr } = await supabase
        .from('calls')
        .update({ metadata: updated.metadata })
        .eq('id', call.id)
      if (updateErr) throw updateErr
      saved++
      console.log(`Saved recording for ${call.id}`)
    } else {
      console.log(`Still no recording for ${call.id}`)
    }
  }

  console.log(`Backfill complete: ${saved}/${missing.length} uploaded`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
