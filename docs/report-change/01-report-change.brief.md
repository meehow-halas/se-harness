# Brief dla wykonawcy: 01 — record-change i agents.reportChange

Repo: /Users/michal.halas@stxnext.pl/projects/se-harness (branch dev, working tree czysty; nie commituj, nie pushuj, nie twórz PR).

## Cel
Zob. `docs/report-change/01-report-change.md` (sekcja Cel). Skopiowana pełna treść specu jest poniżej.

## Kontekst
- Pakiet seh: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/` są kopiowane przez `seh install` do `.seh/`. Edytuj tylko w tych katalogach.
- Skrypty git/helpery to POSIX sh w `scripts/`; mają testy `scripts/<name>.test.js` obok siebie. Przykładowe wzorce: `scripts/commit-task`, `scripts/commit-task.test.js`, `scripts/lib.sh` (jeśli istnieje) — przeczytaj je najpierw przez Grep, nie czytaj całych plików.
- Konfiguracja: `harness.config.json` w projekcie konsumującym; skrypty czytają `agents.baseBranch` itd. przez proste parsowanie. Sprawdź, jak `scripts/commit-task` czyta konfigurację i powtórz ten sam mechanizm dla `agents.reportChange`.
- Zmiany w shipped katalogach wymagają wpisu w `CHANGELOG.md` pod bieżącą wersją oraz bumpu wersji w `package.json` (patrz `CLAUDE.md` projektu). Wersja: 1.4.0 (minor, decyzja użytkownika Q5).

## Spec (pełna treść)
Cel: Reviewer po akceptacji wywołuje `.seh/scripts/record-change <task> --text <opis>` i nie zna nazwy `CHANGELOG.md`. Skrypt zapisuje wpis, gdy `agents.reportChange` jest `true` (default przy braku klucza), a przy `false` kończy z kodem 0 i wypisuje `UNCHANGED` z linią `report: disabled`. `commit-task` sam dołącza zmieniony `CHANGELOG.md` tylko przy fladze `true`; ścieżki podane jawnie commituje zawsze.

Zakres:
- `scripts/record-change` (POSIX sh), kopiowany do `.seh/scripts/` przez `seh install`.
- Odczyt `agents.reportChange` z `harness.config.json`; brak klucza = `true`.
- `scripts/commit-task`: auto-dołączenie `CHANGELOG.md`, gdy zmieniony i flaga `true`; przy `false`, złej wartości lub braku `node` nic nie dołącza sam i nie blokuje; jawnie podane ścieżki (także `CHANGELOG.md`) commituje zawsze (Q3).
- `agents/reviewer.md`: pozycja 3 po akceptacji wywołuje `record-change`; w pozycji 4 nie ma nazwy `CHANGELOG.md`; w trybie git disabled bez zmian kolejności.
- `agents/implementer.md` (linie ok. 8 i 104) i `skills/doit/SKILL.md` (linia ok. 10): jawny zakaz edycji `CHANGELOG.md`, także wbrew regułom projektu (Q2).
- `references/harness.config.md`: opis klucza `agents.reportChange` i `"reportChange": true` w szkielecie.
- `references/AGENTS.md`, `docs/prd.md`: krok changelogu warunkowy przez `agents.reportChange`.
- `CHANGELOG.md`: wpis pod 1.4.0.
- `package.json`: version 1.4.0.

Poza zakresem: podkomenda `seh` (CLI v1 ma tylko `install` i `uninstall`); wymuszanie przez hooki lub system plików; commit, push, PR.

Decyzje: Q1 `commit-task` dołącza `CHANGELOG.md` sam (Reviewer nie podaje ścieżki). Q2 (zmienione) Implementer i doit mają jawny zakaz edycji `CHANGELOG.md`. Q3 `commit-task` nie blokuje przez flagę; `false` wyłącza tylko auto-dołączanie. Q4 `record-change` wstawia Unreleased nad pierwszy nagłówek `## ` dowolnej postaci; wpisy zawsze pod `### Changed`.

Kryteria akceptacji:
- [ ] `scripts/record-change` istnieje, jest wykonywalny i jest testowany w `scripts/record-change.test.js`.
- [ ] Przy `reportChange: true` skrypt dopisuje wpis do `CHANGELOG.md` (task, data, opis) i kończy z kodem 0.
- [ ] Przy `reportChange: false` skrypt nie zmienia żadnego pliku, kończy z kodem 0 i wypisuje `UNCHANGED` z linią `report: disabled`.
- [ ] Brak klucza w `harness.config.json` zachowuje się jak `true`.
- [ ] Testy używają różnych wartości (opisów, nazw zadań, dat, nazwy klucza w różnych ustawieniach JSON); nie hardcodują jednej wartości.
- [ ] `commit-task` przy `true`/braku klucza i zmienionym `CHANGELOG.md` dołącza ten plik sam; przy `false` lub złej wartości go sam nie dołącza i nie zwraca BLOCKED; jawnie podany `CHANGELOG.md` jest commitowany przy każdej wartości.
- [ ] `record-change` przy nagłówkach bez nawiasów (`## v2.1.0`) wstawia wpis nad najnowszą wersją, nie na końcu pliku.
- [ ] `agents/reviewer.md` nie zawiera `CHANGELOG.md` w krokach po akceptacji.
- [ ] Implementer i doit zawierają jawny zakaz edycji `CHANGELOG.md`.
- [ ] `npm test` przechodzi; najpierw uruchom wąskie testy.
- [x] Wersja 1.4.0 (minor) zatwierdzona przez użytkownika (Q5).

Weryfikacja: `node --test scripts/record-change.test.js scripts/commit-task.test.js`, potem `npm test`. Zacytuj prawdziwy wynik (liczbę testów i błędy, jeśli są).

## Ograniczenia
- Nie zmieniaj testów, aby przeszły. Nie usuwaj istniejących testów.
- Bez commitów, pushy, PR.
- Nie dotykaj `.env`. Bez nowych zależności.
- Nie edytuj plików poza zakresem bez pytania.

## Definicja ukończenia
Wszystkie kryteria `[x]` z dowodem (ścieżka:linia lub wynik polecenia), `npm test` zielone, lista zmienionych plików w raporcie, wersja zgodnie z decyzją użytkownika.
