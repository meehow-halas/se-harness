# 02 — Test manualny w projekcie z UI

## Cel
Potwierdzić w realnym projekcie z UI (np. React), że Designer uczy się konwencji, stosuje je, a Consultant pomija tylko zatwierdzone odstępstwa.

## Zakres
**W zakresie:** scenariusz poniżej na projekcie konsumenckim po `seh install` z wersją 1.6.0 i `/_setit-se`.
**Poza zakresem:** inne hosty niż ten, którego używasz (opcjonalnie).

## Decyzje
Q5.

## Plan szczegółowy
1. W projekcie z UI, który ma świadome odstępstwo od a11y (np. icon-only przyciski bez `aria-label` w toolbarze), uruchom `/_designit naucz się konwencji` (interactive).
2. Sprawdź podgląd: reguły z `path:line`, ≤ ~50 linii, odstępstwo w „Deviations from ux-a11y”. Zaakceptuj.
3. Uruchom `/_designit autonomicznie <prośba z tym toolbarem>` → design file ma `D<n> … (ux-conventions)` zgodny z odstępstwem.
4. Uruchom `/_runit` dla taska z UI z tym wzorcem → Consultant nie zgłasza reguły z odstępstwa, nadal zgłasza inną regułę a11y (np. brak `alt`).
5. Zmień `status` pliku na `draft` → Consultant znów zgłasza odstępstwo.
6. `/_designit sam naucz się konwencji` (autonomous) na projekcie z odstępstwem → plik bez nowych odstępstw, raport je proponuje.

## Kryteria akceptacji
- [ ] Krok 2: plik konwencji ma kształt z `01`, dowody wskazują istniejące linie.
- [ ] Krok 3: decyzja oparta o konwencję jest oznaczona.
- [ ] Krok 4: Consultant pomija tylko wymienioną regułę.
- [ ] Krok 5: `draft` nie wyłącza reguły.
- [ ] Krok 6: autonomous nie dopisuje odstępstw.

## Weryfikacja
Potwierdzenie użytkownika per kryterium.

## Pliki
Projekt konsumencki (poza tym repo).

## Zależy od
01 (`done`).
