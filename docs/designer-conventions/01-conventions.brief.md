# Brief — 01 Konwencje UX projektu dla Designera

Repo: `se-harness` (seh). Przeczytaj najpierw `AGENTS.md`/`CLAUDE.md` (reguły: wersjonowanie, CHANGELOG, testy behawioralne, nie edytuj `README.md`), `docs/prd.md` (sekcje Designer, Design, `/<prefix>designit`, Pack `ux-a11y`, Consultant, Decisions, Deferred).

## Cel
Na żądanie (`/<prefix>designit`, intencja „naucz się konwencji”) Designer skanuje UI projektu i zapisuje jeden krótki plik `docs/designs/ux-conventions.md`. Designer czyta go przy każdym uruchomieniu i stawia ponad ogólną bazą WCAG; zatwierdzone odstępstwa od `ux-a11y` pomija też Consultant.

## Pełny spec
Wykonaj dokładnie `docs/designer-conventions/01-conventions.md` (zakres, kształt pliku, kontrakt Conventions-file, precedencja, Consultant, kryteria akceptacji). Decyzje: `docs/designer-conventions/README.md` (Q1–Q5 i założenia).

## Pliki do zmiany
`skills/designit/SKILL.md`, `agents/designer.md`, `agents/consultant.md`, `references/ux-conventions.md` (nowy), `docs/prd.md`, `src/cli.test.js`, `package.json` (→ `1.6.0`), `CHANGELOG.md` (`## [1.6.0] - <dzisiejsza data>`, Added/Changed).

## Styl
Pisz w stylu istniejących plików (angielski, krótkie zdania, `{{prefix}}` w skillach/agentach, `<prefix>` w PRD). Treść agenta zwięzła — designer.md ma ~105 linii, nie podwajaj go: kontrakt Conventions-file ≤ ~20 linii, wzorem sekcji Design-file contract.

## Nie zmieniaj
`README.md`, `src/cli.js`, `skills/setit-se/`, `references/hosts.json`, `packs/` (w tym `ux-a11y`), PRD Deferred, pozostałe agenty i skille. Bez nowego klucza config.

## Ograniczenia
Bez commitów, pushy, PR. Bez `.env`. Bez nowych zależności. Bez akcji zewnętrznych.

## Definicja ukończenia
Wszystkie kryteria z `01-conventions.md` spełnione; `node --test src/cli.test.js` i `npm test` zielone (zacytuj wynik); asercja w teście failuje, gdy usuniesz `references/ux-conventions.md`.
