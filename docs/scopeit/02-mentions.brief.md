# Brief 02 — Domknięcie wzmianek o `scopeit`

Jesteś wykonawcą etapu 02 planu `docs/scopeit/` w repo se-harness. Przeczytaj `AGENTS.md`, `docs/scopeit/README.md` (Q1–Q13) i `docs/scopeit/01-scopeit.md`.

## Ograniczenia
- Bez commitów, pushy, PR. Nie dotykaj `.env`. Bez nowych zależności. Nie bumpuj `package.json` (1.7.0).
- Root `README.md`: dodaj WYŁĄCZNIE wiersz `/_scopeit` (Q12, wyraźna prośba użytkownika); nic poza tym nie zmieniaj ani nie synchronizuj.
- Nie osłabiaj testów. Nie ruszaj Designera ani PRD Deferred. `docs/prd.md` już pokrywa `scopeit` — nie zmieniaj, chyba że grep wykaże lukę.

## Spec
Skopiuj sens z `docs/scopeit/02-mentions.md` (zakres, kryteria, weryfikacja). Krótko: dopisz `scopeit` w `docs/guide/setup.md:27` (pełna lista work skilli, z `designit`), `references/AGENTS.md` (linia ~15 i tabela skilli ~49), jeden wiersz w tabeli intencji root `README.md`, dopisek w `[1.7.0]` CHANGELOG (Changed). Na końcu grep po `shipit`/`grillit` (bez `node_modules`, `.git`, `archive`) i sprawdź, że każdy plik z listą work skilli ma `scopeit` albo wyjątek jest uzasadniony.

## Definicja ukończenia
Wszystkie kryteria z `02-mentions.md` odhaczone, `node --test src/cli.test.js` i `npm test` zielone (prawdziwy wynik), lista zmienionych plików w raporcie.
