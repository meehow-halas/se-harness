---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---

# Accessibility in React Native (WCAG 2.2 AA mapped to native props)

Applies only to files that import from `react-native`. Web DOM rules live in `a11y.md`. Platform rules: iOS VoiceOver and Dynamic Type, Android TalkBack and font scaling.

- Every `Pressable`, `TouchableOpacity`, `TouchableHighlight`, or `TouchableWithoutFeedback` with `onPress` has an accessible name: visible `Text` child, or `accessibilityLabel`. An icon-only one needs `accessibilityLabel`.
- Every such control sets `accessibilityRole` (`button`, `link`, `checkbox`, `switch`, `tab`, and so on). A `Button` from `react-native` already has a role, so this rule does not apply to it.
- A control with a checked, selected, disabled, or busy state in the diff sets `accessibilityState` with the matching key. A state shown only by colour or icon, without `accessibilityState` or text, is a violation.
- A `TextInput` has an `accessibilityLabel`, or a visible `Text` label bound through `accessibilityLabelledBy` (iOS) or `accessibilityLabel` (Android). A `placeholder` is not a label.
- An informative `Image` has `accessibilityLabel`. A decorative `Image` has no label and `accessible={false}`.
- Do not set `allowFontScaling={false}` on `Text` or `TextInput` in new code. Fixed-height containers must grow with the text (no fixed `height` on a text-only wrapper).
- A message that appears asynchronously after an action (error, success, toast) is announced: `accessibilityLiveRegion="polite"` (Android) and `AccessibilityInfo.announceForAccessibility` (iOS), or a visible focus move to it. A diff that adds such a message without either is a violation.
- A `Modal` whose content is a dialog sets `accessibilityViewIsModal` (iOS) or leaves focus trapped by `onRequestClose` (Android back button handled).
- Touch target sizes follow `touch-i18n.md` (44pt iOS, 48dp Android) where the diff sets them literally.
