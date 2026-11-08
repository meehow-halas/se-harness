---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

<!-- dev-harness:pack:react-native -->

# React Native tests

- Structure each test as arrange, act, assert.
- Test names describe behaviour, not the implementation.
- Mock external boundaries: the database, sensors, the file system and native modules. Do not mock the app's own logic.
- React Native Testing Library: `render` and `fireEvent` are async. Await them.
