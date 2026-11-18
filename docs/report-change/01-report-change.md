# 01 — record-change i agents.reportChange

## Cel
Reviewer po akceptacji wywołuje `.seh/scripts/record-change <task> --text <opis>` i nie zna nazwy `CHANGELOG.md`. Skrypt zapisuje wpis, gdy `agents.reportChange` jest `true` (default przy braku klucza), a przy `false` kończy z kodem 0 i wypisuje `UNCHANGED` z linią `report: disabled`. `commit-task` sam dołącza zmieniony `CHANGELOG.md` tylko przy fladze `true`; ścieżki podane jawnie commituje zawsze.

## Zakres
W zakresie:
- `scripts/record-change` (POSIX sh), kopiowany do `.seh/scripts/` przez `seh install` (wpis w listingu install, jeśli takowy jest).
- Odczyt `agents.reportChange` z `harness.config.json`; brak klucza = `true`.
- `scripts/commit-task`: auto-dołączenie `CHANGELOG.md`, gdy zmieniony i flaga `true`; przy `false`, złej wartości lub braku `node` nic nie dołącza sam i nie blokuje; jawnie podane ścieżki (także `CHANGELOG.md`) commituje zawsze (Q3).
- `agents/reviewer.md`: pozycja 3 po akceptacji wywołuje `record-change`; w pozycji 4 nie ma nazwy `CHANGELOG.md`; w trybie git disabled bez zmian kolejności.
- `agents/implementer.md` (linie ok. 8 i 104) i `skills/doit/SKILL.md` (linia ok. 10): jawny zakaz edycji `CHANGELOG.md`, także wbrew regułom projektu (Q2).
- `references/harness.config.md`: opis klucza `agents.reportChange` i wartość `"reportChange": true` w szkielecie.
- `references/AGENTS.md`, `docs/prd.md`: zmiany kroku changelogu na warunkowe przez `agents.reportChange`.
- `CHANGELOG.md`: wpis pod wersją 1.3.4.
- `package.json`: `version` 1.3.4 (patch, decyzja użytkownika Q5).

Poza zakresem:
- Podkomenda `seh` (CLI v1 ma tylko `install` i `uninstall`).
- Wymuszanie przez system plików lub hook. Zachowanie Reviewera pozostaje w prompcie.
- Zmiana `references/checkit`/`shipit` (poza wzmiankami o changelogu tam, gdzie są tylko opisowe).
- Commit, push, PR (tylko na wyraźne polecenie).

## Decyzje
- Q1: `commit-task` dołącza `CHANGELOG.md` sam (Reviewer nie podaje ścieżki).
- Q2 (zmienione): Implementer i doit mają jawny zakaz edycji `CHANGELOG.md`; neutralny zakaz przegrywał z regułami projektu.
- Q3: `commit-task` nie blokuje przez flagę; `false` wyłącza tylko auto-dołączanie.
- Q4: `record-change` wstawia `## [Unreleased]` nad pierwszy nagłówek `## ` dowolnej postaci; wpisy zawsze pod `### Changed` (świadome uproszczenie).
- Q5: wersja 1.3.4 (patch) na polecenie użytkownika, mimo że reguła projektu dla nowego klucza wskazuje minor.

## Kryteria akceptacji
- [ ] `scripts/record-change` istnieje, jest wykonywalny i jest w `scripts/*.test.js` testowany.
- [ ] Przy `reportChange: true` skrypt dopisuje wpis do `CHANGELOG.md` (format: task, data, opis) i kończy z kodem 0.
- [ ] Przy `reportChange: false` skrypt nie zmienia żadnego pliku, kończy z kodem 0 i wypisuje `UNCHANGED` z linią `report: disabled`.
- [ ] Brak klucza w `harness.config.json` zachowuje się jak `true`.
- [ ] Wartość testowa klucza nie jest hardcodowana (testy używają różnych opisów, nazw zadań i dat).
- [ ] `commit-task` przy `true`/braku klucza i zmienionym `CHANGELOG.md` dołącza ten plik sam; przy `false` lub złej wartości go sam nie dołącza i nie zwraca BLOCKED; jawnie podany `CHANGELOG.md` jest commitowany przy każdej wartości.
- [ ] `record-change` przy nagłówkach bez nawiasów (`## v2.1.0`) wstawia wpis nad najnowszą wersją, nie na końcu pliku.
- [ ] `agents/reviewer.md` nie zawiera nazwy `CHANGELOG.md` w krokach po akceptacji (poza opisem w dokumentacji, jeśli jest potrzebny).
- [ ] Implementer i doit zawierają jawny zakaz edycji `CHANGELOG.md`.
- [ ] `npm test` przechodzi (najwęższe testy najpierw; potem całość przed zakończeniem).
- [x] Wersja 1.4.0 (minor) zatwierdzona przez użytkownika (Q5).

## Weryfikacja
- `node --test scripts/record-change.test.js scripts/commit-task.test.js` (nazwy dopasować do istniejących plików testowych).
- Pełne `npm test` na końcu.
- Ręcznie: uruchomić `record-change` z `reportChange: false` w tymczasowym repo i sprawdzić stan plików i kod wyjścia.

## Pliki / materiały
- scripts/record-change (nowy), scripts/commit-task, scripts/*.test.js
- agents/reviewer.md, agents/implementer.md, skills/doit/SKILL.md
- references/harness.config.md, references/AGENTS.md, docs/prd.md
- CHANGELOG.md, package.json (po zgodzie)

Zależy od: brak.
