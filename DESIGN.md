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
- This app is single-theme dark — no light mode toggle, no `prefers-color-scheme` branching.
- Dates, counts, and other key-value metadata (job card timestamps, column counts) use the mono font per section 3.
- No `rounded-full` badges/pills anywhere — status/kit indicators use `rounded` (4px) or `rounded-md` (6px) bordered tags instead.
