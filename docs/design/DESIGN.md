---
name: Apex Engineering
colors:
  surface: '#121416'
  surface-dim: '#121416'
  surface-bright: '#38393c'
  surface-container-lowest: '#0c0e10'
  surface-container-low: '#1a1c1e'
  surface-container: '#1e2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#333537'
  on-surface: '#e2e2e5'
  on-surface-variant: '#e6bdb8'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3133'
  outline: '#ad8884'
  outline-variant: '#5d3f3c'
  surface-tint: '#ffb4ab'
  primary: '#ffb4ab'
  on-primary: '#690006'
  primary-container: '#d71920'
  on-primary-container: '#ffece9'
  inverse-primary: '#c00014'
  secondary: '#c2c7cb'
  on-secondary: '#2c3134'
  secondary-container: '#42474b'
  on-secondary-container: '#b1b6ba'
  tertiary: '#c6c7c4'
  on-tertiary: '#2f312f'
  tertiary-container: '#6c6d6b'
  on-tertiary-container: '#f0f0ed'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#dee3e7'
  secondary-fixed-dim: '#c2c7cb'
  on-secondary-fixed: '#171c1f'
  on-secondary-fixed-variant: '#42474b'
  tertiary-fixed: '#e2e3e0'
  tertiary-fixed-dim: '#c6c7c4'
  on-tertiary-fixed: '#1a1c1b'
  on-tertiary-fixed-variant: '#454745'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
  surface-base: '#111315'
  surface-raised: '#17191B'
  surface-card: '#202326'
  surface-elevated: '#282B2E'
  border-subtle: '#2B2F33'
  border-medium: '#383D42'
  text-primary: '#F5F5F2'
  text-muted: '#A8ADB1'
  accent-red-hover: '#E21B23'
  status-fault-red: '#D71920'
  status-amber-warning: '#F59E0B'
  status-pass-green: '#10B981'
  plate-yellow: '#FDCB00'
  plate-yellow-bg: '#E5B700'
typography:
  headline-xl:
    fontFamily: Chivo
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 54px
  headline-xl-mobile:
    fontFamily: Chivo
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
  headline-lg:
    fontFamily: Chivo
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 42px
  headline-lg-mobile:
    fontFamily: Chivo
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Chivo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-sm:
    fontFamily: Chivo
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-code:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-telemetry:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-badge:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an authoritative, precision-engineered automotive identity tailored for the UK vehicle diagnostics, tuning, and master mechanical sector. Rooted in professional mechanical integrity rather than consumer tuner clichés, the aesthetic fuses disciplined British engineering standards (DVSA MOT certification, IMI technician accreditation, Motor Ombudsman adherence) with high-density workshop telematics.

The visual direction embraces an **Industrial-Technical Minimalist** architecture:
- Deep, oil-free graphite surfaces conveying sterile, diagnostic-bay precision.
- Laser-sharp visual hierarchies engineered for rapid information triage under harsh workshop lighting or roadside mobile use.
- Utilitarian restrained red accents applied with surgical economy, reserving saturation strictly for critical fault alerts, diagnostic state highlights, and primary booking conversions.
- Rejection of synthetic neon gradients, skeuomorphic carbon fibre, or hyper-stylized motorsport tropes in favor of robust, tactile, instrument-grade components.

## Colors

The color palette is deliberately calibrated for high contrast and diagnostic clarity against dark workshop displays. 

- **Primary (`#D71920`)**: A calibrated British mechanical red, derived from brake calipers and diagnostic alert states. Used exclusively for top-tier primary CTAs (e.g., "Book Diagnostic Bay", "Emergency Recovery Call"), live failure indications, and high-priority fault confirmations.
- **Secondary (`#A8ADB1`)**: Cold-rolled zinc tone. Serves as supporting structural metadata, system status subtext, unit measurements (Nm, bar, PSI, ms), and inactive borders.
- **Tertiary (`#F5F5F2`)**: High-luminance crisp off-white ensuring WCAG AAA legibility against the charcoal baseline for headings, active telemetry figures, and primary labels.
- **Neutral (`#111315`)**: Deep mechanical charcoal serving as the application floor. Paired with tiered surface tones (`#17191B`, `#202326`, and `#282B2E`) to generate clear spatial zoning without relying on drop shadows.
- **Domain-Specific Accents**:
  - `plate-yellow` (`#FDCB00`): Authentic UK rear vehicle registration plate yellow, deployed solely on the UK VRM input pattern with authentic Charles Wright-inspired proportions.
  - `status-pass-green` (`#10B981`) & `status-amber-warning` (`#F59E0B`): Strict functional indicators for MOT test outcomes, live sensor parameters, and OBD-II readiness monitors.

## Typography

The typographic system utilizes a tri-font structure to cleanly separate mechanical impact, continuous technical prose, and machine-level telemetry:

1. **Headlines (`Chivo`)**: Selected for its aggressive grotesque cuts, high x-height, and industrial signage heritage. Rendered in upper-range weights (700, 800) with slight letter-spacing reductions (`-0.02em`) on display sizes to mirror automotive chassis stamping and technical toolkits.
2. **Body (`Inter`)**: Deployed across all descriptive paragraphs, workshop reports, service breakdowns, and legal disclosures. Provides neutral, crystalline legibility with tall ascenders and distinct aperture geometry, essential for dark mode legibility.
3. **Labels & Telemetry (`Space Grotesk`)**: Reserved for system metadata, VINs, OBD-II DTC (Diagnostic Trouble Codes) such as `P0300` or `U0100`, torque and voltage ratings, and timestamp logs. Its tabular, technical proportions communicate precision engineering.

## Layout & Spacing

The layout model is governed by a rigorous 8px baseline rhythm across an aligned 12-column responsive fluid grid (collapsing to 6 columns at tablet and 4 columns on mobile devices).

- **Margins & Gutters**: Mobile devices enforce a compact `1rem` margin to maximize screen real estate for diagnostic forms and code lists, expanding smoothly to `2.5rem` on desktop workstations.
- **Rhythm**: Spacing is intentionally dense and structured. Component padding scales from `0.5rem` (`space-sm`) on metadata pills up to `2.5rem` (`space-xl`) on major service bays and conversion panels.
- **Data Grids**: Inspection checklists, diagnostic tables, and telemetry streams use strict `0.5rem` vertical spacing to allow rapid scanning without excessive scrolling.

## Elevation & Depth

Visual hierarchy does not rely on soft diffused drop shadows or blurred glass layers, which detract from industrial clarity. Instead, depth is articulated through **Tonal Stacking and High-Precision Hairline Framing**:

- **Layer 0 (Canvas)**: `#111315` — The deep foundation surface.
- **Layer 1 (Card & Modular Modules)**: `#17191B` with an inset `1px` solid border in `#2B2F33`.
- **Layer 2 (Interactive Panels & Active Modals)**: `#202326` with a `1px` solid border in `#383D42`.
- **Hover & Focus Elevation**: Hover states brighten border values to `#A8ADB1` or `#D71920` (active/focus) rather than projecting artificial shadows. An optional `0 0 12px rgba(215, 25, 32, 0.15)` ambient red glow is reserved solely for critical active diagnostic warnings.

## Shapes

The design system enforces a disciplined `roundedness: 1` (`0.25rem` / `4px` baseline corner radius). 

- Standard inputs, buttons, service cards, and data badges utilize `4px` border-radii, giving elements a solid, machined, metallic feel reminiscent of modern automotive ECU casings and high-end workshop tools.
- Circular shapes are strictly prohibited except for binary status pips (e.g., live OBD connection pulses) and standardized round partner seals.
- Vehicle registration plates retain a customized corner curve of `6px` matching real-world British standard acrylic plates (BS AU 145e specifications).

## Components

### 1. Buttons
- **Primary Action (Emergency Diagnostic / Booking)**: Background in `#D71920`, text in `#F5F5F2`, `4px` radius, typography `Chivo` Bold uppercase with `0.04em` tracking. Hover state transitions to `#E21B23` with no drop shadow.
- **Secondary / Workshop Direct (Call / WhatsApp)**: Background `#202326`, border `1px solid #383D42`, text `#F5F5F2`. Hover state shifts border to `#A8ADB1`.
- **Ghost / Telemetry Actions**: Borderless, text `#A8ADB1`, hover text `#F5F5F2`.

### 2. UK Vehicle Registration (VRM) Look-Up Field
- Built to mimic authentic UK plate aesthetics without gimmickry:
- Left-side GB/UK union band: Deep cobalt blue band with white "UK" label.
- Input surface: High-visibility plate yellow (`#FDCB00`), text in pure black (`#000000`), uppercase monospaced styling (`letter-spacing: 0.12em`), font weight 800.
- Submit button: Integrated directly into the field edge in `#111315` with red accent focus ring.

### 3. Fault Code Badges (OBD-II DTCs)
- Compact chips designed with `label-code` typography (`Space Grotesk`).
- Structure: Code identifier (`P0300`, `P0420`, `U0100`) alongside short-form text (`Random/Multiple Cylinder Misfire Detected`).
- Visual: Border `1px solid #D71920`, background `rgba(215, 25, 32, 0.08)`, text `#F5F5F2`, with a solid red indicator bar on the left edge.

### 4. Workshop Service & Bay Cards
- Background: Surface-card (`#202326`), border: `1px solid #2B2F33`.
- Internal structure: Fixed header displaying service tier (e.g., "Level 3 Master Diagnostic & Oscilloscope Analysis"), technical scope items with checkmark indicators, estimated bay time (`1.5h - 3.0h`), and transparent upfront fixed pricing in `#F5F5F2`.

### 5. DVSA / IMI / Motor Ombudsman Trust Ribbon
- Structured horizontally across the header sub-bar or directly beneath main hero CTA.
- Crisp vector iconography in monochrome `#A8ADB1`, rising to `#F5F5F2` on hover with verifiable accreditation reference numbers underneath.

### 6. Interactive Before / After Engineering Viewer
- Split slider for carbon cleaning, walnut blasting, or mechanical rebuild comparisons.
- High-contrast vertical split line (`#F5F5F2`) with a dual-arrow handle (`#111315` fill, `#D71920` border) featuring explicit "BEFORE: INTAKE CARBON SOOT" and "AFTER: HYDROGEN CLEANED" stamped technical tags.

### 7. Fixed Mobile Dispatch & Booking Bar
- Sticky bottom mobile dock: Dual actions dividing the screen between direct engineer phone dispatch (`tel:`, surface `#202326`, icon + "Call Workshop") and direct bay reservation (`#D71920`, "Book Bay").