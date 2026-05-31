# TITAN E2E Test Suite — Design

**Date:** 2026-05-30
**Status:** Approved (brainstorm), pending implementation plan

## Goal

Behavioral end-to-end coverage for every testable surface in the TITAN system — rules elements,
checks, conditions, traits, buttons, and inputs — runnable from plain scripts (like `build`/`dev`)
with no agent in the loop, and exercising the four dedicated multi-user identities for permission
and socket-sync correctness.

"Behavioral (deep)" is the standard: tests assert the *actual effect* (a `flatModifier` moves a
derived stat by the exact delta; a button commits damage to the actor; an input persists to the
document path), not merely that a surface renders.

## Architecture — two layers, one signal

| Layer | Tool | Runs | Owns |
|---|---|---|---|
| **Logic** | Quench (in-client Mocha/Chai) | inside Foundry's JS runtime | rules-element math, check-result computation, condition effects, trait data-model logic |
| **UI + multi-user** | Playwright | drives the browser | reusable component behavior (buttons/inputs), sheet/dialog wiring, permission matrix, two-client socket sync |

Each tool does what it is best at: Quench has direct JS access to data models (fast, precise math
assertions); Playwright drives real DOM and can open multiple browser contexts (the only way to test
permissions and socket mirroring, since Foundry permits one live session per user).

A single Playwright spec (`quench-runner.spec.js`) logs in, calls `game.quench.runAllBatches()`,
scrapes the pass/fail counts, and **fails the Playwright run if any Quench test failed** — so
`npm run test:e2e` is one command and one signal for both layers.

Quench is already wired (`src/index.js:32` → `registerQuenchTests()`) and is inert unless the Quench
module is installed and enabled in the world. **Precondition:** the test world must have Quench
installed/enabled for the logic layer to run.

## The "every button / every input" strategy — two tiers

Exhaustive per-instance enumeration would be hundreds of brittle tests. The system has ~15 reusable
button components and ~25 reusable input/select components (`src/helpers/svelte-components/`). So:

1. **Component tier** (Playwright, behavioral): test each *reusable* component once against a probe
   harness — `NumberInput` persists an integer to a bound path, `ToggleButton` flips a boolean,
   every `*Select` writes the chosen option, every `*Button` fires its handler. ~40 focused tests
   prove the *mechanism*.
2. **Integration tier** (Playwright, data-driven): per sheet, a manifest lists
   `{ selector, action, expectedDocPath, expectedValue }` rows; one parametrized test drives them
   all. Adding a sheet = adding manifest rows, not new test code.

### `data-testid` enabler (bounded)

The wrappers currently expose no stable selectors. Add an optional `testId` prop to the ~40 reusable
button/input wrappers, applied as `data-testid` on the root element. Component-tier tests set it via
a probe; integration-tier annotates only high-value instances as manifests grow. No big-bang
annotation pass.

## Coverage map

| Surface | Count | Layer | Assertion |
|---|---|---|---|
| Rules elements | 8 ops | Quench | apply RE → derived stat / check / resource changes by the exact expected delta |
| Checks | 5 types | Quench | computed result fields (dice, expertise, success, damage) correct |
| Conditions | 11 | Quench | each condition's mechanical effect; descriptive-only ones → applied + flagged |
| Traits (logic) | custom / armor / weapon | Quench | trait alters derived data / check parameters |
| Traits (dialogs) | add / edit / delete | Playwright | dialog persists **and** re-renders (absorbs the current regression test) |
| Buttons | ~15 components + instances | Playwright | component fires handler & produces documented effect; instances wired |
| Inputs | ~25 components + instances | Playwright | component persists value to bound doc path; instances wired |
| Permissions | 4 users | Playwright | ownership / visibility matrix across GM/Player identities |
| Socket sync | 2 clients | Playwright | turn effects, fast healing, persistent damage, resolve regain mirror across GM + Player contexts |

The 8 rules-element operations: `flatModifier`, `mulBase`, `fastHealing`, `persistentDamage`,
`turnMessage`, `rollMessage`, `conditionalRatingModifier`, `conditionalCheckModifier`
(`CharacterDataModel.js` apply switch, ~line 800). The 5 checks: attribute, resistance, attack,
casting, item. The 11 conditions live in `src/system/Conditions.js`.

## Shared fixture builders

A single source of truth — `tests/shared/builders.js` — exporting **pure functions that return
`Document.create` payloads** (data, not live documents): `buildRulesElementActorData(op, params)`,
`buildConditionedActorData(conditionId)`, `buildTraitItemData(...)`, etc. Plain data crosses both
boundaries cleanly — Quench imports the builder and calls `Document.create` in-runtime; Playwright
passes the returned data object into `page.evaluate` and calls `Document.create` there. Known
expected values live alongside in `tests/shared/fixtureConstants.js`. This eliminates the current
inline-everything duplication (e.g. the hand-copied item-check template in `interaction-rolls.spec.js`).

Decision: builders return **data**, never live documents — portable across both layers and the
Node↔runtime process boundary.

## Test users and login

`tests/e2e/users.js` holds the four dedicated identities as typed constants:

- GM: `E2E GM 1`, `E2E GM 2`
- Player: `E2E Player 1`, `E2E Player 2`

`login(page, user)` (in `fixtures.js`) gains an explicit `user` argument; the **default becomes
`E2E GM 1`, never `Gamemaster`**, so the suite can never evict the developer's own session. The
`FOUNDRY_USER` env var still overrides. The users have no passwords, so login skips the password
field.

## Multi-user orchestration (Playwright)

`tests/e2e/multi-user.js` exposes `withUsers([userA, userB], async (pages) => { … })`, which opens
**one browser context per user** (separate session satisfies Foundry's one-session-per-user rule),
logs each in, runs the body, and tears the contexts down.

- **Permission matrix** (`permissions.spec.js`): create actors with set ownership; assert each
  identity's allowed/denied operations and document visibility (a Player can roll their own actor
  but not edit another's; a GM sees hidden info a Player cannot; socket-routed actions succeed
  cross-user).
- **Socket sync** (`socket-sync.spec.js`): the GM context performs an action (advance a combat turn,
  apply fast healing / persistent damage / resolve regain); assert the Player context observes the
  mirrored result (chat message / actor resource) within a timeout.

## Runner scripts (the "like build/dev" deliverable)

`playwright.config.mjs` gains a `webServer` block:

```js
webServer: {
   command: 'node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata',
   cwd: 'C:/FoundryVTT/V14/dev',
   url: 'http://localhost:30000',
   reuseExistingServer: true,
   timeout: 120_000,
}
```

This is exactly "check if up, else launch": `reuseExistingServer: true` uses an already-running
Foundry (and never kills it); otherwise it boots the server directly via `node` (no UAC elevation,
unlike `run.bat`) and waits for `:30000`.

npm scripts:

- `test:e2e` — full Playwright suite (includes the Quench-runner bridge). Default user `E2E GM 1`.
- `test:e2e:headed` / `test:e2e:ui` — headed run / Playwright UI mode for debugging.
- `test:e2e:quench` — run only `quench-runner.spec.js` (logic layer alone).
- Tag-filtered per-category: `test:e2e:rules`, `:conditions`, `:traits`, `:buttons`, `:inputs`,
  `:permissions`, `:socket` — each `playwright test --grep @tag`.

Optional thin `.bat` wrappers can mirror the existing `claude_new.bat` style for double-click runs.

## File layout

```
tests/
  shared/
    builders.js            # data-returning fixture builders (used by BOTH layers)
    fixtureConstants.js    # the known values assertions check against
  e2e/
    fixtures.js            # existing — extend to login(page, user)
    users.js               # the 4 users + roles
    multi-user.js          # withUsers([...]) multi-context helper
    manifests/
      buttons.manifest.js
      inputs.manifest.js
    quench-runner.spec.js  # triggers game.quench.runAllBatches(), unifies signal
    components.spec.js      # component tier: each reusable button/input once
    traits.spec.js         # add/edit/delete dialogs (absorbs trait-add-custom.spec.js)
    buttons.spec.js        # integration tier (manifest-driven)
    inputs.spec.js         # integration tier (manifest-driven)
    permissions.spec.js    # multi-user permission matrix
    socket-sync.spec.js    # two-client socket mirroring
src/quench/
  RegisterQuenchTests.js   # existing — slimmed to a thin registrar
  batches/
    rules-elements.batch.js
    checks.batch.js
    conditions.batch.js
    traits.batch.js
```

## Phasing

Each phase is independently runnable and verified before the next begins.

1. **Foundation** — `login(page, user)` + `users.js`, shared builders + constants, `webServer` +
   npm scripts, the quench-runner bridge, and the `testId` prop on the reusable wrappers. Smallest
   slice; unblocks everything.
2. **Logic layer (Quench)** — rules-elements → checks → conditions → traits batches.
3. **UI layer (Playwright)** — component tier (`components.spec.js`) → integration manifests
   (`buttons`/`inputs`) → trait dialogs (`traits.spec.js`, absorbing the existing
   `trait-add-custom.spec.js`).
4. **Multi-user (Playwright)** — permissions → socket-sync.

## Notes / out of scope

- The first vertical slice (`tests/e2e/trait-add-custom.spec.js`) already exists and passes; it
  caught and verified the fix for the custom-trait in-place-mutation reactivity bug (add/edit/delete
  across items and effects). It becomes part of Phase 3's `traits.spec.js`.
- The effect inline-`check` add/delete paths in `TitanActiveEffect.js` (~lines 129/159) carry the
  same in-place-mutation antipattern and should be fixed in a follow-up; Phase 2's `checks` /
  `traits` batches will surface it if not.
- A general convention emerged worth recording in the `titan-codebase` skill: **never mutate a live
  `document.system.*` array in place before `update()` — it defeats the `ReactiveDocument`
  change-detection and the sheet never re-renders; always build a fresh array.**
