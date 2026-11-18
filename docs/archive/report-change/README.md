# Flaga agents.reportChange i skrypt record-change
Cel: Reviewer po akceptacji zgłasza wpis zmiany skryptem, nie znając pliku CHANGELOG.md. Flaga `agents.reportChange` (domyślnie `true`) decyduje, czy wpis trafia do CHANGELOG.md. Przy `false` flow idzie dalej bez blokady.
Planning: complete
Źródło: rozmowa (zastępuje wcześniejszy pomysł `agents.changelog`, który wycofano)

## Etapy
| NN | Etap | Wykonawca | Status | Weryfikacja |
|----|------|-----------|--------|-------------|
| 01 | Skrypt record-change, flaga, commit-task, prompty, testy, dokumentacja | agent | done | `npm test` (najwęższe pliki najpierw) |

## Decyzje
- Q1: CHANGELOG.md dołącza do commita `commit-task` sam, gdy plik jest zmieniony i flaga `true`; Reviewer nie podaje tej ścieżki (Reviewer nie zna pliku).
- Q2 (zmienione): Implementer i `doit` mają jawny zakaz edycji `CHANGELOG.md`, także wbrew regułom projektu (neutralny zakaz przegrywał z regułą „każda zmiana = wpis” i dawał podwójne wpisy).
- Q3: `commit-task` nie blokuje przez flagę; `false` wyłącza tylko auto-dołączanie, jawne ścieżki przechodzą (konflikt w `CHANGELOG.md` przy `update-from-base`, changelog prowadzony ręcznie).
- Q4: `record-change` wstawia `## [Unreleased]` nad pierwszy nagłówek `## ` dowolnej postaci; wpisy zawsze pod `### Changed` (świadome uproszczenie).
- Q5: wersja 1.4.0 (minor) zatwierdzona przez użytkownika; zmiana numeru 1.3.4 → 1.4.0 w tym samym niewydanym zestawie (1.3.4 nie był otagowany).

## Założenia
- Jeden etap: skrypt, testy, prompty i dokumentacja są ze sobą powiązane, a skrypt nie działa bez flagi.
- Plan w `docs/report-change/`, bo `CLAUDE.md` projektu wskazuje `docs/<slug>/` dla planów funkcji.
- Git disabled (`agents.baseBranch` puste): Reviewer nadal wywołuje `record-change`; commit-task nie działa, więc nic nie jest commitowane.
