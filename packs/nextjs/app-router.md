---
paths:
  - "**/app/**/*.ts"
  - "**/app/**/*.tsx"
---

# Next.js App Router

- A component is a Server Component unless the file has `'use client'`.
- Add `'use client'` only for state, effects or browser APIs.
- Navigation and pathname hooks come from `next/navigation`, not `next/router`.
- Load data in the server component. Do not repeat that fetch in a client component.
