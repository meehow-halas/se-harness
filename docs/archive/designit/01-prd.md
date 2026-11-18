# 01 — PRD: skill designit i plik projektu

Cel: zapisać w `docs/prd.md` kontrakt skilla `/<prefix>designit`, pliku projektu UX i przejęcia go przez Architekta, zanim powstanie kod.

## Zakres
W:
- PRD: tabela skilli (`designit`), sekcja Designer (drugie wejście: `designit`), sekcja Architect (wejście: plik projektu), Artifact contract (nowy „Design (`*.design.md`)”), lista guardów work skills, opis `planit`/`runit` (jawny plik projektu), Decisions (nowy punkt), generowanie skilla przez `setit-se` i `invokePrefix`.
Poza:
- kod, agenty, skille, testy (etap 02); README.md; Deferred.

## Decyzje
Q1–Q5 (README). Założenia z README do potwierdzenia przez użytkownika przy akceptacji tekstu.

## Plan szczegółowy
1. **Skill `/<prefix>designit`** (wiersz w tabeli Skills): Designer raz, tylko UX/UI; wejście: zdanie albo istniejący `docs/designs/<slug>.design.md` (iteracja); wyjście: plik projektu; nie czyta/nie pisze trackera, nie tworzy speca/promptu/logu, bez git; guard jak inne work skille + `BLOCKED` gdy `agents.designer.enabled` ≠ `true` (Q3); tryby z intencji; na końcu proponuje `/<prefix>planit … <ścieżka>`, nie uruchamia.
2. **Design (`*.design.md`)** w Artifact contract: ścieżka `docs/designs/<slug>.design.md` niezależnie od trackera; frontmatter `id`, `title`, `status` (`draft` | `ready`) (Q4); body: Kontekst (dla kogo, problem), Przepływy użytkownika, Ekrany/układ, Stany (loading/empty/error), Interakcje, Teksty UI, Dostępność, Komponenty/design system do użycia, Decyzje `D<n>`, Kryteria `UX:`, Otwarte kwestie. Bez wymagań biznesowych i decyzji architektury.
3. **Designer** — drugi tryb wejścia (`Design file: <ścieżka>` od `designit`): pisze tylko ten plik; decyzje `D<n>` w pliku (nie w logu); interactive pokazuje plik przed zapisem i ustawia `ready` po akceptacji.
4. **Architect** — wejście `Design: <ścieżka>` od `planit`/`runit`: `ui: true`; przenosi UX do „UX/UI decisions” i `UX:` do kryteriów (Q1); konflikt = `Q<n>`; `draft` → interactive pyta, critical `BLOCKED`, autonomous `Q<n>` (Q4); wiersz logu `design: <ścieżka>`; nie edytuje pliku projektu; plik nieistniejący = `BLOCKED`.
5. **planit / runit**: przyjmują ścieżkę lub slug pliku projektu (Q2) i przekazują `Design:`; etap 1b pomijany, bo sekcja UX istnieje (reguła bez zmian).
6. **Nadpisanie speca z pliku projektu**: Architekt przenosi UX ponownie z pliku z logu; Designer nie jest uruchamiany (założenie — potwierdzić).
7. **Decisions**: nowy punkt „designit = projekt UX przed specem, plik w repo, Architekt przenosi”.
8. `setit-se`: `designit` na listach generowania, czyszczenia przy zmianie prefiksu i `invokePrefix`.

## Kryteria akceptacji
- [ ] `docs/prd.md` ma wiersz `/<prefix>designit` w tabeli Skills, zgodny z Q2–Q3.
- [ ] Artifact contract ma sekcję Design z ścieżką, frontmatterem (Q4) i listą sekcji body.
- [ ] Sekcje Designer i Architect opisują nowe wejście/wyjście (Q1, Q4) i to, że `designit` nie dotyka trackera.
- [ ] Opis `planit`/`runit` mówi o jawnym pliku projektu i pomijaniu etapu 1b.
- [ ] Listy skilli w `setit-se` (generowanie, cleanup prefiksu, `invokePrefix`) w PRD obejmują `designit`.
- [ ] Brak sprzeczności z „Exactly five agents” i Deferred.
- [ ] Użytkownik zaakceptował tekst PRD (w tym założenie z pkt 6).

## Weryfikacja
- Agent (świeży kontekst) sprawdza kryteria 1–6 z dowodem `docs/prd.md:<linia>`.
- Kryterium 7: wyraźne potwierdzenie użytkownika.

## Pliki
- `docs/prd.md`
- Wersja/CHANGELOG: nie dotyczy (`docs/` nie jest katalogiem wysyłanym).

Zależy od: —
