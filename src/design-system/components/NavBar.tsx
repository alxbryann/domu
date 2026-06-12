import { Logo } from './Logo'
import { Button, ArrowIcon } from './Button'

const navLinks = ['About', 'Benefits', 'Integrations', 'Compliance', 'Careers', 'FAQ', 'Blog']

interface NavBarProps {
  className?: string
}

export function NavBar({ className = '' }: NavBarProps) {
  return (
    <header
      className={[
        'sticky top-0 z-50 bg-white border-b border-gray-100',
        className,
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Logo />

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-sm font-medium text-domu-text-nav hover:text-domu-navy transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        <Button variant="outline" size="sm" icon={<ArrowIcon />}>
          Start a Pilot
        </Button>
      </div>
    </header>
  )
}
