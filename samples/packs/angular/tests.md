---
paths:
  - "**/*.spec.ts"
---

<!-- dev-harness:pack:angular -->

# Angular tests

- Use the project's existing TestBed setup. Do not introduce a second testing style.
- Mock `HttpClient` and other process boundaries. Do not mock the unit's own methods.
