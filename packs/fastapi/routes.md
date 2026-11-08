---
paths:
  - "**/*.py"
---

<!-- dev-harness:pack:fastapi -->

# FastAPI

- One `APIRouter` per area, included from the application the project already builds.
- Declare request and response bodies with Pydantic models. Do not return an ORM object without a response model.
- Take shared collaborators through `Depends`. Do not construct them inside the route.
- Keep the route thin. Move the work into a function the route calls.
- Use `async def` when the body awaits. Use a plain `def` for synchronous work so it runs in the threadpool.
- Manage startup and shutdown with a lifespan context manager. Do not add new `@app.on_event` handlers.
- Raise `HTTPException` for an expected client error. Let an unexpected error propagate.
