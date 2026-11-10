# Monitor (idea)

Nazwa: **Monitor** — aplikacja www do lifecycle zadań `dev-harness-layer`.

Ten plik to **kontrakt idei** do późniejszego planu i faz. Nie jest PRD produktu dhs, nie jest zakresem **dhs v1** (tam CLI to tylko `install` / `uninstall`), nie jest planem implementacji.

Szkic layoutu (kolumny, drag, czat): [web-panel.txt](web-panel.txt). Zachowanie i granice: tutaj. Gdy się kłócą, wygrywa ten plik (ustalenia z rozmowy).

Skille, tracker, statusy, git: [prd.md](../prd.md). W runtime czytać `harness.config.json` — **nie zgadywać** `main`/`dev`, nazw statusów, ścieżek docs.

---

## 1. Cel

**Podstawowy cel produktu:** wiele zadań naraz — równoległe opracowywanie (spec), wdrażanie i recenzowanie. Monitor ma być miejscem, z którego user odpala i nadzoruje **N przebiegów**, nie kolejką jednego czatu.

W katalogu projektu, w którym jest dhs, user:

- widzi listę zadań i statusy (w tym które mają żywy przebieg),
- tworzy **nowe** zadanie rozmową z Architectem (nie formularzem CRUD); może startować kolejne zanim poprzednie skończy spec,
- odpala implementację i recenzję **wielu** istniejących (nie „najpierw dokończ to w prawej”),
- rozmawia z agentem wybranego przebiegu (`Q<n>`, akceptacja review) **bez zabijania** pozostałych,
- po merge PR na GitHubie zamyka task przyciskiem z confirm (close per task, nie lista checkit na całą inwokację z UI — chyba że plan świadomie zrobi batch).

Harness zostaje: skille, agenci, `.dhs/scripts/`. Monitor to **UI + N procesów agenta** (jeden przebieg na zadanie/etap, nie jedna globalna sesja). Nie zastępuje Cursora/Claude Code jako IDE. Nie jest pilotem ani lusterkiem okna harnessu.

### Równoległość — ocena (wymaganie vs to, co jest)

**dhs już na to liczy (częściowo).** `/dhs-doit` i `/dhs-checkit` biorą **listę** kluczy; N>1 równolegle gdy runtime pozwala; `Q<n>` na jednym nie stopuje rodzeństwa; każde zadanie ma własne worktree (`start-task`). Nakładające się pliki produktu nie są stopem. `/dhs-shipit` jest **jednym** taskiem — pełnej ścieżki nie odpala się listą.

**Kontrakt UI (przyjęty):** lewa kolumna służy do **przełączania między flow poszczególnych zadań**. Każde zadanie obsługuje **osobna sesja** agenta Monitora. Klik w wiersz pokazuje w prawej czat **tej** sesji. Sesje innych wierszy dalej żyją. Nie ma jednej sesji na cały Monitor i nie recykluje się agenta A dla taska B.

- lewa: wiersze + widać, które biegnie / czeka na usera (`Q<n>`, akceptacja) / idle;
- prawa: tylko wybrana sesja;
- przycisk etapu na B startuje lub wznawia **sesję B**;
- `Q<n>` na A nie pauzuje B.

To jest **N× Cursor Agent CLI** (pierwszy adapter), nie jeden proces agenta na aplikację.

**Realność: tak, jeśli N sesji jest rdzeniem, nie dodatkiem.** Worktree dhs izolują implementację/recenzję — to sprzyja. Ryzyka:

| Ryzyko | Skutek |
| --- | --- |
| Jeden proces agenta w Monitorze | Cel **nieosiągalny** |
| Cursor Agent CLI: limity równoległych procesów, rate, RAM | Sufit N; plan musi to zmierzyć, nie obiecywać „nieskończoność” |
| Dwa `/dhs-planit` naraz (files) | Wyścig o następny `NNN-` basename — plan musi serializować Architectów albo dać lock |
| `/dhs-shipit` | Świadomie 1 task; równoległy full-path = N osobnych shipit/planit+doit, nie jedna lista shipit |
| `depends` | Niespełnione `depends` stopuje **to** zadanie, reszta idzie — UI musi to pokazać |
| Close / checkit | PRD: jeden wariant na całą inwokację listy; w Monitorze bezpieczniej **jeden close na wiersz** |
| Nakładające się pliki | dhs nie stopuje; konflikty w review/merge zostają ludzkie |
| Architect bez worktree | Równoległy spec na launch checkout — kolizja zapisu trzech plików różnych basename raczej OK; ten sam klucz — nie |

**Werdykt:** przy N niezależnych przebiegach + worktree + przełączany czat, podstawowy cel jest **osiągalny w średnim ryzyku** (CLI i Architect-race). Przy jednym czacie/jednym agencie — **nie**. To trzeba traktować jako wymaganie pierwszej dostawy, nie fazę „potem parallel”.

## 2. Czym Monitor nie jest

- Nie syncuje dwóch okien (Monitor ↔ czat IDE).
- Nie wstrzykuje wiadomości do żywej sesji Cursora / Claude Code / OpenCode.
- Nie steruje transkryptami w home (`~/.cursor/projects`, `~/.claude/projects`). To log, nie stdin; format niekontraktowy.
- Nie pisze spec/prompt/log, nie woła `jira create` z UI, nie ustawia `status` w frontmatter / `jira transition` z pominięciem agenta, nie meruduje PR, nie omija `BLOCKED:` raw `git`/`gh`/`curl`.
- Nie jest `/dhs-setup`.
- Nie jest globalny (`npm install -g`, `~/.claude/`, `~/.cursor/`).

IDE może być zamknięte. Jedyny kanał rozmowy tego przebiegu to prawa kolumna Monitora (Architect: *do not wait for a second channel*).

## 3. Dwa „v1” (nie mylić)

| | Co to | Monitor |
| --- | --- | --- |
| **dhs v1** | Obecny PRD: CLI `install`/`uninstall`; tracker files **lub** Jira; `jira` = `meta\|get\|create\|set\|comment\|transition\|link`; **brak** search/list; brak helperów statusu plików | Monitor **nie mieści się** w tym CLI |
| **Pierwsza dostawa Monitora** | Ten dokument | **Oba** trackery w tym samym zakresie: files **i** Jira (w projekcie aktywny jest dokładnie jeden) |

**Oba trackery w tym samym zakresie Monitora.** Files i Jira to nie „najpierw pliki, Jira kiedyś”. Ta sama lista, te same przyciski, ten sam czat, ten sam Dodaj — niezależnie który tracker jest aktywny. W danym projekcie aktywny jest **dokładnie jeden** (PRD); Monitor go czyta z configu i nie mirroringuje.

Dziś `jira` nie listuje — to **praca w zakresie Monitora** (nowy czasownik allowlisty, np. search/JQL do `agents.tracker.project`), nie odroczenie Jiry. Bez listowania dostawa na trackerze Jira jest niepełna tak samo, jak bez globa na plikach.

## 4. Start

- Komenda w **katalogu projektu**. Gdy wejdzie w produkt: np. `dhs monitor --host <id>` (dokładna nazwa binarium — decyzja planu vs osobny pakiet).
- **`--host` zawsze wymagany.** Bez flagi: nie startuje. **Brak defaultu.**
- `<id>` = wiersz `hosts.json` (`cursor`, `claude-code`, `opencode`).
- **Kolejność pisania adapterów** (to nie default flagi): 1) **Cursor Agent CLI** (headless z `PATH`, `cwd` = projekt, `agents.roles.<role>.model.cursor`; login terminalowego `agent`, nie `CURSOR_API_KEY`); 2) **Claude Code**; OpenCode nieustalone.
- Nie `npm run monitor` jako jedyna droga (projekt nie musi być npm). `dhs install` nie musi ruszać `package.json`.
- Skill `/dhs-monitor` (opcjonalnie później): odpala **ten sam** CLI z `--host` i otwiera URL. Nie jest agentem w IDE.
- Nie zgadywać hosta z `.cursor/` vs `.claude/` — setup zapisuje **wszystkie** drzewa.

Guardy jak work skille: brak `.dhs/` / configu / mismatch `.dhs/VERSION` vs `dhs.generatedFrom` → nie pracować, powiedzieć o `dhs install` / `/dhs-setup`.

## 5. Architektura

```text
User (przeglądarka, localhost)
    → UI (lista, czat, przyciski)
    → serwer w cwd projektu (bind pętli zwrotnej, nie LAN)
    → N procesów Cursor Agent CLI (--host wymagany; jeden żywy przebieg na zadanie)
         SKILL.md + agenci + harness.config.json + .dhs/scripts/
    → tracker: pliki XOR Jira (zapisują agenci)
    → UI: stream czatu + odświeżenie listy z trackera
```

Monitor nie implementuje. Headless = Cursor Agent CLI (ten sam login co w terminalu), nie `@cursor/sdk` i nie `CURSOR_API_KEY`. Ryzyko fazy agenta: podagenci, Consultant bez edycji, worktree tylko przez `start-task`, parallel `/dhs-doit`.

Auth = login CLI na `PATH`. Reuse `hosts.json` id `cursor` (nie nowy wiersz). Brak binarium albo brak loginu: `BLOCKED:` z instrukcją logowania do CLI.

Kolizja IDE + Monitor na tym samym kluczu (dwa worktree callers) — plan: ostrzeżenie, nie twardy zakaz.

## 6. UI

Cały viewport, dwie kolumny.

**Lewa** (min 350px, max 25%): drag krawędzi, szerokość w `localStorage`. Lista: tytuł + status. **Przełącznik sesji:** klik wiersza = prawa kolumna pokazuje flow **tego** zadania (osobna sesja). Filtry: status, nazwa, …; **domyślnie ukryj status `done`** (string z configu). Filtry w `localStorage`. Przycisk **Dodaj** (nowe zadanie = nowa sesja).

**Prawa** (reszta): przyciski etapów (gdy wybrany task) + czat. Sama treść czatu i pole — wąski słupek jak w Claude Code (px ustalić przy UI). Pole na dole, Wyślij + **Enter**. Historia przewijalna, autoscroll w dół; po ręcznym scrollu w górę — ikona „do najnowszej”. Loader, gdy agent pracuje.

## 7. Lista zadań

Źródło = aktywny tracker.

**Files:** glob speców (ścieżki z configu, szkielet `docs/features/<basename>.feature.md`). Klucz = basename. Pokazać `title` i `status` z frontmatter. Porównywać status do `agents.statuses.*`, nie do dosłownych `todo` w kodzie UI (w configu mogą być inne stringi; w tabelach poniżej `todo` = klucz mapy).

**Jira (ten sam zakres co files):** lewa kolumna = issues projektu z `agents.tracker` (tytuł, status z `agents.tracker.statuses`). Klucz = issue key. Plan **musi** dodać allowlistowany odczyt listy; UI nie składa `curl`. Credentials: `harness.credentials.local.json`, nie czat. Brak listy Jira = niedokończony Monitor, nie „wersja files-only”.

Po zapisie trackera przez agenta lista się odświeża (nowy task po Architectcie, zmiana statusu).

## 8. Nowe zadanie

**Dodaj** ≠ nowy plik / `jira create` z przeglądarki.

1. Fokus prawej, nowy przebieg (domyślna intencja: **`/dhs-planit`**; czy **Dodaj** ma być `/dhs-shipit` — decyzja planu).
2. User pisze wstępny opis **w czacie**.
3. Architect w tym oknie: `Q<n>: … — Recommendation:`; user odpowiada w czacie.
4. Architect tworzy spec+prompt+log na trackerze (pliki albo ticket), status zostaje skonfigurowany `todo`.
5. Wiersz pojawia się z lewej.

## 9. Czat

Zwykła rozmowa z **agentem procesu Monitora**, nie z oknem IDE.

Prawa kolumna pokazuje czat **wybranego** zadania. Przełączenie z lewej **nie** kończy innych przebiegów. Nie osobne panele per rola (Architect/Implementer/Reviewer) w jednym tasku. W wątku wybranego taska:

- opis i pytania Architecta,
- `Q<n>` Implementera (w tym dług Consultanta — pyta Implementer),
- akceptacja recenzji Reviewera (tryb interactive),
- komunikaty `BLOCKED:`,
- po przyciskach: ten sam wątek dostaje kolejny skill.

Consultant nie pisze do usera.

Persystencja transkryptu UI vs tylko log na trackerze — decyzja planu.

Tryb (`interactive` / `critical` / `autonomous`): dhs bierze z intencji, default `interactive`. Monitor w pierwszej dostawie zakłada **rozmowę** (interactive). Czysty autonomous-only był rozważany i **nie** jest jedynym trybem Monitora.

## 10. Przyciski etapów

Widoczne w prawej po wyborze wiersza. **Nie** ustawiają statusu. Ukryć, gdy warunek nie zachodzi. Startują przebieg na kluczu zadania.

W tabeli nazwy statusów = klucze `agents.statuses` / zmapowane Jira.

| Warunek | Przycisk | Skill |
| --- | --- | --- |
| Jest spec+prompt, status `todo` | Uruchom implementację | `/dhs-doit` |
| Status `in progress` | Uruchom recenzję | `/dhs-checkit` review |
| Status `in review` (PR otwarte) | PR zmergowany do `<agents.baseBranch>` | `/dhs-checkit` close |

**Recenzja przy `in progress`:** w dhs nie ma „zakończono implementację”. User klika, gdy uważa kod za gotowy. **Nie dodajemy statusu.**

**Close:** dialog **confirm** obowiązkowy. Monitor nie meruduje. Przebieg weryfikuje merge, `done`, `return-to-base`. Merge = człowiek na GitHubie.

Confirm przy implementacji/recenzji: nieobowiązkowy.

`/dhs-checkit` update (z bazy): nie w podstawowych przyciskach; można dodać w planie.

## 11. Skille

W wizji Monitora: `/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-shipit`.

`/dhs-brainstorm` jest w [web-panel.txt](web-panel.txt). W pierwszej dostawie **nie** jako osobny UI. Architect może zatrzymać się i kazać rundę — UX tego komunikatu (przycisk vs sam czat) do planu.

`/dhs-setup` poza Monitorem.

## 12. Poza zakresem (dopóki plan tego nie otworzy)

- Zmiana dhs v1 bez nowego zakresu (sama komenda `monitor` już jest nowym zakresem).
- Mostek do żywej sesji IDE; watch JSONL w home.
- CRUD trackera z UI; auto-merge; auto-install.
- Nowy status „koniec implementacji”.
- Osobny UI brainstorm.
- Adapter OpenCode; adapter Claude Code (flaga `--host` już jest; implementacja SDK później).
- Global install.

**Nie jest poza zakresem:** żaden z dwóch trackerów. Files i Jira idą w tej samej dostawie.

## 13. Otwarte na etap planu (nie idei)

- Komenda w pakiecie `dhs` vs osobny bin.
- Dodaj = tylko planit czy shipit.
- Monitor jako nowy `hosts.json` `id` vs reuse `cursor`.
- Jak listować Jirę (JQL, które issue types, które statusy).
- Transkrypt czatu na dysku.
- Sufit N równoległych procesów Cursor Agent CLI; lock na `/dhs-planit` (files).
- Port, już działająca instancja, kilka checkoutów.
- Stop brainstorm w UI.
- Przycisk update-from-base.

## 14. Szkielet pod fazy (kolejność do planu)

1. Opakowanie CLI, `--host` required, serwer `127.0.0.1`, guardy setupu.
2. Adapter Cursor Agent CLI: **N równoległych** przebiegów (stream, narzędzia, `cwd` launch + worktree per task). Runtime SDK z wczesnego planu jest zastąpiony (faza 9 planu Monitora).
3. Layout + localStorage.
4. Lista aktywnego trackera w pełnym zakresie: glob plików **i** listowanie Jira (nowy odczyt w allowliście) — ta sama dostawa.
5. Czat.
6. Dodaj → planit w czacie.
7. Przyciski doit / review / close+confirm.
8. Odświeżanie listy.
9. Później: Claude Code adapter, brainstorm UI, skill-launcher, checkit update. Nie „później: Jira”.

## 15. Realność

- Layout, filtry, lista plików: wysoka.
- Lista (files i Jira): wysoka; Jira wymaga nowego listowania w `jira` **w tej samej dostawie**.
- Czat i przyciski: średnia — koszt = Cursor Agent CLI pod UI, nie HTML.
- **N równoległych zadań (cel główny):** osiągalne tylko jako N procesów + czat-przełącznik; jeden agent na Monitor = porażka celu. Ryzyko CLI i wyścig Architect (files).
- Panel na okno IDE: odrzucony.
- Zlecanie spec/implementacji/review/close z www: osiągalne przy tym kontrakcie i **nowym zakresie** poza dhs v1.
