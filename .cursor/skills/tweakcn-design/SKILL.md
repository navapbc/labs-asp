---
name: tweakcn-design
description: Applies Tailwind-only styling with no inline styles, following the Agentic Submission V2 theme from tweakcn. Use when designing UI, building or styling components, or when the user requests styling that matches the project style guide.
---

# Tweakcn Design (Agentic Submission V2)

Design UI using **Tailwind classes only**. No inline `style` attributes. All visual styling must follow the project style guide so the app stays consistent and themeable.

## Style guide

**Canonical theme:** [Agentic Submission V2](https://tweakcn.com/themes/cmkyjzse0000104kyh1fxgkgc)

Theme values are defined via CSS variables in `client/app/globals.css`. To update the look, export the theme from the link above and replace the `:root` / `.dark` variable blocks in `globals.css`.

## Rules

1. **Tailwind only**
   Use Tailwind utility classes for layout, spacing, colors, typography, borders, and shadows. Do not use inline `style={{ ... }}` or `style="..."`.

2. **Use semantic theme tokens**
   Use the theme-aware color/radius tokens so components respect light/dark and future theme changes:
   - Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `bg-primary`, `bg-secondary`, `bg-destructive`, `bg-sidebar`, `bg-popover`
   - Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-primary-foreground`, `text-card-foreground`, etc.
   - Borders: `border-border`, `border-input`
   - Focus ring: `ring-ring`
   - Radius: `rounded-lg`, `rounded-md`, `rounded-sm` (these use `var(--radius)` in this project)
   - Charts: `text-chart-1` … `text-chart-5`, `bg-chart-1` … `bg-chart-5`

3. **No hardcoded colors for theme areas**
   Avoid raw hex/rgb/hsl in class names for UI that should follow the theme. Use the semantic tokens above (or add new CSS variables in `globals.css` and extend `tailwind.config.ts` if the design system grows).

4. **Custom values**
   If you need a one-off spacing or size not in the theme, use Tailwind's scale (e.g. `p-4`, `w-48`) or add a Tailwind variable in the config rather than inline styles.

## Quick reference

| Purpose        | Prefer                         | Avoid                    |
|----------------|--------------------------------|--------------------------|
| Page background| `bg-background`                | `style={{ backgroundColor }}` |
| Card          | `bg-card text-card-foreground border border-border rounded-lg` | Inline styles, fixed colors |
| Primary button| `bg-primary text-primary-foreground` | `bg-[#hex]`           |
| Muted text    | `text-muted-foreground`        | `text-gray-500`          |
| Borders       | `border-border`                | `border-gray-200`        |

For the full list of semantic tokens and examples, see [reference.md](reference.md).

## When updating the theme

1. Open https://tweakcn.com/themes/cmkyjzse0000104kyh1fxgkgc
2. Export or copy the generated CSS variables
3. Update the `:root` and `.dark` blocks in `client/app/globals.css` with the new values
4. Keep variable names consistent with `client/tailwind.config.ts` (e.g. `--background`, `--foreground`, `--primary`, `--radius`, sidebar and chart variables)
