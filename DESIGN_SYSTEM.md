# Domu Design System

Design system basado en [domu.ai](https://domu.ai) para construir pruebas técnicas con su estilo visual.

## Quick Start

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` para ver el showcase completo con hero + componentes.

## Tokens extraídos

### Colores

| Token | Valor | Uso |
|-------|-------|-----|
| `brand.navy` | `#08144F` | Hero background, headings |
| `brand.blue` | `#0145F2` | Primary CTA, links, charts |
| `brand.blueHover` | `#0034B8` | Button hover |
| `brand.blueSoft` | `#EFF4FF` | Light backgrounds |
| `surface.dashboard` | `#0B0B0D` | App dashboard bg |
| `status.success` | `#00AD7D` | Positive metrics, low priority |
| `status.warning` | `#F59E0B` | Medium priority |
| `status.danger` | `#EF4444` | High priority, negative trends |

### Tipografía

- **Inter** — body, headings, nav (weights: 400, 500, 600, 700, 900)
- **Fragment Mono** — section labels (`DASHBOARD`, `STUDIO`, etc.)
- **Helvetica Neue** — fallback display

### Espaciado & Radius

- Border radius: `4px` (sm), `8px` (md), `12px` (lg), `16px` (xl), pill
- Nav height: `72px`
- Max content width: `1280px`

## Componentes

```tsx
import {
  NavBar,
  HeroSection,
  Button,
  ArrowIcon,
  SectionLabel,
  Badge,
  StatusPill,
  Card,
  MetricCard,
  Sparkline,
  DashboardPreview,
  Logo,
} from './design-system'
```

### Button

```tsx
<Button variant="primary" size="lg" icon={<ArrowIcon />}>
  Start a Pilot
</Button>
```

Variants: `primary` | `secondary` | `outline` | `ghost`  
Sizes: `sm` | `md` | `lg`

### SectionLabel

Label uppercase estilo Domu para secciones del hero:

```tsx
<SectionLabel>Dashboard</SectionLabel>
```

### StatusPill

```tsx
<StatusPill status="low" />    // green
<StatusPill status="medium" />  // amber
<StatusPill status="high" />    // red
```

### MetricCard

```tsx
<MetricCard
  label="Total Calls"
  value="2,847"
  change="+12.5%"
  variant="dark"
/>
```

### HeroSection

Sección completa del landing con grid pattern navy + dashboard preview:

```tsx
<HeroSection
  label="Dashboard"
  title="Your Mission Control for End-To-End Servicing"
  description="..."
  ctaText="Start a Pilot"
/>
```

## Tailwind classes

El design system expone clases Tailwind v4:

```
bg-domu-navy, bg-domu-blue, bg-domu-dashboard
text-domu-text, text-domu-text-secondary
rounded-domu-md, rounded-domu-lg
font-mono (Fragment Mono)
```

## Estructura

```
src/
  design-system/
    tokens/          # colors, typography, spacing
    components/      # UI components
    index.ts         # barrel export
  pages/
    DesignSystemShowcase.tsx
```

## Uso en prueba técnica

1. Importa componentes del design system
2. Usa tokens de `design-system/tokens` para valores consistentes
3. Combina `HeroSection` + `DashboardPreview` para landing pages
4. Usa variant `dark` en cards/metrics para interfaces de app
