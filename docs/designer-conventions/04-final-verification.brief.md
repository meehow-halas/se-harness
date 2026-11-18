# Brief — 04 Weryfikacja całości

Repo: `se-harness`. **Tylko odczyt**: nie edytuj żadnych plików. Wolno uruchamiać `npm test`, `git diff`, `git status` i test na tymczasowej kopii repo w scratchpadzie.

## Cel
Niezależnie sprawdzić, że etapy 01–03 planu `docs/designer-conventions/` razem dają obiecane zachowanie, spójną dokumentację i poprawną wersję.

## Pełny spec
`docs/designer-conventions/04-final-verification.md` (punkty 1–6 i kryteria). Wejście: `README.md`, `01-conventions.md`, `02-manual-test.md`, `03-docs.md` w tym katalogu.

Archiwizacja (punkt 7 specu) nie należy do agenta weryfikującego: wykonuje ją prowadzący plan dopiero po wyraźnej akceptacji realizacji przez użytkownika.

## Wynik
Dla każdego punktu i kryterium: `PASS` / `GAP` + dowód (`path:line` lub dosłowny wynik polecenia). Nie naprawiaj luk; wypisz je z dowodami — prowadzący plan zrobi z nich nowy etap (`05`…).

## Ograniczenia
Bez edycji, commitów, pushy, PR, `.env`, zależności, akcji zewnętrznych. Zmiany w kopii tymczasowej nie mogą dotknąć repo.

## Definicja ukończenia
Raport obejmuje wszystkie punkty; wynik `npm test` zacytowany.
