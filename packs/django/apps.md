---
paths:
  - "**/*.py"
---

# Django

- Follow the app layout that is already there. Do not invent a second settings module or a new project package.
- Read and write through the ORM. A raw query is for a case the ORM cannot express.
- Avoid an N+1 query: use `select_related` or `prefetch_related` when a loop touches a relation.
- Create migrations with `makemigrations`. Do not hand-write a migration the project would generate.
- Reference the user model with `get_user_model()`.
- Keep views thin. A view that grows business logic moves that logic into the model's manager, a form, or the module the app already uses for it.
- Do not mark a view `csrf_exempt` unless that view is an external callback the project already exempts.
