# Skill `scopeit`: tworzenie i aktualizacja PRD projektu
Cel: nowy work skill `/<prefix>scopeit`, który tworzy PRD projektu (nienachalnie, zawsze zostawia plik) i później go aktualizuje. `/<prefix>setit-se` przestaje sam zadawać pytania o produkt i na końcu pierwszego uruchomienia wykonuje procedurę `scopeit`, gdy PRD nie ma.
Planning: complete
Źródło: prośba użytkownika w rozmowie (2026-11-20)

## Etapy
| NN | Etap | Wykonawca | Status | Weryfikacja |
|----|------|-----------|--------|-------------|
| 01 | [Skill `scopeit` i integracja z `setit-se`](01-scopeit.md) | agent | planned | `node --test src/cli.test.js`, `npm test` + przegląd agenta |

## Decyzje
- Q1: nazwa `scopeit` (źródło `skills/scopeit/`, live `<prefix>scopeit`). Dopisana do wszystkich list nazw: `INVOKE_SKILLS` (`src/cli.js:216`), lista work skills, listy cleanup, `invokePrefix` i host commands w `skills/setit-se/SKILL.md`, `docs/prd.md`. (Konwencja czasownik + `it`; PRD to głównie zakres i non-goals.)
- Q2: `setit-se` pierwsze uruchomienie: krok „Project PRD” tylko wykrywa istniejący PRD i wpisuje ścieżkę do `agents.docs`; pytania o produkt usunięte. Nowy ostatni krok po tracker offer: brak PRD → wykonaj procedurę z `.seh/skills/scopeit/SKILL.md` (czytanej wprost, bez polegania na wykryciu skilla przez hosta w trakcie sesji), potem wpisz `docs/prd.md` do `agents.docs` i linię `product`. Język PRD = `agents.contentLanguage`. Later run nadal nie tworzy i nie przepisuje PRD. (Install tworzy tylko `setit-se`; work skille powstają w kroku Generation, więc szablon istnieje, ale host może go jeszcze nie widzieć.)
- Q3: tworzenie: rdzeń 4 pytania po jednym (cel, użytkownicy, zakres, non-goals). Cel/użytkownicy/zakres z propozycją z repo, widocznie oznaczoną jako wniosek z repo, zapisaną jako ustalenie dopiero po akceptacji (Enter = akceptuj, albo popraw). Non-goals zawsze pytanie wprost, bez propozycji. Skip / „wystarczy” w każdej chwili → zapis tego, co jest, reszta `TBD — not stated by the user`, puste non-goals `None stated`. Plik PRD powstaje zawsze, nawet z samymi `TBD`. Potem jedno pytanie teraz/później o pogłębienie (metryki sukcesu, ograniczenia, kluczowe przepływy, słownik, otwarte pytania). Szablon `references/prd-template.md` ze stałymi nagłówkami. (Lepiej podstawowy PRD niż żaden; kod pokazuje, co jest, nie co ma być — stąd akceptacja i brak propozycji non-goals.)
- Q4: na koniec pierwszego tworzenia jedno pytanie: uruchomić `/<prefix>planit` dla pierwszego speca, albo informacja, że można później. (`planit` dziś pisze spec, nie ADR.)
- Q5: aktualizacja: użytkownik mówi, co się zmieniło; skill pokazuje sekcję przed/po, jedna zmiana naraz, zapis po akceptacji; nigdy nie przepisuje całości; może uzupełniać `TBD`; zachowuje strukturę PRD nie stworzonego przez seh.
- Q6: `scopeit` nie zapisuje nic do `harness.config.json` (`setit-se` jedynym właścicielem). Ścieżkę PRD bierze z `agents.docs`. Zmiana celu → jedna linia, że `product` jest nieaktualny i zmienia się go przez `/<prefix>setit-se`. PRD z `agents.docs` nie istnieje → `BLOCKED: … — run /<prefix>setit-se`. Brak `harness.config.json` / niezgodny `VERSION` → standardowe `BLOCKED` jak w innych work skillach. (Plik PRD zawsze powstaje w pierwszym `setit-se`, więc zawsze jest zarejestrowany.)
- Q7: Architekt: jedna linia na końcu odpowiedzi tylko wtedy, gdy decyzja w tym specu zależała od sekcji `TBD` (zakres, non-goals, użytkownicy); bez pytania, bez blokowania. Reguła „`TBD` = brak ograniczenia, bez konfliktu” zostaje. Żadnych promptów przy starcie sesji ani innych przypomnień. (Sygnał tylko, gdy uzupełnienie PRD daje realny zysk.)
- Q8: wersja bez bumpa: dopisać do nieotagowanego `[1.7.0]` w `CHANGELOG.md` (Added / Changed). (1.7.0 niewydane; AGENTS.md: jeden bump na nieotagowany zestaw zmian.)
- Q9: linia o `TBD` tylko u Architekta, nie u Designera. (Architekt decyduje o zakresie; mniej powtórzeń.)
- Q10: jeden etap, wykonawca agent, bez testu manualnego. (Wybór użytkownika; dialog `SKILL.md` niesprawdzony automatycznie.)

## Założenia
- Przepływ `setit-se` i `scopeit` to instrukcje w `SKILL.md` (bez kodu), więc testy automatyczne obejmują tylko install / listy nazw / kopiowanie szablonów, nie dialog.
- `docs/guide/` (`setup.md`, `workflow.md`, `hosts.md`) opisuje skille i zostanie zaktualizowany; root `README.md` bez zmian (reguła projektu).
