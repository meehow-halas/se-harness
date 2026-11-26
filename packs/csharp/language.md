---
paths:
  - "**/*.cs"
---

# C#

- Follow the style of the file you are editing, including the namespace form (file-scoped or block) it already uses. Where the file and the project's `.editorconfig` disagree, follow `.editorconfig`.
- Fix an analyzer or compiler diagnostic instead of suppressing it: no new `#pragma warning disable`, `[SuppressMessage]`, or `NoWarn` entry, unless the code around it already suppresses that diagnostic with a stated reason.
- Keep nullable reference types enabled where the project enables them. Do not silence a warning with `!` or `#nullable disable`; fix the flow or make the type nullable.
- Do not block on a task: no `.Result`, `.Wait()`, or `GetAwaiter().GetResult()`. Pass a `CancellationToken` through public async methods that do I/O.
- Do not use `async void` outside an event handler.
- Dispose what you create: `using` / `await using` for `IDisposable` / `IAsyncDisposable`.
- Use `record` for immutable data carriers. Do not hand-write the equality a record generates.
- Catch a specific exception type. Rethrow with `throw;`, not `throw ex;`.
- Log through `ILogger<T>` with message templates (`"Order {OrderId} failed"`), not string interpolation.
- Do not use a language feature above the project's `LangVersion` or target framework.
- When the project targets net10.0 (C# 14): use the `field` keyword for a property with accessor logic instead of a hand-written backing field.
- When the project targets net10.0 (C# 14): declare a new extension method group in an `extension` block only where the file already uses `extension` blocks. Leave existing `this`-parameter extension methods as they are.
