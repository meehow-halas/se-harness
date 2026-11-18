# 03 — Dokumentacja: README, EXAMPLES i pliki pokrewne

## Cel
Opisać tryb konwencji `/_designit` i plik `docs/designs/ux-conventions.md` w dokumentacji użytkownika i w szablonie konsumenckiego `AGENTS.md`, spójnie z PRD po etapie 01.

## Zakres
**W zakresie** (zgoda użytkownika na edycję `README.md` — prośba z 2026-11-18):
- `README.md`: wiersz `/_designit` w tabeli skilli (`README.md:184`, dodać przykład „learn the project's UX conventions”), opis roli Designer (`README.md:264`), opis packa `ux-a11y` (`README.md:557`: odstępstwa z pliku konwencji), ew. diagram (`README.md:195`) tylko jeśli bez tego jest niespójny.
- `EXAMPLES.md`: nowy przykład po sekcji designit (`EXAMPLES.md:43–57`): uczenie konwencji, podgląd, akceptacja odstępstwa, efekt w `/_runit`; nowe `BLOCKED` (`conventions file write did not persist …`) w tabeli stopów (`EXAMPLES.md:282`).
- `references/AGENTS.md:44` (szablon konsumencki, shipped): wiersz `/{{prefix}}designit` wspomina tryb konwencji.
- `skills/setit-se/SKILL.md:76`: pytanie o przełącznik Designera — tylko jeśli treść staje się nieprawdziwa (w przeciwnym razie bez zmian).
- `docs/README.md`: link do planu `designer-conventions` (aktywny plan), jeśli indeks wymienia aktywne plany.
- `CHANGELOG.md` `## [1.6.0]`: linie dla zmienionych plików shipped (`references/AGENTS.md`, ew. setit-se). Bez nowego bumpu.

**Poza zakresem:** zmiana zachowania, PRD (zrobione w 01), `docs/archive/`, przepisywanie README poza powyższymi miejscami.

## Decyzje
Q4 (1.6.0 bez kolejnego bumpu), Q6 (krok 03 = dokumentacja).

## Kryteria akceptacji
- [x] `README.md` opisuje tryb konwencji w tabeli skilli, przy Designerze i przy packu `ux-a11y`; poza tym README bez zmian (diff tylko w tych miejscach).
- [x] `EXAMPLES.md` ma przykład trybu konwencji i nowy `BLOCKED` w tabeli stopów; komendy w formie `/_…`.
- [x] `references/AGENTS.md` wspomina tryb konwencji w wierszu designit, z `{{prefix}}`.
- [x] Brak sprzeczności z `docs/prd.md` i `agents/designer.md` (ścieżka pliku, statusy, reguła odstępstw tylko po akceptacji, Consultant pomija tylko przy `ready`).
- [x] `CHANGELOG.md` `[1.6.0]` wymienia zmiany plików shipped z tego etapu.
- [x] `npm test` zielony (szablon AGENTS.md jest testowany przez install).

## Weryfikacja
- `npm test`.
- Przegląd agenta: `git diff README.md EXAMPLES.md references/AGENTS.md docs/README.md` vs kryteria.

## Pliki
`README.md`, `EXAMPLES.md`, `references/AGENTS.md`, `docs/README.md`, ew. `skills/setit-se/SKILL.md`, `CHANGELOG.md`.

## Zależy od
02 (`done`).
