import type { Transcript } from '../eval/types.js'
import { getSupabase } from './supabase.js'
import { fetchVapiRecordingUrl } from './vapi.js'

export const RECORDINGS_BUCKET = 'call-recordings'

function extFromContentType(contentType: string | null): string {
  if (!contentType) return 'webm'
  const normalized = contentType.toLowerCase()
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3'
  if (normalized.includes('wav')) return 'wav'
  if (normalized.includes('webm')) return 'webm'
  if (normalized.includes('ogg')) return 'ogg'
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a'
  return 'webm'
}

function extFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.(mp3|wav|webm|ogg|m4a)$/i)
    return match ? match[1].toLowerCase() : null
  } catch {
    return null
  }
}

export async function uploadCallRecording(callId: string, recordingUrl: string): Promise<string> {
  const supabase = getSupabase()
  const res = await fetch(recordingUrl)

  if (!res.ok) {
    throw new Error(`Failed to download recording (${res.status})`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') ?? 'audio/mpeg'
  const ext = extFromUrl(recordingUrl) ?? extFromContentType(contentType)
  const path = `${callId}/recording.${ext}`

  const { error } = await supabase.storage.from(RECORDINGS_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new Error(`Failed to upload recording: ${error.message}`)
  }

  return path
}

export async function deleteCallRecording(storagePath: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.storage.from(RECORDINGS_BUCKET).remove([storagePath])
  if (error) {
    throw new Error(`Failed to delete recording: ${error.message}`)
  }
}

export async function getRecordingSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown error'}`)
  }

  return data.signedUrl
}

export async function persistCallRecording(
  transcript: Transcript,
  options?: { retryDelaysMs?: number[] },
): Promise<Transcript> {
  if (transcript.metadata.recordingStoragePath) {
    return transcript
  }

  let recordingUrl = transcript.metadata.recordingUrl

  if (!recordingUrl && transcript.source === 'vapi') {
    recordingUrl =
      (await fetchVapiRecordingUrl(transcript.id, options?.retryDelaysMs)) ?? undefined
  }

  if (!recordingUrl) return transcript

  try {
    const storagePath = await uploadCallRecording(transcript.id, recordingUrl)
    return {
      ...transcript,
      metadata: {
        ...transcript.metadata,
        recordingUrl,
        recordingStoragePath: storagePath,
      },
    }
  } catch (err) {
    console.error(
      `Recording upload failed for ${transcript.id}:`,
      err instanceof Error ? err.message : err,
    )
    return {
      ...transcript,
      metadata: {
        ...transcript.metadata,
        recordingUrl,
      },
    }
  }
}
