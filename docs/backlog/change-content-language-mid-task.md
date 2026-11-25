---
title: "Zmiana contentLanguage w trakcie taska"
type: feature
date: 2026-11-25
source: lista PRD Deferred przeniesiona z planu v2
tags: [config, language]
---

## Kontekst
Odłożone: pozycja PRD Deferred, poza zakresem v1. Wymaga nowego zakresu wersji, nic nie jest zatwierdzone.

## Problem / cel
PRD opisuje zmianę `agents.contentLanguage` przez `/<prefix>setit-se`, nie w trakcie taska.

## Pytania otwarte
- Jak uniknąć artefaktów taska w dwóch językach przy zmianie w trakcie?

## Powiązane pliki
- `docs/prd.md`: sekcja Deferred, "Changing `agents.contentLanguage` mid-task"
- `skills/setit-se/SKILL.md`: zmiana parametru

## Historia
- 2026-11-25: utworzono (przeniesione z planu v2)
