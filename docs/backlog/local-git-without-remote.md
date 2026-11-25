---
title: "Lokalny git bez remote lub gh jako osobny tryb"
type: feature
date: 2026-11-25
source: lista PRD Deferred przeniesiona z planu v2
tags: [git]
---

## Kontekst
Odłożone: pozycja PRD Deferred, poza zakresem v1. Wymaga nowego zakresu wersji, nic nie jest zatwierdzone.

## Problem / cel
Włączony git to dziś pełny przepływ (Git, "Git disabled"). Częściowo pokryte przez optional git (pusta baza wyłącza git, `docs/archive/optional-git/`) i przełączniki `agents.git`.

## Pytania otwarte
- Czy potrzebny osobny tryb, skoro `agents.git` wyłącza operacje, a połączenie gita wymaga `origin`?

## Powiązane pliki
- `docs/prd.md`: sekcja Deferred, "Local git without remote/`gh` as its own mode"
- `scripts/lib.sh`: wspólna logika gita

## Historia
- 2026-11-25: utworzono (przeniesione z planu v2)
