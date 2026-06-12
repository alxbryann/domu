import { config } from 'dotenv'
import { importCallsExport } from '../server/call-store.js'

config()

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: npm run import:vapi -- <calls-export.json>')
    process.exit(1)
  }

  const { readFileSync } = await import('fs')
  const raw = JSON.parse(readFileSync(arg, 'utf-8'))
  const imported = await importCallsExport(raw)

  for (const { call, result } of imported) {
    console.log(`Imported call: ${call.id}`)
    console.log(`  Status: ${call.status}`)
    console.log(`  Turns: ${call.turns.length}`)
    if (result) {
      console.log(
        `  Score: ${result.weightedScore}/5 | Compliance: ${result.compliancePass ? 'Pass' : 'Fail'}`,
      )
    }
  }

  console.log(`\n${imported.length} call(s) imported to Supabase`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
