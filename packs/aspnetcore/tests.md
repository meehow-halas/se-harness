---
paths:
  - "**/*Tests/**/*.cs"
  - "**/*.Tests/**/*.cs"
  - "**/*Tests.cs"
---

# ASP.NET Core tests

- Test endpoints through `WebApplicationFactory<TEntryPoint>` and its `HttpClient`.
- Replace a dependency in `ConfigureTestServices`. Do not edit `Program.cs` for a test.
- Assert the status code and the body, including `ProblemDetails` for an error response.
