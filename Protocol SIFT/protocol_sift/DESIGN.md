---
name: Protocol SIFT
colors:
  surface: '#0e1322'
  surface-dim: '#0e1322'
  surface-bright: '#343949'
  surface-container-lowest: '#090e1c'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f2f'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3445'
  on-surface: '#dee1f7'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dee1f7'
  inverse-on-surface: '#2b3040'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0e1322'
  on-background: '#dee1f7'
  surface-variant: '#2f3445'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '450'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  panel-padding: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for high-stakes enterprise cybersecurity environments. It evokes the atmosphere of a modern SOC (Security Operations Center) Command Center—authoritative, calm under pressure, and technologically advanced. The aesthetic merges **Corporate Modern** reliability with **Glassmorphism** depth to create a UI that feels multi-layered and immersive.

The brand personality is **Autonomous and Precise**. It avoids unnecessary decorative flourish in favor of functional density. The user should feel in total control of complex data streams, supported by a system that prioritizes signal over noise. Visual cues like subtle glows and translucent surfaces suggest a high-tech "heads-up display" (HUD) interface, while maintaining the rigor of a professional financial or governmental tool.

## Colors

The palette is anchored in a **Deep Navy and Charcoal Black** foundation to reduce eye strain during long monitoring shifts. 

- **Primary (Electric Blue):** Used for primary actions, focus states, and active navigation.
- **Secondary (Cyan):** Reserved for data highlights, telemetry accents, and scanning animations.
- **Semantic States:** Emerald Green signifies "Verified/Secure" status, while Crimson Red is strictly reserved for high-priority "Threat/Alert" states.
- **Surface Strategy:** Backgrounds use a true charcoal black to create infinite depth, while UI containers use a slightly lighter Deep Navy with varying levels of opacity (60-80%) to facilitate the glassmorphic layering.

## Typography

Typography prioritizes clarity and technical density. **Inter** provides the structural backbone for the UI, offering exceptional legibility at small sizes within data-heavy tables. 

**JetBrains Mono** is introduced for all technical data, logs, IP addresses, and status labels. This monospaced contrast helps the user immediately distinguish between "interface prose" and "system data." 

For display headings, use tight letter spacing to maintain a compact, high-performance feel. Labels should frequently use uppercase with increased tracking to create a "technical instrument" aesthetic.

## Layout & Spacing

This design system utilizes a **12-column fluid grid** for desktop, transitioning to a **4-column grid** for mobile. The spacing rhythm is based on a **4px baseline**, ensuring all elements align to a technical grid.

Layouts are designed with a **"Panel-First"** approach. Screens are divided into functional zones (Navigation, Global Intelligence, Detail Inspector) using semi-transparent glass panels. 

- **Desktop:** 24px margins, 16px gutters.
- **Tablet:** 16px margins, 12px gutters. Content stacks into a single primary column with a collapsible side inspector.
- **Mobile:** 16px margins. Minimalist view prioritizing the most recent alerts and status indicators.

## Elevation & Depth

Depth is achieved through **Glassmorphism** rather than traditional drop shadows. Instead of casting shadows "down" onto a surface, elements appear to exist in a 3D space with light passing through them.

1.  **Backdrop Blur:** Use a 12px to 20px blur on all container backgrounds.
2.  **Stroke Elevation:** Use a 1px inner border (stroke) with a gradient—top-left being more opaque (#ffffff20) and bottom-right being more transparent (#ffffff05). This creates a "glass edge" effect.
3.  **Active Glow:** For high-priority elements or selected states, use a subtle `box-shadow` with a 15px spread, utilizing the primary Electric Blue at 20% opacity to simulate a soft UI glow.
4.  **Tonal Stacking:** Higher-level elements (modals, popovers) should have a slightly lighter background hex (#1e293b) compared to the base panels (#0a0f1e).

## Shapes

To maintain a professional and "engineered" feel, the design system utilizes **Soft (0.25rem)** roundedness. This provides enough softening to prevent the UI from feeling aggressive (Brutalist), but stays sharp enough to communicate precision.

- **Primary Elements (Buttons, Inputs):** 4px (0.25rem) radius.
- **Container Panels:** 8px (0.5rem) radius.
- **Large Layout Blocks:** 12px (0.75rem) radius.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use a solid Electric Blue fill with a subtle inner top-light glow. Secondary buttons use a "Ghost" style with a 1px Slate Gray border that brightens to Cyan on hover.
- **Input Fields:** Darker than the panel background (#020617) with a subtle Cyan bottom-border focus state. Use JetBrains Mono for the input text.
- **Chips/Status:** Small, high-contrast labels. "Critical" alerts should pulse slightly (opacity 0.8 to 1.0) to draw immediate attention.
- **Cards/Panels:** These are the primary containers. They must have a `backdrop-filter: blur(12px)` and a subtle light-blue border at 10% opacity.
- **Data Tables:** High-density, low-row-height. Use subtle Slate Gray zebra-striping. Header cells use the `label-sm` typography style.
- **Terminal Component:** A dedicated area for raw log output using JetBrains Mono, featuring a specific Charcoal Black background and no rounded corners on the bottom to simulate an integrated hardware feel.