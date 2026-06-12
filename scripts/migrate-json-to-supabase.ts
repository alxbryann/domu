import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { saveResult, saveTranscript } from '../server/call-store.js'
import { TranscriptSchema } from '../eval/types.js'
import type { EvalResult } from '../eval/types.js'

config()

const TRANSCRIPTS_DIR = join(process.cwd(), 'data', 'transcripts')
const RESULTS_DIR = join(process.cwd(), 'data', 'results')

async function migrateFile(file: string) {
  const transcript = TranscriptSchema.parse(
    JSON.parse(readFileSync(join(TRANSCRIPTS_DIR, file), 'utf-8')),
  )
  await saveTranscript(transcript)

  const resultPath = join(RESULTS_DIR, file)
  if (existsSync(resultPath)) {
    const result = JSON.parse(readFileSync(resultPath, 'utf-8')) as EvalResult
    await saveResult(result)
  }

  console.log(`Migrated ${transcript.id}`)
}

async function main() {
  const arg = process.argv[2] ?? 'all'

  if (!existsSync(TRANSCRIPTS_DIR)) {
    console.log('No local transcripts directory found.')
    return
  }

  if (arg === 'all' || arg === '--all') {
    const files = readdirSync(TRANSCRIPTS_DIR).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      await migrateFile(file)
    }
    console.log(`\n${files.length} call(s) migrated to Supabase`)
    return
  }

  const file = arg.endsWith('.json') ? arg : `${arg}.json`
  await migrateFile(file)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
