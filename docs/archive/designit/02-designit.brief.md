# Brief 02 — Wdrożenie designit

Pracujesz w repo `se-harness` (`seh`). Wdróż skill `/<prefix>designit` zgodnie z `docs/prd.md` (po etapie 01 — źródło prawdy).

## Kontekst
- Reguły: `AGENTS.md` w korzeniu (Tests, Versioning, Package directories). Nazwy skilli w `skills/` bez prefiksu; `{{prefix}}` w tekście.
- Wzorce: `skills/planit/SKILL.md` (guard, tryby, język), `agents/designer.md`, `agents/architect.md`, `skills/runit/SKILL.md` (etap 1b, ok. l. 106–112), `skills/setit-se/SKILL.md` (listy skilli ok. l. 176, 317–337), `src/cli.js` `INVOKE_SKILLS` (ok. l. 216), test `src/cli.test.js` (ok. l. 1190–1215), `references/spec.feature.md` (wzór szablonu).
- Decyzje: `docs/designit/README.md` (Q1–Q5).

## Spec (kopia)
Pełna treść: `docs/designit/02-designit.md` — „Zakres” i „Kryteria akceptacji”. Każdy punkt zakresu = zmiana w wymienionym pliku.

## Testy
Testy mają padać, gdy zachowanie się zepsuje: instalacja z niestandardowym prefiksem (`q_`) kopiuje `designit` i renderuje `{{prefix}}`; host z `invokePrefix: $` przepisuje `/q_designit`. Nie testuj, że źródło zawiera zdanie, które właśnie napisałeś. Najpierw `node --test src/cli.test.js`, potem `npm test`.

## Czego nie zmieniać
`README.md`, `docs/prd.md`, pack `ux-a11y`, brainstorm, fan-out, kontrakty trackerów, liczba agentów.

## Ograniczenia
Bez commitów, bez `.env`, bez nowych zależności, bez akcji zewnętrznych. **Wersja 1.5.0 i wpis CHANGELOG dopiero po wyraźnej zgodzie użytkownika** — przed zgodą przygotuj treść wpisu i zapytaj.

## Ukończone, gdy
Wszystkie kryteria z `02-designit.md` spełnione, `npm test` zielony (prawdziwy wynik zacytowany), zgoda na 1.5.0 uzyskana i wpisana.
