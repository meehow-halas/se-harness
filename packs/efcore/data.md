---
paths:
  - "**/*.cs"
---

# EF Core

- Create migrations with `dotnet ef migrations add`. Do not hand-edit `*.Designer.cs` or the model snapshot.
- Use `AsNoTracking()` for a read-only query.
- Avoid N+1: when a loop touches a relation, load it with `Include` or a `Select` projection.
- Use the async query methods and pass a `CancellationToken`.
- Keep `DbContext` scoped. Do not hold one in a singleton or share it across threads; use `IDbContextFactory<T>` for work outside a request.
- Do not build SQL by string concatenation. Use `FromSql` / `ExecuteSql` with interpolated parameters.
- Use `ExecuteUpdateAsync` / `ExecuteDeleteAsync` for a set-based change instead of loading entities in a loop.
- When the project targets net10.0 (EF Core 10) and an entity has more than one query filter (soft delete, tenant): use named query filters (`HasQueryFilter("Name", ...)`) and `IgnoreQueryFilters(["Name"])` to bypass only one.
