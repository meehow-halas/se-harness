---
paths:
  - "**/*.ts"
  - "**/*.html"
---

# Angular

- Follow the style of the file you are editing. A file that uses decorator inputs keeps decorator inputs; a file that uses signal inputs keeps signal inputs.
- New components are standalone. Do not add an NgModule when the surrounding feature has none.
- In new code, prefer `inject()`, `input()` and `output()`, and the `@if`, `@for` and `@switch` control flow.
- Local UI state is a signal. Do not add an Observable whose only job is to hold component state.
- Lazy-load a routed feature with `loadComponent` or `loadChildren`.
- Keep fetching and multi-step logic out of the template.
