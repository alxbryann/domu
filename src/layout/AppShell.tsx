import { Outlet } from 'react-router-dom'
import { SidebarNav } from './SidebarNav'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-app-bg transition-colors">
      <SidebarNav />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
