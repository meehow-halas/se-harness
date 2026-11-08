---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

<!-- dev-harness:pack:typescript -->

# TypeScript

- Follow the compiler settings the project already has. Do not weaken `strict`.
- Type the arguments and return value of a public function.
- Prefer `unknown` and a narrowing check over `any`. Do not silence an error with a cast when a check can express it.
- Import a type-only name with `import type` when the file already does, or when `verbatimModuleSyntax` is on.
- Do not add a new `enum` when the surrounding code uses a string union.
