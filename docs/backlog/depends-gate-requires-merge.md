---
title: "Bramka depends: merge zamiast done"
type: fix
date: 2026-11-17
source: rozmowa o zależnościach w fan-out runit/shipit
tags: [depends, runit, git]
---

## Kontekst
Odłożone: osobna zmiana, zaostrzenie zachowania (prawdopodobnie minor).

## Problem / cel
Bramka `depends` w Architect i Reviewer sprawdza status `done`, ustawiany przy otwarciu PR, nie przy merge. Ponowne uruchomienie zadania zależnego przed merge (np. po `BLOCKED: … rerun after <DEP> is merged` w fan-out `runit`) przejdzie bramkę, a Implementer zacznie od base bez kodu zależności. Dotyczy też pojedynczych uruchomień `runit`. `shipit` jest bezpieczny (parent sprawdza `pr-state` = `merged`).

## Proponowane rozwiązanie
- Przy włączonym git bramka sprawdza `.seh/scripts/pr-state <DEP>` = `merged` zamiast `done`.
- Git wyłączony: bez zmian (`done` = kod już w checkoutcie).
- Ten sam problem dla spec, która już ma otwarte `depends` (bez Architekta w tym przebiegu): `runit` etap 2 robi `start-task` przed bramką Implementera, więc spec trafia do worktree z base sprzed merge zależności, a ponowne uruchomienie stoi na `BLOCKED`, dopóki user nie usunie worktree. Bramka przed `start-task` musi czytać status zależności niezależnie od lokalnego base (np. `pr-state`), inaczej da fałszywe `BLOCKED` w `shipit` (lokalny base parenta jest nieaktualny).

## Powiązane pliki
- `agents/architect.md:168` — bramka `depends` przed implementacją
- `agents/reviewer.md:51` — stop, gdy `depends` nie jest `done`
- `references/session-fanout.md` — komunikat „rerun after <DEP> is merged”

## Historia
- 2026-11-17 — utworzenie
- 2026-11-17 — dopisany przypadek spec z otwartym `depends` przed `start-task` (bramka po Architekcie w `runit` już jest)
