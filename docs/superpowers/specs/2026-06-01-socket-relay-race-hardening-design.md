# Socket-Relay Race Hardening — Design

**Date:** 2026-06-01. **Status:** approved, ready for implementation plan.
**Origin:** Phase 4 open follow-up #1 (see `docs/superpowers/e2e-suite-status.md`, the
"Deferred (optional, Phase 4 outcome)" block and the bug #18 entry).

## Problem

The combat turn-change handlers `src/hooks/OnCombatNextTurn.js` and
`src/hooks/OnCombatPreviousTurn.js` are invoked on **every** client via the `system.titan`
socket relay (`SocketManager.triggerSocketHook`). Because live `Document` instances do not
survive socket JSON-serialization (bug #18), `TitanCombat.nextTurn`/`previousTurn` now emit
the combatant + combat **IDs**, and each handler re-resolves to live documents:

```js
const combat = game.combats.get(combatId);
const current = combat?.combatants.get(currentCombatantId);
const previous = combat?.combatants.get(previousCombatantId);
if (current && previous && combat) { /* apply turn effects */ }
// else: silently does nothing
```

The `system.titan` socket and Foundry's native combat replication are **independent network
paths**. On a congested remote client the socket message can arrive *before* the combat's
embedded-document update has applied, so one of the `.get()` lookups returns `undefined` and
the entire turn-effect apply is **dropped silently** — no log, no trace. This only has a
visible consequence when the dropped client is the single writer (the best-owner; see the
gate note below), but when it bites, a turn's persistent-damage / fast-healing / resolve-regain
apply is lost with no diagnostic.

Probability is **low** — for a plain turn advance the combatants already exist on all clients
(only `combat.turn` changes), and the A1–A5 two-client e2e tests pass through a real
browser-to-browser relay without hitting it. This is defensive hardening against a theoretical
remote race, plus making the failure observable if it ever occurs.

### Single-writer gate (why retry is safe)

The best-owner gate (`isCurrentUserBestOwner`) lives **inside** each
`CharacterDataModel` turn method (`onTurnStart`, `onTurnEnd`, `onInitiativeAdvanced`,
`onInitiativeReverted`, `onTurnStartReverted`, `onTurnEndReverted`) — not in the handler. Every
client runs the handler; only the best-owner client actually writes. Therefore retrying
re-resolution can only change whether a client *succeeds in resolving* — it can never cause a
double-apply, because the single-writer guarantee is downstream and unchanged.

## Design

One new utility, two edited handlers, one new unit test.

### 1. New util — `src/helpers/utility-functions/RetryResolve.js`

A generic, pure, bounded-retry resolver that reuses the existing `Delay.js`:

```js
import delay from '~/helpers/utility-functions/Delay.js';

/**
 * Repeatedly invokes a synchronous resolver until it returns a truthy value or the attempt
 * budget is exhausted, yielding for a fixed delay between attempts. The first attempt runs
 * immediately with no delay, so the success path pays no wall-clock cost.
 * @param {() => *} resolveFn - Synchronous resolver; returns a truthy result on success or a
 * falsy value to trigger a retry.
 * @param {object} [options] - Retry budget.
 * @param {number} [options.attempts] - Maximum number of resolver invocations.
 * @param {number} [options.delayMs] - Milliseconds to wait between attempts.
 * @returns {Promise<*|null>} The first truthy resolver result, or null if the budget is
 * exhausted without one.
 */
export default async function retryResolve(resolveFn, { attempts = 5, delayMs = 50 } = {}) {
   for (let i = 0; i < attempts; i++) {
      const result = resolveFn();
      if (result) {
         return result;
      }
      if (i < attempts - 1) {
         await delay(delayMs);
      }
   }
   return null;
}
```

- **Budget is single-sourced as the helper defaults: 5 attempts × 50 ms (≤ 250 ms worst case).**
  Both handlers call `retryResolve(fn)` with no override, so there is one place to tune.
- The helper is intentionally generic (no Foundry globals, no combat knowledge) — all
  game-state access stays in the handler closures, keeping the helper trivially unit-testable.
- The helper does not swallow exceptions; the handler closures use optional chaining and cannot
  throw, so propagation is a non-issue in practice and we keep the helper simple.

### 2. Edited handlers — `OnCombatNextTurn.js` / `OnCombatPreviousTurn.js`

Each handler wraps its three-way resolution in a closure passed to `retryResolve`. On
exhaustion (`null`), it `warn(...)`s with the IDs and returns — converting today's silent drop
into a diagnosable event. Shape (next-turn shown; previous-turn is structurally identical with
its own variable names):

```js
const context = await retryResolve(() => {
   const combat = game.combats.get(combatId);
   const currentCombatant = combat?.combatants.get(currentCombatantId);
   const previousCombatant = combat?.combatants.get(previousCombatantId);
   return combat && currentCombatant && previousCombatant
      ? { combat, currentCombatant, previousCombatant }
      : null;
});
if (!context) {
   warn(
      'Combat turn-change socket could not re-resolve the combat or its combatants after '
      + 'retrying; turn effects were not applied on this client.',
      combatId,
      currentCombatantId,
      previousCombatantId,
   );
   return;
}
const { combat, currentCombatant, previousCombatant } = context;
// ...existing apply logic unchanged...
```

The body below the guard is unchanged — only the resolution + guard at the top of each handler
is replaced. The existing inner `null`-initiative `warn` and the per-combatant apply loop stay
as-is.

## Testing

### Unit (vitest) — the real coverage

New `tests/unit/RetryResolve.test.js` (flat in `tests/unit/`, matching the existing
utility-function test convention, e.g. `GetApplication.test.js`,
`ResolveDocumentSheetArguments.test.js`). Cases, all deterministic — pass `{ delayMs: 0 }` and
count resolver invocations with a closure counter; no fake timers needed:

1. Resolver truthy on the first call → returns that value; resolver invoked exactly once.
2. Resolver returns `null` twice then a value → returns the value; resolver invoked 3 times.
3. Resolver always `null` → returns `null`; resolver invoked exactly `attempts` times.
4. (Default budget) Calling with no options uses 5 attempts (assert via case 3 with default
   options and an always-`null` resolver: invoked exactly 5 times).

### e2e — no new test

The race cannot be reliably forced across two real browsers, so there is **no** new
race-reproduction e2e test. The existing **A1–A5** socket-sync tests
(`tests/e2e/socket-sync.spec.js`) remain the integration guard: they exercise the happy path
(attempt-1 resolution through a real browser-to-browser relay) and must stay green after the
change. This is an intentional, logged coverage boundary — the unit test covers the retry
mechanism; the e2e suite covers the handler wiring.

## Files

- **New:** `src/helpers/utility-functions/RetryResolve.js`
- **New:** `tests/unit/RetryResolve.test.js`
- **Edit:** `src/hooks/OnCombatNextTurn.js` (resolution + guard at top)
- **Edit:** `src/hooks/OnCombatPreviousTurn.js` (resolution + guard at top)
- **Docs:** mark follow-up #1 done in `docs/superpowers/e2e-suite-status.md`; add the rule
  "re-resolve socket-relayed document IDs with a bounded retry and `warn` on exhaustion — never
  assume the relayed update has already replicated" to the `titan-codebase` conventions
  reference (extends the existing bug-#18 "pass IDs, re-resolve" rule).

## Build & verify

After implementation: `npm run build:e2e`, then `npx vitest run` (expect 35 + new
`RetryResolve` cases) and `npx playwright test` (expect 312 still passing, A1–A5 green).

## Working agreements

- Route all `.js` work through the `titan-svelte-dev` subagent (loads
  `svelte-5`/`foundry-vtt`/`foundry-svelte`/`titan-codebase`); follow `.claude/CLAUDE.md` style
  (120-col, typed params with comments, multi-line conditional scopes).
- Stay on `development`; build output is gitignored — never `git add` `index.js`/`style.css`.
