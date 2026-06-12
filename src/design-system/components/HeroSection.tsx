import { SectionLabel } from './SectionLabel'
import { Button, ArrowIcon } from './Button'
import { DashboardPreview } from './DashboardPreview'

interface HeroSectionProps {
  label?: string
  title?: string
  description?: string
  ctaText?: string
}

export function HeroSection({
  label = 'Dashboard',
  title = 'Your Mission Control for End-To-End Servicing',
  description = 'A centralized command center for high-stakes recovery. Track performance and agent activity in real-time with a continuous data stream designed for rapid, informed decision-making.',
  ctaText = 'Start a Pilot',
}: HeroSectionProps) {
  return (
    <section className="relative domu-hero-grid domu-hero-glow overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="flex flex-col gap-6">
            <SectionLabel>{label}</SectionLabel>

            <h1 className="text-4xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight">
              {title}
            </h1>

            <p className="text-base lg:text-lg text-white/70 leading-relaxed max-w-lg">
              {description}
            </p>

            <div className="pt-2">
              <Button variant="primary" size="lg" icon={<ArrowIcon />}>
                {ctaText}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-domu-blue/20 blur-3xl rounded-full scale-75" />
            <DashboardPreview className="relative" />
          </div>
        </div>
      </div>
    </section>
  )
}
