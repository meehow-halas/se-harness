---
paths:
  - "**/*.cs"
---

# ASP.NET Core

- Follow the API style the project already uses (minimal APIs or controllers). Do not mix in the other one.
- Register services with the right lifetime. Do not resolve a scoped service from a singleton. Do not `new` a registered service inside an endpoint.
- Bind configuration with the options pattern (`IOptions<T>` / `IOptionsSnapshot<T>`). Validate options on start where the project already does.
- Keep an endpoint thin. Move the work into a service the endpoint calls.
- Return `TypedResults` from minimal APIs and `ActionResult<T>` from controllers. Return errors as `ProblemDetails`.
- Use `IHttpClientFactory` or a typed client. Do not `new HttpClient()` per request.
- Keep the project's middleware order (exception handling, HTTPS, routing, CORS, authentication, authorization, endpoints).
- Every new endpoint states its authorization: `RequireAuthorization` / `[Authorize]`, or an explicit `AllowAnonymous`.
- When the project targets net10.0 and validates minimal API requests: use the built-in validation (`AddValidation()` with DataAnnotations) instead of hand-written checks in the endpoint. Built-in validation does not cover everything: nullable value-type parameters are not validated before .NET 11, and unmapped JSON properties are not rejected by default. Keep a manual check for those cases.
