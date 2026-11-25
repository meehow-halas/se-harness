# 01 — Packi csharp / aspnetcore / efcore z detekcją

## Cel

Dodać trzy rule packi (`csharp`, `aspnetcore`, `efcore`) zgodne z aktualnymi praktykami C# 14 / .NET 10 / ASP.NET Core 10 / EF Core 10, wykrywane przez `/<prefix>setit-se`, oraz włączyć Razor/Blazor do „UI stack” (`ux-a11y`, rekomendacja Designera).

## Zakres

**W zakresie**
- `packs/csharp/`, `packs/aspnetcore/`, `packs/efcore/` (pliki reguł z `paths:`).
- Wiersze detekcji w `skills/setit-se/SKILL.md` (tabela „Rule packs”, ok. :344) + rozszerzenie warunku **UI stack detected** (:354, :356) o Razor/Blazor.
- Globy `.razor` / `.cshtml` w `packs/ux-a11y/a11y.md`, `states.md`, `touch-i18n.md` (nie w `react-native.md`).
- PRD: `docs/prd.md` :16 (lista packów), :599 (lista frameworków), :600 i :758 (UI stack / zakres plików `ux-a11y`), oraz każde inne miejsce PRD wyliczające packi lub warunek UI stack (Grep `Django templates`, `FastAPI`).
- `docs/guide/setup.md` tabela „Rule packs” (:124) — nowe wiersze i rozszerzony wiersz `ux-a11y`.
- Test w `src/cli.test.js`: install kopiuje nowe packi do `.seh/packs/<id>/` (pliki z `paths:` w frontmatterze, treść = źródło, bez `*.test.js`) — wzór: test ux-a11y ok. :311.
- `package.json` + `CHANGELOG.md` (patrz Wersja).

**Poza zakresem**
- Warianty packa per wersja TFM / nowy mechanizm w setit-se (Q3).
- Inne frameworki .NET (MAUI, WinForms, WPF, Orleans, Aspire jako osobny pack), F#, VB.
- Zmiana generatora reguł (format `.md`/`.mdc`, hosty) — bez zmian.
- `README.md` w korzeniu (reguła projektu: nie edytować bez prośby).
- Test manualny na przykładowym repo .NET (odrzucony w Q5).

## Decyzje

- Q1: trzy packi `csharp` / `aspnetcore` / `efcore`.
- Q2: Razor/Blazor = UI stack; globy `ux-a11y` o `.razor` / `.cshtml`; `aspnetcore/blazor.md`.
- Q3: reguły ogólne + warunkowe dla C# 14 / .NET 10 („gdy projekt targetuje `net10.0` / `LangVersion` ≥ 14”); reguła „nie używaj funkcji powyżej `LangVersion` projektu”.
- Q4: wersja minor 1.8.0 zaakceptowana, z zastrzeżeniem reguły „jeden bump na nieotagowany zestaw zmian”.
- Q5: jeden etap, wykonawca agent.

## Plan szczegółowy

### Styl reguł (jak istniejące packi)

- Angielski, krótkie zdania w trybie rozkazującym, 6–12 reguł na plik, jedna reguła = jedna linia.
- Tylko reguły sprawdzalne w diffie; bez reguł gustu i bez duplikowania tego, co egzekwuje kompilator/analizator.
- „Follow what the project already uses” tam, gdzie wybór zależy od projektu (runner testów, kontrolery vs minimal API, provider bazy).
- Reguły zależne od wersji zaczynają się od warunku, np. `When the project targets net10.0 (C# 14): …`.
- Przed zapisem zweryfikować każdą regułę zależną od wersji z dokumentacją Microsoft (learn.microsoft.com: „What's new in C# 14”, „What's new in .NET 10”, „What's new in ASP.NET Core 10”, „What's new in EF Core 10”). Reguła, której nie da się potwierdzić, odpada.

### Detekcja (wiersze do tabeli w `SKILL.md`)

| Pack | Detect when |
|------|-------------|
| `csharp` | `*.csproj`, `*.sln` / `*.slnx`, `global.json`, `Directory.Build.props`, or `.cs` sources |
| `aspnetcore` | a `.csproj` with `Sdk="Microsoft.NET.Sdk.Web"` / `Microsoft.NET.Sdk.Razor` / `Microsoft.NET.Sdk.BlazorWebAssembly`, a `FrameworkReference` to `Microsoft.AspNetCore.App`, or a `Microsoft.AspNetCore.*` package reference (also via `Directory.Packages.props`) |
| `efcore` | a `Microsoft.EntityFrameworkCore*` package reference (in a `.csproj` or `Directory.Packages.props`) |

UI stack: dopisać „Razor or Blazor in an ASP.NET Core tree (`.razor` or `.cshtml` files)” w obu miejscach (:354 i :356) i rozszerzyć listę globów `ux-a11y` o `**/*.razor`, `**/*.cshtml`. Monorepo: jak dziś — pack tylko na drzewach (katalog `.csproj`), które go używają.

### Pliki i szkic reguł (do weryfikacji i dopracowania)

**`packs/csharp/language.md`** — `paths: **/*.cs`
- Keep nullable reference types enabled where the project enables them. Do not silence a warning with `!` or `#nullable disable`; fix the flow or make the type nullable.
- Use file-scoped namespaces when the project already does.
- Async all the way: no `.Result`, `.Wait()`, or `GetAwaiter().GetResult()` on a task. Pass a `CancellationToken` through public async APIs that do I/O.
- Do not use `async void` outside event handlers.
- Dispose what you create: `using` / `await using` for `IDisposable` / `IAsyncDisposable`.
- Use `record` or `record struct` for immutable data carriers; do not hand-write equality the record would generate.
- Catch a specific exception type. Rethrow with `throw;`, not `throw ex;`.
- Log through `ILogger<T>` with message templates, not string interpolation.
- Do not use a language feature above the project's `LangVersion` / target framework.
- When the project targets net10.0 (C# 14): reach for the `field` keyword instead of a hand-written backing field for a property with logic; group extension methods in `extension` blocks only where the file already uses them or a new extension type is added (do zweryfikowania).

**`packs/csharp/project.md`** — `paths: **/*.csproj`, `**/Directory.Build.props`, `**/Directory.Packages.props`, `**/global.json`
- Add a package version in `Directory.Packages.props` when the repo uses central package management; no `Version` on the `PackageReference` then.
- Do not change `TargetFramework`, `LangVersion`, `Nullable`, or `TreatWarningsAsErrors` as a side effect of a feature.
- Shared properties go in `Directory.Build.props`, not copied into each project.
- Do not commit secrets in `appsettings*.json`; use user secrets locally and the project's secret store in deployment.
- (np. `.slnx` jako domyślny format solution w .NET 10 — tylko jeśli potwierdzone i sformułowane bez wymuszania migracji.)

**`packs/csharp/tests.md`** — `paths: **/*Tests/**/*.cs`, `**/*.Tests/**/*.cs`, `**/*Tests.cs`
- Use the test framework the project already uses (xUnit, NUnit, MSTest). Do not add a second one.
- Name tests after behaviour; arrange, act, assert.
- `async Task` tests; never `async void`; no `.Result`.
- Mock only the process boundary (HTTP, clock via `TimeProvider`, filesystem). Do not mock the class under test.
- (warunkowo: Microsoft.Testing.Platform / `dotnet test` w .NET 10 — tylko jeśli da się sformułować sprawdzalnie.)

**`packs/aspnetcore/web.md`** — `paths: **/*.cs`
- Follow the API style the project already uses (minimal APIs or controllers). Do not mix in a new area.
- Register services in DI with the right lifetime; do not resolve a scoped service from a singleton. No `new` of a registered service inside an endpoint.
- Bind configuration with the options pattern (`IOptions<T>` / `IOptionsSnapshot<T>`), validated on start where the project does.
- Keep endpoints thin; move work into a service the endpoint calls.
- Return `TypedResults` (minimal APIs) / `ActionResult<T>` (controllers); return errors as `ProblemDetails`.
- Use `IHttpClientFactory` / typed clients; do not `new HttpClient()` per request.
- Middleware order: keep the project's pipeline order (exception handling, HTTPS, routing, CORS, authentication, authorization, endpoints).
- Every new endpoint states its authorization (`RequireAuthorization` / `[Authorize]` / explicit `AllowAnonymous`).
- When the project targets net10.0: use built-in minimal API validation (`AddValidation`) where the project validates requests (do zweryfikowania).

**`packs/aspnetcore/blazor.md`** — `paths: **/*.razor`, `**/*.razor.cs`, `**/*.cshtml`
- Follow the render mode the project already uses; set a render mode only where interactivity is needed.
- Keep markup in `.razor`; move logic into code-behind or a service.
- Every component that subscribes or starts a timer implements `IDisposable` / `IAsyncDisposable` and unsubscribes.
- Use `@key` in loops over a changing collection.
- Do not call JS interop before `OnAfterRenderAsync(firstRender)`.
- (warunkowo .NET 10: deklaratywny trwały stan, np. `[PersistentState]` — do zweryfikowania.)

**`packs/aspnetcore/tests.md`** — globy testów jak `csharp/tests.md`
- Test endpoints through `WebApplicationFactory<TEntryPoint>` with the project's HTTP client.
- Replace dependencies in `ConfigureTestServices`, not by editing `Program.cs`.
- Assert status code and body (including `ProblemDetails` for errors).

**`packs/efcore/data.md`** — `paths: **/*.cs`
- Create migrations with `dotnet ef migrations add`; do not hand-edit generated `*.Designer.cs` or the model snapshot.
- Use `AsNoTracking()` for read-only queries.
- Avoid N+1: `Include` / projection with `Select` when a loop touches a relation.
- Use async query methods with a `CancellationToken`.
- `DbContext` is scoped; do not hold one in a singleton or share it across threads. Use `IDbContextFactory` for non-request work.
- No string-concatenated SQL; `FromSql` / `ExecuteSql` with interpolated parameters only.
- Use `ExecuteUpdateAsync` / `ExecuteDeleteAsync` for set-based changes instead of loading entities to loop.
- (warunkowo EF Core 10: np. nazwane filtry zapytań — do zweryfikowania.)

## Kryteria akceptacji

- [x] `packs/csharp/`, `packs/aspnetcore/`, `packs/efcore/` istnieją; każdy plik ma frontmatter `paths:` (lista YAML) i nagłówek `#`, jak istniejące packi.
- [x] Każda reguła zależna od wersji ma warunek wersji i jest potwierdzona w dokumentacji Microsoft (źródło wymienione w raporcie wykonawcy, nie w pliku packa).
- [x] `csharp/language.md` zawiera regułę „nie używaj funkcji powyżej `LangVersion` / TFM projektu”.
- [x] Tabela detekcji w `skills/setit-se/SKILL.md` ma wiersze `csharp`, `aspnetcore`, `efcore` z warunkami jak w planie; warunek **UI stack detected** i lista globów `ux-a11y` obejmują Razor/Blazor (`.razor`, `.cshtml`) w obu miejscach.
- [x] `packs/ux-a11y/a11y.md`, `states.md`, `touch-i18n.md` mają globy `**/*.razor` i `**/*.cshtml`; `react-native.md` bez zmian; nagłówek `a11y.md` wymienia Razor/Blazor wśród web DOM.
- [x] `docs/prd.md`: lista packów, lista frameworków, warunek UI stack i zakres plików `ux-a11y` uwzględniają C#/ASP.NET Core/EF Core i Razor/Blazor; brak sprzeczności (Grep: `Django templates`, `FastAPI`).
- [x] `docs/guide/setup.md`: wiersze `csharp`, `aspnetcore`, `efcore` w tabeli „Rule packs”; wiersz `ux-a11y` wymienia Razor/Blazor.
- [x] `src/cli.test.js`: test, który pada, gdy `seh install` nie skopiuje któregoś z nowych packów (lista plików każdego packa, frontmatter `paths:`, treść = źródło); test ux-a11y zaktualizowany, jeśli lista plików się zmienia.
- [x] `npm test` zielony.
- [x] Wersja: `git ls-remote --tags origin` sprawdzone (brak tagów; wynik: wpis w `[1.7.0]`, bez bumpa; późniejszy bump do 1.7.1 w osobnym commicie `314be2f`, a nie 1.8.0 z Q4);  jeśli 1.7.0 nieotagowane — wpis dopisany do `[1.7.0]` w `CHANGELOG.md`, bez bumpa; jeśli otagowane — `package.json` 1.8.0 i nowa sekcja `[1.8.0]` (Added: packi + detekcja; Changed: UI stack / globy ux-a11y). Oczekiwania testów na wersję (jeśli są) zaktualizowane.
- [x] Brak zmian w `README.md` (korzeń) i `.env` w commicie `47e6a36`. Uwaga: commit `47e6a36` istnieje (wykonanie zostało zacommitowane), więc punkt „brak commitów” nie jest spełniony dosłownie.

## Weryfikacja

1. `node --test src/cli.test.js`
2. `npm test`
3. Agent weryfikujący: przegląd każdego kryterium z dowodem `path:line`; Grep PRD/guide/SKILL pod kątem spójnej listy packów.

## Pliki / materiały

- `packs/csharp/{language,project,tests}.md`, `packs/aspnetcore/{web,blazor,tests}.md`, `packs/efcore/data.md` (nowe)
- `packs/ux-a11y/{a11y,states,touch-i18n}.md`
- `skills/setit-se/SKILL.md` (sekcja „Rule packs”)
- `docs/prd.md`, `docs/guide/setup.md`
- `src/cli.test.js`
- `package.json`, `CHANGELOG.md` (zmiana w shipped dirs → wymagany wpis; patrz kryterium Wersja)

## Zależy od

— (pierwszy etap)
