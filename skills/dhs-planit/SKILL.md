---
name: dhs-planit
description: Run the Architect once for a request. Use when the user runs /dhs-planit. Offers the next step; does not start it.
---

# /dhs-planit

Before any work:

1. If `.dhs/` or `.dhs/VERSION` is missing:

```text
BLOCKED: dhs install has not been run here — run dhs install (npx dhs install or npx -p github:<owner>/<repo> dhs install), then /dhs-setup
```

2. If `harness.config.json` is missing:

```text
BLOCKED: setup is incomplete — run /dhs-setup
```

3. If `.dhs/VERSION` does not match `dhs.generatedFrom` in `harness.config.json`:

```text
BLOCKED: generated files do not match the installed templates — run /dhs-setup
```

Otherwise this skill’s procedure is not in this package yet:

```text
BLOCKED: /dhs-planit template is incomplete — update the dhs package and run /dhs-setup to regenerate work skills
```
