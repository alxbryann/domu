import { NavLink } from 'react-router-dom'
import { Logo } from '../design-system/components/Logo'
import { ThemeToggle } from '../design-system/components/ThemeToggle'

const navItems = [
  { to: '/', icon: '📊', label: 'Overview' },
  { to: '/calls', icon: '📞', label: 'Calls' },
]

export function SidebarNav() {
  return (
    <aside className="w-[220px] bg-app-sidebar border-r border-app-border flex flex-col shrink-0 transition-colors">
      <div className="p-4 border-b border-app-border">
        <Logo />
        <p className="text-xs text-app-muted mt-2 font-mono tracking-wider uppercase">Agent QA</p>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 px-3 py-2.5 rounded-domu-md text-sm transition-colors',
                isActive
                  ? 'bg-domu-blue/15 text-app-text border-l-2 border-domu-blue'
                  : 'text-app-muted hover:text-app-text-secondary hover:bg-app-hover',
              ].join(' ')
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-app-border">
        <ThemeToggle />
      </div>

      <div className="p-4 border-t border-app-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-domu-blue/30 flex items-center justify-center text-xs text-domu-blue font-medium dark:text-white">
            QA
          </div>
          <div className="text-xs text-app-muted">
            <p className="text-app-text font-medium">Eval System</p>
            <p>v1.0</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
