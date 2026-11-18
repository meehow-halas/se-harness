# Feature log

Files tracker path: `docs/feature-log/<basename>.log.md`. Example basename: `001-feature-example-name`. Append-only. No second approvals file.

User decisions: `Q<n>: …`. Designer decisions: `D<n>: …`. Consultant items: `C<phase>.<n>: …`. Debt: `C<id>: accepted — <reason>`. Stale: `C<id>: stale`.

| date | agent | action | note |
|------|-------|--------|------|
| YYYY-MM-DD | architect | spec | First spec and prompt. |
| YYYY-MM-DD | architect | user decision | Q1: … |
| YYYY-MM-DD | architect | design | design: docs/designs/<slug>.design.md |
| YYYY-MM-DD | designer | ux decision | D1: … |
| YYYY-MM-DD | implementer | phase | C1.1: … |
