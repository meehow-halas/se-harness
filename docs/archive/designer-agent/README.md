# Agent Designer (UX/UI)

Cel: dodać rolę Designer, która przy zadaniach z UX/UI dopisuje do speca decyzje UX i kryteria akceptacji UX, oraz pack reguł `ux-a11y` pilnujący wymiernych standardów w kodzie. Zadania bez UI idą dotychczasowym flow, bez Designera.
Planning: complete
Źródło: rozmowa 2026-11-18 (pomysł agenta Designer i jego miejsce w flow)

## Etapy

| NN | Etap | Wykonawca | Status | Weryfikacja |
|----|------|-----------|--------|-------------|
| 01 | [PRD: rola Designer](01-prd.md) | mixed | done | przegląd agenta + akceptacja tekstu PRD przez użytkownika |
| 02 | [Agent Designer i flow](02-designer-agent.md) | agent | done | `npm test` (codex-adapters, cli) + scenariusz ręczny |
| 03 | [Pack ux-a11y](03-ux-a11y-pack.md) | agent | done | `npm test` (cli) + przegląd agenta |

Przepływ docelowy:

```text
Architect (spec, ui: true|false)
  └─ ui: true i Designer włączony → Designer (sekcja „UX/UI decisions” + kryteria akceptacji UX, log D<n>)
Implementer (+ Consultant; pack ux-a11y ładuje się na plikach UI → naruszenie = must-fix)
Reviewer (kryteria UX sprawdza jak każde inne; bez zmian roli)
```

## Decyzje

- Q1: wariant D: Designer jako etap po Architekcie (sekcja UX + kryteria akceptacji UX w specu) plus pack `ux-a11y` przy implementacji (Consultant: naruszenia wymiernych reguł = must-fix). Odrzucone: B (konsultant Implementera: za późno, podwaja pętlę), C (persona brainstormu: tylko opinia), A (bez kontroli w kodzie). (Decyzje UX przed kodem są najtańsze, Reviewer zostaje spec-only.)
- Q1a: Designer jest warunkowy: zadania bez UX/UI go nie uruchamiają. (Wymóg użytkownika.)
- Q2: o uruchomieniu decyduje Architekt flagą we frontmatterze speca (`ui: true`), gdy zadanie zmienia coś, co widzi użytkownik. Skill odpala Designera tylko przy `true`. Klucz w config wyłącza Designera w projektach bez UI. (Decyzja jawna, sprawdzalna i do poprawienia przez użytkownika.)
- Q3: Designer sam dopisuje do speca sekcję „UX/UI decisions” i kryteria akceptacji UX, a w logu wiersz `D<n>`. Nie zmienia wymagań ani decyzji Architekta; konflikt zgłasza jako `Q<n>` do użytkownika. Interactive: pokazuje zmianę przed zapisem. (Jeden przebieg, Reviewer sprawdza kryteria UX bez zmian.)
- Q4: domyślny model Designera na każdym hoście = ten sam co dla Implementera (`modelSuggest.designer` = `modelSuggest.implementer` w każdym wierszu `references/hosts.json`). (Decyzja użytkownika.)
- Q5: pack `ux-a11y` zawiera tylko reguły wymierne (WCAG 2.2 AA: etykiety, alt, focus, klawiatura, kontrast przez tokeny; stany loading/empty/error; cele dotyku; teksty UI przez i18n), globy na pliki UI, generowany przez `/setit-se`, gdy wykryje stack UI. Dla Consultanta naruszenie = must-fix. (Bez gustu, więc bez bezsensownego blokowania faz.)
- Q6: 3 etapy: 01 PRD → 02 agent Designer i flow → 03 pack `ux-a11y`. (Decyzja użytkownika; każdy etap sprawdzalny osobno.)
- Q6a: Designer obsługuje tryby jak Architekt: `interactive` (jedno pytanie naraz z rekomendacją, pokazuje sekcję UX przed zapisem), `critical` (pyta tylko o decyzję krytyczną, resztę rozstrzyga i zapisuje `D<n>`), `autonomous` (nie pyta, zapisuje każdą decyzję). Tryb przekazuje skill (ten sam co Architekta). (Wymóg użytkownika.)
- Q7: wersja minor → 1.4.0, jeden bump na cały plan, jeden wpis w `CHANGELOG.md` rozszerzany w etapach 02–03. (Zgodne wstecz: projekty bez UI działają jak dziś.)

## Założenia

- Architekt jest subagentem i nie odpali Designera; uruchamia go skill (`planit`, `runit`), jak `/grillit` personę.
- Wyłącznik: `agents.designer.enabled` (boolean). Pierwszy `/setit-se`: domyślnie `true`, gdy wykryto stack UI, inaczej `false`. Brak klucza w istniejącym config = `false` (zgodność wstecz). Ostateczną nazwę zatwierdza etap 01.
- Brak `ui` we frontmatterze starego speca = `false`.
- Designer pracuje w launch checkout, bez git i worktree, read-only na kodzie aplikacji, status zostaje `todo`; pisze tylko na aktywnym trackerze (jak Architekt; `readOnly` → pliki repo).
- `docs/` nie jest katalogiem wysyłanym: bump wersji następuje w etapie 02 (pierwsza zmiana w katalogu wysyłanym).
