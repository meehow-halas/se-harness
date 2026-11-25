# Brief — 01 Packi csharp / aspnetcore / efcore

Jesteś wykonawcą etapu 01 planu `docs/dotnet-packs/`. Repo: `se-harness` (CLI `seh`). Pracujesz w katalogu głównym repo.

## Cel

Dodać rule packi `csharp`, `aspnetcore`, `efcore` (C# 14 / .NET 10 / ASP.NET Core 10 / EF Core 10, aktualne praktyki), detekcję w `/<prefix>setit-se` i włączyć Razor/Blazor do „UI stack” (`ux-a11y`).

## Kontekst do przeczytania najpierw

- `AGENTS.md` (reguły projektu: testy, wersjonowanie, CHANGELOG, zakaz edycji `README.md`).
- `docs/prd.md` — normatywny; Grep `pack`, `UI stack`, `Django templates`, `FastAPI`.
- `skills/setit-se/SKILL.md` sekcja „Rule packs” (ok. :340–:358).
- Istniejące packi jako wzór stylu: `packs/python/*`, `packs/django/*`, `packs/fastapi/*`, `packs/ux-a11y/*`.
- `src/cli.test.js` test ux-a11y (ok. :311) jako wzór testu.
- `docs/guide/setup.md` sekcja „Rule packs”.

## Spec (pełna treść)

Pełny spec: `docs/dotnet-packs/01-dotnet-packs.md` — przeczytaj go w całości; jest częścią briefu (zakres, decyzje Q1–Q5, szkic reguł, detekcja, kryteria akceptacji, weryfikacja). Szkic reguł to punkt wyjścia: dopracuj, usuń reguły niesprawdzalne lub niepotwierdzone, nie dodawaj reguł gustu.

## Research

- Reguły zależne od wersji potwierdź w dokumentacji Microsoft (learn.microsoft.com: What's new in C# 14 / .NET 10 / ASP.NET Core 10 / EF Core 10). Wolno czytać publiczne strony dokumentacji. Niepotwierdzona reguła odpada.
- Źródła wypisz w raporcie końcowym, nie w plikach packów.

## Czego nie zmieniać

- `README.md` w korzeniu, `.env`, `references/hosts.json`, generator reguł (format `.md`/`.mdc`), `packs/ux-a11y/react-native.md`.
- Nie dodawaj mechanizmu wariantów packa per wersja TFM.
- Nie dodawaj innych packów (.NET MAUI, WPF, F# itd.).

## Ograniczenia

- Bez commitów, pushy, PR.
- Bez nowych zależności npm.
- Testy: najpierw `node --test src/cli.test.js`, potem `npm test`. Nie osłabiaj ani nie usuwaj testów. Cytuj prawdziwy wynik.
- Wersja: sprawdź `git ls-remote --tags origin`. 1.7.0 nieotagowane → dopisz do `[1.7.0]` w `CHANGELOG.md`, bez bumpa. Otagowane → bump do 1.8.0 (zgoda użytkownika już jest, Q4) i nowa sekcja `[1.8.0]`.

## Definicja ukończenia

Wszystkie checkboxy w „Kryteria akceptacji” specu spełnione, `npm test` zielony, raport: lista zmienionych plików, źródła dokumentacji, odrzucone reguły szkicu z powodem.
