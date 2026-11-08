---
paths:
  - "**/test_*.py"
  - "**/*_test.py"
---

<!-- dev-harness:pack:python -->

# Python tests

- Use the test runner the project already uses. Do not introduce a second one.
- Structure each test as arrange, act, assert.
- Mock the process boundary (network, filesystem, clock). Do not mock the unit's own functions.
