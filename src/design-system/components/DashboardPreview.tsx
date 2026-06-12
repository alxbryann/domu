import { MetricCard } from './MetricCard'
import { StatusPill } from './Badge'

const sidebarItems = [
  { icon: '📥', label: 'Inbox', active: false },
  { icon: '🔔', label: 'Alerts', active: false },
  { icon: '📊', label: 'Dashboard', active: true },
  { icon: '📞', label: 'Calls', active: false },
  { icon: '💬', label: 'Messages', active: false },
  { icon: '👥', label: 'Agents', active: false },
  { icon: '⚙️', label: 'Settings', active: false },
]

const tableRows = [
  { name: 'John Smith', account: 'ACC-2847', status: 'active' as const, priority: 'low' as const },
  { name: 'Sarah Johnson', account: 'ACC-1923', status: 'active' as const, priority: 'medium' as const },
  { name: 'Mike Davis', account: 'ACC-4512', status: 'inactive' as const, priority: 'high' as const },
]

interface DashboardPreviewProps {
  className?: string
}

export function DashboardPreview({ className = '' }: DashboardPreviewProps) {
  return (
    <div
      className={[
        'rounded-domu-xl overflow-hidden border border-white/10 shadow-2xl',
        'bg-domu-dashboard',
        className,
      ].join(' ')}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-domu-dashboard-sidebar border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-white/5 rounded-md px-3 py-1 text-xs text-white/40 text-center">
            app.domu.ai/dashboard
          </div>
        </div>
      </div>

      <div className="flex min-h-[320px]">
        {/* Sidebar */}
        <aside className="w-[180px] bg-domu-dashboard-sidebar border-r border-white/10 p-3 flex flex-col">
          <nav className="flex flex-col gap-1 flex-1">
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-domu-md text-xs transition-colors',
                  item.active
                    ? 'bg-domu-blue/15 text-white border-l-2 border-domu-blue'
                    : 'text-white/50 hover:text-white/80',
                ].join(' ')}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2 px-3 py-2 mt-4 border-t border-white/10 pt-4">
            <div className="w-7 h-7 rounded-full bg-domu-blue/30 flex items-center justify-center text-xs text-white">
              BR
            </div>
            <div className="text-xs text-white/60">
              <p className="text-white/90 font-medium">Bryan R.</p>
              <p>Admin</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Total Calls" value="2,847" change="+12.5%" />
            <MetricCard label="Resolution Rate" value="87.3%" change="+3.2%" />
            <MetricCard label="Avg Handle Time" value="4:32" change="-8.1%" changeType="negative" />
          </div>

          <div className="rounded-domu-lg bg-domu-dashboard-card border border-white/10 p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/50 font-medium">Recent Accounts</span>
              <span className="text-xs text-domu-blue">View all →</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Account</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.account} className="border-b border-white/5 text-white/70">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 text-white/50">{row.account}</td>
                    <td className="py-2"><StatusPill status={row.status} /></td>
                    <td className="py-2"><StatusPill status={row.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
