---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.html"
  - "**/*.razor"
  - "**/*.cshtml"
---

# Touch targets and UI text

- Interactive targets are at least 24×24 CSS px (WCAG 2.5.8), including padding, unless it is a link inside running text. Checkable only where sizes are literal in the diff (CSS, inline styles, or style props). Where the code already sets platform sizes (pt on iOS, dp on Android), the platform minimum applies (44pt, 48dp).
- Adjacent interactive targets under 24×24 px need spacing so that a 24 px circle centred on each does not overlap another target. Checkable only where sizes and gaps are literal in the diff; otherwise not a violation.
- When the project has an i18n mechanism (translation function, message catalog), user-visible strings go through it. New hardcoded user-visible text in JSX/templates is a violation. If the project has no i18n, this rule does not apply.
- A status or state shown only by a colour class or colour style (for example red/green) with no text or labelled icon in the same element is a violation.
