# 01 — PRD: rola Designer

## Cel

Wpisać do `docs/prd.md` normę dla piątej roli Designer i packa `ux-a11y`, zanim powstanie kod. PRD wygrywa z innymi dokumentami, więc etapy 02–03 implementują dokładnie ten tekst.

## Zakres

W: `docs/prd.md` (Agents, Artifact contract, Modes, Statuses, Skills/pipeline, Coding standards, Runtime config, Decisions, Brainstorm „four product agents”), `docs/README.md` (wiersz planu).
Poza: kod, agenci, skille, packi, `README.md` repo, wersja (etap 02).

## Decyzje

Q1, Q1a, Q2, Q3, Q4, Q5, Q6a, Q7 (README).

## Plan szczegółowy

1. **Agents**: tabela z pięcioma rolami; Designer — model domyślny = Implementer na każdym hoście; zadanie: sekcja „UX/UI decisions” + kryteria akceptacji UX dla speca z `ui: true`; read-only na kodzie aplikacji; bez git; status nie zmienia. Nowa podsekcja `### Designer` (wejście, wyjście, czego nie robi: nie zmienia wymagań ani decyzji Architekta, nie rusza promptu poza wskazaniem komponentów/design systemu do reużycia, nie odpala persony brainstormu).
2. **Artifact contract**: frontmatter speca + `ui` (`true` | `false`, brak = `false`); body + sekcja 5 **UX/UI decisions** (tylko przy `ui: true`); kryteria UX dopisywane w Acceptance criteria z oznaczeniem (np. `UX:`). Log: `D<n>: …` dla decyzji Designera.
3. **Modes**: Designer stosuje te same tryby co Architekt (interactive / critical / autonomous), definicja „critical” dla UX (np. sprzeczność z istniejącym design systemem, zmiana nawigacji trudna do cofnięcia, brakujący fakt dający dwa różne zachowania).
4. **Kiedy działa**: Architekt ustawia `ui: true`, gdy zadanie zmienia coś, co widzi użytkownik (ekran, interakcja, tekst UI, nawigacja). Skill odpala Designera tylko przy `ui: true` i `agents.designer.enabled: true`. Zmiana istniejącego speca z sekcją UX przez Architekta → Designer uruchamia się ponownie na tych samych zasadach co nadpisanie speca (interactive: propozycja; autonomous: nadpisanie).
5. **Pipeline**: `/planit` = Architect → (Designer); `/runit` krok 1b; `/doit` i `/checkit`: `ui: true`, Designer włączony, brak sekcji UX → `BLOCKED: <KEY> needs the Designer stage — run /<prefix>planit <KEY>`; `/shipit` przez `runit` (dziecko zaczyna od pierwszego brakującego etapu, w tym Designera).
6. **Config**: `agents.roles.designer.model` (mapa po host `id`), `agents.designer.enabled`; `modelSuggest.designer` w `hosts.json`. Brak roli w istniejącym config → `/setit-se` uzupełnia pytaniem jak przy brakującym hoście.
7. **Coding standards**: pack `ux-a11y` (tylko reguły wymierne, globy na pliki UI, detekcja stacku UI); naruszenie = must-fix Consultanta.
8. **Decisions**: zmiana pkt 10 („Only four product agents” → pięć; facilitator nadal nie jest rolą) + nowa decyzja o Designerze warunkowym i podziale: Designer = cel UX w specu, Consultant = reguły ux-a11y w kodzie, Reviewer = zgodność ze specem.
9. Sprawdzić wszystkie miejsca w PRD mówiące „four”/„cztery” i zaktualizować spójnie.

## Kryteria akceptacji

- [ ] `docs/prd.md` nie zawiera już twierdzenia o dokładnie czterech agentach; tabela Agents ma 5 ról z Designerem.
- [ ] Jest podsekcja `### Designer` z wejściem, wyjściem, zakazami i trybami.
- [ ] Artifact contract opisuje `ui` (z domyślnym `false`), sekcję „UX/UI decisions” i log `D<n>`.
- [ ] Pipeline `planit` / `runit` / `doit` / `checkit` / `shipit` opisuje warunek uruchomienia Designera i `BLOCKED` dla braku sekcji UX.
- [ ] Opisane klucze config `agents.roles.designer.model`, `agents.designer.enabled` i `modelSuggest.designer`, wraz z zachowaniem dla starego config.
- [ ] Coding standards opisuje pack `ux-a11y` i jego status must-fix.
- [ ] Decisions: pkt 10 zmieniony, nowa decyzja dodana; Deferred bez zmian.
- [ ] Brak sprzeczności: `grep -n -i -E "four (product )?agents|exactly four|only four" docs/prd.md` nie zwraca nieaktualnych twierdzeń.
- [ ] `docs/README.md` ma wiersz planu `designer-agent/`.
- [ ] Użytkownik zaakceptował tekst zmian PRD (część `user`).

## Weryfikacja

Agent: przegląd świeżym `Agent` (PASS/GAP z `path:line`) + polecenie `grep` z kryteriów. Użytkownik: akceptacja diffu `docs/prd.md` w rozmowie.

## Pliki

`docs/prd.md`, `docs/README.md`. Bez bumpa wersji (`docs/` nie jest wysyłany).

## Zależy od

Brak (pierwszy etap).
