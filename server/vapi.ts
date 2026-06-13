type VapiCallResponse = {
  recordingUrl?: string
  stereoRecordingUrl?: string
  artifact?: {
    recordingUrl?: string
    stereoRecordingUrl?: string
  }
}

function extractRecordingUrl(data: VapiCallResponse): string | null {
  return (
    data.artifact?.recordingUrl ??
    data.recordingUrl ??
    data.artifact?.stereoRecordingUrl ??
    data.stereoRecordingUrl ??
    null
  )
}

export async function fetchVapiRecordingUrl(callId: string): Promise<string | null> {
  const key = process.env.VAPI_PRIVATE_KEY
  if (!key) return null

  const delaysMs = [0, 2000, 5000]

  for (const delayMs of delaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })

    if (!res.ok) continue

    const data = (await res.json()) as VapiCallResponse
    const url = extractRecordingUrl(data)
    if (url) return url
  }

  return null
}
