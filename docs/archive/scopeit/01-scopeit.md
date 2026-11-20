# 01 — Skill `scopeit` i integracja z `setit-se`

## Cel
Dodać work skill `/<prefix>scopeit` (tworzenie i aktualizacja PRD), przenieść do niego pytania o produkt z `/<prefix>setit-se` i uruchamiać go na końcu pierwszego `setit-se`, gdy projekt nie ma PRD. Architekt sygnalizuje jedną linią, gdy decyzja w specu zależała od sekcji `TBD`.

## Zakres
**W zakresie**
- `skills/scopeit/SKILL.md` (nowy): tryb tworzenia i aktualizacji (Q3–Q6).
- `references/prd-template.md` (nowy): stałe nagłówki PRD.
- `skills/setit-se/SKILL.md`: krok „Project PRD” tylko wykrywa/rejestruje; nowy ostatni krok pierwszego uruchomienia; `scopeit` na listach work skills, cleanup (stary prefix), `invokePrefix`, host commands; reguły `TBD` przeniesione do szablonu/`scopeit`.
- `agents/architect.md`: reguła `TBD` (brak ograniczenia, bez konfliktu) + linia sygnału (Q7).
- `src/cli.js`: `scopeit` w `INVOKE_SKILLS`.
- `src/cli.test.js`: testy (patrz Kryteria).
- `docs/prd.md`: binding flow (krok 2), lista work skills i tabele skilli, opis `setit-se` first run, nowa sekcja / wiersz `scopeit`.
- `docs/guide/setup.md`, `docs/guide/workflow.md`, `docs/guide/hosts.md`: wzmianki o `scopeit` tam, gdzie wymieniane są work skille.
- `CHANGELOG.md`: dopisek do `[1.7.0]`.

**Poza zakresem**
- Root `README.md` (reguła projektu: tylko na wyraźną prośbę).
- Designer bez linii o `TBD` (Q9).
- ADR, wiele PRD, monorepo, prompty przy starcie sesji, propozycja aktualizacji PRD po `planit`.
- Bump wersji (Q8).
- Test manualny (Q10).

## Decyzje
Q1–Q10 z [README](README.md).

## Plan szczegółowy

### `skills/scopeit/SKILL.md`
- Frontmatter `name: scopeit`, `description:` — tworzy lub aktualizuje PRD projektu; użyj przy `/{{prefix}}scopeit`; nie zapisuje configu.
- **Guard** jak inne work skille (`skills/checkit/SKILL.md` — ten sam kształt i te same linie `BLOCKED:`): brak `.seh/` / `.seh/VERSION`, brak `harness.config.json`, niezgodny `VERSION` vs `seh.generatedFrom`.
  - Wyjątek: wykonanie z `setit-se` na pierwszym uruchomieniu (sekcja „Called from setit-se”) — config właśnie zapisany, guard przechodzi normalnie; skill nie może zakładać innego wejścia.
- **Wybór trybu:** ścieżka PRD = wpis w `agents.docs`, który jest PRD (pierwszy pasujący do PRD; na pierwszym uruchomieniu `docs/prd.md`). Plik istnieje → **aktualizacja**. Brak pliku przy wpisie w `agents.docs` → `BLOCKED: PRD from agents.docs not found (<path>) — run /{{prefix}}setit-se`. Brak wpisu PRD w `agents.docs` poza wywołaniem z `setit-se` → ten sam `BLOCKED` (setit-se rejestruje).
- **Tworzenie:**
  1. Przeczytaj repo (README, manifesty, docs) tylko do propozycji.
  2. Jedno pytanie na wiadomość, kolejno: cel, użytkownicy, zakres. Każde z propozycją oznaczoną jako wniosek z repo (np. „Proposal from README: …”) i helperem: Enter / ok = akceptuj, inaczej wpisz poprawkę. Brak sensownego wniosku → pytanie bez propozycji. Do PRD jako ustalenie trafia tylko zaakceptowana albo wpisana treść.
  3. Non-goals: pytanie wprost, nigdy propozycja. Brak odpowiedzi / „none” → `None stated`.
  4. `skip` / „wystarczy” / „enough” w dowolnym pytaniu → przejdź do zapisu; nieodpowiedziane sekcje = `TBD — not stated by the user`. Nie wpisuj non-goals, których user nie podał.
  5. Zapisz `docs/prd.md` z `.seh/references/prd-template.md` w `agents.contentLanguage` (nagłówki szablonu mogą zostać po angielsku — decyzja wykonawcy, opisana w szablonie). Plik powstaje zawsze, także z samymi `TBD`.
  6. Jedno pytanie: pogłębić teraz czy później (metryki sukcesu, ograniczenia, kluczowe przepływy, słownik, otwarte pytania). Teraz → po jednym pytaniu na sekcję, skip pomija sekcję (zostaje `TBD`), zapis po każdej odpowiedzi. Później → jedna linia, że `/{{prefix}}scopeit` uzupełnia PRD.
  7. Tylko przy pierwszym tworzeniu (pliku nie było): jedno pytanie, czy uruchomić `/{{prefix}}planit` dla pierwszego speca; nie → jedna linia, że można później. Tak → przekaż do `/{{prefix}}planit` (skill nie robi pracy Architekta sam).
- **Aktualizacja:**
  - Wejście: co się zmieniło (z wywołania albo jedno pytanie). Może to być uzupełnienie `TBD`.
  - Pokaż sekcję przed/po, jedna zmiana na wiadomość, zapis dopiero po akceptacji. Nigdy nie przepisuj całego pliku ani sekcji, których zmiana nie dotyczy.
  - PRD bez nagłówków szablonu (spoza seh): zachowaj jego strukturę; nowa treść idzie do najbliższej pasującej sekcji albo, po akceptacji, do nowej sekcji z nagłówkiem z szablonu.
  - Brak argumentu i są sekcje `TBD` → zaproponuj ich uzupełnienie (jedno pytanie, rekomendacja pierwsza); bez `TBD` → zapytaj, co zmienić.
  - Zmiana celu → na koniec jedna linia: `product` w `harness.config.json` może być nieaktualny; zmień przez `/{{prefix}}setit-se`.
- **Reguła `TBD`** (ta sama treść co w szablonie): agenci traktują `TBD` jako brak ograniczenia i nie zgłaszają z nim konfliktu; konflikt tylko wobec podanego non-goal lub linii zakresu.
- **Nie:** nie zapisuje `harness.config.json`, nie commituje, nie tworzy innych plików niż PRD.
- **Called from setit-se:** opis kontraktu — `setit-se` czyta ten plik z `.seh/skills/scopeit/SKILL.md` i wykonuje tryb tworzenia; po powrocie `setit-se` rejestruje ścieżkę i `product`.

### `references/prd-template.md`
- Sekcje rdzenia: Purpose, Users, Scope, Non-goals. Sekcje pogłębienia: Success metrics, Constraints, Key flows, Glossary, Open questions.
- Każda sekcja ma placeholder `TBD — not stated by the user`; Non-goals pusta = `None stated`.
- Nota o regule `TBD` na górze (dla agentów).

### `skills/setit-se/SKILL.md`
- „2. Project PRD”: tylko wykrycie. Istnieje → użyj, nie przepisuj, ścieżka do `agents.docs`. Nie istnieje → nic nie pytaj teraz; zaplanuj `docs/prd.md` do kroku końcowego. Usuń bullet z pytaniami i bullet o `TBD` (przeniesione do `scopeit` / szablonu).
- Nowy „7. Project PRD (create)” po „6. Tracker offer”: tylko gdy PRD nie było. Przeczytaj `.seh/skills/scopeit/SKILL.md` i wykonaj tryb tworzenia w tej sesji (nie polegaj na tym, że host widzi nowy skill). Potem wpisz `docs/prd.md` do `agents.docs` i linię `product` z zaakceptowanego celu (cel `TBD` → `product` pusty). Jedno pytanie o `/{{prefix}}planit` zadaje `scopeit` — `setit-se` nie dubluje go.
  - Kolejność zapisu configu: config jest już zapisany w kroku 4; krok 7 zmienia tylko `agents.docs` i `product`.
- Później: „Do not create or rewrite the project PRD” zostaje; dodać, że PRD zmienia `/{{prefix}}scopeit`. Zmiana `product` zostaje w tabeli zmian.
- `scopeit` na liście work skills do skopiowania, w cleanup starego prefiksu (`skillsDir` i `commandsDir`), na liście nazw `invokePrefix`. Repair check obejmuje go automatycznie (wszystkie szablony z `.seh/skills/`).
- „Do not”: linia „Repeat first-run PRD …” zostaje (later run nadal nie tworzy PRD).

### `agents/architect.md`
- Przy czytaniu `agents.docs`: reguła `TBD` (jak wyżej).
- Linia końcowa: tylko gdy decyzja w tym specu zależała od sekcji PRD z `TBD` (Purpose/Users/Scope/Non-goals), jedna linia w odpowiedzi (nie w specu), np. „PRD does not state <section> (TBD), so I could not check whether <X> fits; fill it in with `/{{prefix}}scopeit`.” W `agents.contentLanguage`/języku rozmowy zgodnie z istniejącymi regułami pliku. Bez pytania, bez blokowania, bez linii, gdy PRD nie miał wpływu.

### `src/cli.js`
- `"scopeit"` w `INVOKE_SKILLS` (`src/cli.js:216`), żeby `invokePrefix` przepisywał `/<prefix>scopeit` na hostach typu Codex.

### `docs/prd.md`
- Binding flow krok 2 (~57, 59, 120): `setit-se` wykrywa PRD; brak → na końcu pierwszego uruchomienia procedura `scopeit` (zawsze zostawia `docs/prd.md`, także z `TBD`).
- Listy skilli (~47, 51, 559, 574 i tabele skilli): dodać `scopeit`.
- Nowy opis `/<prefix>scopeit` (tworzenie, aktualizacja, brak zapisu configu, `BLOCKED` przy braku pliku, reguła `TBD`) i linia Architekta (Q7).

### `CHANGELOG.md` `[1.7.0]`
- Added: `/<prefix>scopeit`, `references/prd-template.md`, linia Architekta o `TBD`.
- Changed: `/<prefix>setit-se` nie zadaje pytań o produkt w kroku 2; tworzy PRD przez `scopeit` na końcu pierwszego uruchomienia.

## Kryteria akceptacji
- [ ] `skills/scopeit/SKILL.md` istnieje, `name: scopeit`, zawiera guard, oba tryby, regułę propozycji (oznaczona, zapis po akceptacji), non-goals bez propozycji, skip → `TBD`, plik zawsze zapisany, pytanie o pogłębienie, pytanie o `planit` tylko przy pierwszym tworzeniu, brak zapisu configu, `BLOCKED` przy braku pliku PRD.
- [ ] `references/prd-template.md` istnieje z sekcjami rdzenia i pogłębienia oraz regułą `TBD`.
- [ ] `setit-se` krok 2 nie zawiera pytań o produkt; nowy krok końcowy czyta `.seh/skills/scopeit/SKILL.md`, rejestruje `docs/prd.md` w `agents.docs` i `product`; `scopeit` na listach kopiowania, cleanup, `invokePrefix`, host commands.
- [ ] `agents/architect.md` zawiera regułę `TBD` i warunkową linię sygnału.
- [ ] Test: `seh install --prefix q_` kopiuje `.seh/skills/scopeit/SKILL.md` i `.seh/references/prd-template.md`, bez `{{prefix}}` (rozszerzenie testu `src/cli.test.js:1240`), `/q_planit` wyrenderowane w `scopeit`.
- [ ] Test: na hoście z `invokePrefix` `$` (Codex) tekst `/<prefix>scopeit` jest przepisany na `$<prefix>scopeit` (tam, gdzie istniejące testy sprawdzają `INVOKE_SKILLS`); test failuje bez wpisu w `INVOKE_SKILLS`.
- [ ] Install nadal zapisuje live tylko `setit-se` (żaden `scopeit` w `skillsDir` po samym install).
- [ ] `docs/prd.md`, `docs/guide/*` i `CHANGELOG.md [1.7.0]` zaktualizowane; root `README.md` niezmieniony; `package.json` `version` = `1.7.0`.
- [ ] `npm test` zielone.

## Weryfikacja
- `node --test src/cli.test.js`
- `npm test`
- Przegląd agenta (świeży kontekst) kryteriów wobec plików.

## Pliki
`skills/scopeit/SKILL.md`, `references/prd-template.md`, `skills/setit-se/SKILL.md`, `agents/architect.md`, `src/cli.js`, `src/cli.test.js`, `docs/prd.md`, `docs/guide/setup.md`, `docs/guide/workflow.md`, `docs/guide/hosts.md`, `CHANGELOG.md`.
Wersja: bez bumpa, dopisek do nieotagowanego `[1.7.0]` (Q8).

## Zależy od
—
