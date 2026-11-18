# 02 — Wdrożenie designit

Cel: wdrożyć kontrakt z etapu 01: skill `designit`, szablon pliku projektu, zmiany Designera, Architekta, `planit`, `runit`, `setit-se` i CLI, z testami i wpisem 1.5.0.

## Zakres
W:
- `skills/designit/SKILL.md` (nowy): guard (jak `planit`) + `BLOCKED` przy wyłączonym Designerze; tryby; język; uruchomienie Designera z `Design file:`; propozycja `/{{prefix}}planit … <ścieżka>`.
- `references/design.design.md` (nowy szablon pliku projektu).
- `agents/designer.md`: drugi kontrakt (plik projektu, bez trackera, `D<n>` w pliku, status `draft`/`ready`).
- `agents/architect.md`: wejście `Design:` (Q1, Q4, log `design:`, `BLOCKED` przy braku pliku, nadpisanie z pliku).
- `skills/planit/SKILL.md`, `skills/runit/SKILL.md`: przyjmują plik projektu, przekazują `Design:`.
- `skills/setit-se/SKILL.md`: `designit` na listach generowania, cleanup prefiksu, `invokePrefix`, komendy hosta.
- `src/cli.js` `INVOKE_SKILLS` + `designit`; `references/AGENTS.md` (lista skilli dla konsumenta).
- Testy w `src/cli.test.js` (i `references/codex-adapters.test.js`, jeśli dotyczy).
- `package.json` 1.5.0 + `CHANGELOG.md` `[1.5.0]` — po zgodzie użytkownika.
Poza:
- `README.md`, `docs/prd.md` (zrobione w 01), pack `ux-a11y`, brainstorm, fan-out.

## Decyzje
Q1–Q5 (README); tekst PRD z etapu 01 jest źródłem prawdy.

## Kryteria akceptacji
- [ ] `seh install --prefix q_` kopiuje `.seh/skills/designit/SKILL.md` bez `{{prefix}}` i z nazwą `designit` we frontmatterze (test).
- [ ] Na hoście z `invokePrefix: $` tekst `/q_designit` w skopiowanych plikach staje się `$q_designit` (test).
- [ ] `skills/designit/SKILL.md` ma guardy jak `planit` i `BLOCKED` dla `agents.designer.enabled` ≠ `true`; nie zawiera kroków zapisu na tracker ani skryptów `jira`/`ado`/git.
- [ ] `references/design.design.md` ma frontmatter `id`, `title`, `status` i sekcje z PRD.
- [ ] `agents/designer.md` opisuje oba kontrakty; w trybie pliku projektu pisze tylko `docs/designs/<slug>.design.md`.
- [ ] `agents/architect.md` opisuje `Design:` zgodnie z PRD (przeniesienie, `Q<n>` przy konflikcie, `draft`: pytanie / `BLOCKED` w critical / `Q<n>` w autonomous, log `design:`, brak edycji pliku projektu).
- [ ] `planit`/`runit` przekazują `Design:`; etap 1b pomijany, gdy sekcja UX istnieje (bez zmian reguły).
- [ ] `setit-se` wymienia `designit` na wszystkich listach skilli.
- [ ] Zgoda użytkownika na 1.5.0; `package.json` = `1.5.0`; `CHANGELOG.md` ma `[1.5.0]` (Added: designit, szablon; Changed: Designer, Architect, planit, runit, setit-se).
- [ ] `npm test` zielony.

## Weryfikacja
- Najpierw: `node --test src/cli.test.js`, potem `npm test`; cytować prawdziwy wynik.
- Agent (świeży kontekst) sprawdza kryteria z dowodem `path:line`.
- Ręcznie (opcjonalnie): w projekcie testowym `/_designit "ekran logowania"` → plik w `docs/designs/`, tracker nietknięty; `/_planit "logowanie" docs/designs/<slug>.design.md` → spec z sekcją UX, bez etapu 1b.

## Pliki
`skills/designit/SKILL.md`, `references/design.design.md`, `agents/designer.md`, `agents/architect.md`, `skills/planit/SKILL.md`, `skills/runit/SKILL.md`, `skills/setit-se/SKILL.md`, `references/AGENTS.md`, `src/cli.js`, `src/cli.test.js`, `package.json`, `CHANGELOG.md`.
Wersja: minor 1.5.0, tylko po zgodzie użytkownika (reguły projektu).

Zależy od: 01 (`done`)
