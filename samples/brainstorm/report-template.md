<!-- dev-harness:brainstorm -->

# Brainstorm report template

PART A is the synthesizer's reply. It is not a file.
The settled record is written only after the user confirms the round, as `docs/brainstorm/<slug>-<YYYY-MM-DD>.md`. Persona replies are not saved.

---

# PART A — Synthesizer report

**Material:** <path or question>
**Personas:** <list>
**Date:** <YYYY-MM-DD>

## 1. Summary (at most 5 sentences)
The main findings, without deciding who is right.

## 2. Blockers
Points marked [BLOCKER] by at least one persona.

| ID | Problem | Raised by | Reference | Fact or assumption |
|----|---------|-----------|-----------|--------------------|
| B1 | ... | id | section | assumption |

## 3. Agreements
Points where at least two personas agree independently. Name the personas.

## 4. Conflicts
Places where the personas' needs contradict. Do not resolve them. State each side.

| ID | Topic | Side A (persona) | Side B (persona) | What the resolution changes |
|----|-------|------------------|------------------|-----------------------------|
| K1 | ... | ... | ... | ... |

## 5. Gaps
What is missing, according to individual personas, with severity.

## 6. Lone voices
Important points raised by only one persona that must not be lost.

## 7. Review quality
- Similarity of opinions: low, medium, or high (high is suspicious: the personas may be too loose)
- Share of claims marked as assumptions: about X%
- Personas with low confidence: <list>

## 8. Hypotheses to check with real users
Claims that rest on assumptions and are worth checking.

---

# Settled record

Write this only after the user confirms the round. Leave out the persona replies and PART A.

**Material:** <path or question>
**Date:** <YYYY-MM-DD>

## Accepted
What the user confirmed and what changed in the specification. One line per item: id and the change. Write "none" when nothing was accepted.

## Left for the user
- Conflicts with no obvious resolution: <ids and the two sides, in one line each>
- Rejected blockers: <ids and why>
