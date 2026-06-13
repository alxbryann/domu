import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildEmailHtml } from '../server/email-alerts.js'

const html = buildEmailHtml({
  callId: '019ebe81-ba91-7003-9708-6cd053a5ff84',
  triggerLabel: 'Legal / lawsuit threat',
  severity: 'critical',
  description: 'Customer mentioned lawsuit or legal action',
  matchedText: 'sue',
  quote: 'i want to sue the company',
  speaker: 'customer',
  dashboardUrl: 'http://localhost:5173/calls/019ebe81-ba91-7003-9708-6cd053a5ff84/live',
})

const outPath = resolve('examples/escalation-email-preview.html')
writeFileSync(outPath, html, 'utf8')
console.log(`Preview written to ${outPath}`)
