# Session Handoff — 2026-06-06 (embedded-context conversion merged; NEXT = brainstorm the TODO batch)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory
(`MEMORY.md` → `embedded-context-conversion.md`).

## ✅ Last session — Embedded-context conversion — DONE + MERGED

`main` is at **`6b495349`** (fast-forward merged and **pushed to origin**; feature branch deleted).
Built subagent-driven (7 plan tasks, fresh `titan-svelte-dev` implementers + two-stage review each +
final holistic review). **Verified: unit 183 (37 files) / FULL e2e 401 (55 files) green** (run as 3
disjoint foreground Playwright shards — see Gotchas), build clean + probe-free (grep-proven).

Shipped (spec `specs/2026-06-06-embedded-context-conversion-design.md`, plan
`plans/2026-06-06-embedded-context-conversion.md`):

- **Stage 1 — effects family:** `CharacterSheetEffectList` + `EffectHudSection` wrap rows in
  id-keyed `EmbeddedDocumentProvider`s; `EffectHudShell` sets `'sheetDocument'`; all
  `CharacterSheetEffect*` leaves + `EffectHudRow` context-sourced; `effect`/`effectId` props gone.
- **Stage 2 — item family (atomic, 27+2 files):** both item lists wrap rows; the shell trio, 4
  shared buttons, `ItemChecks`/`ItemCheck`, 3 condensed buttons, all 7 row types + stats converted;
  `item`/`itemId` props gone; dead `CharacterSheetItemTradition`/`CharacterSheetItemFooter` DELETED;
  shared leaves (`RichText`, `DocumentOwner*Button`) guard `document.data?.isOwner`.
- **Stage 3 — `CheckTags`** (`src/document/svelte-components/check/CheckTags.svelte`, testIds
  `check-tags-*`, optional actor-resolved `attribute` override prop): ONE intrinsic check display
  across the item-sheet sidebar (converged body — Decision 7), `CharacterSheetItemCheck` (+ new
  `{#if checkParameters}` guard), `CharacterSheetEffectCheck`, and the Effect HUD via reuse.
- **E2E +15:** `embedded-context-effects.spec.js` (3), `embedded-context-items.spec.js` (8,
  table-driven 7-type sweep + delete cancel/confirm), `embedded-context-check-parity.spec.js` (4,
  capture-and-compare with a testId set-equality guard). Unit +6 (`CheckTags` ×5 incl.
  deletion-window, `AttackTags` +1 deletion-window).
- **Settled idioms** (now in titan-codebase `conventions.md` "Embedded-row idioms"): display reads
  `document.data?.…`; ids `document.data?._id` (reactive) / `document.doc._id` (init-time one-shot);
  handler-time doc methods `document.doc?.…`; actor calls + actor state via `'sheetDocument'`;
  owner gates on the NEAREST `'document'` with `?.`; list-script code stays on the actor bridge;
  provider `{#each}`es MUST stay id-keyed (four wrap sites).
- TODO **#21/#22 closed**, **#20 amended** (write-path only); **#23** (ItemCheck/EffectCheck twin
  extraction) and **#24** (e2e helpers → `world.js`) logged; OPEN_BUGS **#7** logged (pre-existing
  unguarded `attack.*` reads in `CharacterSheetWeaponAttack`).

## ▶ NEXT — user directive: brainstorm session for the TODO batch

Resume with **superpowers:brainstorming** (→ spec → plan) covering these five `docs/TODO.md` /
backlog items, in the user's stated order. Likely first move: assess which are independent
sub-projects vs one batched spec (they span migration tooling, schema work, chat-component cleanup,
and a component extraction — almost certainly multiple specs; the brainstorm decides decomposition
and sequencing):

1. **#6** — convert effect Items inside compendium-packed actors (extend
   `convertEffectItemsToActiveEffects` or one-shot tool; iterate unlocked actor packs, convert,
   re-lock).
2. **#12** — chat-message ↔ document path parity north-star (progressively move ALL fields on ALL
   documents onto consistent `system.*` paths via `buildSchemaFromShape`; no migration — cards are
   snapshots).
3. **#11** — check chat components mutate the live DataModel before `update()` (clone-then-update
   refactor: `CheckChatMessageDie`, `CheckChatResetExpertiseButton`,
   `CastingCheckChatMessageScalingAspect`).
4. **#10** — chat-message Svelte mount keyed per-document, not per-element (notification-pane
   double-render unmount bug + bridge leak; per-element mount tracking in
   `TitanChatMessage.renderHTML`).
5. **#23** — extract the shared check-row presentation from ItemCheck/EffectCheck (byte-identical
   template+styles; `checkParameters` + `onRoll` callback component).

Planning rules: load `foundry-vtt` + `titan-codebase` (+ `svelte-5`/`foundry-svelte` — items 3-5
touch Svelte).

## Gotchas (carried forward + new this session)

- **NEVER run `npm run build` concurrently with an e2e run** (probe boot-window strand, OPEN_BUGS #6).
- **NEW: never run Playwright from a DETACHED background shell on this machine** — workers crash
  with `0xC0000142`; run e2e in a FOREGROUND shell. For the full suite under a 10-minute command
  cap, run 3 disjoint shards: `npm run test:e2e -- --shard=N/3` (×3, sequential foreground).
- **NEW: item-sheet sidebar checks seed EXPANDED** (`TitanItemSheetData` pushes `true` per check) —
  e2e must not blind-toggle them. Weapon sidebar attacks also seed expanded (older gotcha).
- E2E helpers must NOT blind-toggle expanders generally; sheet rows seed collapsed (fresh ids), HUD
  rows are local-state collapsed.
- e2e RUN is world-launch-gated (user launches `:30000`); `npm run build` before e2e. Unit runner is
  **`npm test`** (filter positionally).
- **`git add` explicit paths only — NEVER stage `packs/`** (incl. `lost/`),
  **`.claude/settings.local.json`, `.claude/scheduled_tasks.lock`**.
- **TODO/OPEN_BUGS hygiene: completed entries are DELETED, not marked DONE** (user-directed
  2026-06-06; the file headers now state it). An unexplained working-tree edit may be the USER —
  ask before reverting.
- E2E house patterns (copy from the `embedded-context-*` family): row locators id-keyed under
  `.application.titan-document-sheet`; role-based action locators (no `.first()`); icon-class reads
  only for STATE; three-layer settings hygiene; positive-signal-first negatives; no instant-true
  `expect.poll(...).toBe(true)` negatives; confirm dialogs pinned via
  `[id^="titan-confirmation-dialog"]` (the `_getDialogClasses` override is DEAD code in v14).
- Resume a finished subagent with its context via `SendMessage` to its `agentId`.

## Open bugs / todos worth knowing

- `docs/OPEN_BUGS.md`: **#7** (NEW — `CharacterSheetWeaponAttack` unguarded `attack.*` reads,
  latent), #5 (`addAttack` dead sheet-notify), #6 (`ensureProbe` boot-window), #4 (fast-healing
  flake, watch), #1-3 (older, low).
- `docs/TODO.md` (post-purge format): #2 (seeded effects pack), #6, #10-13, #16-20, #23, #24.

## Rules (CLAUDE.md, non-negotiable)

No test/e2e code in shipping builds; test/e2e → `test/build/` (self-cleaning); no dynamic imports in
shipping; no stub fixes (fix the root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md`
(delete on completion); project `.claude/CLAUDE.md` supersedes all; route `.js`/`.svelte` to
`titan-svelte-dev` (load `svelte-5`, `foundry-vtt`, `foundry-svelte`); update the `titan-codebase`
skill after each spec; planning loads `foundry-vtt` + `titan-codebase` (+ Svelte skills for Svelte
specs). Test source = `tests/` (plural); built artifacts = `test/build/` (singular, gitignored);
`dist/` is the shipping bundle (gitignored); e2e world is `:30000`.

## Repo state at handoff

- Branch `main` @ `6b495349` (this handoff commit lands on top), pushed; working tree dirty only
  with the sanctioned never-stage noise (`packs/effects/*` incl. `lost/`,
  `.claude/settings.local.json`, `.claude/scheduled_tasks.lock`).
