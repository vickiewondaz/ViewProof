# Glass System — a glassmorphism design system for Web, iOS & Android

One shared set of design tokens (`tokens.json`) expressed natively on all three platforms, so frosted‑glass surfaces look and behave consistently.

## What's inside

```
glass-system/
├── tokens.json              # Source of truth: color, blur, radius, border, shadow, motion, a11y
├── web/
│   ├── tokens.css           # Tokens as CSS custom properties (+ light/dark themes)
│   ├── glass.css            # Component classes: surface, card, button, input, navbar, badge, toggle
│   ├── GlassComponents.jsx  # Drop-in React components
│   └── demo.html            # Self-contained preview — just open it in a browser
├── ios/
│   └── Glassmorphism.swift  # SwiftUI: native Material levels + GlassCard/Button/Field/Toggle
└── android/
    └── Glassmorphism.kt     # Jetpack Compose (M3): glassSurface modifier + GlassCanvas/Card/Button
```

## The glass recipe (shared across all three)

| Token | Value | Notes |
|---|---|---|
| Blur | sm 10 · md 18 · lg 28 (px) | Backdrop blur. iOS maps to `.ultraThin/.thin/.regular` Material. |
| Saturation | 1.4 light / 1.6 dark | Boosts color behind the glass. |
| Fill | white 55% light · #11162E 42% dark | The translucent surface. |
| Border | 1px, white 70% light / 16% dark | Hairline edge highlight. |
| Shadow | 0 8 32 rgba(8,12,32,.20) | Layered depth. |
| Radius | card 26 · button 18 · pill 999 | |

## Quick start

**Web** — open `web/demo.html` to preview instantly. In a real app, import `tokens.css` + `glass.css` once, then use the classes or the React components in `GlassComponents.jsx`.

**iOS** — drop `Glassmorphism.swift` into a SwiftUI project (iOS 15+). Wrap screens in `GlassCanvas { ... }` and use `GlassCard`, `GlassButton`, etc. Native materials auto-adapt to light/dark and *Reduce Transparency*.

**Android** — copy `Glassmorphism.kt` into a Compose (Material 3) project. Wrap content in `GlassCanvas` and use `GlassCard` / `GlassButton`. The starter uses translucent fill + blobs (works on every API level). For true live backdrop blur on Android 12+ (API 31+), add the [Haze](https://github.com/chrisbanes/haze) library — a commented `haze`/`hazeEffect` path is included.

## Accessibility notes

- Glassmorphism's weak point is text contrast. Put text on a `fillStrong`/`.regular` surface over busy backgrounds.
- All three honor a "reduce transparency" fallback: web via `prefers-reduced-transparency`, iOS via the system setting + native materials, Android by raising fill opacity toward solid.
- Keep body text ≥ 4.5:1 and large text ≥ 3:1 against the surface.

## Customizing

Edit `tokens.json` first, then mirror changes into `tokens.css`, `Glass.Colors` (Swift), and `GlassTokens` (Compose). Colors are currently a neutral vibrant palette — swap the blob/accent colors for your brand (e.g. RCCG navy #001755 / forest #2B6B4A / burgundy #660F2E).
