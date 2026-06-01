# Socket-Relay Race Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the two combat turn-change socket handlers so a socket message that beats Foundry's native combat replication retries re-resolution (bounded) instead of silently dropping the turn-effect apply, and warns if it ultimately fails.

**Architecture:** Add a generic, pure `retryResolve(resolveFn, { attempts, delayMs })` utility (reusing the existing `Delay.js`). Both `OnCombatNextTurn.js` and `OnCombatPreviousTurn.js` wrap their ID→document re-resolution in a closure passed to `retryResolve`; on exhaustion they `warn` and return. The downstream best-owner write gate is unchanged, so retry cannot cause a double-apply.

**Tech Stack:** JavaScript (ES modules, `~/` Vite alias → `src/`), Foundry VTT v14, vitest (happy-dom) for the unit test, Playwright for the existing e2e integration guard.

**Spec:** `docs/superpowers/specs/2026-06-01-socket-relay-race-hardening-design.md`

**Working agreements:** Route all `.js` work through the `titan-svelte-dev` subagent (loads `svelte-5`/`foundry-vtt`/`foundry-svelte`/`titan-codebase`). Follow `.claude/CLAUDE.md` style (120-col wrap, multi-line conditional scopes, typed params with single-line comments, multi-line JSDoc on functions). Stay on `development`. Build output (`index.js`, `style.css`) is gitignored — never `git add` it.

---

## File Structure

- **Create** `src/helpers/utility-functions/RetryResolve.js` — the generic bounded-retry resolver. One responsibility: invoke a synchronous resolver until truthy or budget exhausted.
- **Create** `tests/unit/RetryResolve.test.js` — vitest unit coverage for the resolver (flat in `tests/unit/`, matching the `GetApplication.test.js` / `ResolveDocumentSheetArguments.test.js` convention).
- **Modify** `src/hooks/OnCombatNextTurn.js` — replace the top-of-handler resolution with a `retryResolve` closure + warn-on-exhaustion guard.
- **Modify** `src/hooks/OnCombatPreviousTurn.js` — same change, mirrored variable names.
- **Modify** `docs/superpowers/e2e-suite-status.md` — mark follow-up #1 done.
- **Modify** `.claude/skills/titan-codebase/references/data-flow.md` — note the bounded-retry re-resolution.

---

## Task 1: `retryResolve` utility (TDD)

**Files:**
- Create: `src/helpers/utility-functions/RetryResolve.js`
- Test: `tests/unit/RetryResolve.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/RetryResolve.test.js`. (`vitest.config.mjs` sets `globals: true`, so `describe`/`it`/`expect` are global — no imports for them. All cases pass `delayMs: 0` and count resolver calls with a closure counter, so they are fully deterministic with no fake timers.)

```js
import retryResolve from '~/helpers/utility-functions/RetryResolve.js';

describe('retryResolve', () => {
   it('returns the first truthy result without retrying', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return 'ok';
      }, { delayMs: 0 });
      expect(result).toBe('ok');
      expect(calls).toBe(1);
   });

   it('retries until the resolver returns a truthy value', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return calls >= 3 ? 'ok' : null;
      }, { delayMs: 0 });
      expect(result).toBe('ok');
      expect(calls).toBe(3);
   });

   it('returns null after exhausting the attempt budget', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return null;
      }, { attempts: 4, delayMs: 0 });
      expect(result).toBeNull();
      expect(calls).toBe(4);
   });

   it('defaults to 5 attempts when no attempt budget is provided', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return null;
      }, { delayMs: 0 });
      expect(result).toBeNull();
      expect(calls).toBe(5);
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/RetryResolve.test.js`
Expected: FAIL — module `~/helpers/utility-functions/RetryResolve.js` cannot be resolved (file does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/helpers/utility-functions/RetryResolve.js`:

```js
import delay from '~/helpers/utility-functions/Delay.js';

/**
 * Repeatedly invokes a synchronous resolver until it returns a truthy value or the attempt budget is
 * exhausted, yielding for a fixed delay between attempts. The first attempt runs immediately with no
 * delay, so the success path pays no wall-clock cost.
 * @param {() => *} resolveFn - Synchronous resolver; returns a truthy result on success, or a falsy value
 * to trigger a retry.
 * @param {object} [options] - The retry budget.
 * @param {number} [options.attempts] - Maximum number of resolver invocations.
 * @param {number} [options.delayMs] - Milliseconds to wait between attempts.
 * @returns {Promise<*|null>} The first truthy resolver result, or null if the budget is exhausted without
 * one.
 */
export default async function retryResolve(resolveFn, { attempts = 5, delayMs = 50 } = {}) {
   for (let i = 0; i < attempts; i++) {
      // The current resolution attempt's result.
      const result = resolveFn();
      if (result) {
         return result;
      }

      // Yield before the next attempt, but never after the final one.
      if (i < attempts - 1) {
         await delay(delayMs);
      }
   }

   return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/RetryResolve.test.js`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/utility-functions/RetryResolve.js tests/unit/RetryResolve.test.js
git commit -m "feat(combat): add retryResolve bounded-retry utility"
```

---

## Task 2: Wire both combat turn handlers

**Files:**
- Modify: `src/hooks/OnCombatNextTurn.js` (full rewrite below)
- Modify: `src/hooks/OnCombatPreviousTurn.js` (full rewrite below)

Both handlers replace ONLY the top-of-handler resolution + outer `if (… && … && combat)` wrapper with a `retryResolve` closure and an early-return warn guard. The apply logic below the guard is unchanged (de-indented one level now that the wrapping `if` is gone). Full file contents are given to avoid de-indent ambiguity.

- [ ] **Step 1: Rewrite `src/hooks/OnCombatNextTurn.js`**

```js
import retryResolve from '~/helpers/utility-functions/RetryResolve.js';
import warn from '~/helpers/utility-functions/Warn.js';

/**
 * Called when combat advances from one turn to the next turn.
 * @param {string} currentCombatantId - The ID of the Combatant whose turn it currently is.
 * @param {string} previousCombatantId - The ID of the Combatant whose turn it previously was.
 * @param {string} combatId - The ID of the Combat that just advanced a turn.
 */
export default async function onCombatNextTurn(currentCombatantId, previousCombatantId, combatId) {
   // The socket relay delivers IDs (live document instances do not survive serialization), and the
   // socket can beat Foundry's native combat replication on a congested client, so re-resolve to live
   // documents with a bounded retry before use.
   const context = await retryResolve(() => {
      // The live combat and its two relevant combatants, re-resolved from the relayed IDs.
      const combat = game.combats.get(combatId);
      const currentCombatant = combat?.combatants.get(currentCombatantId);
      const previousCombatant = combat?.combatants.get(previousCombatantId);
      return combat && currentCombatant && previousCombatant
         ? { combat, currentCombatant, previousCombatant }
         : null;
   });

   // If re-resolution failed after retrying, the relayed update never replicated on this client; warn so
   // the dropped apply is diagnosable rather than silent, then bail.
   if (!context) {
      warn(
         'Combat next-turn socket could not re-resolve the combat or its combatants after retrying; '
         + 'turn effects were not applied on this client.',
         combatId,
         currentCombatantId,
         previousCombatantId,
      );
      return;
   }

   // The re-resolved live documents.
   const { combat, currentCombatant, previousCombatant } = context;

   // Handle Initiative based effects.
   const currentInitiative = currentCombatant.initiative;
   const previousInitiative = previousCombatant.initiative;

   // Ensure that the combatants have initiative set.
   if (currentInitiative === null || previousInitiative === null) {
      warn(
         'Current or Previous combatant had an Initiative of null. Initiative based effects will not function.',
         currentCombatant,
         previousCombatant,
      );
   }
   else {
      // Calculate whether this is a new round.
      const isNewRound = currentInitiative > previousInitiative;

      // For each character combatant.
      for (const combatant of combat.getCharacterCombatants()) {

         // Update initiative based effects on the character.
         const actor = combatant?.actor;
         if (actor) {
            await actor.system.onInitiativeAdvanced(currentInitiative, previousInitiative, isNewRound);
         }
      }
   }

   // Perform end of turn updates for the previous character.
   const previousCharacter = previousCombatant.actor;
   if (previousCharacter && previousCharacter.system.isCharacter) {
      await previousCharacter.system.onTurnEnd();
   }

   // Start of turn operations for current combatant.
   const currentCharacter = currentCombatant?.actor;
   if (currentCharacter && currentCharacter.system.isCharacter) {
      await currentCharacter.system.onTurnStart();
   }
}
```

- [ ] **Step 2: Rewrite `src/hooks/OnCombatPreviousTurn.js`**

```js
import retryResolve from '~/helpers/utility-functions/RetryResolve.js';
import warn from '~/helpers/utility-functions/Warn.js';

/**
 * Called when combat retreats from the current turn to the previous turn.
 * @param {string} restoredCombatantId - The ID of the Combatant whose turn has been restored as current.
 * @param {string} displacedCombatantId - The ID of the Combatant whose turn was displaced.
 * @param {string} combatId - The ID of the Combat that just retreated a turn.
 */
export default async function onCombatPreviousTurn(restoredCombatantId, displacedCombatantId, combatId) {
   // The socket relay delivers IDs (live document instances do not survive serialization), and the
   // socket can beat Foundry's native combat replication on a congested client, so re-resolve to live
   // documents with a bounded retry before use.
   const context = await retryResolve(() => {
      // The live combat and its two relevant combatants, re-resolved from the relayed IDs.
      const combat = game.combats.get(combatId);
      const restoredCombatant = combat?.combatants.get(restoredCombatantId);
      const displacedCombatant = combat?.combatants.get(displacedCombatantId);
      return combat && restoredCombatant && displacedCombatant
         ? { combat, restoredCombatant, displacedCombatant }
         : null;
   });

   // If re-resolution failed after retrying, the relayed update never replicated on this client; warn so
   // the dropped apply is diagnosable rather than silent, then bail.
   if (!context) {
      warn(
         'Combat previous-turn socket could not re-resolve the combat or its combatants after retrying; '
         + 'turn effects were not reverted on this client.',
         combatId,
         restoredCombatantId,
         displacedCombatantId,
      );
      return;
   }

   // The re-resolved live documents.
   const { combat, restoredCombatant, displacedCombatant } = context;

   // Handle Initiative based effects.
   const restoredInitiative = restoredCombatant.initiative;
   const displacedInitiative = displacedCombatant.initiative;

   // Ensure that the combatants have initiative set.
   if (restoredInitiative === null || displacedInitiative === null) {
      warn(
         'Restored or Displaced combatant had an Initiative of null. Initiative based effects will not function.',
         restoredCombatant,
         displacedCombatant,
      );
   }
   else {
      // Compute the forward-step parameters: the step that is being reversed went from restoredInitiative
      // to displacedInitiative, so pass those as currentInitiative and previousInitiative respectively.
      // This ensures the same filter selects the same effects that were decremented in the forward step.
      const forwardIsNewRound = displacedInitiative > restoredInitiative;

      // For each character combatant, revert initiative based effects.
      for (const combatant of combat.getCharacterCombatants()) {
         const actor = combatant?.actor;
         if (actor) {
            await actor.system.onInitiativeReverted(displacedInitiative, restoredInitiative, forwardIsNewRound);
         }
      }
   }

   // Revert end-of-turn effect duration changes for the restored combatant.
   const restoredCharacter = restoredCombatant.actor;
   if (restoredCharacter && restoredCharacter.system.isCharacter) {
      await restoredCharacter.system.onTurnEndReverted();
   }

   // Revert start-of-turn effect duration changes for the displaced combatant.
   const displacedCharacter = displacedCombatant?.actor;
   if (displacedCharacter && displacedCharacter.system.isCharacter) {
      await displacedCharacter.system.onTurnStartReverted();
   }
}
```

> **NOTE:** the apply/revert logic below the guard is byte-for-byte the original — only the
> top-of-handler resolution and the wrapping `if` were replaced. The final block reverts
> start-of-turn changes for the displaced combatant via `onTurnStartReverted()` (the
> previous-turn handler's end-vs-start pairing is intentionally crossed; preserve it as-is).

- [ ] **Step 3: Build the e2e bundle**

Run: `npm run build:e2e`
Expected: build completes with no errors (the live Foundry on :30000 serves the rebuilt `index.js`).

- [ ] **Step 4: Run the unit suite**

Run: `npx vitest run`
Expected: PASS — 35 prior tests + the 4 new `RetryResolve` tests, all green.

- [ ] **Step 5: Run the e2e suite (integration guard)**

Run: `npx playwright test --reporter=list`
Expected: PASS — 312 passing. In particular the socket-sync `A1`–`A5` tests in `tests/e2e/socket-sync.spec.js` must stay green (they exercise the happy path, attempt-1 resolution, through a real browser-to-browser relay).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/OnCombatNextTurn.js src/hooks/OnCombatPreviousTurn.js
git commit -m "fix(combat): retry socket re-resolution, warn instead of silent drop"
```

---

## Task 3: Documentation

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: `.claude/skills/titan-codebase/references/data-flow.md`

- [ ] **Step 1: Update the e2e status doc**

In `docs/superpowers/e2e-suite-status.md`, edit the "Open follow-ups" block (currently near line 447). Change item (1) from an open follow-up to DONE, citing this spec/plan and the new util. Concretely, in the bullet that reads:

> **Open follow-ups (optional, both need user go-ahead …):** (1) harden the bug-#18 socket relay against a theoretical remote race …; (2) make the effect-duration INPUTS reactive …

remove clause (1) and replace it with a one-line DONE note, leaving (2) as the sole remaining follow-up. Add a short entry under the Phase 4 "Reusable findings" (or a new note) recording: "Socket-relay re-resolution now retries (bounded, 5×50ms via `retryResolve`) and `warn`s on exhaustion instead of dropping silently — see `RetryResolve.js` + spec `2026-06-01-socket-relay-race-hardening-design.md`." Also update the doc's top-line **Next action** if it still references this as queued.

- [ ] **Step 2: Update the codebase data-flow reference**

In `.claude/skills/titan-codebase/references/data-flow.md`, section "3. Hook handler — `onCombatNextTurn`" (currently near line 225-228), extend the sentence that reads "… and immediately re-resolves them to live documents via `game.combats.get` / `combat.combatants.get` before use." to note the bounded retry, e.g.:

> The handler receives `(currentCombatantId, previousCombatantId, combatId)` and re-resolves them to live documents via `game.combats.get` / `combat.combatants.get` using a bounded retry (`retryResolve`, 5 attempts × 50 ms) — because the `system.titan` socket and Foundry's native combat replication are independent network paths, the relayed update may not have replicated yet on a congested client. On exhaustion it `warn`s and bails rather than silently dropping the apply. The same pattern applies to `onCombatPreviousTurn`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase/references/data-flow.md
git commit -m "docs(combat): record socket re-resolution bounded retry"
```

---

## Self-Review (completed)

**Spec coverage:** util (Task 1) ✓; both handlers wired with warn-on-exhaustion (Task 2) ✓; budget single-sourced as helper defaults 5×50ms (Task 1 Step 3 + tested in Task 1 Step 1 case 4) ✓; unit-test-only coverage + A1–A5 e2e as integration guard (Task 1, Task 2 Steps 4–5) ✓; docs update incl. conventions/data-flow (Task 3) ✓.

**Placeholder scan:** no TBD/TODO; all code blocks complete and directly usable. Both handler rewrites are full file contents (no de-indent ambiguity).

**Type consistency:** util signature `retryResolve(resolveFn, { attempts = 5, delayMs = 50 } = {})` is identical across the test, the implementation, and both call sites. Both handlers destructure the exact keys their closures return (`{ combat, currentCombatant, previousCombatant }` / `{ combat, restoredCombatant, displacedCombatant }`). Import path `~/helpers/utility-functions/RetryResolve.js` consistent everywhere.
