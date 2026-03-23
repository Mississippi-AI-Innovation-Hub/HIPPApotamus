# Design System — HIPAApotamus

## Product Context
- **What this is:** HIPAA Business Associate Agreement management system — contract tracking, expiration reminders, e-signatures, and AI-assisted audit packets
- **Who it's for:** Mississippi DOH compliance officers, HIPAA officers, and healthcare vendors who sign contracts
- **Space/industry:** Healthcare compliance / government health IT. Peers: Vanta, Drata, Secureframe (but those target startups — this targets state government)
- **Project type:** Web app / internal compliance dashboard

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian
- **Decoration level:** Intentional — subtle texture through card depth and border hierarchy. No gradients, no blobs, no decorative elements. Decoration comes from well-structured data.
- **Mood:** Opening a secure filing cabinet. Institutional authority meets modern clarity. This tool means business — it's not a trendy SaaS product, it's a government compliance instrument.
- **Reference sites:** Vanta.com, Drata.com, Secureframe.com (studied as counter-examples — their startup-minimal aesthetic is wrong for state government users)

## Typography
- **Display/Hero:** Instrument Serif — institutional gravitas, law-firm-letterhead feel. Used only for app name and major page titles. Separates HIPAApotamus from the startup compliance crowd.
- **Body/UI:** DM Sans — clean geometric sans with excellent readability at small sizes. Tabular-nums support for data tables.
- **UI/Labels:** DM Sans (same as body, weight 500-600 for labels)
- **Data/Tables:** JetBrains Mono — for BAA IDs, timestamps, audit trail entries, IP addresses. Signals precision.
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN — `https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500;600&display=swap`
- **Scale:**
  - xs: 11px (0.6875rem) — fine print, timestamps
  - sm: 13px (0.8125rem) — table cells, secondary text
  - base: 14px (0.875rem) — body text, form inputs
  - md: 16px (1rem) — section labels, emphasized body
  - lg: 18px (1.125rem) — subsection titles
  - xl: 22px (1.375rem) — page titles (display font)
  - 2xl: 28px (1.75rem) — section titles (display font)
  - 3xl: 48px (3rem) — hero/brand (display font)

## Color
- **Approach:** Restrained — color is earned, not decorative
- **Primary:** `#0F766E` (deep teal) — authority without coldness. Deeper than typical teal-500 for institutional weight.
- **Primary hover:** `#0D6560`
- **Primary light:** `#CCFBF1` — backgrounds for primary badges/alerts
- **Secondary:** `#B45309` (warm amber) — urgency and warnings. Reads as serious, not playful.
- **Neutrals:** Warm slate range (slightly warm, not blue-gray)
  - 50: `#F8FAFC` (page background)
  - 100: `#F1F5F9` (surface alt)
  - 200: `#E2E8F0` (borders)
  - 300: `#CBD5E1` (strong borders)
  - 400: `#94A3B8` (muted text)
  - 500: `#64748B`
  - 600: `#475569` (secondary text)
  - 700: `#334155`
  - 800: `#1E293B` (dark surfaces)
  - 900: `#0F172A` (primary text, sidebar bg)
- **Semantic:**
  - Success: `#15803D` / light: `#DCFCE7`
  - Warning: `#B45309` / light: `#FEF3C7`
  - Error: `#B91C1C` / light: `#FEE2E2`
  - Info: `#1D4ED8` / light: `#DBEAFE`
- **Dark mode:** Invert surfaces (900→bg, 50→text), reduce primary saturation by 15%, use `#14B8A6` as primary in dark mode. All semantic colors shift to lighter variants on dark surfaces.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — not cramped, not wasteful. Government workers use smaller screens than designers assume.
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment. Compliance officers scan tables all day; consistency reduces cognitive load.
- **Grid:** 12 columns. Sidebar: fixed 256px (collapsible to 64px). Content: fluid within max-width.
- **Max content width:** 1100px (7xl)
- **Border radius:**
  - sm: 4px (buttons, inputs, badges)
  - md: 8px (cards, dropdowns)
  - lg: 12px (modals, panels)
  - full: 9999px (pills, avatars)

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension. Compliance tools shouldn't bounce.
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-200ms) medium(200-300ms)
- **What gets motion:** Slide-over panels (200ms ease-out), toast notifications (150ms), dropdown menus (100ms), theme toggle (300ms on backgrounds). Everything else is instant.
- **What doesn't:** Page loads, tab switches, table rendering, button clicks.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-23 | Initial design system created | Created by /design-consultation based on competitive research of Vanta/Drata/Secureframe + healthcare dashboard best practices |
| 2026-03-23 | Instrument Serif for display | Deliberate departure from compliance SaaS norms — signals state government authority rather than startup modernity |
| 2026-03-23 | Warm slate neutrals | Deliberate departure — warm grays feel less sterile than blue-tinted grays, more like a physical office |
| 2026-03-23 | Deep teal #0F766E over lighter teal | Deepened from original teal-600 for more institutional weight |
