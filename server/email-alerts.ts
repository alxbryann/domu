export interface EscalationEmailPayload {
  callId: string
  triggerLabel: string
  severity: 'critical' | 'high'
  description: string
  matchedText: string
  quote: string
  speaker: string
  dashboardUrl?: string
}

function getAlertRecipients(): string[] {
  const raw = process.env.ALERT_EMAIL_TO ?? 'bryanalexanderbogota@gmail.com'
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}

function getFromAddress(): string {
  return process.env.ALERT_EMAIL_FROM ?? 'Domu QA Alerts <onboarding@resend.dev>'
}

function buildEmailHtml(payload: EscalationEmailPayload): string {
  const dashboardLink = payload.dashboardUrl
    ? `<p><a href="${payload.dashboardUrl}">Open call in dashboard</a></p>`
    : ''

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px;">
      <h2 style="color: #dc2626; margin: 0 0 12px;">Immediate escalation alert</h2>
      <p style="margin: 0 0 8px;"><strong>Call:</strong> ${payload.callId}</p>
      <p style="margin: 0 0 8px;"><strong>Trigger:</strong> ${payload.triggerLabel}</p>
      <p style="margin: 0 0 8px;"><strong>Severity:</strong> ${payload.severity}</p>
      <p style="margin: 0 0 8px;"><strong>Speaker:</strong> ${payload.speaker}</p>
      <p style="margin: 0 0 8px;">${payload.description}</p>
      <blockquote style="border-left: 3px solid #dc2626; margin: 16px 0; padding: 8px 16px; background: #fef2f2;">
        "${payload.quote}"
      </blockquote>
      <p style="font-size: 12px; color: #666;">Matched phrase: "${payload.matchedText}"</p>
      ${dashboardLink}
    </div>
  `.trim()
}

export async function sendEscalationEmail(payload: EscalationEmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const recipients = getAlertRecipients()

  if (!apiKey) {
    console.warn(
      '[email-alerts] RESEND_API_KEY not set — escalation logged only:',
      payload.triggerLabel,
      payload.callId,
      `"${payload.quote}"`,
    )
    return false
  }

  const subject = `[Domu QA] URGENT: ${payload.triggerLabel} — ${payload.callId}`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: recipients,
      subject,
      html: buildEmailHtml(payload),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('[email-alerts] Resend error:', response.status, body)
    throw new Error(`Failed to send escalation email (${response.status})`)
  }

  console.log('[email-alerts] Sent escalation email:', subject, '→', recipients.join(', '))
  return true
}
