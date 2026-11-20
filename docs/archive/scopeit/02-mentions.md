# 02 — Domknięcie wzmianek o `scopeit`

## Cel
Pliki, które wymieniają work skille, mają wymieniać też `scopeit`. Luki wykazał przegląd etapu 01 i dodatkowy grep.

## Zakres
**W zakresie**
- `docs/guide/setup.md:27`: zdanie „Work skills (…) do not exist yet” — pełna lista work skilli (`planit`, `designit`, `doit`, `checkit`, `runit`, `shipit`, `scopeit`, `grillit`).
- `references/AGENTS.md`: linia 15 (lista „Work”) i tabela skilli (~linia 49): `scopeit` z jednozdaniowym opisem (tworzy/aktualizuje PRD).
- Root `README.md`: jeden wiersz w tabeli intencji (obok „Personae `/_grillit`”), np. „Project PRD (create / update) | `/_scopeit`” (Q12). Jeśli README ma listę work skilli „do not exist yet”, dopisz tam `scopeit`.
- `CHANGELOG.md` `[1.7.0]`: dopisek w Changed (`references/AGENTS.md` wymienia `scopeit`). Bez bumpa (Q13).
- Przegląd końcowy: `grep -rn "shipit" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive .` — każdy plik z listą work skilli ma `scopeit`, albo jest uzasadniony wyjątek (np. `scripts/fanout-plan`, `docs/guide/hosts.md` fan-out: `scopeit` nie jest skillem fan-out).

**Poza zakresem**
- Reszta README (bez synchronizacji z PRD), Designer, zmiany w kodzie i testach (chyba że test czyta zmienione szablony), bump wersji.

## Decyzje
Q11–Q13 z [README](README.md).

## Kryteria akceptacji
- [x] `docs/guide/setup.md` wymienia `scopeit` (i `designit`) na liście work skilli.
- [x] `references/AGENTS.md` zawiera `scopeit` na liście „Work” i w tabeli skilli.
- [x] Root `README.md` ma wiersz `/_scopeit`; poza nim `git diff README.md` pusty.
- [x] `CHANGELOG.md [1.7.0]` wspomina zmianę `references/AGENTS.md`; `package.json` `version` = `1.7.0`.
- [x] Grep po nazwach work skilli nie wskazuje innego pliku z listą bez `scopeit` (wyjątki opisane w raporcie).
- [x] `npm test` zielone.

## Weryfikacja
- `node --test src/cli.test.js`, potem `npm test`.
- Przegląd agenta (świeży kontekst) kryteriów wobec plików.

## Pliki
`docs/guide/setup.md`, `references/AGENTS.md`, `README.md`, `CHANGELOG.md`.

## Zależy od
01 (`done`).
