# 02 — Agent Designer i flow

## Cel

Zaimplementować rolę Designer zgodnie z PRD z etapu 01: plik agenta, flaga `ui` u Architekta, uruchamianie w `planit`/`runit`, bramka w `doit`/`checkit`, konfiguracja w `/setit-se` dla wszystkich hostów. Wersja 1.4.0.

## Zakres

W: `agents/designer.md` (nowy), `agents/architect.md`, `skills/planit`, `skills/runit`, `skills/doit`, `skills/checkit`, `skills/shipit` (tylko gdy PRD tego wymaga), `skills/setit-se`, `references/hosts.json` (`modelSuggest.designer`), `references/harness.config.json`, `references/harness.config.md`, `references/spec.feature.md`, `references/log.log.md`, `references/AGENTS.md`, `references/codex-adapters.cjs` (+ test), `src/cli.js` (+ test, gdy lista ról/plików jest tam utrwalona), `package.json`, `CHANGELOG.md`, `docs/manual-tests/designer.md` (nowy).
Poza: pack `ux-a11y` (etap 03), `agents/implementer.md`, `agents/consultant.md`, `agents/reviewer.md` (poza zmianą „cztery → pięć”, jeśli występuje), `README.md` repo, `skills/grillit`.

## Decyzje

Q2, Q3, Q4, Q6a, Q7 (README) + norma PRD z etapu 01.

## Plan szczegółowy

1. `agents/designer.md`: frontmatter jak u innych ról (`name`, `description`, `model`, `tools` read-only + zapis speca/logu na trackerze tak jak Architekt). Treść: bramka setup (`BLOCKED` jak u innych), odczyt config w czasie działania (bez wpiekania wartości), tryby (interactive / critical / autonomous, `Q<n>` z rekomendacją), wejście = spec z `ui: true` + kod/design system projektu (read-only), wyjście = sekcja „UX/UI decisions” + kryteria `UX:` + wiersz logu `D<n>`, zakazy (wymagania, decyzje Architekta, status, git, kod, brainstorm), standardy, na których się opiera (WCAG 2.2 AA, wytyczne platformy, istniejący design system projektu).
2. `agents/architect.md`: ustawia `ui` we frontmatterze z kryterium z PRD; nie pisze sekcji UX.
3. Skille: `planit` po Architekcie odpala Designera raz (ten sam tryb, ten sam `User approval:`), gdy `ui: true` i `agents.designer.enabled: true`; `runit` krok 1b i wznowienie od brakującej sekcji UX; `doit`/`checkit` bramka `BLOCKED` z PRD; fan-out bez zmian poza tym, że dziecko `planit`/`runit` przechodzi tę samą ścieżkę.
4. `/setit-se`: rola `designer` w pytaniu per host (prefill z `modelSuggest.designer`), migracja starego config (brak roli → pytanie jak dla brakującego hosta), pytanie/ustawienie `agents.designer.enabled` (domyślnie z detekcji stacku UI), generowanie `designer` na każdym hoście (Claude Code, Cursor, OpenCode `mode: subagent`, Codex TOML). Usunąć sformułowania „Only architect, implementer, consultant, reviewer”.
5. `references/hosts.json`: `modelSuggest.designer` = wartość `modelSuggest.implementer` w każdym wierszu.
6. Szablony: `spec.feature.md` (`ui: false` + opis), `log.log.md` (przykład `D<n>`), `harness.config.json`/`.md` (nowe klucze), `references/AGENTS.md` (pięć ról).
7. Wersja 1.4.0 w `package.json`, wpis `## [1.4.0]` w `CHANGELOG.md` (Added: Designer, `ui`, klucze config; Changed: Architect, skille, setit-se).
8. `docs/manual-tests/designer.md`: scenariusz na projekcie testowym: zadanie backendowe (Designer nie rusza), zadanie UI w trzech trybach, `doit` na `ui: true` bez sekcji (BLOCKED), wyłączony Designer.

## Kryteria akceptacji

- [ ] `agents/designer.md` istnieje i opisuje tryby, wejście, wyjście, zakazy zgodnie z PRD; nie zawiera wpieczonych wartości config (base branch, statusy, język).
- [ ] `seh install` kopiuje `agents/designer.md` do `.seh/agents/` (test w `src/cli.test.js` sprawdza obecność pliku po instalacji).
- [ ] Generowanie Codex TOML obsługuje rolę `designer` (test w `references/codex-adapters.test.js` z modelem różnym od domyślnego; pusty model = brak klucza `model`).
- [ ] Każdy wiersz `references/hosts.json` ma `modelSuggest.designer` równy `modelSuggest.implementer` (test odczytujący plik).
- [ ] `agents/architect.md` wymaga ustawienia `ui` z kryterium z PRD.
- [ ] `skills/planit` i `skills/runit` odpalają Designera tylko przy `ui: true` i `agents.designer.enabled: true`, przekazując tryb.
- [ ] `skills/doit` i `skills/checkit` mają bramkę `BLOCKED` z PRD dla `ui: true` bez sekcji UX.
- [ ] `skills/setit-se` pyta o model Designera per host, obsługuje stary config bez roli i ustawia `agents.designer.enabled`.
- [ ] Szablony speca, logu i config zawierają nowe pola.
- [ ] `grep -rn -i -E "exactly four|only four|four product agents|Only architect, implementer, consultant, reviewer" agents skills references` nie zwraca nic.
- [ ] `package.json` ma `1.4.0`; `CHANGELOG.md` ma wpis `[1.4.0]`.
- [ ] `docs/manual-tests/designer.md` opisuje cztery scenariusze z planu.
- [ ] `npm test` przechodzi.

## Weryfikacja

Najpierw: `node --test references/codex-adapters.test.js src/cli.test.js` (dostosować do runnera z `package.json`), potem `npm test`. Przegląd świeżym `Agent`. Scenariusz ręczny: użytkownik, opcjonalnie po etapie.

## Pliki

Jak w Zakresie. Wersja: bump 1.4.0 (zatwierdzony w Q7) + `CHANGELOG.md`.

## Zależy od

01 (`done`).
