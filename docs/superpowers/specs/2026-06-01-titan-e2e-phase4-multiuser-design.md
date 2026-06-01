# TITAN E2E — Phase 4: Multi-User Permissions + 2-Client Socket Sync (Design)

**Date:** 2026-06-01. **Branch:** `development`. **Status:** approved design, pending implementation plan.

Phase 3 is fully complete (suite **298 passing**, unit **35**). Phase 4 covers BOTH multi-user surfaces
in a single spec, organized as two plan groups that share one harness:

- **Plan Group A — Socket sync:** drive a `TitanCombat` turn change on one client; assert the
  *replicated document state* on the second (observing) client.
- **Plan Group B — Permissions / visibility:** what a Player client may see and do versus a GM —
  sheet ownership levels, best-owner write routing (the bridge to Group A), compendium ownership,
  and auto-open-sheet settings.

## Architecture findings (ground truth — verified against source)

These shape the entire design; recorded here so the plan doesn't re-derive them.

- **System socket.** The only system socket usage is `system.titan` →
  `SocketManager.triggerSocketHook(id, ...args)` (`src/helpers/SocketManager.js`). It calls the hook
  **locally** AND `game.socket.emit`s it to every other client, whose `_onSocketReceived` runs
  `Hooks.callAll(message.id, ...message.args)`.
- **Emitters.** Only `TitanCombat` (`src/document/types/combat/TitanCombat.js`) emits, and only from
  the overridden `nextTurn()` / `previousTurn()` — firing `'combatNextTurn'` /
  `'combatPreviousTurn'` with `(currentCombatant, previousCombatant, combat)`. Guarded by
  `this.turns.length > 1`.
- **Why a system socket at all.** `nextTurn()`/`previousTurn()` run only on the client that invoked
  them, and they compute the pre/post combatant args. The system socket re-broadcasts those computed
  args so every client's `onCombatNextTurn`/`onCombatPreviousTurn` handler
  (`src/hooks/OnCombatNextTurn.js`, `OnCombatPreviousTurn.js`) runs with identical inputs. Foundry's
  native combat replication fires `updateCombat` everywhere but does not carry these specific
  combatant args in the same shape.
- **Who actually mutates.** The handlers call `actor.system.onTurnStart()` / `onTurnEnd()` (and the
  `onInitiative*` / `*Reverted` variants) on **every** client, but the resource-changing
  `actor.update(...)` is gated by **`isCurrentUserBestOwner(this.parent)`**
  (`CharacterDataModel.js`), so it fires on exactly one client. Other clients then observe the change
  via Foundry's **native document replication**, not the system socket.
- **`isCurrentUserBestOwner`** (`src/helpers/utility-functions/IsCurrentUserBestOwner.js`): if any GM
  is active, returns true only for the **first active GM**; otherwise true only for the **first active
  player owner**. This is the single-writer guarantee Group A/B2 exercises.
- **Determinism lever.** Turn effects apply outright only when the relevant setting equals
  `'enabled'`; `'showButton'` posts a chat-report button instead, `'disabled'` skips. Settings:
  `autoApplyFastHealing`, `autoApplyPersistentDamage`, plus auto-revert counterparts and resolve
  regain (`src/helpers/Settings/*.js`, `src/system/SystemSettings.js`). Turn-effect magnitudes are
  **flat rules-element values, not dice** — so `forceDice` is NOT needed; pinning settings to
  `'enabled'` makes outcomes fully deterministic.
- **Auto-open behavior.** `onTurnStart()` renders the sheet based on `autoOpenCharacterSheetsGM`
  (`npcsOnly`/`pcsOnly`/`all`) for GM clients and `autoOpenCharacterSheetsPlayer` (boolean) for
  owning player clients — independent of the resource mutation.

## Constraint: two simultaneous clients = two contexts in one test

`playwright.config.mjs` runs `workers: 1, fullyParallel: false`, and the live Foundry on `:30000`
serves a single world. Two genuinely-independent sessions therefore must be **two browser contexts
within one test**, each with its own cookies/session. Playwright projects / extra workers are
rejected for this reason.

## Section 1 — Harness & determinism infrastructure

### `tests/e2e/multiClient.js`
Reusable two-client wrapper:
```
withClients(browser, { gm = 'E2E GM 1', player = 'E2E Player 1' }, async ({ pageGm, pagePlayer, ctxGm, ctxPlayer }) => { … })
```
- Creates `ctx = await browser.newContext()` → `page = await ctx.newPage()` for each role; runs the
  existing `login(page, user)` (`tests/e2e/fixtures.js`) which already accepts any identity by
  display name and waits for `ready`.
- Runs the callback inside `try { … } finally { await ctxGm.close(); await ctxPlayer.close(); }` —
  one place owns cleanup so contexts never leak (the dominant multi-context flakiness source).
- Tests obtain `browser` from the Playwright fixture.

### `tests/e2e/worldSettings.js`
Deterministic world-scope setting control:
- `setWorldSetting(pageGm, key, value)` → `game.settings.set('titan', key, value)`. **Must be written
  from the GM client** (world scope).
- `awaitSetting(page, key, value)` → `page.waitForFunction` that the value has **propagated** to the
  given client (world settings broadcast over Foundry's native socket). Never a fixed sleep.
- A snapshot/restore pair driven from `beforeEach`/`afterEach` so settings do not leak across tests.

### Combat seeding — `tests/shared/combat.js` + `tests/shared/builders.js` additions
- New actor builders carrying a single turn-effect rules element each: **fastHealing**,
  **persistentDamage**, **resolveRegain** (one ability item applying the element on ownership — same
  mechanism as the Phase 2a `flatModifier` ability; abilities apply rules elements on ownership with
  no equip requirement).
- A combat-seeding helper that creates a `Combat`, adds `Combatant`s for the seeded actors, and sets
  initiative so `this.turns.length > 1` (required for the socket emit) and the
  `currentInitiative`/`previousInitiative` comparison in the handlers is well-defined.

### Determinism levers (carried by every Group A/B4 test)
- Pin the auto-apply / auto-revert setting for the effect under test to `'enabled'`; pin the others
  to `'disabled'` so each test isolates one effect with no chat-button in the loop.
- Assert on the observing client by polling the **document** (`page.waitForFunction` on the resource
  value, sheet presence, or ownership level) — never DOM-by-timing.

## Section 2 — Plan Group A: Socket sync (replicated document state)

Each test seeds combat on the GM client, advances/retreats the turn, then asserts on the *observing*
client's document via `waitForFunction`.

- **A1 — Fast healing replicates.** Actor with fastHealing element + `autoApplyFastHealing='enabled'`.
  GM advances turn → best-owner applies → assert client B sees the healed resource.
- **A2 — Persistent damage replicates.** Same shape; resource reduced
  (`autoApplyPersistentDamage='enabled'`).
- **A3 — Resolve regain replicates.** Resolve resource increases on turn-start, observed on client B.
- **A4 — Reversion replicates.** `previousTurn()` after a forward step with auto-revert `'enabled'` →
  assert client B sees the resource reverted (exercises `onTurnStartReverted` / `onTurnEndReverted` +
  the `combatPreviousTurn` socket).
- **A5 — System-socket relay (load-bearing).** Advance the turn on a client that is **not** the best
  owner (Player 1 advances while GM 1 is connected); assert the effect is applied **exactly once** by
  the best owner (GM 1) and observed on the Player client. Proves the `system.titan` socket relays the
  `combatNextTurn` hook + computed combatant args — native combat replication alone wouldn't carry
  them. (This is the same scenario as B2, counted once and living in `socket-sync.spec.js`.)

## Section 3 — Plan Group B: Permissions / visibility

- **B1 — Sheet ownership levels.** Set Player 1's ownership on an actor to each of
  NONE / LIMITED / OBSERVER / OWNER; on the player client assert: NONE → cannot open,
  LIMITED → limited sheet, OBSERVER → read-only (no commit succeeds), OWNER → editable. (≈3–4 tests,
  driven through TITAN's `DocumentSheetV2` sheets.)
- **B2 — Best-owner write routing.** The bridge to Group A — identical scenario to A5 (exactly-once
  application with both roles connected, no double-apply). Counted once; implemented as A5.
- **B3 — Compendium ownership.** `fs`-parse `system.json` (Phase 3c style) for the `effects` pack
  `ownership` (`PLAYER: OBSERVER`, `ASSISTANT: OWNER`); assert a Player client resolves OBSERVER and a
  GM resolves OWNER on a pack document.
- **B4 — Auto-open sheet settings.** Set `autoOpenCharacterSheetsGM` (`npcsOnly`/`pcsOnly`/`all`) and
  `autoOpenCharacterSheetsPlayer` (on/off); advance the turn; assert the sheet auto-renders (or not)
  on the role-appropriate client. (≈3 tests.)

## File inventory

**New:**
- `tests/e2e/multiClient.js` — two-client harness.
- `tests/e2e/worldSettings.js` — world-setting set/await/restore.
- `tests/shared/combat.js` — combat + combatant seeding.
- `tests/e2e/socket-sync.spec.js` — A1–A5.
- `tests/e2e/permissions-ownership.spec.js` — B1.
- `tests/e2e/permissions-compendium.spec.js` — B3.
- `tests/e2e/permissions-auto-open.spec.js` — B4.

**Edited:**
- `tests/shared/builders.js` — turn-effect actor builders (fastHealing / persistentDamage /
  resolveRegain).

**Estimate:** ~13–16 new e2e tests → suite lands around **311–314 passing**.

## Risks / open items to settle in the plan (not blocking the design)

1. **Combatant resolution without a token/scene** — verify `Combatant.actor` resolves (so
   `getCharacterCombatants()` returns the actor) when a Combatant is created with `actorId` and no
   token on a scene. If it does not, the combat-seeding helper must place a token on a scene. **This
   is the first plan task.**
2. **World-setting write timing** — confirm `awaitSetting` reliably observes propagation on the
   non-writing client before the action under test runs.
3. **Best-owner determinism** — both clients log in before the action; confirm `game.users` reports
   both `active` on each client so `isCurrentUserBestOwner` resolves consistently (first active GM).

## Working agreements (carry from prior phases)

- Route all `.js` / `.svelte` / `.svelte.js` work through the `titan-svelte-dev` subagent
  (loads `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase`); follow `.claude/CLAUDE.md`
  style. Subagent-driven-development: fresh subagent per task, Sonnet for mechanical work, Opus for
  integration/judgment/bug-fixes; per-task spec + quality review.
- No git worktree — the running Foundry on `:30000` serves THIS directory's built `index.js`. Stay on
  `development`. Rebuild with `npm run build:e2e` after any `src/` edit (test-only edits need no
  build). Build output is gitignored — never `git add` it.
- Any real bug found gets the prior-phase treatment: TDD red→green, fix routed through the subagent,
  logged in `docs/superpowers/e2e-suite-status.md` bug log.
- `packs/effects/` LevelDB churn during runs is runtime noise — leave uncommitted.

## Verify current state quickly on resume

- `npx vitest run` → 35 passing.
- `npm run build:e2e` then `npx playwright test --reporter=list` → 298 passing (Foundry on :30000, or
  the `webServer` config launches it).
