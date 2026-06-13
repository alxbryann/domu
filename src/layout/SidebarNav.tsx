import { NavLink } from 'react-router-dom'
import { Logo } from '../design-system/components/Logo'
import { ThemeToggle } from '../design-system/components/ThemeToggle'

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
    <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
    <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
  </svg>
)

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 .97.757l.5 2a1 1 0 0 1-.293 1.008L5.5 7c.7 1.4 2.1 2.8 3.5 3.5l.735-.677a1 1 0 0 1 1.008-.293l2 .5A1 1 0 0 1 13.5 11v1.5a1 1 0 0 1-1 1C5.716 13.5 2.5 9.784 2.5 5.5V3.5z" />
  </svg>
)

const navItems = [
  { to: '/', icon: <GridIcon />, label: 'Overview' },
  { to: '/calls', icon: <PhoneIcon />, label: 'Calls' },
]

export function SidebarNav() {
  return (
    <aside className="w-[220px] bg-app-sidebar border-r border-app-border flex flex-col shrink-0 transition-colors">
      <div className="p-4 border-b border-app-border">
        <Logo />
        <p className="text-xs text-app-muted mt-2 font-mono tracking-wider uppercase">Agent QA</p>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 px-3 py-2 rounded-domu-md text-sm transition-all',
                isActive
                  ? 'bg-domu-blue/10 text-domu-blue font-medium'
                  : 'text-app-muted hover:text-app-text hover:bg-app-hover',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-domu-blue' : ''}>{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-app-border space-y-1">
        <ThemeToggle />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-5 h-5 rounded bg-domu-blue/15 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-domu-blue tracking-tight">QA</span>
          </div>
          <span className="text-xs text-app-muted">Eval System · v1.0</span>
        </div>
      </div>
    </aside>
  )
}
