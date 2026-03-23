# Design System — HIPAApotamus

## Product Context
- **What this is:** HIPAA BAA management system for state government healthcare
- **Who it's for:** Compliance officers, HIPAA officers, healthcare vendors
- **Project type:** Web app / institutional compliance dashboard
- **UI Framework:** shadcn/ui + Tailwind CSS v4

## Typography
- **Display/Headings:** Satoshi (from Google Fonts) — modern geometric sans-serif with institutional weight. Clean, authoritative, not calligraphic.
- **Body/UI:** DM Sans — readable at all sizes, tabular-nums for data
- **Data/Code:** JetBrains Mono — BAA IDs, timestamps, audit entries
- **Loading:** Google Fonts CDN
- **Scale (bigger throughout for institutional gravitas):**
  - xs: 12px — timestamps, fine print
  - sm: 14px — secondary text, table cells
  - base: 15px — body text, form inputs
  - md: 16px — emphasized body, labels
  - lg: 20px — subsection titles
  - xl: 24px — page titles
  - 2xl: 32px — section titles, stat numbers
  - 3xl: 40px — hero/brand on login

## Color (shadcn theme variables)
- **Primary:** `#0F766E` (deep teal) mapped to shadcn `--primary`
- **Primary foreground:** `#FFFFFF`
- **Destructive:** `#B91C1C`
- **Semantic:** Success `#15803D`, Warning `#B45309`, Error `#B91C1C`, Info `#1D4ED8`
- **Neutrals:** Warm slate (`#F8FAFC` → `#0F172A`)

## Layout
- **Content max-width:** 1400px — wide institutional feel, not cramped
- **Sidebar:** 260px fixed, dark (#0F172A)
- **Spacing between sections:** 32px (space-y-8)
- **Card padding:** 24px (p-6)
- **Page padding:** px-8 py-8

## Components (shadcn/ui)
- Use shadcn `<Table>` for data tables
- Use shadcn `<Card>` for stat cards and vendor cards
- Use shadcn `<Badge>` for status indicators
- Use shadcn `<Tabs>` for dashboard tab navigation
- Use shadcn `<Input>` for form inputs
- Use shadcn `<Button>` for all buttons
- Use shadcn `<Dialog>` for modals
- Use shadcn `<Tooltip>` for help text
- Use shadcn `<Separator>` for visual dividers
