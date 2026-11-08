---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
---

# TypeScript tests

- Type the fixture and the expected value. Do not annotate them as `any`.
- Assert the behaviour the types describe. A cast in a test hides the same bug it would hide in the source.
