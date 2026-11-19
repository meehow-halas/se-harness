---
paths:
  - "**/*Tests/**/*.cs"
  - "**/*.Tests/**/*.cs"
  - "**/*Tests.cs"
---

# C# tests

- Use the test framework the project already uses (xUnit, NUnit, or MSTest). Do not add a second one.
- Name a test after the behaviour it checks. Arrange, act, assert.
- Write async tests as `async Task`. Never `async void`, never `.Result`.
- Mock only a process boundary (HTTP, filesystem, clock through `TimeProvider`). Do not mock the class under test.
- A test asserts an outcome a caller can observe. Do not assert that a mock was called when the result can be checked instead.
