---
name: tweakcn-design
description: Applies Tailwind-only styling with no inline styles, following the Agentic Submission V2 theme from tweakcn. Use when designing UI, building or styling components, or when the user requests styling that matches the project style guide.
---

# Tweakcn Design — Agentic Submission V2

Design or style UI using **Tailwind utility classes only**. Never use inline `style={{ ... }}` or `style="..."` attributes. All styling must follow the Agentic Submission V2 theme so the app stays consistent and themeable across light/dark mode.

**Canonical theme:** https://tweakcn.com/themes/cmkyjzse0000104kyh1fxgkgc
**Theme variables live in:** `client/app/globals.css` (`:root` and `.dark` blocks)

---

## Rules

1. **Tailwind only** — layout, spacing, color, typography, borders, shadows. Zero inline styles.
2. **Semantic theme tokens** — use CSS-variable-backed Tailwind classes so components respect light/dark mode and future theme changes. Never write raw hex/rgb/hsl values for theme areas.
3. **Custom one-offs** — use Tailwind's built-in scale (`p-4`, `w-48`, `gap-6`, etc.). If a new token is truly needed, add it to `globals.css` + `tailwind.config.ts`; don't reach for inline styles.

---

## Token Reference

### Backgrounds
| Class | Use |
|---|---|
| `bg-background` | Page / main container |
| `bg-card` | Cards, panels, elevated surfaces |
| `bg-popover` | Popovers, dropdowns, tooltips |
| `bg-muted` | Subtle sections, disabled areas |
| `bg-accent` | Hover/active accent, list highlights |
| `bg-primary` | Primary buttons, key CTAs |
| `bg-secondary` | Secondary buttons, tags |
| `bg-destructive` | Delete / danger actions |
| `bg-sidebar` | Sidebar background |

### Text
| Class | Use |
|---|---|
| `text-foreground` | Default body text |
| `text-muted-foreground` | Secondary text, captions, hints |
| `text-primary` | Links, primary emphasis |
| `text-primary-foreground` | Text on primary bg (e.g. buttons) |
| `text-card-foreground` | Text on cards |
| `text-accent-foreground` | Text on accent bg |
| `text-destructive` | Error / destructive text |
| `text-destructive-foreground` | Text on destructive bg |
| `text-sidebar-foreground` | Sidebar text |

### Borders & Inputs
| Class | Use |
|---|---|
| `border-border` | Default borders |
| `border-input` | Input field borders |
| `ring-ring` | Focus rings |
| `border-sidebar-border` | Sidebar dividers |

### Radius
| Class | Notes |
|---|---|
| `rounded-lg` | Maps to `var(--radius)` — 0.75rem |
| `rounded-md` | Slightly smaller |
| `rounded-sm` | Smallest radius |

### Charts
`bg-chart-1` … `bg-chart-5` / `text-chart-1` … `text-chart-5`

### Sidebar
`bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`, `text-sidebar-accent-foreground`, `border-sidebar-border`, `ring-sidebar-ring`

---

## Quick Reference

| Goal | Use | Avoid |
|---|---|---|
| Page background | `bg-background` | `style={{ backgroundColor }}` |
| Card | `bg-card text-card-foreground border border-border rounded-lg` | Inline styles |
| Primary button | `bg-primary text-primary-foreground hover:opacity-90` | `bg-[#b14092]` |
| Muted text | `text-muted-foreground` | `text-gray-500` |
| Border | `border-border` | `border-gray-200` |
| Input | `border border-input bg-background text-foreground focus:ring-2 focus:ring-ring` | Inline styles |

---

## Component Patterns

**Card:**
```tsx
<div className="bg-card text-card-foreground border border-border rounded-lg p-4 shadow-sm">
  ...
</div>
```

**Primary button:**
```tsx
<button className="bg-primary text-primary-foreground hover:opacity-90 rounded-md px-4 py-2 font-medium">
  Submit
</button>
```

**Muted helper text:**
```tsx
<p className="text-muted-foreground text-sm">Optional description</p>
```

**Input:**
```tsx
<input className="border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring px-3 py-2 w-full" />
```

**Section with accent highlight:**
```tsx
<div className="bg-accent text-accent-foreground rounded-md px-3 py-2">
  ...
</div>
```

---

## Theme Values (for reference)

| Token | Light | Dark |
|---|---|---|
| `--background` | `#ffffff` | `#1b1b18` |
| `--foreground` | `#3d3929` | `#c3c0b6` |
| `--primary` | `#b14092` | `#b14092` |
| `--secondary` | `#f9fafb` | `#faf9f5` |
| `--muted` | `#f9fafb` | `#1b1b19` |
| `--muted-foreground` | `#6b7280` | `#b7b5a9` |
| `--accent` | `#f5e4f0` | — |
| `--border` | `#f3f4f6` | `#3e3e38` |
| `--input` | `#f0f0f0` | `#52514a` |
| `--radius` | `0.75rem` | — |
| Font sans | Inter | — |
| Font serif | Source Serif 4 | — |
| Font mono | IBM Plex Mono | — |

---

## Updating the theme

1. Open https://tweakcn.com/themes/cmkyjzse0000104kyh1fxgkgc
2. Export the generated CSS variables
3. Replace the `:root` and `.dark` blocks in `client/app/globals.css`
4. Keep variable names consistent with `client/tailwind.config.ts`
