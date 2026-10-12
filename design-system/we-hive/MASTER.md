# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** We Hive
**Generated:** 2026-10-11 20:28:04
**Category:** Travel, visa & study-abroad services
**Design Dials:** Motion 6/10 (Standard+) · Depth: flag-palette gradients

---

## Global Rules

### Color Palette — US flag

| Role | Hex | Token | Contrast on white |
|------|-----|-------|-------------------|
| Primary (Old Glory Blue) | `#0A3161` | `--primary` / `--blue-700` | 12.9:1 |
| Primary hover | `#072447` | `--blue-800` | 15.5:1 |
| Primary mid (secondary accents) | `#1D4E89` | `--blue-500` | 8.4:1 |
| CTA (Old Glory Red) | `#B31942` | `--accent` / `--red-500` | 6.7:1 (white text on it 6.7:1) |
| CTA hover | `#8E1434` | `--accent-hover` / `--red-600` | 9.1:1 |
| Ink (text) | `#0B1220` | `--foreground` / `--blue-900` | 18.7:1 |
| Muted text | `#4A5568` | `--muted-foreground` | 7.5:1 |
| Background | `#FFFFFF` | `--background` | — |
| Tint | `#F0F4FA` | `--blue-50` / `--secondary` | — |
| Page tint | `#F7F9FC` | `--soft-bg` | — |
| Border | `#E1E7F0` | `--border` | — |
| Destructive | `#DC2626` | `--destructive` | 4.8:1 |

**Colour roles:** navy for primary buttons, links, active states and icons; red for the single main call-to-action per view and for one highlight word in a headline; white surfaces. Emerald / amber / red Tailwind shades are reserved for status. On dark (ink or navy) bands, use white text and white or red buttons — never navy on dark. Tokens live in `frontend/src/index.css`; prefer token classes over raw hex.

**Elite layer (index.css):** navy and red buttons render as gradients (`--grad-navy`, `--grad-red`) with a coloured glow on hover; every button gets a click ripple (`src/lib/ripple.js`) and a 1px press; cards gain a navy→red gradient edge on hover; `.eyebrow` has a navy→red underline; `.flag-stripe` sits under the navbar and above the footer; `.mesh-bg` / page wrappers carry a soft navy+red glow; `.text-gradient-red` / `.text-gradient-navy` for highlight words. Gradients stay within navy, red, white and ink.

**Enforced in Tailwind:** `frontend/tailwind.config.js` remaps the stock hues — `blue`, `sky`, `indigo`, `cyan`, `teal`, `violet`, `purple` render the navy scale (`700` = `#0A3161`) and `red`, `rose`, `pink`, `fuchsia`, `orange` render the flag-red scale (`600` = `#B31942`). Only `emerald`/`green`/`amber` keep stock values, for status. Don't add other hex accents; use navy, red, white or ink.

### Typography

- **Heading Font:** Figtree
- **Body Font:** Noto Sans
- **Mood:** medical, clean, accessible, professional, healthcare, trustworthy
- **Google Fonts:** [Figtree + Noto Sans](https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap)

**Loading:** via `<link rel="preconnect">` + `<link rel="stylesheet">` in `frontend/public/index.html` (never a CSS `@import`).

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

Use the classes in `frontend/src/index.css` (add `h-11 px-5 rounded-xl font-semibold`):

```css
.btn-primary { background: hsl(var(--primary)); color: #fff; }        /* navy #0A3161 */
.btn-accent  { background: hsl(var(--accent));  color: #fff; }        /* red #B31942 — one main CTA per view */
.btn-outline { background: #fff; border: 1px solid hsl(var(--border)); color: hsl(var(--blue-900)); }
/* hover: darker shade (--blue-800 / --accent-hover), 150-200ms; focus-visible ring in --ring */
```

### Cards

```css
.card-surface { background: #fff; border: 1px solid hsl(var(--border)); border-radius: 16px; box-shadow: var(--shadow-sm); }
.card-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0A3161;
  outline: none;
  box-shadow: 0 0 0 3px #0A316120;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Hero + Testimonials + CTA

- **Conversion Strategy:** Social proof before CTA. Use a concise set of verified testimonials with photo, name, and role. CTA after social proof. Provide previous/next and pause controls; stop rotation on focus, hover, and reduced motion; announce slide position. Previous/next buttons and keyboard controls must expose every slide without dragging.
- **CTA Placement:** Hero (sticky) + Post-testimonials
- **Section Order:** Hero > Problem statement > Solution overview > Testimonials carousel > CTA

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger; Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ Excessive decoration

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
