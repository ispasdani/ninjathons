# design.md — Challenge Platform Design System

Version 0.1 · 26 Sept 2026

This style guide adapts the visual language of getcracked.io: monochrome, typographic, calm, with color reserved for meaning. The values below were read from getcracked.io's live CSS (CSS variables, computed styles) on 26 Sept 2026, then extended for our own features: duels, verdicts, ratings, profiles and the research panel.

**Borrow the language, not the brand.** We reuse general design decisions: a neutral scale, open-source fonts, a type scale, radii and spacing. We do not copy getcracked's logo, wordmark, illustrations, marketing copy, page compositions, or product names such as "Quant Accelerator" or "platinum". Our identity comes from our own name, logo, illustrations and the duel/territory visuals.

---

## 1. Principles

1. **Monochrome first.** The interface is black, white and neutral grays. Color appears only when it means something: a verdict, a duel side, a rating tier, syntax highlighting.
2. **Type does the work.** Large headings are set at regular weight (400) with tight negative tracking, not bold. Hierarchy comes from size, spacing and gray levels.
3. **Quiet surfaces.** Cards are separated by a 1px border or a 1px ring shadow, not heavy drop shadows. Real shadows are reserved for floating elements and one premium button style.
4. **Dense, readable UI.** 13px is the main interface size. Body copy is 16px. Nothing important is below 12px.
5. **Mono means data.** Geist Mono is used for labels, code, numbers, timers and ratings, never for paragraphs.
6. **Both themes are first-class.** Every token has a light and a dark value. Dark mode is not an inverted light mode.

---

## 2. Color tokens

Token names follow the shadcn/ui convention, so they work directly with shadcn components and Tailwind v4 `@theme`.

### 2.1 Neutrals (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#ffffff` | `#0a0a0a` | Page background |
| `--foreground` | `#0a0a0a` | `#fafafa` | Primary text |
| `--bg-secondary` | `#f5f5f5` | `#171717` | Card fill, hover rows, input fill |
| `--bg-tertiary` | `#e5e5e5` | `#262626` | Pressed states, progress tracks, skeletons |
| `--text-secondary` | `#555555` | `#a1a1a1` | Lede and secondary text |
| `--muted-foreground` | `#737373` | `#a1a1a1` | Captions, meta, placeholders |
| `--primary` | `#171717` | `#fafafa` | Primary button fill |
| `--primary-foreground` | `#fafafa` | `#171717` | Primary button text |
| `--secondary` | `#f5f5f5` | `#262626` | Secondary button fill |
| `--border` | `#e5e5e5` | `#262626` | Default borders, dividers |
| `--border-strong` | `#d4d4d4` | `#525252` | Inputs on hover, emphasized dividers |
| `--ring` | `#a1a1a1` | `#525252` | Focus ring |
| `--card` | `#ffffff` | `#0a0a0a` | Card background (with border) |
| `--popover` | `#ffffff` | `#0a0a0a` | Menus, popovers |

### 2.2 Status (from the reference)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--success` | `#24c55f` | `#52dc78` | Success toasts, passed states |
| `--warning` | `#e49e21` | `#f7b345` | Warnings, time running low |
| `--destructive` | `#e40014` | `#e40014` | Errors, destructive actions |

### 2.3 Our additions: verdicts

Verdicts appear on the results view, submission lists and the duel HUD. Each verdict has a color, a short label and an icon, so it never relies on color alone.

| Verdict | Label | Light | Dark |
|---|---|---|---|
| Accepted | `AC` | `#16a34a` | `#4ade80` |
| Wrong answer | `WA` | `#dc2626` | `#f87171` |
| Time limit exceeded | `TLE` | `#d97706` | `#fbbf24` |
| Memory limit exceeded | `MLE` | `#c2410c` | `#fb923c` |
| Runtime error | `RE` | `#9333ea` | `#c084fc` |
| Compile error | `CE` | `#737373` | `#a1a1a1` |
| Running / queued | `…` | `#2563eb` | `#60a5fa` |

Use each color as text or a 1px border on a tinted fill (the same color at 10% opacity), not as a solid block.

### 2.4 Our additions: duel sides

| Token | Light | Dark | Use |
|---|---|---|---|
| `--duel-you` | `#2563eb` | `#60a5fa` | Your progress bar, your territory, your cursor |
| `--duel-opponent` | `#e11d48` | `#fb7185` | Opponent progress, their territory |
| `--duel-neutral` | `#a3a3a3` | `#525252` | Unclaimed territory |

For 3+ players in territory mode, add `#7c3aed` / `#a78bfa` (violet) and `#0d9488` / `#2dd4bf` (teal). Never use more than 4 player colors at once.

### 2.5 Our additions: rating tiers

Tiers are shown as a small colored name or badge next to a rating, like Codeforces. The rating number itself stays in `--foreground`, in Geist Mono.

| Tier | Rating | Light | Dark |
|---|---|---|---|
| Newbie | < 1200 | `#737373` | `#a3a3a3` |
| Apprentice | 1200–1399 | `#16a34a` | `#4ade80` |
| Specialist | 1400–1599 | `#0891b2` | `#22d3ee` |
| Expert | 1600–1899 | `#2563eb` | `#60a5fa` |
| Master | 1900–2199 | `#7c3aed` | `#a78bfa` |
| Grandmaster | 2200+ | `#dc2626` | `#f87171` |

Tier names and cut-offs are placeholders; rename them to fit the brand.

### 2.6 Pro accent

The reference marks premium offers with a dark, slightly cool "metal" button rather than a bright color. We keep that idea under our own token names:

| Token | Light | Dark |
|---|---|---|
| `--pro-bg` | `#1a1a1c` | `#323335` |
| `--pro-bg-hover` | `#2d2e30` | `#47484a` |
| `--pro-text` | `#e4e4e7` | `#d6d7d9` |
| `--pro-border` | `rgb(255 255 255 / 0.08)` | `rgb(255 255 255 / 0.10)` |
| `--pro-sheen` | `#9d9ea0` | `#b6b7b9` |

Pro is never shown with gold, gradients or sparkles. The Pro badge is this dark button style at small size.

---

## 3. Typography

### 3.1 Fonts

- **Sans:** Geist Sans. Open source (SIL Open Font License), shipped in the `geist` npm package and loadable through `next/font`.
- **Mono:** Geist Mono, same package.
- **Fallback stacks:**
  - Sans: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
  - Mono: `ui-monospace, SFMono-Regular, Menlo, "Roboto Mono", monospace`

```ts
// app/layout.tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// <html className={`${GeistSans.variable} ${GeistMono.variable}`}>
```

### 3.2 Scale

| Role | Size / line height | Weight | Tracking | Font |
|---|---|---|---|---|
| Display (marketing only) | 60 / 66px | 400 | -1.5px (-0.025em) | Sans |
| H1 | 48 / 52.8px | 400 | -1.2px (-0.025em) | Sans |
| H2 | 36 / 39.6px | 400 | -0.9px (-0.025em) | Sans |
| H3 | 20 / 28px | 400 | -0.2px | Sans |
| Lede | 18 / 29px | 400 | 0 | Sans, `--text-secondary` |
| Body | 16 / 24px | 400 | 0 | Sans |
| UI (buttons, nav, tables) | 13 / 18.5px | 400 or 500 | 0 | Sans |
| Caption | 12 / 16px | 400 | 0 | Sans, `--muted-foreground` |
| Label (eyebrow, section title) | 12 / 12px | 500 | 1.44px (0.12em), uppercase | Mono |
| Micro (button sublabel) | 9–10px | 400–500 | 0 | Sans, muted |
| Code | 13 / 20px | 400 | 0 | Mono |
| Numbers (rating, timer, stats) | inherits | 500 | 0, `tabular-nums` | Mono |

Rules:
- Headings are never bold. Weight 500 is the maximum anywhere except rare emphasis at 600.
- On mobile, step headings down: Display 40px, H1 36px, H2 28px.
- Use `text-wrap: balance` on headings and keep paragraphs under about 65 characters wide.

---

## 4. Spacing, radius, elevation

### 4.1 Spacing

A 4px base (Tailwind default). Common values from the reference:

- Inside controls: 8px vertical, 12–16px horizontal
- Card padding: 24px
- Grid gaps: 8px (tight lists), 16px (cards), 32–40px (feature grids)
- Section padding: 64px mobile, 96px tablet, 128px desktop (`py-16 sm:py-24 lg:py-32`)

### 4.2 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | Badges, kbd, tiny chips |
| `--radius-sm` | 6px | Inputs inside dense tables, progress bars, tags |
| `--radius` | 10px | Base token (0.625rem), nav buttons |
| `--radius-md` | 12px | Buttons, cards, panels (the most common value) |
| `--radius-lg` | 16px | Large feature panels, modals |
| `--radius-xl` | 24px | Marketing hero frames only |
| `--radius-full` | 9999px | Pills, avatars, toggles |

### 4.3 Elevation

| Level | Value | Use |
|---|---|---|
| Ring | `0 0 0 1px var(--border)` | Default card outline |
| Soft | `0 1px 4px 0 rgb(0 0 0 / 0.10)` | Primary button |
| Raised | `0 2px 8px -2px rgb(0 0 0 / 0.30)` | Pro button, floating toolbar |
| Overlay | `inset 0 1px 0 rgb(0 0 0 / 0.08), 0 2px 8px -3px rgb(0 0 0 / 0.35), 0 28px 56px -24px rgb(0 0 0 / 0.5)` | Modals, command palette, product screenshots |

In dark mode, keep the same shadows but rely more on borders, since shadows are barely visible on `#0a0a0a`.

---

## 5. Layout

- **Container:** max width 1344px (84rem), centered, side padding 16px mobile, 24px tablet, 32px desktop.
- **Reading width:** 672–768px for prose, lesson text and problem statements.
- **Header:** sticky, 64px tall, background `--background` at 80% opacity with backdrop blur, 1px bottom border.
- **Announcement bar (optional):** full-width, `--foreground` background, `--background` text, 13px, dismissible. Use it for things like "Python 3.14 now available in the runner".
- **Footer:** column groups with mono uppercase labels (12px, 0.12em tracking) above 13px link lists.

### 5.1 Marketing pages

- Hero is left-aligned: H1 at Display or H1 size, one lede line, a row of small icon + label chips for tracks (for example "Algorithms", "Duels", "Ninjathons"), then two buttons (primary + Pro).
- Feature sections alternate a text column with a real product screenshot or live demo inside a bordered, `--radius-lg` frame.
- Use real product UI instead of stock illustrations: a live mini duel, a real verdict list, a real rating chart.

### 5.2 App layout (dashboard)

- Left sidebar 240px (collapsible to 56px icons), top bar 56px.
- Content uses the full container; tables and lists are 13px.
- The solve view is a resizable split: problem and research tabs on the left, editor on the right, results panel docked under the editor.
- The duel view adds a HUD strip at the top: server timer (mono, tabular numbers), your progress bar (`--duel-you`), opponent progress bar (`--duel-opponent`).

---

## 6. Components

### Buttons

All buttons: 13px, weight 500, `--radius-md` (12px), height 36px (32px small, 40px large), 1px border.

| Variant | Background | Text | Border | Shadow |
|---|---|---|---|---|
| Primary | `--foreground` | `--background` | transparent | Soft |
| Secondary | `--secondary` | `--foreground` | `--border` | none |
| Ghost (nav) | transparent | `--foreground` | none | none; hover `--bg-secondary` |
| Link | transparent | `--text-secondary` | none | underline on hover |
| Pro | `--pro-bg` | `--pro-text` | `--pro-border` | Raised |
| Destructive | `--destructive` | white | transparent | none |

**Two-line button** (from the reference, good for Pro and events): title at 13px/500, sublabel below at 9–10px in muted text, for example "Go Pro" over "Courses + unlimited coach", or "Weekly Contest" over "Sun · 18:00 CET".

Focus: `outline: 2px solid var(--ring); outline-offset: 2px` on every interactive element.

### Cards

- Default: `--card` background, 1px `--border`, `--radius-md`, 24px padding.
- Muted: `--bg-secondary` fill with a 1px `--border`, for grouped content and stats.
- Interactive cards (problem cards, course cards): the border moves to `--border-strong` on hover. No lift or scale animation.

### Inputs

Height 36px, `--radius-md`, 1px `--border`, 13px text, `--background` fill (dark: `--bg-secondary`). The border darkens to `--border-strong` on hover and the focus ring appears on focus.

### Labels and badges

- **Section eyebrow:** Geist Mono 12px, weight 500, uppercase, 0.12em tracking.
- **Tag chip:** 12px, `--bg-secondary` fill, `--radius-sm`, 2px × 8px padding. Use for topics like "graphs" or "dp".
- **Difficulty:** text only, no colored pill: Easy / Medium / Hard in `--muted-foreground`, plus a 3-dot meter.
- **Verdict badge:** mono label (`AC`, `WA`…) in the verdict color on a 10% tint, `--radius-xs`.

### Tables

- 13px text, 12px mono uppercase headers in `--muted-foreground`.
- 1px `--border` row dividers, rows 44px tall, hover row `--bg-secondary`.
- Numbers right-aligned in Geist Mono with `tabular-nums`.
- Wide tables scroll inside their own container, never the page.

### Code and the editor

- Monaco editor, font Geist Mono 13px / 20px.
- Syntax colors: Catppuccin Latte in light mode and Catppuccin Mocha in dark mode. This is an open-source (MIT) palette, and it's what the reference uses.

| Role | Latte (light) | Mocha (dark) |
|---|---|---|
| Text | `#4c4f69` | `#cdd6f4` |
| Comment | `#9ca0b0` | `#6c7086` |
| Keyword | `#8839ef` | `#cba6f7` |
| String | `#40a02b` | `#a6e3a1` |
| Number / literal | `#fe640b` | `#fab387` |
| Type | `#df8e1d` | `#f9e2af` |
| Function | `#1e66f5` | `#89b4fa` |
| Variable / tag | `#e64553` | `#eba0ac` |

- Editor background: `--background`; gutter and active line: `--bg-secondary`.

### Research panel (docs library)

- Tabs above the panel: Problem · Research · Submissions.
- A search input at the top, results as a list of page titles with a mono breadcrumb (for example `python 3.13 › library › collections`).
- Doc pages render at 15px / 24px, max 672px wide, with code blocks in the editor's syntax theme.
- Every doc page has a footer line with the source and license, in 12px muted text.
- In duels, show a small mono label with the current docs policy ("OFFICIAL DOCS ONLY").

### Profiles

- The **stats block is fixed**: rating (mono, 36px), tier name in its tier color, rank, solved count and duel record. It uses platform tokens only, and profile themes cannot restyle or hide it.
- Profile themes change only these values: accent color, background image, banner, font choice from an approved list, and section order. Each theme must pass a contrast check (text at least 4.5:1 against its background).

### Toasts

Bottom-right, `--popover` background, 1px `--border`, Overlay shadow, 13px text. Duel events such as "Opponent passed 7/12 tests" use a small colored dot for the side.

---

## 7. Motion

Easing curves (same values as the reference):

| Token | Curve | Use |
|---|---|---|
| `--ease-out-quad` | `cubic-bezier(.25,.46,.45,.94)` | Hovers, small state changes (150ms) |
| `--ease-out-cubic` | `cubic-bezier(.215,.61,.355,1)` | Panels, menus opening (200–250ms) |
| `--ease-in-out-cubic` | `cubic-bezier(.645,.045,.355,1)` | Layout shifts, tab changes (250ms) |
| `--ease-dialog` | `cubic-bezier(.32,.72,0,1)` | Dialogs and sheets (300ms) |

Rules:
- No scroll-triggered fade-ins on content.
- Motion is reserved for meaningful moments: a verdict arriving, a progress bar filling, a territory being captured, the duel countdown.
- Respect `prefers-reduced-motion`: replace movement with instant state changes.

---

## 8. Accessibility

- Text contrast at least 4.5:1, large text at least 3:1, in both themes.
- Never use color alone: verdicts have labels, duel sides have names, tiers have names.
- Visible focus ring on every interactive element.
- The editor, research panel and duel HUD must work with the keyboard alone.
- Timers announce the last minute and the last 10 seconds to screen readers (`aria-live="polite"`).

---

## 9. Implementation (Tailwind v4 + shadcn/ui)

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e5e5e5;
  --text-secondary: #555555;
  --muted-foreground: #737373;
  --primary: #171717;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --border: #e5e5e5;
  --border-strong: #d4d4d4;
  --ring: #a1a1a1;
  --success: #24c55f;
  --warning: #e49e21;
  --destructive: #e40014;
  --duel-you: #2563eb;
  --duel-opponent: #e11d48;
  --pro-bg: #1a1a1c;
  --pro-text: #e4e4e7;
  --radius: 0.625rem;
}

.dark {
  --background: #0a0a0a;
  --foreground: #fafafa;
  --bg-secondary: #171717;
  --bg-tertiary: #262626;
  --text-secondary: #a1a1a1;
  --muted-foreground: #a1a1a1;
  --primary: #fafafa;
  --primary-foreground: #171717;
  --secondary: #262626;
  --border: #262626;
  --border-strong: #525252;
  --ring: #525252;
  --success: #52dc78;
  --warning: #f7b345;
  --duel-you: #60a5fa;
  --duel-opponent: #fb7185;
  --pro-bg: #323335;
  --pro-text: #d6d7d9;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--bg-secondary);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --color-duel-you: var(--duel-you);
  --color-duel-opponent: var(--duel-opponent);
  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --radius-md: 12px;
}
```

Use `next-themes` with `attribute="class"` for the light, dark and system toggle.

---

## 10. Do and don't

**Do**
- Keep screens mostly black, white and gray, and let verdicts and duel colors stand out.
- Use Geist Mono for every number the user compares: ratings, timers, runtimes, ranks.
- Show real product UI on marketing pages.
- Keep headings at weight 400 with negative tracking.

**Don't**
- Use gradients, glows or neon for Pro or for rankings.
- Put colored pills on every tag.
- Bold headings or center long blocks of text.
- Copy getcracked's logo, illustrations, copy, page layouts or product names.
