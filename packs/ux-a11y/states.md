---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.html"
---

# States and feedback

- A view that loads data asynchronously renders three states: loading, empty (no data), and error. A diff that adds such a view without all three is a violation.
- A delete, remove, discard, or reset handler, or an HTTP DELETE call, that the diff adds to the UI asks for confirmation or offers undo.
- A form shows a validation error next to the field it belongs to and links it to the control (`aria-describedby` or the framework's equivalent). A single error summary alone is not enough.
- A submit control is disabled or shows progress while its request is in flight (no double submit).
