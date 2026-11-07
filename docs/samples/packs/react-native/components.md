---
paths:
  - "**/*.tsx"
---

<!-- dev-harness:pack:react-native -->

# React Native components

- One component per file. A small helper used only by that component may stay in the same file.
- Name the props interface `[Component]Props` and destructure it in the function signature.
- Keep the component mostly JSX. Move logic into a hook.
- Prefer Expo APIs over the matching bare React Native module. A native module needs a native build; Expo Go does not run it.
- Styles live in a `StyleSheet`. Take spacing and colors from the project's theme instead of hardcoding a palette. Conditional styles are arrays: `[styles.card, isActive && styles.cardActive]`.
- Lists use `FlatList`. A long list sets `keyExtractor` and considers `initialNumToRender` and `windowSize`.
- `React.memo`, `useMemo` and `useCallback` only where re-renders are frequent or expensive, such as list items and callbacks passed into them.
- Every `useEffect` that subscribes, starts a timer or adds a listener returns a cleanup.
- Confirmations and errors go through a Promise-returning function that wraps `Alert.alert`, kept next to the feature, not inline in the component.
- Do not use `InteractionManager`. Current React Native does not provide it. Defer non-urgent work with `requestIdleCallback`.
