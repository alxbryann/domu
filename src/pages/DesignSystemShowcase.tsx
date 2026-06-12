import { colors, typography } from '../design-system/tokens'
import {
  Button,
  ArrowIcon,
  Badge,
  StatusPill,
  SectionLabel,
  Card,
  MetricCard,
  Sparkline,
} from '../design-system/components'

const colorSwatches = [
  { name: 'Navy', token: 'brand.navy', value: colors.brand.navy },
  { name: 'Blue (CTA)', token: 'brand.blue', value: colors.brand.blue },
  { name: 'Blue Hover', token: 'brand.blueHover', value: colors.brand.blueHover },
  { name: 'Blue Soft', token: 'brand.blueSoft', value: colors.brand.blueSoft },
  { name: 'Periwinkle', token: 'brand.periwinkle', value: colors.brand.periwinkle },
  { name: 'Dashboard', token: 'surface.dashboard', value: colors.surface.dashboard },
  { name: 'Success', token: 'status.success', value: colors.status.success },
  { name: 'Warning', token: 'status.warning', value: colors.status.warning },
  { name: 'Danger', token: 'status.danger', value: colors.status.danger },
]

export function DesignSystemShowcase() {
  return (
    <div className="bg-domu-blue-lighter">
      {/* Colors */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-domu-navy mb-2">Color Palette</h2>
        <p className="text-domu-text-secondary mb-8">
          Tokens extraídos de domu.ai — navy hero, electric blue CTA, dashboard dark mode.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {colorSwatches.map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <div
                className="h-20 rounded-domu-lg border border-domu-blue-border shadow-sm"
                style={{ backgroundColor: swatch.value }}
              />
              <div>
                <p className="text-sm font-medium text-domu-navy">{swatch.name}</p>
                <p className="text-xs font-mono text-domu-text-secondary">{swatch.value}</p>
                <p className="text-xs text-domu-text-muted">{swatch.token}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-domu-blue-border">
        <h2 className="text-2xl font-bold text-domu-navy mb-2">Typography</h2>
        <p className="text-domu-text-secondary mb-8">
          Inter (body/headings) + Fragment Mono (labels) — igual que domu.ai
        </p>
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <p className="text-xs font-mono tracking-[0.12em] uppercase text-domu-text-secondary mb-4">
              Headings — {typography.fontFamily.sans}
            </p>
            <h1 className="text-5xl font-bold text-domu-navy tracking-tight mb-4">
              Hero Heading
            </h1>
            <h2 className="text-3xl font-semibold text-domu-navy mb-3">
              Section Title
            </h2>
            <h3 className="text-xl font-medium text-domu-navy">
              Card Heading
            </h3>
          </Card>
          <Card>
            <p className="text-xs font-mono tracking-[0.12em] uppercase text-domu-text-secondary mb-4">
              Body & Labels — {typography.fontFamily.mono}
            </p>
            <p className="text-base text-domu-text-secondary leading-relaxed mb-4">
              Body text for descriptions and supporting content. Used across landing pages and dashboard interfaces.
            </p>
            <SectionLabel variant="filled">Section Label</SectionLabel>
          </Card>
        </div>
      </section>

      {/* Buttons */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-domu-blue-border">
        <h2 className="text-2xl font-bold text-domu-navy mb-2">Buttons</h2>
        <p className="text-domu-text-secondary mb-8">
          Primary (solid blue), outline (nav CTA), secondary y ghost.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" icon={<ArrowIcon />}>Start a Pilot</Button>
          <Button variant="outline" icon={<ArrowIcon />}>Start a Pilot</Button>
          <Button variant="secondary">Learn More</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg" icon={<ArrowIcon />}>Large</Button>
        </div>
      </section>

      {/* Badges & Status */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-domu-blue-border">
        <h2 className="text-2xl font-bold text-domu-navy mb-2">Badges & Status Pills</h2>
        <p className="text-domu-text-secondary mb-8">
          Priority levels y estados del dashboard.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
        <div className="mt-6 p-6 bg-domu-dashboard rounded-domu-lg">
          <div className="flex flex-wrap gap-3">
            <StatusPill status="low" />
            <StatusPill status="medium" />
            <StatusPill status="high" />
            <StatusPill status="active" />
            <StatusPill status="inactive" />
          </div>
        </div>
      </section>

      {/* Cards & Metrics */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-domu-blue-border">
        <h2 className="text-2xl font-bold text-domu-navy mb-2">Cards & Metrics</h2>
        <p className="text-domu-text-secondary mb-8">
          Cards light (landing) y dark (dashboard) con sparklines.
        </p>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Total Calls" value="2,847" change="+12.5%" />
            <MetricCard label="Resolution" value="87.3%" change="+3.2%" />
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 bg-domu-dashboard rounded-domu-lg">
            <MetricCard label="Total Calls" value="2,847" change="+12.5%" />
            <MetricCard label="Resolution" value="87.3%" change="-2.1%" changeType="negative" />
          </div>
        </div>
        <div className="mt-8">
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-domu-navy mb-2">Light Card</h3>
            <p className="text-domu-text-secondary text-sm">
              Contenedor para contenido en secciones claras del landing.
            </p>
          </Card>
        </div>
      </section>

      {/* Sparkline */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-domu-blue-border pb-24">
        <h2 className="text-2xl font-bold text-domu-navy mb-2">Data Visualization</h2>
        <p className="text-domu-text-secondary mb-8">
          Sparklines con gradient fill — estilo dashboard Domu.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-4 bg-domu-dashboard rounded-domu-lg">
            <Sparkline height={60} />
          </div>
          <div className="p-4 bg-white border border-domu-blue-border rounded-domu-lg">
            <Sparkline height={60} color="#00AD7D" />
          </div>
          <div className="p-4 bg-domu-blue-soft rounded-domu-lg">
            <Sparkline height={60} color="#0034B8" />
          </div>
        </div>
      </section>
    </div>
  )
}
