# Designer uczy się konwencji UX projektu
Cel: Na żądanie użytkownika Designer skanuje UI projektu i zapisuje krótki plik konwencji UX (także zatwierdzonych odstępstw od a11y). Designer czyta go przy każdym uruchomieniu i stosuje ponad ogólną bazą WCAG; Consultant pomija tylko zatwierdzone odstępstwa.
Planning: complete
Źródło: zdanie z rozmowy (2026-11-18)

## Etapy
| NN | Etap | Wykonawca | Status | Weryfikacja |
|----|------|-----------|--------|-------------|
| 01 | [Konwencje UX: designit, Designer, Consultant, PRD](01-conventions.md) | agent | planned | `npm test` (cli) + przegląd agenta |
| 02 | [Test manualny w projekcie z UI](02-manual-test.md) | user | planned | potwierdzenie użytkownika |
| 03 | [Dokumentacja: README, EXAMPLES, AGENTS.md szablon](03-docs.md) | agent | planned | `npm test` + przegląd diffu |
| 04 | [Weryfikacja całości realizacji i archiwizacja](04-final-verification.md) | mixed | planned | świeży agent, `npm test`, raport PASS/GAP; akceptacja użytkownika → archiwum |

## Przepływ docelowy
```
/_designit naucz się konwencji
  → Designer (kontrakt Conventions-file) skanuje UI + .seh/packs/ux-a11y
  → docs/designs/ux-conventions.md (≤~50 linii, path:line, sekcja "Deviations from ux-a11y")
/_designit | /_planit | /_runit
  → Designer czyta plik → D<n> (ux-conventions)
  → Consultant: reguła z "Deviations" (status ready) ≠ finding
```

## Decyzje
- Q1: Wyzwalacz = tryb `/{{prefix}}designit` (intencja „naucz się konwencji”), nowy kontrakt Designera; bez nowego skilla, bez zmian w CLI / setit-se / hosts (najlżejsze).
- Q2: Magazyn = jeden plik `docs/designs/ux-conventions.md`, stała ścieżka, limit ~50 linii, punkty z dowodem `path:line`; Designer czyta go jawnie (bez rule, bez klucza config, bez regeneracji).
- Q3: Sekcja „Deviations from ux-a11y” w pliku (reguła packa dosłownie + praktyka + powód + dowód, zatwierdzone przez usera). Designer je stosuje; Consultant pomija tylko wymienione reguły (inaczej Implementer buduje wg specu, a Consultant blokuje must-fix).
- Q4: Wersja 1.6.0 (minor; 1.5.0 już zmergowane), nowy wpis w CHANGELOG.
- Q5: Etapy: 01 agent (implementacja), 02 user (test manualny).
- Q6: Dodane etapy: 03 dokumentacja (README, EXAMPLES, `references/AGENTS.md`, pokrewne; zgoda na edycję `README.md`), 04 weryfikacja całości (prośba użytkownika).
- Q7: Po akceptacji realizacji w 04 plan idzie do `docs/archive/designer-conventions/` (bez `*.brief.md`, poprawione linki); 04 = `mixed`.
- Q8: Luki z 04 trafiają do nowego etapu (kolejny wolny numer, `05`…), nie są naprawiane w 04; po jego zamknięciu 04 ponownie.

## Założenia
- Designer dziś nie czyta packa `ux-a11y` jawnie; bazą jest WCAG 2.2 AA w `agents/designer.md`. Pack egzekwuje Consultant (must-fix, `docs/prd.md:756`).
- W trybie `autonomous` / `critical` Designer nie dopisuje odstępstw od a11y, tylko je proponuje w raporcie (a11y nie słabnie bez decyzji człowieka).
- Odstępstwa działają tylko przy `status: ready`; `draft` = wskazówka dla Designera, Consultant bez zmian.
