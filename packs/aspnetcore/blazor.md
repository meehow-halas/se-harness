---
paths:
  - "**/*.razor"
  - "**/*.razor.cs"
  - "**/*.cshtml"
---

# Blazor and Razor

- Follow the render mode the project already uses. Set a render mode on a component only where it needs interactivity.
- Keep markup in the `.razor` file. Move logic into code-behind (`.razor.cs`) or a service.
- A component that subscribes to an event or starts a timer implements `IDisposable` / `IAsyncDisposable` and releases it there.
- Use `@key` on elements rendered in a loop over a collection that changes.
- Do not call JS interop before `OnAfterRenderAsync`; use `firstRender` for one-time setup.
- When the project targets net10.0: persist state across prerendering with the `[PersistentState]` attribute on a public property instead of hand-written `PersistentComponentState` code.
