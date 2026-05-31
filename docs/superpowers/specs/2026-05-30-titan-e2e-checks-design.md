# TITAN E2E — Checks Surface Design

**Date:** 2026-05-30
**Status:** Approved (brainstorm), pending implementation plans
**Builds on:** the Playwright + fast-check logic layer
(`2026-05-30-titan-e2e-logic-layer-design.md`) and the Phase 2a harness.

## Goal

Behavioral coverage that the TITAN check system produces accurate outputs — success counting, critical
handling, expertise optimization, per-type results (damage / damage taken / scaling), the five
`roll<Type>Check` integration paths, the check dialog's option fields, and opposed/cross-actor checks.

## Architecture — two homes, chosen by need

The check result computation is **pure and isolated**: `evaluateCheck()` rolls dice once via
`rollCheckDice(totalDice)` (a single `new Roll('Nd6')`), then `_applyExpertise(dice)` and
`calculate<Type>CheckResults(diceResults, parameters)` are pure functions of `(dice, parameters)`.
Randomness lives only in `rollCheckDice`.

**Engine math → vitest (pure unit + fast-check).** `calculateCheckResults` (`src/check/CheckResults.js`),
the five per-type calculators (`src/check/types/*/[Type]CheckResults.js`), and `_applyExpertise`
(method on `TitanCheck`, `src/check/Check.js`) have no Foundry dependency at module load and are
imported via the `~/` alias straight into vitest. fast-check is already a devDependency and is imported
directly (`import fc from 'fast-check'`) — no browser, no in-page injection. This is the cheapest and
most exhaustive coverage and holds the bulk of the "accurate output" logic.

**Integration / dialog / opposed → Playwright with forced dice.** Real rolls are made deterministic by
stubbing `CONFIG.Dice.randomUniform` (verified live on v14): Foundry maps a d6 face as
`face = 6 - floor(u * 6)`, so to force face `f` return `u = (6.5 - f) / 6`. A known actor + a known
forced-dice sequence yields exactly-assertable `flags.titan.results`. (Alternatives rejected:
independent-oracle on random rolls — cannot assert exact counts; `Roll.evaluate({maximize/minimize})` —
only all-6s/all-1s.)

## The four concerns

### 1. Engine math (vitest + fast-check)

Cover the pure result engine with crafted-input unit tests plus property tests.

`calculateCheckResults(diceResults, parameters)` rules (confirmed against source):
- per die: `final === 6` → `criticalSuccesses++`, `successes += extraSuccessOnCritical ? 2 : 1`; else
  `final >= difficulty` → `successes++`; else `final === 1` → `criticalFailures++`, and if
  `extraFailureOnCritical` then `successes -= 1`.
- when `complexity > 0`: `succeeded = successes >= complexity`; `extraSuccesses = successes - complexity`
  when `successes > complexity`.

`_applyExpertise(dice)` (via `new TitanCheck(params)._applyExpertise(dice)`): when
`extraFailureOnCritical`, spends 1 expertise to lift each `final === 1` to `2`; then for increments
1..5 lifts dice that are exactly `increment` below `difficulty` up to `difficulty` (cost `increment`),
and — if `extraSuccessOnCritical` — lifts dice `increment` below `6` up to `6`; tracks
`expertiseRemaining`.

Per-type calculators:
- **attack** (`calculateAttackCheckResults`): `succeeded` → `damage = parameters.damage +
  parameters.damageMod`, `+ extraSuccesses` if `parameters.plusExtraSuccessDamage`.
- **attribute / resistance** (`damageTaken`): `damageToReduce && !succeeded` →
  `damageTaken = damageToReduce - successes`, else `0`.
- **casting / item**: their `[Type]CheckResults.js` calculators (scaling aspects, item-specific fields)
  — exact fields confirmed when the engine plan is written.

Property-test invariants (fast-check over random dice arrays + parameter combos):
- `successes` equals an independent recomputation from the dice and crit flags.
- `succeeded ⇔ successes >= complexity` (for `complexity > 0`).
- `extraSuccesses === max(0, successes - complexity)`.
- expertise: `expertiseApplied` summed never exceeds `totalExpertise`; every die's `final >= base`; a die
  is only lifted to `difficulty` or `6`.
- attack `damage` is `0` unless `succeeded`; monotonic in `extraSuccesses` when `plusExtraSuccessDamage`.

### 2. Five-type integration (Playwright, forced dice)

One test per check type. Build a known actor (seeding a weapon/spell/ability for attack/casting/item, as
`interaction-rolls.spec.js` does), force a dice sequence via the `forceDice` helper, call the
dialog-bypassing API (`rollAttributeCheck`, `rollResistanceCheck`, `rollAttackCheck`,
`rollCastingCheck`, `rollItemCheck`), read the newest chat message, and assert
`flags.titan.type` and the exact `flags.titan.results` (successes, succeeded, and type-specific fields
such as `damage`) computed for the forced dice and the parameters the system assembled. Because the
forced faces and `flags.titan.parameters` (`difficulty`, `totalDice`, `totalExpertise`) are both known,
expected results are computed exactly in the test.

### 3. Check dialog option UI (Playwright)

The check dialogs (`src/check/dialog/` + per-type `dialog/`) expose option fields — difficulty,
complexity, expertise mod, dice mod, double expertise/training. Test that setting these fields flows
into the check `parameters` and changes `results`. **Open exploration (resolved in the 2b-3 plan):** how
to open a check dialog programmatically (the `roll<Type>Check` actor APIs bypass it) and which
sheet/control or method triggers the dialog path.

### 4. Opposed / cross-actor checks (Playwright, forced dice)

Attack check vs a target actor's Defense, and resistance vs incoming damage. Build attacker + target
actors (GM owns both), set known stats, force dice, and assert the attack/resistance result accounts for
the opposing stat. **Open exploration (resolved in the 2b-4 plan):** how `AttackCheckParameters` reads
the target's Defense (target selection vs explicit option) and the resistance-vs-damage entry point.

## Decomposition into plans

Four ordered plans, each independently runnable and verified before the next:

1. **2b-1 checks-engine** — vitest unit + fast-check for the base calculator, the five type calculators,
   and `_applyExpertise`. Pure, no Foundry. First; de-risks all downstream work.
2. **2b-2 checks-integration** — the `forceDice` helper, actor/item builders, and one forced-dice
   Playwright test per check type.
3. **2b-3 checks-dialog** — the dialog option fields → parameters → results (gathers the dialog-trigger
   API first).
4. **2b-4 checks-opposed** — attack-vs-Defense and resistance-vs-damage (gathers the target-mechanics
   API first).

The spec fully specifies 2b-1 and 2b-2 at plan time (APIs confirmed); 2b-3 and 2b-4 gather their
remaining APIs when their plans are written.

## File layout

```
tests/
  unit/check/
    calculate-check-results.test.js   # base engine, crafted inputs + fast-check
    apply-expertise.test.js           # expertise optimizer, crafted inputs + fast-check
    type-results.test.js              # 5 per-type calculators (damage, damageTaken, scaling, item)
  e2e/
    dice.js                           # forceDice(page, faces): stubs CONFIG.Dice.randomUniform
    logic/
      checks.spec.js                  # 2b-2: 5-type integration, forced dice
      checks-dialog.spec.js           # 2b-3: dialog options
      checks-opposed.spec.js          # 2b-4: cross-actor
  shared/
    builders.js                       # extended: known-stat actors + weapon/spell/ability fixtures
```

## Determinism helper contract

`tests/e2e/dice.js` exports `forceDice(page, faces)`: installs a `CONFIG.Dice.randomUniform` stub that
returns `(6.5 - faces[i]) / 6` for each successive die, so the next `faces.length` d6 results are exactly
`faces`. Also exports a reset so each test restores the original RNG in `afterEach`. The mapping
`face = 6 - floor(u * 6)` was confirmed live on Foundry 14.363.

## Risks / notes

- **Per-type parameter assembly** (how each `roll<Type>Check` derives `totalDice` / `totalExpertise` /
  `difficulty` from actor stats) is read from `flags.titan.parameters` at assertion time, so the
  integration tests verify plumbing without hard-coding the derivation formula — robust to balance
  tweaks.
- **Forced-dice ordering:** `rollCheckDice` sorts dice descending before returning, and `_applyExpertise`
  mutates `final`; the integration tests assert on `flags.titan.results` (post-sort, post-expertise), and
  compute expectations the same way, so sort order is not a source of flakiness.
- **fast-check in vitest** needs no injection harness — it is a direct import. The Phase 2a in-page
  injection (`injectFastCheck`) remains only for surfaces that require the live actor (e.g. rules-element
  stacking).
- 2b-3 and 2b-4 carry explicit open-exploration items; their plans must resolve those before coding.
