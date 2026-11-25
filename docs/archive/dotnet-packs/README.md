# Packi reguł C# / .NET 10 / ASP.NET Core
Cel: dodać rule packi dla C#, .NET 10 i ASP.NET Core zgodne z aktualnymi standardami i dobrymi praktykami, wykrywane i generowane przez `/<prefix>setit-se`.
Planning: complete
Źródło: prośba użytkownika w rozmowie (2026-11-19)

## Etapy
| NN | Etap | Wykonawca | Status | Weryfikacja |
|----|------|-----------|--------|-------------|
| 01 | [Packi csharp / aspnetcore / efcore z detekcją](01-dotnet-packs.md) | agent | done | `node --test src/cli.test.js`, `npm test` + przegląd agenta |

## Decyzje
- Q1: trzy packi: `csharp` (język C# + .NET 10 SDK/BCL + testy), `aspnetcore` (web: minimal API/kontrolery, DI, middleware, konfiguracja), `efcore` (EF Core, osobno). (Analogia python → django/fastapi; EF Core występuje też poza web.)
- Q2: Razor/Blazor = UI stack: `.razor` / `.cshtml` w projekcie ASP.NET Core włącza `ux-a11y` i rekomendację Designera; globy `ux-a11y` (web DOM) obejmują `**/*.razor`, `**/*.cshtml`; `aspnetcore` dostaje plik reguł komponentów Razor/Blazor. (Bez tego projekty Blazor nie mają reguł a11y.)
- Q3: baseline + reguły warunkowe: reguły ogólne działają na każdym wspieranym TFM; reguły C# 14 / .NET 10 mają warunek „gdy projekt targetuje `net10.0` / `LangVersion` ≥ 14”; plus reguła „nie używaj funkcji powyżej `LangVersion` projektu”. Bez wariantów packa per wersja w setit-se. (Brak fałszywych zaleceń w net8, bez nowego mechanizmu.)
- Q4: wersja minor 1.8.0 zaakceptowana. Przy wykonaniu: jeśli 1.7.0 nie jest otagowane, dopisać do `[1.7.0]` bez bumpa (AGENTS.md: jeden bump na nieotagowany zestaw zmian). (Nowe zachowanie, kompatybilne wstecz.)
- Q5: jeden etap, wykonawca agent; bez testu manualnego na przykładowym repo .NET. (Wybór użytkownika.)

## Założenia
- Detekcja to instrukcja w `skills/setit-se/SKILL.md` (bez kodu), więc testy automatyczne sprawdzają tylko kopiowanie packów przez `seh install`, nie samą detekcję.
- Lokalnie brak tagów git; stan tagu 1.7.0 do sprawdzenia na `origin` przy wykonaniu.
