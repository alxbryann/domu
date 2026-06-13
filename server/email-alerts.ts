import { emailBrand, getEmailLogoSrc } from '../shared/email-brand.js'

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

const { colors: c, radius: r, font } = emailBrand

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function severityBadgeStyle(severity: 'critical' | 'high'): string {
  if (severity === 'critical') {
    return `display:inline-block;padding:2px 10px;font-size:12px;font-weight:500;background:${c.status.dangerBg};color:${c.status.danger};border-radius:${r.pill};`
  }
  return `display:inline-block;padding:2px 10px;font-size:12px;font-weight:500;background:${c.status.warningBg};color:${c.status.warning};border-radius:${r.pill};`
}

export function buildEmailHtml(payload: EscalationEmailPayload): string {
  const callId = escapeHtml(payload.callId)
  const triggerLabel = escapeHtml(payload.triggerLabel)
  const severityLabel = escapeHtml(formatLabel(payload.severity))
  const speaker = escapeHtml(formatLabel(payload.speaker))
  const description = escapeHtml(payload.description)
  const quote = escapeHtml(payload.quote)
  const matchedText = escapeHtml(payload.matchedText)
  const logoSrc = escapeHtml(getEmailLogoSrc())
  const severityBadge = severityBadgeStyle(payload.severity)

  const ctaBlock = payload.dashboardUrl
    ? `
          <tr>
            <td style="padding:4px 28px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:${r.md};background:${c.brand.blue};">
                    <a href="${escapeHtml(payload.dashboardUrl)}" target="_blank" style="display:inline-block;padding:0 20px;height:44px;line-height:44px;font-family:${font.sans};font-size:14px;font-weight:500;color:${c.text.onDark};text-decoration:none;">
                      Review case in dashboard &nbsp;&#8594;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-family:${font.sans};font-size:12px;color:${c.text.secondary};line-height:1.5;">
                Open the call record to review the full transcript and take action.
              </p>
            </td>
          </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Domu QA — Escalation Alert</title>
  <link href="https://fonts.googleapis.com/css2?family=Fragment+Mono&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${c.brand.blueLighter};font-family:${font.sans};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.brand.blueLighter};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:${c.surface.white};border:1px solid ${c.brand.blueBorder};border-radius:${r.lg};overflow:hidden;">

          <!-- Sidebar-style header (Logo + Agent QA) -->
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid rgba(8,20,79,0.1);background:${c.surface.white};">
              <img src="${logoSrc}" alt="Domu" width="auto" height="32" style="display:block;height:32px;width:auto;border:0;" />
              <p style="margin:8px 0 0;font-family:${font.mono};font-size:12px;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;color:${c.text.tertiary};">Agent QA</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:28px 28px 0;background:${c.brand.blueLighter};">
              <span style="display:inline-block;padding:6px 12px;font-family:${font.mono};font-size:12px;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;color:${c.brand.blue};background:${c.brand.blueSoft};border:1px solid rgba(1,69,242,0.2);border-radius:${r.sm};">Escalation alert</span>
              <h1 style="margin:16px 0 0;font-family:${font.sans};font-size:24px;font-weight:700;color:${c.text.primary};line-height:1.25;letter-spacing:-0.02em;">Review required</h1>
              <p style="margin:8px 0 0;font-family:${font.sans};font-size:14px;color:${c.text.secondary};line-height:1.5;">
                A ${severityLabel.toLowerCase()} trigger was detected during a call.
              </p>
            </td>
          </tr>

          <!-- ComplianceAlert danger -->
          <tr>
            <td style="padding:20px 28px 0;background:${c.brand.blueLighter};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.status.dangerBg};border:1px solid rgba(239,68,68,0.3);border-radius:${r.lg};">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-family:${font.sans};font-size:14px;font-weight:600;color:${c.status.danger};">Immediate review required</p>
                    <p style="margin:8px 0 0;font-family:${font.sans};font-size:14px;color:${c.status.danger};opacity:0.85;line-height:1.55;">
                      Please open the case and review the transcript.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card: call details -->
          <tr>
            <td style="padding:20px 28px 0;background:${c.brand.blueLighter};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.surface.white};border:1px solid ${c.brand.blueBorder};border-radius:${r.lg};">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${c.brand.blueBorder};">
                    <span style="display:inline-block;padding:6px 12px;font-family:${font.mono};font-size:12px;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;color:${c.brand.blue};background:${c.brand.blueSoft};border:1px solid rgba(1,69,242,0.2);border-radius:${r.sm};">Call details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 20px 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${c.brand.blueTint};font-family:${font.sans};font-size:13px;color:${c.text.secondary};width:110px;vertical-align:top;">Call ID</td>
                        <td style="padding:12px 0;border-bottom:1px solid ${c.brand.blueTint};font-family:${font.mono};font-size:12px;color:${c.text.primary};word-break:break-all;">${callId}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${c.brand.blueTint};font-family:${font.sans};font-size:13px;color:${c.text.secondary};vertical-align:top;">Trigger</td>
                        <td style="padding:12px 0;border-bottom:1px solid ${c.brand.blueTint};font-family:${font.sans};font-size:13px;color:${c.text.primary};font-weight:600;">${triggerLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${c.brand.blueTint};font-family:${font.sans};font-size:13px;color:${c.text.secondary};vertical-align:top;">Severity</td>
                        <td style="padding:12px 0;border-bottom:1px solid ${c.brand.blueTint};">
                          <span style="${severityBadge}">${severityLabel}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;font-family:${font.sans};font-size:13px;color:${c.text.secondary};vertical-align:top;">Speaker</td>
                        <td style="padding:12px 0;font-family:${font.sans};font-size:13px;color:${c.text.primary};">${speaker}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TranscriptViewer-style quote -->
          <tr>
            <td style="padding:20px 28px 0;background:${c.brand.blueLighter};">
              <span style="display:inline-block;padding:6px 12px;font-family:${font.mono};font-size:12px;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;color:${c.brand.blue};background:${c.brand.blueSoft};border:1px solid rgba(1,69,242,0.2);border-radius:${r.sm};">Detected statement</span>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;border:2px solid rgba(239,68,68,0.5);background:rgba(239,68,68,0.08);border-radius:${r.md};">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px;font-family:${font.mono};font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${c.text.tertiary};">${speaker}</p>
                    <p style="margin:0;font-family:${font.sans};font-size:14px;color:${c.text.primary};line-height:1.6;font-weight:500;">&ldquo;${quote}&rdquo;</p>
                    <p style="margin:10px 0 0;font-family:${font.sans};font-size:12px;color:${c.text.secondary};">
                      Matched phrase: <span style="color:${c.text.primary};font-weight:500;">&ldquo;${matchedText}&rdquo;</span>
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-family:${font.sans};font-size:13px;color:${c.text.secondary};line-height:1.5;">${description}</p>
            </td>
          </tr>
${ctaBlock}
          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px;background:${c.brand.blueLighter};border-top:1px solid ${c.brand.blueBorder};">
              <p style="margin:0;font-family:${font.sans};font-size:12px;color:${c.text.tertiary};line-height:1.5;">
                Automated alert from Domu Agent QA. Do not reply to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
