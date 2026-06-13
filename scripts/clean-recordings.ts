import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

config()

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  })

  const { data: folders, error: listErr } = await supabase.storage
    .from('call-recordings')
    .list('', { limit: 1000 })
  if (listErr) throw listErr

  const pathsToDelete: string[] = []

  for (const item of folders ?? []) {
    if (!item.name) continue
    const { data: files, error } = await supabase.storage.from('call-recordings').list(item.name)
    if (error) throw error
    for (const file of files ?? []) {
      pathsToDelete.push(`${item.name}/${file.name}`)
    }
  }

  console.log(`Storage files found: ${pathsToDelete.length}`)

  if (pathsToDelete.length > 0) {
    const { data: removed, error: removeErr } = await supabase.storage
      .from('call-recordings')
      .remove(pathsToDelete)
    if (removeErr) throw removeErr
    console.log(`Deleted storage files: ${removed?.length ?? 0}`)
  }

  const { data: calls, error: callsErr } = await supabase
    .from('calls')
    .select('id, metadata')
    .or('metadata->>recordingStoragePath.not.is.null,metadata->>recordingUrl.not.is.null')

  if (callsErr) throw callsErr

  let updated = 0
  for (const call of calls ?? []) {
    const metadata = { ...(call.metadata as Record<string, unknown>) }
    delete metadata.recordingUrl
    delete metadata.recordingStoragePath
    const { error } = await supabase.from('calls').update({ metadata }).eq('id', call.id)
    if (error) throw error
    updated++
  }

  console.log(`Calls metadata cleaned: ${updated}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
