import type { EvalResult, Transcript } from '../eval/types.js'

const TREND_DAYS = 14
const MAX_SCORE_POINTS = 14

export interface OverviewTrends {
  callVolume: number[]
  qualityScores: number[]
  complianceFailures: number[]
  passRates: number[]
}

function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function lastNDays(n: number): string[] {
  const keys: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    keys.push(dayKey(d))
  }

  return keys
}

function callStartedOn(call: Transcript): string | null {
  const raw = call.metadata.callDate ?? call.metadata.endedAt
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return dayKey(parsed)
}

export function buildOverviewTrends(
  calls: Transcript[],
  results: EvalResult[],
): OverviewTrends {
  const dayBuckets = lastNDays(TREND_DAYS)

  const callVolume = dayBuckets.map((key) =>
    calls.filter((call) => callStartedOn(call) === key).length,
  )

  const failuresByDay = new Map<string, number>()
  for (const result of results) {
    if (result.compliancePass) continue
    const key = dayKey(new Date(result.evaluatedAt))
    failuresByDay.set(key, (failuresByDay.get(key) ?? 0) + 1)
  }

  const complianceFailures = dayBuckets.map((key) => failuresByDay.get(key) ?? 0)

  const sortedResults = [...results].sort(
    (a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime(),
  )
  const recentResults = sortedResults.slice(-MAX_SCORE_POINTS)

  const qualityScores = recentResults.map((result) => result.weightedScore)

  let passes = 0
  const passRates = recentResults.map((result, index) => {
    if (result.overallPass) passes++
    return Math.round((passes / (index + 1)) * 100)
  })

  return {
    callVolume,
    qualityScores,
    complianceFailures,
    passRates,
  }
}
