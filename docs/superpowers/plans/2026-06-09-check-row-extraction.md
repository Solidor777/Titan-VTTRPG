# Shared check-row extraction (TODO #23) — plan

Spec: `docs/superpowers/specs/2026-06-09-check-row-extraction-design.md`.
Branch: `check-row-extraction`. Executed mainline (`mainline-plan-execution`).

## Task 1 — create `src/document/svelte-components/check/CheckRow.svelte`

Move the shared template + styles verbatim from `CharacterSheetItemCheck.svelte`; script reads
`'document'`/`'sheetDocument'` contexts and the `autoSpendResolveChecks` setting; props
`{ checkParameters, checkIdx, onRoll }`; `{#if checkParameters}` gate inside.

## Task 2 — slim both consumers

`CharacterSheetItemCheck.svelte` and `CharacterSheetEffectCheck.svelte` keep only their
options-building scripts + roll handlers and render `<CheckRow/>`. Remove now-unused imports and
the duplicated template/styles.

## Task 3 — verify

`npm run build`; unit suite; targeted e2e (checks-integration, embedded-context-effects,
effect-hud) if the world is up.

## Task 4 — docs + skill

Delete TODO #23; titan-codebase skill self-update (CheckRow joins CheckTags in the shared check
components); `graphify update .`; final branch review; merge + push per session convention.
