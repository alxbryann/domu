import { Outlet } from 'react-router-dom'
import { SidebarNav } from './SidebarNav'

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-app-bg transition-colors">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
