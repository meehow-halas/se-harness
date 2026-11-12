---
paths:
  - "**/test_*.py"
  - "**/*_test.py"
---

# FastAPI tests

- Call the app through the project's existing client, `TestClient` or an async HTTPX client. Do not introduce the other one.
- Override a dependency with `app.dependency_overrides` instead of patching inside the route.
- Assert the status code and the response body.
