# Session Handoff — 2026-06-04 (follow-up D complete on branch)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory.

## ✅ This session — follow-up D (check chat schemas from single-source shapes)

Branch `feat/chat-subtypes-followup-D-check-templates` (off `main`). **Implementation complete and
verified; pending final review + merge** (the finishing-a-development-branch step). Built
subagent-driven (fresh implementer + two-stage review per task).

What shipped:
- **Single-source shapes (approach B):** every check parameter/result factory now spreads a co-located,
  exported `create<T>Check{Parameters,Results}Shape()` (results compose `createCheckResultsShape()`;
  params flat) and overrides only option/computed fields — byte-identical output. The 5 leaf chat
  DataModels build TYPED `parameters`/`results` from the SAME shapes via
  `CheckChatMessageDataModel._defineCheckDataSchema(pShape, rShape)`
  (`createSchemaField(buildSchemaFromShape(...))`); the base dropped its untyped `ObjectField` bags.
- **Item-check correctness (path 2, user-confirmed):** `getItemCheckParameters` now mirrors the item
  config — copies `isDamage`/`isHealing`, carries `opposedCheck.enabled`, and fixes the `damageReducedBy`
  gate to read `checkData` (was a self-comparison vs the `'none'` default) — so opposed/resistance
  damage-reduction actually feeds the opposing attribute check (`damageToReduce`→`damageTaken`).
  `opposedCheck` is a typed nested `{enabled,attribute,skill}`; all its truthiness guards use `.enabled`
  (`ItemCheckResults.js`, `ItemCheckChatMessage.svelte`); stale `parameters.itemTrait` card reads
  (item + casting) repointed to `customTrait`; the sourceless `opposedCheck.difficulty` read dropped.
- **Pre-existing bug exposed + fixed:** `createAttackCheckOptions` dropped `damageMod` (siblings had
  `?? 0`) → dialog attack rolls produced `NaN` `results.damage`, silently stored by the old untyped bag
  but rejected by the typed integer field → no message. Added `damageMod: options.damageMod ?? 0`.
- **Gates:** golden master `tests/unit/CheckChatMessageSchemaEquivalence.test.js` (all 5 typed schemas,
  hand-authored, independent of `buildSchemaFromShape`) + factory↔shape parity
  `tests/unit/check/check-shape-parity.test.js` + new e2e `tests/e2e/item-check-damage-reduction.spec.js`.
- **Verified:** unit **140**, check/chat e2e surface **44** green (all 5 check types via dialog + API,
  item cards, render smokes), `npm run build` clean (single chunk). Lint clean EXCEPT one PRE-EXISTING
  error logged to `docs/OPEN_BUGS.md` (#1, `MoveEffectToFolderDialogShell.svelte:22`, unrelated to D).
- Spec/plan: `specs/2026-06-04-chat-subtypes-followup-D-check-templates-design.md`,
  `plans/2026-06-04-chat-subtypes-followup-D-check-templates.md`.

## How to resume / finish
1. If D is not yet merged: do the final whole-branch code review, then
   `superpowers:finishing-a-development-branch` (merge to `main` / PR). The branch is green.
2. **NEXT (chat-message-subtypes roadmap):** **Phase 3 (reports ×13)** then **Phase 4 (effect + delete
   the legacy `OnRenderChatMessageHTML` mount + the `ChatMessageShell.svelte` switch)** — not yet
   specced. Reuse the proven item/check pattern. Backlog detail: `docs/TODO.md` ("Chat message subtypes").
3. Load skills: `foundry-vtt`, `titan-codebase`, `foundry-data-models` (+ `svelte-5`/`foundry-svelte`).
   Route `.js`/`.svelte` edits through `titan-svelte-dev`.

## Gotchas learned this session
- **Typed chat schemas reject `NaN`/wrong-type values the old untyped `ObjectField` bags silently
  stored.** Typing a previously-bag-stored snapshot can EXPOSE latent producers of bad data (the attack
  `damageMod` NaN). Verify ALL producer paths (dialog AND API) under e2e, not just one.
- **e2e needs a current `dist/`:** a launched world serves whatever `dist/index.js` was last built; after
  any `src/` change, `npm run build` before e2e (a fresh Playwright page re-fetches the bundle; no
  Foundry restart needed unless `documentTypes`/manifest changed).
- **`attachPageErrors` only captures uncaught `pageerror`, not `console.error`** — to debug a
  `ChatMessage.create` `DataModelValidationError`, monkeypatch `ChatMessage.create` in `page.evaluate`
  to stash the error/data; `JSON.stringify` turns `NaN`→`null`, a tell for an arithmetic-on-undefined bug.
- **`buildSchemaFromShape([])` makes the element an untyped `ObjectField`** (not a typed element) — the
  golden for empty object arrays (`dice`/`scalingAspect`/`customTrait`/`attackTrait`) is `emptyObjectArray()`.
- **`SendMessage` (resume a subagent in place) needs `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`** — not
  set here, so review-fixes were done by fresh scoped fix-subagents.

## Rules (CLAUDE.md, non-negotiable)
No test/e2e code in shipping builds; test/e2e → `test/build/` self-cleaning; no dynamic imports in
shipping; no stub fixes (fix root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md`; project
`.claude/CLAUDE.md` supersedes all; route `.js`/`.svelte` to `titan-svelte-dev`; update the
`titan-codebase` skill after each spec. **NEVER `git add packs/`** (stage explicit paths only). e2e is
**world-launch-gated** (`:30000`); test source = `tests/` (plural), built artifacts = `test/build/`
(singular, gitignored); `dist/` is the shipping bundle (gitignored).
