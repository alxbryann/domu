import { writeFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import {
  SYNTHETIC_CASES,
  SYNTHETIC_GOLDEN_LABELS,
} from '../eval/synthetic-transcripts.js'
import { saveTranscript } from '../server/call-store.js'
import { isSupabaseConfigured } from '../server/supabase.js'

config()

/**
 * Seeds the curated synthetic transcripts into Supabase and writes the matching
 * golden-label file used by `npm run eval:validate`.
 *
 *   npm run seed:synthetic              # write golden labels + upsert to Supabase
 *   npm run seed:synthetic -- --no-push # only write data/golden-labels.json
 *
 * Transcripts are upserted by id (all prefixed `synthetic-`), so re-running is
 * safe and idempotent. After seeding, run `npm run eval:all` then
 * `npm run eval:validate` to score them and measure judge agreement.
 */

const GOLDEN_LABELS_PATH = join(process.cwd(), 'data', 'golden-labels.json')

async function main() {
  const noPush = process.argv.includes('--no-push')

  writeFileSync(GOLDEN_LABELS_PATH, JSON.stringify(SYNTHETIC_GOLDEN_LABELS, null, 2) + '\n')
  console.log(`Wrote ${SYNTHETIC_GOLDEN_LABELS.length} golden labels → ${GOLDEN_LABELS_PATH}`)

  if (noPush) {
    console.log('Skipping Supabase push (--no-push).')
    return
  }

  if (!isSupabaseConfigured()) {
    console.warn(
      'Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — wrote golden labels only.',
    )
    process.exit(1)
  }

  for (const { transcript, golden } of SYNTHETIC_CASES) {
    await saveTranscript(transcript)
    console.log(
      `  seeded ${transcript.id.padEnd(34)} [${golden.label}]  ` +
        `compliance=${golden.expectedCompliancePass ? 'pass' : 'fail'} ` +
        `overall=${golden.expectedOverallPass ? 'pass' : 'fail'}`,
    )
  }

  console.log(
    `\n${SYNTHETIC_CASES.length} synthetic transcripts seeded to Supabase.\n` +
      'Next: npm run eval:all   then   npm run eval:validate',
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
