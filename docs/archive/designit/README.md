# Skill designit (projekt UX/UI przed specem)
Cel: dodać skill `/<prefix>designit`, w którym Designer projektuje rozwiązanie wyłącznie od strony UX/UI i zapisuje je jako plik w repo, niezależnie od trackera. Architekt bierze taki plik jako jawne wejście do pełnego speca na aktywnym trackerze. Designer przez ten skill nic nie zapisuje na trackerze.
Planning: complete
Źródło: rozmowa 2026-11-18 (pomysł skilla `_designit`)

## Etapy
| NN | Etap | Wykonawca | Status | Weryfikacja |
|----|------|-----------|--------|-------------|
| 01 | [PRD: skill designit i plik projektu](01-prd.md) | mixed | done | przegląd agenta + akceptacja tekstu PRD przez użytkownika |
| 02 | [Wdrożenie designit](02-designit.md) | agent | done | `npm test` (cli) + przegląd agenta + zgoda na 1.5.0 |

## Przepływ docelowy

```text
/<prefix>designit "<zdanie>" | docs/designs/<slug>.design.md
  └─ Designer (tryb: designit) → docs/designs/<slug>.design.md (status draft → ready)
     (bez trackera, bez speca, bez git; propozycja: /<prefix>planit … docs/designs/<slug>.design.md)
/<prefix>planit | /<prefix>runit  "<zdanie>" + <plik projektu>
  └─ Architekt: spec z ui: true, sekcja „UX/UI decisions” + kryteria UX: z pliku projektu,
     log `design: <ścieżka>` → etap 1b Designera pominięty (sekcja już jest)
```

## Decyzje
- Q1: przy specu z pliku projektu Architekt przenosi decyzje UX do sekcji „UX/UI decisions” i kryteria `UX:` do „Acceptance criteria”; konflikt z wymaganiami = `Q<n>`; etap 1b Designera pomijany, bo sekcja już jest. (Designer daje wejście, Architekt tworzy ostateczny spec; bez dodatkowego przebiegu.)
- Q2: plik projektu podaje użytkownik jawnie w `planit`/`runit` (ścieżka lub slug); skill przekazuje go Architektowi; Architekt nie szuka w `docs/designs/` sam. `designit` kończy się propozycją gotowej komendy `/<prefix>planit … <ścieżka>`. (Przewidywalne we wszystkich trybach.)
- Q3: `designit` przy `agents.designer.enabled` ≠ `true` kończy się `BLOCKED: the Designer is disabled — enable it in /<prefix>setit-se`. (Jeden przełącznik, jedno znaczenie.)
- Q4: frontmatter pliku projektu: `id`, `title`, `status` (`draft` | `ready`). Interactive: `ready` po akceptacji użytkownika; critical/autonomous: `ready` po zapisie. Architekt przy `draft`: interactive pyta (rekomendacja: dokończyć w `designit`); critical kończy się `BLOCKED: design <ścieżka> is draft — finish it in /<prefix>designit or rerun interactive`; autonomous zapisuje `Q<n>` i jedzie dalej. Spec loguje źródło (`design: <ścieżka>`). Architekt nie edytuje pliku projektu. (Jeden piszący, sygnał „projekt w toku”.)
- Q5: 2 etapy: 01 PRD (mixed) → 02 wdrożenie (agent). Wersja minor 1.5.0 — podbicie dopiero po zgodzie użytkownika (kryterium w 02). (Bramka kontraktu przed kodem, jak w designer-agent.)

## Założenia
- Pliki projektu: `docs/designs/<slug>.design.md`, zawsze w repo, niezależnie od `agents.tracker` (także Jira/ADO i `readOnly`). Bez nowego klucza config. Szablon: `references/design.design.md`.
- Designer zostaje jedną rolą (pięć agentów bez zmian); `designit` uruchamia ten sam plik agenta z innym kontraktem wejścia/wyjścia (`Design file: <ścieżka>`), bez klucza zadania i bez trackera.
- Korekta przesłanki: dziś Designer nie daje feedbacku Architektowi — sam dopisuje sekcję UX i kryteria `UX:` do speca na trackerze (PRD „Designer”). Etap 1b w `planit`/`runit` zostaje bez zmian dla speców bez pliku projektu.
- Zmiana speca zbudowanego z pliku projektu (nadpisanie przez Architekta): Architekt ponownie przenosi UX z tego samego pliku (ścieżka z logu), Designer nie jest uruchamiany. Do potwierdzenia w 01.
- Jeden plik projektu może zasilić kilka speców (split Architekta); każdy spec loguje tę samą ścieżkę.
- `designit`: jedno wywołanie = jeden plik projektu; bez fan-outu, bez brainstormu, bez `ux-a11y` (pack sprawdza kod, nie projekt).
- Poza zakresem: Figma/obrazy jako wejście inne niż odnośnik tekstowy, konsultacja `grillit` nad plikiem projektu, automatyczne wyszukiwanie plików projektu.
