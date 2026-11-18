# 04 — Weryfikacja całości realizacji

## Cel
Niezależnie sprawdzić, że etapy 01–03 razem dają obiecane zachowanie, spójną dokumentację i poprawną wersję, zanim plan pójdzie do archiwum.

## Zakres
**W zakresie:** tylko odczyt i testy. Raport `PASS` / `GAP` z dowodem.
**W zakresie (po akceptacji):** archiwizacja planu — po wyraźnej akceptacji realizacji przez użytkownika: przeniesienie `docs/designer-conventions/` do `docs/archive/designer-conventions/`, usunięcie `*.brief.md`, poprawa linków (w tym `docs/README.md`: link z aktywnych planów do listy archiwum).
**Poza zakresem:** poprawki w tym etapie i commit. Luki (`GAP`, czerwony test) trafiają do **nowego etapu** z kolejnym wolnym numerem (`05`, potem `06`…): spec + brief z listą luk i dowodami; wykonawca `agent` (lub `mixed`, gdy luka wymaga decyzji użytkownika). 04 dostaje status `gaps` i po zamknięciu nowego etapu jest uruchamiany ponownie.

## Decyzje
Q6 (krok 04 = weryfikacja całości).

## Plan szczegółowy
Świeży `Agent` (`general-purpose`) dostaje ścieżki `01`–`03` (spec), README planu i sprawdza:
1. Każde kryterium z `01-conventions.md` i `03-docs.md` nadal `PASS` (regresje po 03).
2. Spójność jednego faktu we wszystkich miejscach: ścieżka `docs/designs/ux-conventions.md`, nazwa sekcji „Deviations from ux-a11y”, `status: ready` jako warunek, odstępstwa tylko po akceptacji usera, autonomous tylko proponuje — w `docs/prd.md`, `agents/designer.md`, `agents/consultant.md`, `skills/designit/SKILL.md`, `references/ux-conventions.md`, `references/AGENTS.md`, `README.md`, `EXAMPLES.md`.
3. Zakres nie wyciekł: brak zmian w `src/cli.js`, `references/hosts.json`, `packs/`, `skills/setit-se/` (poza dozwoloną w 03), PRD Deferred; brak nowego klucza config.
4. Wersja: `package.json` = `1.6.0`; jeden wpis `## [1.6.0]` w `CHANGELOG.md` obejmujący każdy zmieniony plik shipped (`git diff --stat` vs CHANGELOG).
5. Test behawioralny: usunięcie `references/ux-conventions.md` (w kopii tymczasowej, nie w repo) → test w `src/cli.test.js` failuje.
6. Etap `02` ma wszystkie kryteria potwierdzone przez użytkownika.
7. Po wszystkich `PASS`: pytanie do użytkownika o akceptację realizacji. Po akceptacji — archiwizacja (patrz Zakres); bez akceptacji etap zostaje `in progress`.

## Kryteria akceptacji
- [x] Punkty 1–6 `PASS`, każdy z dowodem (`path:line` albo wynik polecenia).
- [x] `npm test` zielony — wynik zacytowany.
- [x] Brak plików zmienionych poza listami etapów 01 i 03 (`git status`).
- [x] Użytkownik zaakceptował realizację (jego słowa w specu).
- [x] Plan w `docs/archive/designer-conventions/`, bez `*.brief.md`; `docs/designer-conventions/` nie istnieje; linki w `docs/README.md` i w plikach planu działają.

## Weryfikacja
`npm test`; raport agenta weryfikującego; luki → nowy etap (patrz Zakres), potem ponowne 04.

## Pliki
Tylko odczyt: wszystkie pliki z etapów 01 i 03, `git diff`, `git status`.

## Zależy od
03 (`done`).

## Akceptacja użytkownika
2026-11-18: „akceptuję realizację”. Plan zarchiwizowany.
