# DESIGN.md — Linear Aesthetic System

## 1. Visual Theme & Atmosphere
- **Persona**: Software-craft documentation, silent luxury, ultra-disciplined dark mode.
- **Bias**: High information density, flat border-based hierarchy, keyboard-first clarity.
- **Reject**: Drop-shadow card clutter, multi-color chromatic palettes, glowing neon blobs, heavy marketing gradients, rounded consumer pills.

## 2. Color Roles (Dark-First)
- `surface-canvas`: `#010102` (deepest dark with faint blue tint — never pure `#000000`)
- `surface-1`: `#0a0b0d` (panel / container base)
- `surface-2`: `#0f1011` (elevated card panel)
- `surface-3`: `#161719` (interactive hover / active row)
- `hairline-border`: `rgba(255, 255, 255, 0.08)` or `#1e2023`
- `text-primary`: `#f7f8f8`
- `text-secondary`: `#8a8f98`
- `text-dim`: `#565860`
- `accent-primary`: `#5e6ad2` (Linear lavender-blue — restricted strictly to brand marks, primary focus rings, and single key primary CTAs)

## 3. Typography
- **Display / Headings**: Linear custom sans / `Inter` / `SF Pro Display`, weight 500–600, negative letter-spacing (`-0.03em` to `-0.02em`).
- **Body**: `Inter` / system-ui, weight 400, line-height `1.5`, letter-spacing `0`.
- **Mono**: `JetBrains Mono` / `SF Mono`, weight 400, tracking `-0.01em` for shortcuts, IDs, and key-values.
- **Scale Ratio**: Tight modular scale (`12px`, `13px`, `14px` body, `16px`, `20px`, `28px`, `36px` display).

## 4. Spacing & Layout
- **Base Unit**: `4px` grid (`4, 8, 12, 16, 24, 32, 48, 64`).
- **Container**: Max width `1200px`, fluid horizontal padding `24px`–`48px`.
- **Card Padding**: Internal padding `16px` to `24px`.
- **Gaps**: Grid gap `12px`–`16px` for dense lists, `24px` for section cards.

## 5. Elevation & Depth
- **Surface Ladder**: Hierarchy carried strictly via surface lightness progression (`surface-canvas` -> `surface-1` -> `surface-2` -> `surface-3`) paired with `1px` hairline borders. No box shadows.

## 6. Component Rules
- **Buttons**:
  - Primary: `#5e6ad2` fill, white text `#ffffff`, radius `6px`–`8px`, weight `500`, padding `6px 12px`.
  - Secondary/Ghost: Transparent fill, hairline border, hover shifts to `surface-3`.
- **Cards**: Charcoal panels (`#0f1011`) with hairline borders, `6px`–`8px` border-radius. No floating elevation.
- **Protagonist**: Frame product UI screenshots inside dark charcoal window frames rather than abstract marketing illustrations.

## 7. Do's and Don'ts
- **Do**: Use `#5e6ad2` as surgical punctuation, pair display weight 600 with body 400, use product UI as visual hero.
- **Don't**: Use pure black `#000000`, use purple for body links/paragraph highlights, add multi-stop gradient text, or use rounded pill badges for data rows.

## 8. Agent Prompt Directive
When writing or refactoring UI code, treat this file as immutable truth. Prefer tabular alignment, crisp 1px borders, high-density key-value metadata, and zero decorative fluff.

## Implementation notes (this project)

- Tokens live in `app/globals.css` as CSS custom properties, registered with Tailwind v4's `@theme inline` so they're usable as `bg-surface-2`, `text-text-primary`, `border-border`, `text-accent`, etc.
- Fonts: Inter (sans) and JetBrains Mono (mono), loaded via `next/font/google` in `app/layout.tsx`.
- **Light is the default theme** (white canvas, near-black text) — by explicit request, overriding this spec's dark-mode default. **Dark is available as a per-user toggle** (Profile → Appearance, `User.themePreference` in the DB), applied via `[data-theme="dark"]` on `<html>` set server-side from the signed-in user's saved preference — no flash on load, no `prefers-color-scheme` branching. Both themes share the same surface-ladder + hairline-border structure.
- Dates, counts, and other key-value metadata (job card timestamps, column counts) use the mono font per section 3.
- No `rounded-full` badges/pills anywhere — status/kit indicators use `rounded` (4px) or `rounded-md` (6px) bordered tags instead.

### Dark palette revision — "Linear-design-analysis" spec

The dark theme's exact color values were later revised against a more detailed token
spec extracted directly from linear.app's marketing surfaces (colors, a full
typographic scale, spacing/radius scales, and a large marketing-page component
library — pricing cards, testimonials, changelog rows, a top-nav with
"Sign in"/"Get started", etc.). Two scoping decisions were made explicitly with the
user, since that source spec conflicts with / doesn't map cleanly onto this app:

1. **Keep the light/dark toggle.** The source spec is dark-only ("Don't ship a
   light-mode... page") — this project keeps light as default with dark as a
   toggle regardless; only the dark palette's values were revised.
2. **Extract tokens, don't adopt marketing components.** This app is a functional
   dashboard, not a marketing/landing page — pricing cards, testimonial cards,
   customer logo tiles, changelog rows, and the marketing top-nav/footer have no
   equivalent screens here and were not built. Only the color values (and the
   already-shared principles — negative tracking on headings, hairline borders,
   no shadows) were carried over onto the app's real components (board, cards,
   modals, buttons, inputs).

Token mapping (source spec → this app's dark tokens) — the source's 4-step surface
ladder and 4-tier text hierarchy were compressed onto this app's existing 3-surface /
2-text-tier tokens rather than renaming every component's classes:

| This app's token | Source spec token | Value |
|---|---|---|
| `canvas` | `canvas` | `#010102` |
| `surface-1` | `surface-1` | `#0f1011` |
| `surface-2` | `surface-2` | `#141516` |
| `surface-3` | `surface-3` | `#18191a` |
| `border` | `hairline` | `#23252a` |
| `text-primary` | `ink` | `#f7f8f8` |
| `text-secondary` | `ink-muted` | `#d0d6e0` |
| `text-dim` | `ink-subtle` | `#8a8f98` |
| `accent` | `primary` | `#5e6ad2` |
| `accent-hover` | `primary-hover` | `#828fff` |
| `danger` | *(not in source — marketing pages have no destructive actions)* | `#e5484d`, kept as this app's own addition for real delete flows |

Not adopted: the source spec's display typography scale (80px/56px/40px hero sizes)
has no use in a dense dashboard with no hero sections; the marketing-specific
component tokens (`pricing-card`, `testimonial-card`, `changelog-row`,
`customer-logo-tile`, `cta-banner`, `top-nav`/`footer` with sign-in/get-started
copy) were left out entirely, as scoped above; the source's 4-tier text hierarchy
and `hairline-strong`/`hairline-tertiary`/`surface-4` steps were compressed rather
than each getting a dedicated token, since this app's components don't currently
need that many levels of distinction.
