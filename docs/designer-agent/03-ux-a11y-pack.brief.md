# Brief: 03-ux-a11y-pack

Jesteś wykonawcą etapu planu `docs/designer-agent/` w repo se-harness (`seh`).

## Kontekst do przeczytania

- `CLAUDE.md` / `AGENTS.md` (reguły projektu: Tests, Versioning, Commands).
- `docs/prd.md` — norma produktu (po etapie 01 zawiera rolę Designer).
- `docs/designer-agent/README.md` — decyzje Q1–Q7 i założenia.
- Pliki z sekcji „Zakres” specu poniżej.

## Czego nie zmieniać

- Niczego poza „Zakres → W”. Nie edytuj `README.md` repo. PRD **Deferred** to granica zakresu.
- Nie zmieniaj decyzji Q1–Q7; sprzeczność z PRD zgłoś jako pytanie zamiast ją rozstrzygać.

## Ograniczenia

- Bez commitów, pushy, PR. Bez dotykania `.env`.
- Bez nowych zależności i akcji na zewnątrz bez zgody użytkownika.
- Testy: zachowanie obserwowalne (pliki, exit status, kontrakt OK/UNCHANGED/BLOCKED), nie odbicie implementacji; najwęższy test najpierw, potem `npm test`; cytuj prawdziwy wynik.

## Definicja ukończenia

Wszystkie kryteria akceptacji ze specu spełnione i zweryfikowane; testy z sekcji Weryfikacja uruchomione z wynikiem zielonym; krótki raport: co zmieniono (`path`), wynik testów, otwarte kwestie.

## Spec (kopia)

# 03 — Pack ux-a11y

## Cel

Dodać pack reguł `ux-a11y` z wymiernymi regułami UX i dostępności, ładowany na plikach UI i generowany przez `/setit-se`, gdy wykryje stack UI. Consultant traktuje naruszenia jako must-fix.

## Zakres

W: `packs/ux-a11y/*.md` (nowe), `skills/setit-se/SKILL.md` (tabela detekcji), `agents/consultant.md` (jedno zdanie: naruszenie reguły `ux-a11y` = obiektywne naruszenie reguły → must-fix, jeśli PRD tego wymaga jawnie), `src/cli.test.js` (kopiowanie packa), `CHANGELOG.md` (rozszerzenie `[1.4.0]`).
Poza: reguły gustu (odstępy, hierarchia wizualna, estetyka), zmiany istniejących packów stacków, nowe wersje (bez kolejnego bumpa).

## Decyzje

Q5, Q7 (README).

## Plan szczegółowy

1. Pliki packa (format jak `packs/nextjs/*.md`, frontmatter `paths:`):
   - `a11y.md` — WCAG 2.2 AA: kontrolki mają etykietę dostępną; obraz informacyjny ma alt, dekoracyjny pusty alt; interakcja działa z klawiatury; widoczny focus; nie usuwać outline bez zamiennika; kolory przez tokeny/theme, nie hardcode (kontrast w jednym miejscu); role/aria tylko gdy brak elementu natywnego.
   - `states.md` — każdy widok z danymi asynchronicznymi ma stany loading / empty / error; akcje destrukcyjne mają potwierdzenie albo cofnięcie; formularz pokazuje błąd przy polu.
   - `touch-i18n.md` — cele dotyku ≥ 24×24 CSS px (WCAG 2.5.8; dla mobile wytyczne platformy 44pt/48dp); teksty UI przez mechanizm i18n projektu, gdy projekt go ma.
   Każda reguła sprawdzalna w diffie; żadnych „ładnie”, „spójnie”.
2. Globy: `**/*.tsx`, `**/*.jsx`, `**/*.vue`, `**/*.svelte`, `**/*.html`, szablony Angular/Django (`**/templates/**/*.html`). Monorepo: zawężenie jak u innych packów.
3. Detekcja w `/setit-se`: nowy wiersz `ux-a11y` — gdy wykryto `react-native`, `angular`, `nextjs`, React/Vue/Svelte w manifeście albo szablony Django. `packsIgnored` działa jak dla innych.
4. `CHANGELOG.md`: Added w `[1.4.0]`.

## Kryteria akceptacji

- [ ] `packs/ux-a11y/` zawiera pliki z frontmatterem `paths:` i tylko reguły sprawdzalne w kodzie.
- [ ] `seh install` kopiuje `packs/ux-a11y/` do `.seh/packs/ux-a11y/` i nie kopiuje `*.test.js` (test w `src/cli.test.js`).
- [ ] Tabela detekcji w `skills/setit-se/SKILL.md` ma wiersz `ux-a11y` z warunkiem z planu.
- [ ] Consultant (agent lub PRD) traktuje naruszenie reguły `ux-a11y` jako must-fix.
- [ ] `CHANGELOG.md` `[1.4.0]` wymienia pack; wersja bez zmian (1.4.0).
- [ ] `npm test` przechodzi.

## Weryfikacja

`node --test src/cli.test.js`, potem `npm test`. Przegląd świeżym `Agent` (sprawdza, że żadna reguła nie jest gustem).

## Pliki

Jak w Zakresie. Bez nowego bumpa (jeden bump na plan, Q7).

## Zależy od

02 (`done`).
