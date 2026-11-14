# v2 plan: kandydaci z listy Deferred

Status: szkic, bez zatwierdzonego zakresu. Źródło: `docs/prd.md` (sekcja Deferred). Każda pozycja wymaga osobnej decyzji o zakresie wersji, zanim trafi do implementacji. Lista jest granicą zakresu, nie backlogiem.

## Pozycje

1. **Auto-merge.** Harness sam merguje PR po akceptacji Reviewera. Dziś merge robi człowiek na GitHubie (`docs/prd.md:444`, `:474`). Ryzyko: merge bez człowieka.

2. **Auto-instalacja nowej wersji.** Hook sesji tylko powiadamia o nowszym tagu (`docs/prd.md:114`). Instalacja lub aktualizacja tylko po jawnej zgodzie użytkownika (`docs/prd.md:114`, `:735`).

3. **Consultant jako skill dla użytkownika.** Dziś Consultant działa tylko w pętli Implementera (`docs/prd.md:536`). Samodzielny skill pominąłby Implementera, czyli recenzję bez zamkniętej pętli.

4. **Zmiana `agents.contentLanguage` w trakcie zadania.** Język plików i tekstu w trackerze. Zmiana w środku zadania dałaby artefakty w dwóch językach. PRD nie opisuje zmiany między zadaniami (`docs/prd.md:551`).

5. **Helpery statusu i logu dla trackera plikowego w `.seh/scripts/`.** Dziś agent zapisuje status i log sam (`docs/prd.md:478`, `:728`).

6. **Jira Server/Data Center.** Tylko Jira Cloud REST v3 (`docs/prd.md:478`). Server/DC to inne API (zwykle v2), inny format opisu i inna auth.

7. **Lokalny git bez remote/`gh` jako osobny tryb.** Git włączony oznacza pełny flow (`docs/prd.md:454`).

8. **Uruchamianie `.seh/scripts/` na Windows.** W v1 tylko hosty z `sh` (`docs/prd.md:456`).

9. **Symlinki żywych agentów do `.seh/agents/`.** Dziś agenty są kopiowane (`docs/prd.md` sekcja Deferred).

## Poza listą

- Trackery poza plikami, Jira i Azure DevOps usunięte z Deferred: brak planów.
- Non-goal: trackery poza plikami/Jira/ADO (`docs/prd.md:141`) nadal obowiązuje w v1.
