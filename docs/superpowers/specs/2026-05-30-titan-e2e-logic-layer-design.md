# TITAN E2E — Logic-Layer Design (Playwright + fast-check)

**Date:** 2026-05-30
**Status:** Approved (brainstorm), pending implementation plan
**Supersedes:** the Quench logic-layer of `2026-05-30-titan-e2e-suite-design.md`. The Foundation,
UI-tier, and multi-user portions of that spec stand unchanged.

## Why this revision

The original suite spec placed the entire logic layer (rules-element math, check results, conditions,
trait logic) in **Quench** (in-client Mocha/Chai). Verification on the live system found Quench 0.10.0
is **broken for headless runs on Foundry v14**:

- Quench moved from `game.quench` (v13) to `globalThis.quench` (v14), and `runAllBatches()` was
  renamed `runBatches("**")`.
- `runBatches()` returns a Mocha `Runner` but executes **0 tests**: it wraps each batch in
  `describe(\`${key}_root\`, async function(){ await batch.fn(context) })`, and Mocha does not await
  async `describe` callbacks, so the nested `it()`s register a microtask after Mocha has already built
  its suite tree. It also `await this.app.clear()`s its `QuenchResults` UI app first; v14's
  ApplicationV2/render timing shifts break the run path.
- Quench is effectively stalled for v14: latest release 0.10.0 (Apr 2025), `compatibility.verified:
  "13"`, last `master` commit ~May 2025, no v14 issues/PRs.

Adopting Quench would mean forking and maintaining a full Foundry module (UI app, snapshots, reporter,
settings) on a moving v14+ target — heavy ongoing cost for what is fundamentally test ergonomics.

The reframing that settles it: **`page.evaluate` already executes in-client.** Existing specs
(`interaction-rolls`, `effect-checks`) already perform data operations in the live runtime and assert
the outputs. Quench was never required to test "accurate outputs from data operations." The one
capability that would justify an in-client framework — property-based testing — is provided by
**fast-check**, a pure function library with no Foundry-lifecycle coupling, which runs inside a
`page.evaluate` block without any runner. So the logic layer becomes Playwright-driven, with fast-check
injected for the math-heavy surfaces.

## Architecture — two test shapes, one runner

All logic tests are **Playwright specs**. Test orchestration stays outside Foundry (stable across
Foundry versions); the data operation runs inside the runtime via `page.evaluate`; only the output
crosses back to Node for assertion.

### Example-based tests (the default)

A spec builds fixtures via the shared builders, performs the operation inside `page.evaluate`, and
returns the output; Node asserts with Playwright `expect`. One per known case — each of the 8
rules-element operations, each of the 5 check types, each of the 11 conditions, each trait effect.

### Property-based tests (math surfaces)

For surfaces with invariants over a large input space, the spec runs fast-check **inside**
`page.evaluate`:

```js
const result = await page.evaluate(async () => {
   // `fc` is injected as a page global (see fast-check injection below).
   const report = await fc.check(
      fc.asyncProperty(fc.array(fc.integer({ min: -10, max: 10 }), { maxLength: 5 }), async (values) => {
         // Build/mutate the fixture, perform the operation in-runtime, return the invariant boolean.
         // e.g. apply `values` as flatModifiers to Body and assert derived Body === base + sum(values).
         return derivedBody === baseBody + values.reduce((a, b) => a + b, 0);
      }),
      { numRuns: 40 },
   );
   return { failed: report.failed, counterexample: report.counterexample, numRuns: report.numRuns };
});

expect(result.failed, `property failed on counterexample: ${JSON.stringify(result.counterexample)}`)
   .toBe(false);
```

`fc.check` (not `fc.assert`) is used so the shrunk counterexample is returned as data rather than
thrown across the page↔Node boundary. fast-check shrinks failures to a minimal counterexample
automatically.

Surfaces that get property tests (invariant-rich and combinatorially large):

- **Rules-element stacking** — `flatModifier` / `mulBase` / `conditionalRatingModifier` /
  `conditionalCheckModifier` composing onto one derived stat. Invariants: `derived = base + Σ flat`;
  defined, claimed-order behavior of `mulBase` vs `flatModifier`; conditional modifiers apply iff their
  condition holds.
- **Damage / armor / resistance** — `applied = max(0, raw − armor)` across `damageReducedBy` types and
  resistances; floor-at-zero; healing vs damage sign.
- **Resource clamping** — HP / Resolve land in `[0, max]` after any applied delta.

### Performance / hygiene for property tests

Document-creating properties cap `numRuns` (~30–50) and **reuse a single actor**, mutating its items'
rules elements per iteration rather than create/delete churn. Each logic spec cleans up the fixtures it
creates in `afterAll`/`afterEach` so the world does not accumulate state across runs.

## fast-check injection

- Add `fast-check` as a `devDependency` (it is currently only bundled *inside* Quench; we take it as a
  first-class dev dependency).
- A Playwright helper `tests/e2e/fast-check.js` exposes `injectFastCheck(page)`, which calls
  `page.addInitScript({ path: <fast-check browser bundle> })` so the fast-check global is available on
  every navigation, before page scripts run. The exact bundle path and global name (`fc` /
  `fastcheck`) are confirmed against the installed `fast-check` package at implementation time; the
  helper re-exports the resolved global handle and the injection call.
- This changes only the **test** harness — the shipped system bundle (`index.js`) is untouched.

## Quench retirement

Quench is removed, not left dormant (user decision):

- **Delete** `src/quench/` (the registrar and `batches/`) and the `registerQuenchTests()` import +
  call in `src/index.js`. Rebuild so the shipped `index.js` no longer registers Quench.
- **Delete** `tests/e2e/quench-runner.spec.js` and the `test:e2e:quench` npm script.
- **Update** the `titan-codebase` skill: remove the Quench bridge / batch-registrar notes from
  `references/conventions.md` and the Quench mention from `references/architecture.md`; add the
  Playwright + fast-check logic-layer description and the v14-Quench-incompatibility finding (so the
  decision is not silently re-litigated).

## File layout (logic layer)

```
tests/
  e2e/
    fast-check.js               # injectFastCheck(page) helper
    logic/
      rules-elements.spec.js    # 8 ops example-based + stacking property tests
      checks.spec.js            # 5 check types, output assertions
      conditions.spec.js        # 11 conditions, mechanical-effect assertions
      traits.spec.js            # custom/armor/weapon trait logic (+ the trait dialog UI test stays in Phase 3)
  shared/
    builders.js                 # extended with condition + trait + damage builders (returns create-payloads)
    fixtureConstants.js         # extended with known expected values
```

Removed: `tests/e2e/quench-runner.spec.js`, `src/quench/**`.

## Revised Phase 2 plan outline

Each task is independently runnable and verified before the next.

1. **Quench removal + fast-check injection** — delete `src/quench/**` + `src/index.js` registration +
   `quench-runner.spec.js` + npm script; rebuild; add `fast-check` devDependency and
   `tests/e2e/fast-check.js`; a smoke spec proves `fc` is injected and a trivial property runs.
2. **Rules elements** — example test per operation (apply → assert exact derived delta) + stacking
   property tests (`flatModifier`, `mulBase`).
3. **Checks** — example test per check type asserting computed output fields; property test for
   modifier effect on check totals.
4. **Conditions** — example test per condition (mechanical effect, or applied+flagged for
   descriptive-only).
5. **Traits (logic)** — example tests for trait effect on derived data / check parameters; damage/armor
   property test.

## Coverage map (logic layer)

| Surface | Count | Test shape | Assertion |
|---|---|---|---|
| Rules elements | 8 ops | example + property (stacking) | exact derived delta; stacking invariants |
| Checks | 5 types | example (+ property on modifiers) | computed output fields correct |
| Conditions | 11 | example | mechanical effect; descriptive-only → applied + flagged |
| Traits (logic) | custom/armor/weapon | example + property (damage/armor) | trait alters derived data / check params; `max(0, raw−armor)` |
| Resources (clamping) | HP / Resolve | property | result ∈ `[0, max]` after any delta |

## Risks / notes

- **Property-test runtime:** creating/mutating documents per iteration is slower than pure-function
  PBT; capped `numRuns` + single-actor reuse keep it bounded. If a property still proves too slow, drop
  its `numRuns` further or narrow the arbitraries — never silently skip iterations without logging.
- **fast-check global/bundle path** is confirmed at implementation against the installed package
  version; the helper centralizes it so a version bump touches one file.
- The Phase-1 Foundation (login/users, builders, webServer, `testId`) is unaffected and already
  complete. The Phase-1 Quench bridge (Task 4) is explicitly reverted by Phase 2 Task 1.
