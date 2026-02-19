# Semantic Tailwind Classes (Agentic Submission V2)

Use these theme-backed classes instead of hardcoded colors or inline styles. They map to CSS variables defined in `client/app/globals.css` and support light/dark mode.

## Backgrounds

| Class | Use case |
|-------|----------|
| `bg-background` | Page or main container background |
| `bg-card` | Cards, panels, elevated surfaces |
| `bg-popover` | Popovers, dropdowns, tooltips |
| `bg-muted` | Subtle sections, disabled areas |
| `bg-accent` | Hover/active accent, list highlights |
| `bg-primary` | Primary buttons, key CTAs |
| `bg-secondary` | Secondary buttons, tags |
| `bg-destructive` | Delete, danger actions |
| `bg-sidebar` | Sidebar background |
| `bg-chat-background` | Chat view background (if used) |

## Text

| Class | Use case |
|-------|----------|
| `text-foreground` | Default body text |
| `text-muted-foreground` | Secondary text, captions |
| `text-primary` | Links, primary emphasis |
| `text-primary-foreground` | Text on primary background (e.g. buttons) |
| `text-card-foreground` | Text on cards |
| `text-accent-foreground` | Text on accent background |
| `text-destructive` | Error/destructive text |
| `text-destructive-foreground` | Text on destructive background |
| `text-sidebar-foreground` | Sidebar text |

## Borders & inputs

| Class | Use case |
|-------|----------|
| `border-border` | Default borders |
| `border-input` | Input borders |
| `ring-ring` | Focus ring color |
| `border-sidebar-border` | Sidebar dividers |

## Radius

| Class | Notes |
|-------|--------|
| `rounded-lg` | Uses `var(--radius)` |
| `rounded-md` | Slightly smaller |
| `rounded-sm` | Smallest radius |

## Charts

| Class | Use |
|-------|-----|
| `bg-chart-1` … `bg-chart-5` | Chart fills |
| `text-chart-1` … `text-chart-5` | Chart labels / legends |

## Sidebar-specific

| Class | Use case |
|-------|----------|
| `bg-sidebar` | Sidebar background |
| `text-sidebar-foreground` | Sidebar text |
| `bg-sidebar-accent` / `text-sidebar-accent-foreground` | Sidebar item hover/active |
| `border-sidebar-border` | Sidebar borders |
| `ring-sidebar-ring` | Sidebar focus ring |

## Example snippets

**Card:**
```html
<div class="bg-card text-card-foreground border border-border rounded-lg p-4 shadow-sm">
  ...
</div>
```

**Primary button:**
```html
<button class="bg-primary text-primary-foreground hover:opacity-90 rounded-md px-4 py-2">
  Submit
</button>
```

**Muted helper text:**
```html
<p class="text-muted-foreground text-sm">Optional description</p>
```

**Input-style border:**
```html
<input class="border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring" />
```
