import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MetricCard } from '../design-system/components/MetricCard'
import { Badge } from '../design-system/components/Badge'
import { SectionLabel } from '../design-system/components/SectionLabel'
import { DataTable } from '../design-system/components/DataTable'
import { api } from '../lib/api'
import type { EvalResult, OverviewData } from '../types'

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    api.getOverview().then(setData).catch((e) => setError(e.message))
    const interval = setInterval(() => {
      api.getOverview().then(setData).catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="p-8 text-domu-danger">
        Failed to load overview. Is the API server running? ({error})
      </div>
    )
  }

  if (!data) {
    return <div className="p-8 text-app-muted">Loading...</div>
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <SectionLabel variant="outline">Dashboard</SectionLabel>
        <h1 className="text-2xl font-bold text-app-text mt-3">Agent Quality Overview</h1>
        <p className="text-app-muted text-sm mt-1">
          Quality scores for Domu-orchestrated collections calls — eval runs when each call ends
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Live Calls"
          value={String(data.liveCalls)}
          change={data.evaluatingCalls > 0 ? `${data.evaluatingCalls} scoring` : 'Active now'}
          changeType={data.liveCalls > 0 ? 'positive' : 'neutral'}
        />
        <MetricCard label="Avg Quality Score" value={`${data.avgScore}/5`} change="Completed calls" changeType="neutral" />
        <MetricCard
          label="Compliance Failures"
          value={String(data.complianceFailures)}
          change={data.complianceFailures > 0 ? 'Needs review' : 'All clear'}
          changeType={data.complianceFailures > 0 ? 'negative' : 'positive'}
        />
        <MetricCard
          label="Pass Rate"
          value={`${data.passRate}%`}
          change={`${data.totalEvals} evals · ${data.judgeDisagreements} disagreements`}
          changeType={data.passRate >= 80 ? 'positive' : 'negative'}
        />
      </div>

      <div className="rounded-domu-lg bg-app-card border border-app-border p-5 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-app-text">Recent Evaluations</h2>
          <Link to="/calls" className="text-xs text-domu-blue hover:underline">
            View all calls →
          </Link>
        </div>

        <DataTable<EvalResult>
          data={data.recent}
          emptyMessage="No completed evaluations yet. Scores appear when agent calls finish."
          onRowClick={(row) => navigate(`/calls/${row.transcriptId}`)}
          columns={[
            {
              key: 'id',
              header: 'Call',
              render: (r) => <span className="text-app-text font-medium">{r.transcriptId}</span>,
            },
            {
              key: 'score',
              header: 'Score',
              render: (r) => <span>{r.weightedScore}/5</span>,
            },
            {
              key: 'compliance',
              header: 'Compliance',
              render: (r) => (
                <Badge variant={r.compliancePass ? 'success' : 'danger'}>
                  {r.compliancePass ? 'Pass' : 'Fail'}
                </Badge>
              ),
            },
            {
              key: 'overall',
              header: 'Overall',
              render: (r) => (
                <Badge variant={r.overallPass ? 'success' : 'danger'}>
                  {r.overallPass ? 'Pass' : 'Fail'}
                </Badge>
              ),
            },
            {
              key: 'date',
              header: 'Evaluated',
              render: (r) => (
                <span className="text-app-muted">
                  {new Date(r.evaluatedAt).toLocaleDateString()}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
