# Session Handoff — 2026-06-06 (pack effect-item conversion merged; NEXT = brainstorm #10+#11)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory.

## ✅ Last session — Pack effect-Item conversion + invalid-document repair — DONE + MERGED

`main` is at **`ef1b4a42`** (fast-forward merged and **pushed to origin**; feature branch deleted). Built
subagent-driven (6 plan tasks, fresh `titan-svelte-dev` implementers + two-stage review each + final holistic
review), with a **pre-implementation two-reviewer buddy check on the plan** (13 agreed findings, 0 unresolved —
every one folded in before any code). **Verified: unit 212 (38 files) / FULL e2e 402 (3 foreground shards), build
clean + probe-free (grep-proven).**

Shipped (spec `specs/2026-06-06-pack-effect-item-conversion-design.md`, plan
`plans/2026-06-06-pack-effect-item-conversion.md`):

- **Invalid-document repair (closed OPEN_BUGS #8):** `convertActor` discovers legacy effect Items from raw
  `actor._source.items` — the `effect` Item subtype is unregistered, so legacy items are INVALID documents,
  excluded from `actor.items` iteration but present in raw source and deletable by id (client backend resolves
  deletions with `{strict: true, invalid: true}`).
- **Idempotency + data safety (closed OPEN_BUGS #9, user-approved deltas):** replacement AEs stamped
  `flags.titan.convertedFromItem`; creation skip-guarded; **deletion stamp-verified** (a source is deleted only
  when its replacement verifiably exists — pre-existing stamp or a doc RETURNED by `createEmbeddedDocuments`, so a
  third-party `preCreateActiveEffect` veto retains its source). `active` normalized for uncast template-era
  strings/missing keys.
- **Pack path (closed TODO #6):** `convertWorldActorPacks` → `convertPack` — world Actor packs only, index-gated
  every load via `pack.getIndex({ fields: ['items'] })` (a SUMMARY projection: `compendiumIndexFields` + `_id` per
  item, NO `system`; invalid-typed entries included), auto-unlock + lock restored in a guarded `finally`
  (restore failure logs its own error, never masks), per-entry/per-pack isolation, missing-document guard.
- **Tests:** `tests/unit/ConvertEffectItemsToActiveEffects.test.js` (29) and `tests/e2e/pack-conversion.spec.js`
  (clean-pack safety lock; the suite's FIRST mid-file `page.reload()` — hardened idiom now documented in
  titan-codebase `conventions.md`).
- Docs/skill: TODO #6 + OPEN_BUGS #8/#9 deleted; converter state + reload idiom recorded in titan-codebase.

## ⚠ OUTSTANDING — user-deferred manual deep-path verification

The user chose **merge now, verify after**. Still owed (spec §6 manual mode): run a COPY of a pre-conversion world
(packed actor + world actor with legacy effect Items) against current `main`. Conversion load WILL show red errors
(one `Failed to initialize Item … "effect" is not a valid type` + one caught `Failed data preparation` per legacy
item — both expected, neither is failure). Confirm items → equivalent stamped `effect` AEs, no leftovers, lock
restored, stats unchanged. **Pass signal = SECOND load: zero red errors, zero conversion lines.** If it fails,
fix-forward on `main`.

## ▶ NEXT — the remaining TODO batch, in the user-approved order

Decomposition + sequencing settled in this session's brainstorm (4 specs, grouped): **#6 ✅ → #10+#11 → #23 → #12.**

1. **#10+#11 combined spec (chat-message render/update hygiene)** — brainstorm next: per-element Svelte mount
   keying in `TitanChatMessage.renderHTML` (notification-pane double-render unmount bug + bridge leak, TODO #10)
   plus clone-then-update refactor of the three live-DataModel-mutating check chat components (TODO #11). One
   subsystem, one verification cycle.
2. **#23** — extract the shared check-row presentation from ItemCheck/EffectCheck (byte-identical template+styles).
3. **#12** — chat ↔ document path parity north-star: brainstorm strategy + first increment LAST, informed by the
   path friction the chat-hygiene work surfaces.

Planning rules: load `foundry-vtt` + `titan-codebase` (+ `svelte-5`/`foundry-svelte` — all three touch Svelte).

## Gotchas (carried forward + new this session)

- **NEW: `pack.getIndex({ fields: [...] })` hierarchy fields are SUMMARY projections** — embedded items filtered to
  `compendiumIndexFields` + `_id` (`{_id, name, img, type, sort, folder}`), never `system`; no validation, so
  invalid-typed entries ARE included; the client index retains projected fields for the session (and they go stale
  after writes).
- **NEW: unregistered-subtype documents** throw strict construction → `invalidDocumentIds`, excluded from
  collection iteration; raw `_source` sees them; embedded delete-by-id works on them.
- **NEW: `game.ready` is set BEFORE the un-awaited ready hooks finish** — login/boot gates prove nothing about
  ready-hook work; gate on a positive console-line/state signal instead (see the reload idiom in titan-codebase
  `conventions.md`).
- **NEW: Playwright `waitForFunction(fn, arg, options)` is THREE-positional** — the two-argument form silently
  binds options as `arg` and keeps the default timeout.
- **NEVER run `npm run build` concurrently with an e2e run**; Playwright FOREGROUND only (detached background
  shells crash workers `0xC0000142`); full suite = 3 disjoint shards `npm run test:e2e -- --shard=N/3`.
- e2e RUN is world-launch-gated (user launches `:30000`); `npm run build` before e2e. Unit runner is **`npm test`**
  (filter positionally).
- **`git add` explicit paths only — NEVER stage `packs/`** (incl. `lost/`), **`.claude/settings.local.json`,
  `.claude/scheduled_tasks.lock`**. The user edits `.claude/` files live — ask before reverting anything there.
- TODO/OPEN_BUGS hygiene: completed entries are DELETED, not marked DONE.
- Confirm dialogs pin via `[id^="titan-confirmation-dialog"]`; item-sheet sidebar checks seed EXPANDED; helpers
  must not blind-toggle expanders.
- Resume a finished subagent with its context via `SendMessage` to its `agentId`.

## Open bugs / todos worth knowing

- `docs/OPEN_BUGS.md`: #7 (`CharacterSheetWeaponAttack` unguarded `attack.*` reads, latent), #5 (`addAttack` dead
  sheet-notify), #6 (`ensureProbe` boot-window), #4 (fast-healing flake, watch), #1-3 (older, low).
- `docs/TODO.md` (post-#6 purge): #2 (seeded effects pack), #10-13, #16-20, #23, #24.
- Accepted limitation (documented in `convertPack` JSDoc): the pack index gate flags legacy ITEMS only — a packed
  actor carrying ONLY stale mirror AEs is never flagged (mirrors normally co-exist with their items).

## Rules (CLAUDE.md, non-negotiable)

No test/e2e code in shipping builds; test/e2e → `test/build/` (self-cleaning); no dynamic imports in shipping; no
stub fixes (fix the root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md` (delete on completion); project
`.claude/CLAUDE.md` supersedes all (NOTE: the user edited it live this session — re-read it on resume); route
`.js`/`.svelte` to `titan-svelte-dev` (load `svelte-5`, `foundry-vtt`, `foundry-svelte`); update the
`titan-codebase` skill after each spec; planning loads `foundry-vtt` + `titan-codebase` (+ Svelte skills for Svelte
specs). Test source = `tests/` (plural); built artifacts = `test/build/` (singular, gitignored); `dist/` is the
shipping bundle (gitignored); e2e world is `:30000`.

## Repo state at handoff

- Branch `main` @ `ef1b4a42` (this handoff commit lands on top), pushed; working tree dirty only with the
  sanctioned never-stage noise (`packs/effects/*`, `.claude/settings.local.json`, `.claude/scheduled_tasks.lock`,
  plus the user's live `.claude/` edits).
