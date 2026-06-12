import { basename } from 'path'
import { config } from 'dotenv'
import { evaluateTranscript } from './judge.js'
import { validateAgainstGoldenSet, summarizeValidation } from './validate.js'
import {
  listTranscripts,
  listResults,
  loadTranscript,
  saveResult,
} from '../server/call-store.js'
import { isSupabaseConfigured } from '../server/supabase.js'

config()

async function evalTranscriptById(id: string) {
  const transcript = await loadTranscript(id)
  if (!transcript) {
    throw new Error(`Call not found in Supabase: ${id}`)
  }

  console.log(`Evaluating: ${transcript.id} (${transcript.source})`)
  const result = await evaluateTranscript(transcript)
  await saveResult(result)
  console.log(`  Score: ${result.weightedScore}/5 | Pass: ${result.overallPass} | Compliance: ${result.compliancePass}`)
  if (result.judgeDisagreement) console.log('  ⚠ Judge disagreement flagged')
  console.log(`  Saved to Supabase: ${result.transcriptId}`)
  return result
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const arg = process.argv[2]

  if (!arg) {
    console.error('Usage: npm run eval -- <call-id>')
    console.error('       npm run eval:all')
    console.error('       npm run eval:validate')
    process.exit(1)
  }

  if (arg === '--all' || arg === 'all') {
    const transcripts = await listTranscripts()
    const results = []
    for (const transcript of transcripts) {
      results.push(await evalTranscriptById(transcript.id))
    }

    if (process.argv.includes('--validate')) {
      const report = validateAgainstGoldenSet(results)
      console.log('\n' + summarizeValidation(report))
    }
    return
  }

  if (arg === '--validate') {
    const results = await listResults()
    const report = validateAgainstGoldenSet(results)
    console.log(summarizeValidation(report))
    return
  }

  const id = basename(arg, '.json')
  await evalTranscriptById(id)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
