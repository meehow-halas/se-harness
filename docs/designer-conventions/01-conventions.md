# 01 — Konwencje UX projektu dla Designera

## Cel
Na żądanie (`/<prefix>designit`, intencja „naucz się konwencji”) Designer skanuje UI projektu i zapisuje jeden krótki plik `docs/designs/ux-conventions.md`. Designer czyta go przy każdym uruchomieniu (oba istniejące kontrakty) i stawia ponad ogólną bazą WCAG. Zatwierdzone odstępstwa od `ux-a11y` pomija też Consultant.

## Zakres
**W zakresie:**
- `skills/designit/SKILL.md`: rozpoznanie intencji „konwencje” (np. `naucz się konwencji`, `learn conventions`, `ux-conventions`) → launch Designera z `Conventions file: docs/designs/ux-conventions.md` zamiast `Design file:`; raport i brak oferty `/planit` w tym trybie.
- `agents/designer.md`: trzeci kontrakt **Conventions-file**; oraz krok „przeczytaj `docs/designs/ux-conventions.md`, jeśli istnieje” w kontrakcie spec i design-file (Inputs).
- `agents/consultant.md`: reguła `ux-a11y` wymieniona w sekcji „Deviations from ux-a11y” tego pliku nie jest violation (ani must-fix, ani nit); każda inna — bez zmian.
- `references/ux-conventions.md`: szablon pliku.
- `docs/prd.md`: Designer, Design / designit, Pack `ux-a11y`, Consultant — opis mechanizmu; decyzja w „Decisions”.
- `package.json` → `1.6.0`, `CHANGELOG.md` `## [1.6.0]`.
- `src/cli.test.js`: asercja, że install kopiuje `references/ux-conventions.md` i że `designit` zawiera ścieżkę konwencji.

**Poza zakresem:**
- Nowy skill, nowy klucz config, zmiany w `src/cli.js`, setit-se, `hosts.json`, rulesDir.
- Automatyczne uczenie (setit-se, runit) — tylko na żądanie.
- Zmiana treści packa `ux-a11y`.
- Implementer, Reviewer, Architect (Reviewer i tak sprawdza `UX:` ze specu).

## Decyzje
Q1 (tryb designit), Q2 (jeden plik, stała ścieżka, ~50 linii, dowody), Q3 (sekcja odstępstw, Consultant pomija tylko wymienione), Q4 (1.6.0), Q5 (01 agent + 02 user).

## Plan szczegółowy

### Kształt pliku `docs/designs/ux-conventions.md` (szablon `references/ux-conventions.md`)
```markdown
---
# UX conventions learned from this project. Read by the Designer on every run; deviations also by the Consultant.
# Max ~50 lines of rules. Each rule: one line, observable, with evidence path:line. No taste.
status: draft | ready
updated: YYYY-MM-DD
---
# UX conventions

## Components and tokens
- <rule> — `<path:line>`
## Layout and navigation
## States and feedback
## Forms and validation
## UI copy and i18n
## Deviations from ux-a11y
- `<pack file>`: <rule as written in the pack> — <project practice> — <reason> — `<path:line>`
```
- Puste sekcje dozwolone (usunięte albo `-`). Limit ~50 linii reguł; nadmiar → zostaw najczęstsze wzorce.
- Odstępstwo cytuje regułę packa dosłownie (identyfikacja przez Consultanta). Wchodzi do pliku tylko po akceptacji usera (interactive) — w `autonomous` / `critical` odstępstwa **nie** są dopisywane, tylko zgłaszane w raporcie jako propozycja (bezpieczny default: a11y nie słabnie bez człowieka).

### Kontrakt Conventions-file (Designer)
- Wejście: `Conventions file: <path>`, mode, `Conversation language`. Bez task key.
- Czyta (read-only): kod UI, tokeny, biblioteki komponentów, `agents.docs`, istniejący plik konwencji (iteracja: zmienia tylko to, co nowe/nieaktualne), pack `ux-a11y` z `.seh/packs/ux-a11y/` (by wykryć odstępstwa).
- Pisze tylko ten plik. Bez trackera, specu, git, kodu.
- Interactive: pokazuje cały plik przed zapisem, `ready` po akceptacji (lub `User approval:` verbatim). Autonomous/critical: zapis z `ready`, bez sekcji odstępstw (patrz wyżej).
- Weryfikacja zapisu: odczyt, frontmatter `status` obecny; retry raz; inaczej `BLOCKED: conventions file write did not persist for <path>`.
- Raport: ścieżka, status, liczba reguł, liczba odstępstw (zapisanych / proponowanych).

### Czytanie w pozostałych kontraktach
- Spec i design-file: jeśli plik istnieje, czytaj go przed decyzjami. Konwencja wygrywa z ogólną bazą WCAG/HIG tylko w tym, co opisuje; odstępstwa od a11y stosuj wyłącznie z sekcji „Deviations from ux-a11y”. Decyzja oparta na konwencji → `D<n>` z dopiskiem `(ux-conventions)`. `status: draft` → traktuj jako wskazówkę, nie odstępstwo.
- Brak pliku = zachowanie jak dziś.

### Consultant
- Jeśli `docs/designs/ux-conventions.md` istnieje ze `status: ready`, naruszenie reguły `ux-a11y` wymienionej w „Deviations from ux-a11y” nie jest findingiem. Inne reguły i statusy `draft` — bez zmian.

## Kryteria akceptacji
- [ ] `skills/designit/SKILL.md` rozpoznaje intencję konwencji i przekazuje `Conventions file: docs/designs/ux-conventions.md`; w tym trybie nie oferuje `/planit` / `/runit`.
- [ ] `agents/designer.md` ma kontrakt Conventions-file (wejście, wyjście = tylko ten plik, tryby, reguła „odstępstwa tylko po akceptacji usera”, weryfikacja zapisu z `BLOCKED`, raport).
- [ ] `agents/designer.md` w kontraktach spec i design-file czyta plik, jeśli istnieje; precedencja i `D<n> (ux-conventions)` opisane; brak pliku = bez zmian.
- [ ] `agents/consultant.md`: reguła z „Deviations from ux-a11y” przy `status: ready` nie jest findingiem; reszta packa bez zmian.
- [ ] `references/ux-conventions.md` istnieje w kształcie z planu; `seh install` kopiuje go do `.seh/references/`.
- [ ] `docs/prd.md` opisuje mechanizm (Designer, designit, pack `ux-a11y`, Consultant) i ma decyzję w „Decisions”; Deferred nietknięte.
- [ ] `package.json` `1.6.0`; `CHANGELOG.md` `## [1.6.0]` z Added/Changed.
- [ ] `src/cli.test.js` asercje: plik szablonu po install; `designit` zawiera `docs/designs/ux-conventions.md`. Test failuje bez szablonu.
- [ ] `npm test` zielony.

## Weryfikacja
- `node --test src/cli.test.js`, potem `npm test`.
- Przegląd agenta (świeży kontekst) każdego kryterium.

## Pliki
`skills/designit/SKILL.md`, `agents/designer.md`, `agents/consultant.md`, `references/ux-conventions.md` (nowy), `docs/prd.md`, `src/cli.test.js`, `package.json`, `CHANGELOG.md`.
Wersja: 1.6.0 (minor, zatwierdzone Q4). README.md projektu — nie ruszać.

## Zależy od
—
