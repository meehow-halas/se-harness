---
paths:
  - "**/hooks/**"
  - "**/use*.ts"
  - "**/use*.tsx"
---

<!-- dev-harness:pack:react-native -->

# React Native hooks

- The name starts with `use` and the file name matches the hook.
- One responsibility per hook. Compose focused hooks instead of one hook that owns sensors, persistence and UI state.
- Return an object, not a tuple, unless the hook is deliberately shaped like `useState`.
- Every `useEffect` that subscribes, starts a timer or adds a listener returns a cleanup.
- Data access goes through the project's repositories and stores, not through a database client inside the hook.
