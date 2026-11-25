---
title: "Task główny + subtaski na wspólnym branchu (Jira, FE/BE)"
type: idea
date: 2026-11-25
source: rozmowa o pracy FE/BE na subtaskach Jiry z jednym branchem taska głównego
tags: [jira, tracker, branch, worktree, subtask]
---

## Kontekst
Odłożone: dziś działa tylko obejściem; pełne wsparcie to nowy zakres (nie v1).

## Problem / cel
Analityk przygotowuje task główny `T-01` (opis + AC, FE i BE). FE i BE mają subtaski `T-02`, `T-03`, ale pracują na jednym branchu `T-01`. Chcemy: opracowanie na podstawie `T-01`, spec/prompt/logi/statusy na subtasku, kod na branchu `T-01`.

## Stan obecny (obejście)
- `/_planit T-02` z poleceniem „źródło wymagań i AC: T-01 (`jira get T-01`), zakres: tylko FE”: spec, prompt, logi i statusy trafiają na `T-02`.
- `/_doit T-02` tworzy branch `T-02` (branch = basename). Żeby pracować na `T-01`: `agents.git.worktree: false` (łańcuch wyłącza commit/push/PR), ręczny `checkout T-01`, commit/push/PR ręcznie.
- Opcja ze stubem `docs/features/T-01.feature.md` + `tracker: T-02` daje branch `T-01`, ale wtedy `jira get T-01` czyta `T-02` (parenta nie da się odczytać), a dwie osoby z seh kolidują na jednym basename.

## Proponowane rozwiązanie
- Rozdzielić nazwę brancha od klucza/basename (np. pole w specu, z którego korzystają `start-task` i `open-pr`).
- Opcjonalnie: odczyt opisu/AC parenta jako źródła dla Architekta.

## Pytania otwarte
- Jak `push-task` ma się zachować przy cudzych commitach na wspólnym branchu (dziś bez fetch/pull, bez force → `BLOCKED`)?
- Jeden PR na branch: kto otwiera, co robi `open-pr` drugiego deva (dziś `BLOCKED` na `gh pr create`)?
- `worktree: false` jest globalne dla projektu, nie per task.

## Ryzyka
- Reviewer uruchamia testy/lint/typecheck całego projektu, gdy wymaga ich AC: czerwone testy BE na `T-01` zatrzymują review FE (stop, nie ❌).
- AC FE zależne od BE wyjdą jako niespełnione, jeśli BE jeszcze nie dowiózł.
- Obejście niesprawdzone na żywej Jirze.

## Powiązane pliki
- `docs/prd.md:168`: branch = basename
- `docs/prd.md:194`: Binding, `tracker:` w lokalnym specu
- `scripts/jira-json.js:528`: `resolve-key`, basename → klucz z `tracker:`
- `agents/implementer.md:123`: praca w launch checkout przy wyłączonym worktree
- `agents/reviewer.md:153`: testy na nieruszanym kodzie to stop
- `scripts/push-task:48`: push bez force

## Historia
- 2026-11-25: utworzono
