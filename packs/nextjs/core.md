---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

<!-- dev-harness:pack:nextjs -->

# Next.js

- Internal navigation uses `next/link`. Content images use `next/image`.
- Do not import a server-only module into a Client Component.
- `app/` and `pages/` are different routers. Edit a file in the router it already belongs to.
