# TITAN E2E — Phase 3c: Integration Manifest Drift Guard (Design)

**Date:** 2026-05-31. **Branch:** `development`. **Phase:** 3c (last remaining Phase 3 item).
**Skills:** `foundry-vtt`, `titan-codebase` (+ `foundry-versioning`/`foundry-data-models` for the manifest
surface). No `.svelte` work; one `system.json` edit (manifest-only, normal review, no `titan-svelte-dev`).

## Purpose

Assert that the **declarative `system.json` manifest** and the **live runtime registration**
(`src/hooks/OnceInit.js`, `OnceSetup.js`) never silently diverge. Today the subtypes, sheets, document
classes, packs, and assorted `CONFIG` flags are wired by hand in `OnceInit`; nothing guards against the
manifest declaring a subtype the code forgets to register (or vice versa), a pack going stale, the core
AppV1 sheets sneaking back in, or a runtime flag regressing. Phase 3c is that guard.

## Source of truth

Read the shipped `system.json` from disk via Node `fs` in the test process; assert the live `CONFIG`/`game`
state via `page.evaluate`. This compares the **actual shipped artifact** against the **running
registration** — the truest drift guard. The live Foundry on `:30000` serves *this* directory, so the disk
`system.json` is byte-identical to the served manifest; there is no staleness gap. (Rejected alternatives:
reading `game.system` in-page compares Foundry's *parse* of the manifest to `CONFIG`, not the shipped file;
hardcoding expected lists introduces a third source of truth that can itself drift.)

## Architecture

**Single spec:** `tests/e2e/integration-manifest.spec.js`.

- A module-scope helper reads and parses `system.json` once (Node `fs.readFileSync` +
  `JSON.parse`, resolved relative to the spec file). No new shared fixture file is needed; the parse is
  small and local to this spec.
- Each test passes only the relevant **declared list** (plain JSON-serialisable data) into
  `page.evaluate`, where it is compared against the live `CONFIG`/`game`. Functions and classes never cross
  the Node↔page boundary — assertions compare by subtype key, pack name, and `constructor.name`/`.name`
  strings.
- Login via the shared `login(page)` (defaults to `E2E GM 1`) in `beforeEach`. Settings/conditions
  assertions need a GM-ready world, which `login` already guarantees (`game.ready === true`).

## Assertion matrix

### Manifest-derived (parsed from `system.json`)

1. **documentTypes ↔ dataModels parity** — for `Actor`, `Item`, `ActiveEffect`: the set of subtype keys in
   `system.json.documentTypes.<X>` equals the set of keys in `CONFIG.<X>.dataModels` — asserted **both
   directions** (no manifest subtype missing a dataModel; no orphan dataModel beyond the declared set).
   Expected today: Actor `{player, npc}`, Item `{ability, armor, commodity, equipment, shield, spell,
   weapon}`, ActiveEffect `{effect}`.
2. **ChatMessage subtypes** — after the `testChat` removal (below), `system.json.documentTypes.ChatMessage`
   is empty/absent. The test asserts ChatMessage has **no declared subtypes** and that
   `CONFIG.ChatMessage.dataModels` likewise carries no `titan` subtype entries. This encodes the resolution
   and locks out re-introduction of an unused subtype.
3. **Packs** — every entry in `system.json.packs` resolves in `game.packs` (keyed `titan.<name>`) with a
   matching `type` and `system`. Expected: the `effects` pack → `type: 'ActiveEffect'`, `system: 'titan'`.
4. **Grid + socket** — `game.system.grid.units` / `.diagonals` match the manifest's `grid` block
   (`'sp'` / `4`); the manifest `socket` flag is `true`.

### Runtime-only (direct assertions — these facts are not in the manifest)

5. **documentClass identity** — `CONFIG.Actor.documentClass.name === 'TitanActor'`,
   `CONFIG.Item.documentClass.name === 'TitanItem'`,
   `CONFIG.ActiveEffect.documentClass.name === 'TitanActiveEffect'`,
   `CONFIG.ChatMessage.documentClass.name === 'TitanChatMessage'`,
   `CONFIG.Combat.documentClass.name === 'TitanCombat'`. (Assert by `.name` to avoid importing the classes
   into the Node process or across the boundary.)
6. **Sheet registration** — for every Actor/Item subtype, the registered sheet collection contains a
   `titan`-scoped sheet that is the **default** for that subtype, and the core AppV1 sheets
   (`foundry.appv1.sheets.ActorSheet` / `ItemSheet`) are **not** registered. The ActiveEffect `titan` sheet
   is registered and default. Read via the live sheet-registration config
   (`CONFIG.<X>.sheetClasses` / the `DocumentSheetConfig` registration map) inside `page.evaluate`; the
   exact accessor is confirmed against the running v14 during implementation (TDD red first).
7. **Misc runtime config** —
   - `CONFIG.time.roundTime === 6`
   - `CONFIG.ActiveEffect.legacyTransferral === false`
   - the custom initiative formula is installed (`CONFIG.Combat.initiative.formula` equals the Titan
     formula produced by `registerInitiativeFormula`)
   - conditions/status effects are populated (`CONFIG.statusEffects` is non-empty and contains the Titan
     conditions set up by `setupConditions`)
   - the `titan` system settings are registered (`game.settings.settings` contains the known keys, e.g.
     `titan.migrationMode`).

   The exact expected values for the initiative formula and the conditions set are pinned during
   implementation by reading them from the source registration functions, not invented in the test.

## The `testChat` resolution (investigate-oddity deliverable)

`testChat` is declared in `system.json.documentTypes.ChatMessage` but has **no** registered dataModel and
**zero** references anywhere in `src/` (verified by grep). It is dead scaffolding that would still surface
wherever ChatMessage subtypes are offered. **Resolution: remove the `testChat` entry from
`system.json.documentTypes.ChatMessage`** (manifest-only edit; normal review). Assertion #2 then locks it
out. If a real `ChatMessage` subtype is added later, it must come with a dataModel + the manifest entry, and
#2 updates accordingly.

## Build & verification

- This spec touches no gated `src/` probe code, so it runs on either bundle. The suite standard is the
  `build:e2e` bundle — run `npm run build:e2e` (it already serves all source changes including the
  `system.json` `testChat` removal) then `npx playwright test --reporter=list`.
- Expected outcome: existing **290** e2e tests remain green; this spec adds new passing tests (count TBD by
  the plan — roughly one `describe` with ~7 focused tests matching the matrix).
- Unit suite (`npx vitest run`) unaffected — expect **35**.

## Out of scope

- i18n key existence for the `localize()` sheet labels (separate concern).
- Asserting the *content* of dataModel schemas (covered structurally elsewhere; 3c guards *wiring*, not
  field shapes).
- Multi-user/socket behaviour (Phase 4).

## Working agreements (carried from the suite status doc)

- Stay on `development`; no git worktree (live Foundry serves this directory).
- Login as `E2E GM 1`, never the human `Gamemaster` session.
- Build output (`index.js`, `style.css`) is gitignored — never `git add` it.
- `packs/effects/**` LevelDB churn stays uncommitted.
- Update `titan-codebase` conventions only if a new reusable pattern emerges (the manifest-read helper may
  qualify).
