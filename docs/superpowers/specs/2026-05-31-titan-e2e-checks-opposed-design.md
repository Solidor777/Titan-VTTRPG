# TITAN E2E — 2b-4 Checks-Opposed Design

**Date:** 2026-05-31
**Status:** Approved (brainstorm), pending implementation plan
**Resolves:** the open-exploration item for concern 4 (opposed / cross-actor checks) in
`2026-05-30-titan-e2e-checks-design.md` — specifically *how a selected target's Defense reaches
`AttackCheckParameters`*.
**Builds on:** 2b-2 checks-integration (forced dice, roller fixture, oracle) and 2b-3 checks-dialog.

## Goal

Prove the TITAN attack-check *opposed-difficulty* mechanic: when the user has a target, the attack's
difficulty is computed from the **target's Defense rating**, not the attacker's own rating. Concretely,
cover the target branch and fallback branch of `initializeAttackCheckOptions` and the difficulty formula
in `getAttackCheckParameters`.

## Key findings (resolve the open question)

The auto-populate path is short and isolated:

- `getTargetedCharacters()` (`src/helpers/utility-functions/GetTargetedCharacters.js`) →
  `getTargetedTokens()` → `Array.from(game.user.targets)`, then filters `target.actor?.system.isCharacter`
  and returns the `target.actor` array.
- `initializeAttackCheckOptions` (`CharacterDataModel.js:2317`), when `options.targetDefense === undefined`
  (lines 2497-2508): if `getTargetedCharacters()` is non-empty, sets
  `checkOptions.targetDefense = targets[0].system.getRollData().rating.defense.value`; otherwise falls back
  to `attackerMelee` (melee) or `attackerAccuracy` (ranged).
- `getAttackCheckParameters` (`:2681`) then computes
  `difficulty = clamp(targetDefense − attackerRating + 4, 2, 6)` (`:2711`).
- **The bypass `rollAttackCheck` API** (`:2209`) calls `initializeAttackCheckOptions` at `:2219`, so it
  reaches the auto-populate **without** the dialog or request flow. 2b-4 needs neither a dialog nor the
  canvas.
- `User#targets` is a plain own-property on the user instance (assigned in the constructor), **not** a
  getter, so a test can temporarily reassign it.

## Approach — fake target set (cheapest real case)

We are **not** testing Foundry's targeting UI — only what TITAN does *given* a target. So skip the canvas,
scene, and PIXI entirely:

1. Build a **real** TITAN character actor as the target (real `getRollData().rating.defense.value`).
2. In `page.evaluate`, save `game.user.targets` and reassign it to
   `new Set([{ actor: targetActor }])` — a minimal shape carrying exactly what `getTargetedCharacters()`
   reads (`.actor.system.isCharacter`, `.actor.system.getRollData()`).
3. Roll via the existing bypass `rollAttackCheck({ itemId, attackIdx })` with `targetDefense` left
   `undefined`.
4. Read the newest chat message's `flags.titan.parameters` and assert `targetDefense` and `difficulty`.
5. Restore the original `game.user.targets` in `afterEach`.

Rejected alternatives: real canvas mouse/PIXI targeting (flakiest, tests Foundry not TITAN, no other test
uses canvas input); a drawn-scene + `token.setTarget` (more setup cost for no extra TITAN coverage).

## Fixture

- **Attacker:** the existing `buildE2ERollerActorData` roller (already carries a weapon with an attack).
- **Target:** a character actor whose Defense rating is **deliberately offset** from the roller's attacker
  rating, so the targeted difficulty is distinguishable from the fallback's 4. Implemented as a new
  `buildE2ETargetActorData` (or a Defense-offsetting rules element following the existing
  `buildFlatModifierAbilityData` pattern). Exact stats chosen so cases 1 and 2 below hit the intended
  difficulties.
- **Read-don't-hardcode:** the test reads `targetDefense` (target's
  `getRollData().rating.defense.value`) and `attackerRating` (the roller's melee/accuracy per the weapon's
  type) from the live actors, then asserts `difficulty === clamp(targetDefense − attackerRating + 4, 2, 6)`
  — robust to rating-formula internals and balance tweaks.

## Tests — `tests/e2e/checks-opposed.spec.js`

1. **Targeted, interior difficulty** — target Defense offset to land an interior result (3 or 5). Assert
   `parameters.targetDefense === target Defense` and `parameters.difficulty === clamp(...)`. This is the
   opposed mechanic proven against the fallback. Force dice for this case and additionally run the
   `expectedCheckResults` oracle to confirm the full pipeline holds at a non-4 difficulty.
2. **Targeted, clamp boundary** — large offset so difficulty pins to 2 and/or 6, proving the `clamp`.
   Assert `parameters.difficulty` equals the clamped bound. (No dice needed — parameter assertion only.)
3. **First-target-wins** — target set with two `{ actor }` entries; assert difficulty uses `targets[0]`'s
   Defense (documents the `targets[0]` selection for "given a target(s)").
4. **No-target fallback** — empty target set → `targetDefense` falls back
   (`melee→attackerMelee` / `ranged→attackerAccuracy`) → `difficulty === 4`. Asserts
   `parameters.targetDefense === attackerRating`. As `E2E GM 1` with no active scene,
   `getControlledTokens()` is empty, so the GM controlled-token branch in `getTargetedCharacters()` cannot
   leak a target — the test asserts the empty set up front to make this explicit.

## Reuse

`forceDice`/`resetDice` (`tests/e2e/dice.js`), `expectedCheckResults` (`tests/shared/checkOracle.js`),
`buildE2ERoller*` (`tests/shared/builders.js`). New: `buildE2ETargetActorData` in `builders.js`.

## Scope explicitly excluded (YAGNI)

- Real canvas / mouse targeting.
- The dialog `targetDefense` flow-through (already covered by 2b-3's attack clamp-to-6 test).
- A full melee-vs-ranged fallback matrix (one fallback case suffices; the targeted path is
  type-independent).
- Resistance-vs-damage (the parent spec's other half of concern 4): the roller/oracle already exercise
  `damageTaken` in the engine unit tests and 2b-2; an opposed resistance entry point is not part of this
  plan. If desired later it gets its own follow-up, recorded in the backlog.

## Verification

- `npx vitest run` → unchanged (35 passing).
- `npx playwright test tests/e2e/checks-opposed.spec.js --reporter=list` → 4 passing, plus the existing
  suite (`…/checks-integration.spec.js …/checks-dialog.spec.js` etc.) still green.
- No `pageerror` during any roll window.
