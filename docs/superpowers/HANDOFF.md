# Session Handoff — 2026-06-06 (embedded-document-stores merged; NEXT = convert remaining components)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory
(`MEMORY.md` → `embedded-document-stores.md`).

## ✅ Last session — Embedded document stores — DONE + MERGED

`main` is at **`7c58883c`** (fast-forward merged and **pushed to origin**; feature branch deleted).
Built subagent-driven (8 tasks, fresh `titan-svelte-dev` implementer + two-stage review each + final
holistic review). **Verified: unit 177 (36 files) / full e2e 386 green** (one environmental failure
root-caused to a concurrent build — see Gotchas — and twice-green in isolation at HEAD), build clean +
probe-free.

Shipped: **`EmbeddedDocument`** delegating bridge + **`EmbeddedDocumentProvider`** (shadows the
`'document'` context; MUST be keyed by `doc.id` in `{#each}`) + the never-shadowed **`'sheetDocument'`**
context (set in `DocumentSheetShell`), proven by ONE shared **`AttackTags`** component consumed on the
weapon item-sheet sidebar, the character sheet (provider + actor `damageMod`), and the weapon chat card
(snapshot path parity, no provider). Bonus display-parity fixes in `CharacterSheetWeaponAttack`
(real `getAttackCheckMod` signature via `getCheckMod`, `'dice'` mod in the dice pool, training fold-in
pre-halving, flurry `'flurry'` fix) — all regression-locked by
`tests/unit/CharacterSheetWeaponAttack.test.js`. Spec/plan:
`specs/2026-06-03-embedded-document-stores-design.md` (refreshed 2026-06-05),
`plans/2026-06-05-embedded-document-stores.md`. The titan-codebase skill documents the machinery
(abstractions/data-flow/conventions + SKILL.md).

## ▶ NEXT — brainstorm: convert the remaining embedded-document components to the context

The user's directive: **resume with a brainstorming session** (superpowers:brainstorming → spec → plan)
to convert the remaining Svelte components that reference embedded documents (the `item`/`effect`
prop-threading + `document.data.items.get(item._id)…` lookup pattern) onto the embedded-document
context (`EmbeddedDocumentProvider` + `'document'`/`'sheetDocument'`).

Starting inventory (grep, 2026-06-06):
- `document.data.items.get(` — **55 occurrences across 19 `.svelte` files** under
  `src/document/types/actor/types/character/sheet/items/` (weapon/armor/shield/equipment/commodity/
  spell/ability rows + stats + condensed check buttons + the two list components).
- `.effects.get(` — **13 occurrences across 5 `.svelte` files** (`items/effect/CharacterSheetEffect*`)
  plus `src/ui/effect-hud/EffectHudRow.svelte` (1) — the Effect HUD already passes a `ReactiveDocument`
  actor bridge, so it is a candidate surface too.
- Existing decomposed follow-ups to fold into the brainstorm scope: `docs/TODO.md` **#20** (inline
  attack editing by reusing `WeaponSheetAttackSettings` through the provider — the WRITE path the
  AttackTags proof left unexercised), **#21** (checks tab + rules-elements tab generalization),
  **#22** (commodity/effect rows). Spec follow-up list:
  `specs/2026-06-03-embedded-document-stores-design.md` → "Follow-up work → Sheet-side reuse".

Brainstorm questions to settle: scope/phasing (per-item-type? read-path first vs write-path first?),
whether the provider wraps at the row level (`CharacterSheetItem`/`CharacterSheetMultiItemList`, one
provider per row — already id-keyed at `CharacterSheetMultiItemList.svelte:91`) or per-section; what
happens to the `item` prop threading (drop entirely vs keep for engine-call args); whether shared
display components (like AttackTags) fall out per type or whether this pass is purely a context-source
conversion; e2e strategy (the reactive-* spec family covers several of these rows already).

## Gotchas (carried forward)
- **NEVER run `npm run build` concurrently with an e2e run** — the build's `emptyOutDir` mid-login
  hands a page a broken system load; the probe's pre-init injection window then strands exactly one
  test (`OPEN_BUGS.md` #6 has the mechanism + the `ensureProbe` hardening recipe).
- E2E helpers must NOT blind-toggle expanders (weapon sidebar attacks seed EXPANDED,
  `WeaponSheetData.js:44`; a blind click collapses + races the slide transition). Convention in
  titan-codebase `conventions.md`.
- e2e RUN is world-launch-gated (user launches `:30000`); `npm run build` before e2e; full run ~14 min
  throttled (`test:e2e:fast` = unthrottled). Unit runner is **`npm test`** (filter positionally).
- **`git add` explicit paths only — NEVER stage `packs/`** (incl. `packs/effects/lost/`),
  **`.claude/settings.local.json`, or `.claude/scheduled_tasks.lock`**.
- Tippy-tooltip tags render fine under happy-dom unit tests (no mocking needed); context-Map render
  harness pattern: `tests/unit/AttackTags.test.js` / `CharacterSheetWeaponAttack.test.js`.
- `attack.customTrait` entries are `{name, description, uuid}` objects.
- Resume a finished subagent with its context via `SendMessage` to its `agentId`.

## Open bugs / todos worth knowing
- `docs/OPEN_BUGS.md`: **#5** (`WeaponDataModel.addAttack` dead sheet-notify — new attacks mount
  collapsed), **#6** (`ensureProbe` boot-window stranding — hardening recipe logged), #4 (fast-healing
  flake, watch), #1-3 (older, low).
- `docs/TODO.md`: #20-22 (this NEXT), #10/#11/#13/#16/#17/#18/#19 (older backlog).

## Rules (CLAUDE.md, non-negotiable)
No test/e2e code in shipping builds; test/e2e → `test/build/` (self-cleaning); no dynamic imports in
shipping; no stub fixes (fix the root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md`;
project `.claude/CLAUDE.md` supersedes all; route `.js`/`.svelte` to `titan-svelte-dev` (load
`svelte-5`, `foundry-vtt`, `foundry-svelte`); update the `titan-codebase` skill after each spec;
planning loads `foundry-vtt` + `titan-codebase` (+ `svelte-5`/`foundry-svelte` for Svelte specs).
Test source = `tests/` (plural); built artifacts = `test/build/` (singular, gitignored); `dist/` is
the shipping bundle (gitignored); e2e world is `:30000`.

## Repo state at handoff
- Branch `main` @ `7c58883c` (this handoff commit lands on top), pushed; working tree dirty only with
  the sanctioned never-stage noise (`packs/effects/*` incl. `lost/`, `.claude/settings.local.json`,
  `.claude/scheduled_tasks.lock`).
