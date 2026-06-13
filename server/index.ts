import { config } from 'dotenv'
import { isSupabaseConfigured } from './supabase.js'
import { app } from './app.js'

config()

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

if (!isSupabaseConfigured()) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`Domu Eval API running on http://localhost:${PORT}`)
  console.log(`Storage: Supabase`)
  console.log(`Webhook: POST /api/webhooks/call`)
})
