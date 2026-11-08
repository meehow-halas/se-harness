---
paths:
  - "**/test_*.py"
  - "**/tests.py"
  - "**/tests/**/*.py"
---

# Django tests

- Use the project's existing test style, Django `TestCase` or pytest-django. Do not introduce the other one.
- Build rows through the ORM or a factory the project already has. Do not insert SQL by hand.
- Assert the response status and the resulting database state, not the private helpers of the view.
