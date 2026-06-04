# E2E Suite Speedup Phase 1b — Fixed-Sleep Removal (full sweep) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. All `.js` edits route through the `titan-svelte-dev` subagent with `foundry-vtt` + `titan-codebase` skills loaded.

**Goal:** Remove every fixed-duration sleep (`setTimeout` settles *and* `page.waitForTimeout` calls) from `tests/e2e/`, replacing each with a deterministic condition wait, with zero change to what any test asserts and the suite staying green at parity.

**Architecture:** Each fixed sleep is replaced by one of five canonical conversions (below). The dominant case is *deletion* — a fixed sleep that precedes an auto-retrying Playwright assertion (`expect(locator).…`) is redundant and is simply removed. Sleeps that precede an in-page `page.evaluate` state read become `expect.poll`/`waitForFunction`/in-page `titanWait`. The one negative assertion (assert-absence) is re-anchored on a positive turn-start signal. Work is grouped into 6 tasks by pattern affinity; each task verifies by running its touched spec files green against the live world.

**Tech Stack:** Playwright (`@playwright/test`), Foundry VTT v14 live world on `:30000`, the in-page `titanWait` helper (`tests/e2e/poll.js`, installed by `login()` via `installPoll`/`addInitScript`).

---

## Scope

**Full sweep — 92 sites across 19 files** (the union of every `setTimeout` settle and every `page.waitForTimeout`):

| File | setTimeout | waitForTimeout | Task |
|------|-----------:|---------------:|------|
| `tests/e2e/logic/conditions.spec.js` | 2 | 0 | 1 |
| `tests/e2e/logic/rules-elements.spec.js` | 10 | 0 | 1 |
| `tests/e2e/effect-tray.spec.js` | 18 | 8 | 2 |
| `tests/e2e/localization.spec.js` | 2 | 0 | 3 |
| `tests/e2e/permissions-auto-open.spec.js` | 1 | 0 | 3 |
| `tests/e2e/traits.spec.js` | 0 | 2 | 4 |
| `tests/e2e/trait-add-custom.spec.js` | 0 | 1 | 4 |
| `tests/e2e/effect-traits.spec.js` | 0 | 2 | 4 |
| `tests/e2e/rules-element-crud.spec.js` | 0 | 6 | 4 |
| `tests/e2e/interaction-dialogs.spec.js` | 0 | 1 | 4 |
| `tests/e2e/reactive-ability.spec.js` | 0 | 3 | 5 |
| `tests/e2e/reactive-armor-shield.spec.js` | 0 | 4 | 5 |
| `tests/e2e/reactive-spell.spec.js` | 0 | 3 | 5 |
| `tests/e2e/reactive-weapon.spec.js` | 0 | 6 | 5 |
| `tests/e2e/reactive-effect-rows.spec.js` | 0 | 10 | 6 |
| `tests/e2e/reactive-inventory-basic.spec.js` | 0 | 7 | 6 |
| `tests/e2e/reactive-expanded-toggle.spec.js` | 0 | 2 | 6 |
| `tests/e2e/spells-filter.spec.js` | 0 | 2 | 6 |
| `tests/e2e/effect-reactivity.spec.js` | 0 | 2 | 6 |
| **Total** | **33** | **59** | |

**Not touched** (already sleep-free / self-managed): `checkDialog.js`, `checks-*.spec.js`, `interaction-rolls.spec.js`, `effect-checks.spec.js`, `multi-client.spec.js`, `socket-sync.spec.js`, `component-probe*.spec.js`, `fixtures.js`. The `poll.js` internal `setTimeout(resolve, interval)` (line 25) is the polling primitive itself — **leave it**.

**Out of scope (do NOT change):** any test assertion, fixture find-or-create logic, the `setInterval` canvas-readiness poll already present in `effect-tray.spec.js:105-117` (that is already a condition wait, not a fixed sleep), and the shared-world harness (that is Phase 2 / TODO #15).

---

## Canonical conversions (the five patterns)

Apply the first pattern that fits each site. **`titanWait` is only callable inside `page.evaluate`** (it lives on the page's `globalThis`); at the Playwright/Node level use `expect.poll` / `page.waitForFunction` / auto-retrying locator assertions.

### Pattern B — Delete a Node-level sleep before an auto-retrying assertion (the common case)

A `await page.waitForTimeout(N)` immediately followed by `await expect(page.locator(...)).toBeVisible()` / `.toHaveText(...)` / etc. is redundant — Playwright web-first assertions auto-retry to the test timeout.

```js
// BEFORE
await someAction();
await page.waitForTimeout(400);
await expect(page.locator('[data-testid="x"]')).toHaveText('expected');

// AFTER  (delete the sleep; the assertion already polls)
await someAction();
await expect(page.locator('[data-testid="x"]')).toHaveText('expected');
```

### Pattern C — Node-level sleep before an in-page state read → `expect.poll`

A `await page.waitForTimeout(N)` followed by `const x = await page.evaluate(() => <readState>); expect(x)...` — convert to polling the same state.

```js
// BEFORE
await page.locator('[data-testid="apply"]').click();
await page.waitForTimeout(400);
const applied = await page.evaluate(() => [...game.actors.getName('X').effects].some((e) => e.name === 'E'));
expect(applied).toBe(true);

// AFTER
await page.locator('[data-testid="apply"]').click();
await expect.poll(
   () => page.evaluate(() => [...game.actors.getName('X').effects].some((e) => e.name === 'E')),
   { message: 'effect copied onto the controlled actor' },
).toBe(true);
```

(Equivalent alternative: `await page.waitForFunction(() => <condition>)`. Use `expect.poll` when the read is an existing `page.evaluate` that returns the asserted value, so the assertion is unchanged.)

### Pattern D — In-page settle inside a `page.evaluate`

A `await new Promise((resolve) => setTimeout(resolve, N))` *inside* an evaluate callback. Two sub-cases:

- **D1 — the evaluate resolves and a Playwright locator assertion follows:** delete the in-page sleep line; the following auto-retrying locator covers the wait.
- **D2 — more in-page work follows that reads the settled state:** replace with in-page `titanWait` polling the concrete post-condition.

```js
// D2 BEFORE (inside page.evaluate)
select.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((resolve) => { setTimeout(resolve, 400); });

// D2 AFTER
select.dispatchEvent(new Event('change', { bubbles: true }));
await titanWait(
   () => !!ui.titanEffects.element.querySelector('[data-testid="effect-tray-row"]'),
   { message: 'tray rows rendered for selected pack' },
);
```

### Pattern A — In-page derived-data settle (Task 1)

A `setTimeout(resolve, 100)` inside an evaluate after `createEmbeddedDocuments` / `toggleStatusEffect`, before a derived-stat snapshot. Replace with an in-page `titanWait` that polls until the just-applied change is observable in `actor.system.*`. Determine the concrete signal from `titan-codebase` (when rules elements / conditions apply to prepared data). Recommended signal: the value the test will assert on has reached its expected post-mutation state.

```js
// BEFORE
await actor.createEmbeddedDocuments('Item', [abilityData]);
await new Promise((resolve) => { setTimeout(resolve, 100); });
const baseline = snapshot();

// AFTER (poll until the owned ability's rules element is reflected in derived data)
await actor.createEmbeddedDocuments('Item', [abilityData]);
await titanWait(() => actor.items.size > 0 && actor.system.rating.melee.value >= /* boosted floor */ ...,
   { message: 'ability rules element applied to derived data' });
const baseline = snapshot();
```

If a robust non-circular signal cannot be found for a given site, poll a monotonic readiness indicator (e.g. the embedded doc count / the effect's presence in `actor.appliedEffects`) rather than the asserted delta. The test passing green is the gate.

### Pattern E — Negative assertion (`permissions-auto-open.spec.js`, the one true exception)

You cannot poll for an *absence*. Re-anchor on a **positive** signal proving the turn-start pipeline ran, then assert the sheet stayed closed.

```js
// BEFORE
await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);
await gm.evaluate(() => new Promise((r) => setTimeout(r, 1000)));   // "give the handler time"
const rendered = await gm.evaluate((id) => game.actors.get(id)?.sheet?.rendered === true, ids.effectActorId);
expect(rendered).toBe(false);

// AFTER — wait for a deterministic consequence of turn-start (the seeded turn effect's resource
// change applied to the effect actor), which proves the same hook that *would* auto-open has run.
await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);
await gm.waitForFunction(
   (id) => <observable turn-start consequence on game.actors.get(id)>,   // resolve the concrete signal
   ids.effectActorId,
   { timeout: 15_000 },
);
const rendered = await gm.evaluate((id) => game.actors.get(id)?.sheet?.rendered === true, ids.effectActorId);
expect(rendered).toBe(false);
```

The implementer must inspect `buildTurnEffectActorData` (`tests/shared/builders.js`) + the turn-start handler (`CharacterDataModel` / `TitanCombat`) to identify the concrete `system.resource.*` (or status) change to poll. If no clean positive signal exists, fall back to a **single bounded `titanWait`** with an explanatory comment naming it as the sanctioned negative-assertion exception (the design spec at `specs/2026-06-03-e2e-suite-speedup-design.md` permits "a positive signal *or* a bounded wait" here). Do not leave a raw `setTimeout`.

---

## General rules (every task)

- **No assertion changes.** Only the wait mechanism changes. If a converted test cannot go green without weakening an assertion, STOP and surface it — that is a real bug, not a conversion.
- **Default timeouts.** `titanWait` defaults to 5000 ms / 50 ms interval; `expect.poll` defaults are fine. Only raise a timeout where the original sleep + observed latency warrants it (e.g. the multi-client turn-start at 15 s, matching the sibling positive test).
- **Always pass a `message`** to `titanWait` / `expect.poll` so a timeout names what was awaited.
- **Verify against the live world.** After editing a file, run it: `npx playwright test <file> --reporter=line`. The world is launched on `:30000`. Each file boots the client once; expect the same pass count as before the edit.
- **Commit per task** with the build untouched (test-only changes need no `npm run build`).
- **Routing:** all edits go through the `titan-svelte-dev` subagent; these are test-only `.js` files, so `foundry-vtt` + `titan-codebase` are the load-bearing skills.

---

### Task 1: `logic/` derived-data settles (Pattern A)

**Files:**
- Modify: `tests/e2e/logic/conditions.spec.js` (sites: 58, 74)
- Modify: `tests/e2e/logic/rules-elements.spec.js` (sites: 48, 66, 84, 119, 233, 256, 298, 329, 352, 394)

- [ ] **Step 1: Read both files** and, for each `setTimeout` site, identify the mutation it follows (`Actor.create` / `createEmbeddedDocuments` / `toggleStatusEffect` / `update`) and the derived value the test later asserts.
- [ ] **Step 2: Convert each site using Pattern A** — in-page `titanWait` polling the concrete observable that proves the mutation reached prepared data. Load `titan-codebase` to confirm when rules elements / conditions apply.
- [ ] **Step 3: Verify** `npx playwright test tests/e2e/logic/conditions.spec.js tests/e2e/logic/rules-elements.spec.js --reporter=line`. Expected: all pass, count unchanged.
- [ ] **Step 4: Commit** `test(e2e): replace logic/ derived-data sleeps with titanWait conditions`.

### Task 2: `effect-tray.spec.js` (Patterns B / C / D)

**Files:**
- Modify: `tests/e2e/effect-tray.spec.js`
  - In-page `setTimeout` (render+activate, then select-change), Pattern D: 52, 64, 81, 122, 134, 158, 170, 222, 230, 277, 285, 307, 330, 334, 368, 372, 411, 415.
  - Node-level `waitForTimeout`, Pattern B or C: 144, 176, 200, 242, 341, 382, 419, 424.

- [ ] **Step 1: Read the file.** Map each site: render+activate settles → D2 (`titanWait` on `[data-testid="effect-tray"]` present); select-change settles → D2 (`titanWait` on `[data-testid="effect-tray-row"]` present) unless a Playwright locator follows (then D1 delete); the in-page drop/create settles → D2 on the resulting pack/actor state; Node-level `waitForTimeout` before `expect(locator)` → B (delete); before `page.evaluate` reads (`created`/`deleted`/`applied`/`opened`/`renamed`/`stashed`/`locked`) → C (`expect.poll`).
- [ ] **Step 2: Convert** every site. Leave the existing `setInterval` canvas-readiness poll (105-117) untouched.
- [ ] **Step 3: Verify** `npx playwright test tests/e2e/effect-tray.spec.js --reporter=line`. Expected: all 8 tests pass.
- [ ] **Step 4: Commit** `test(e2e): replace effect-tray fixed sleeps with conditions`.

### Task 3: tray localization + the negative assertion (Patterns D / E)

**Files:**
- Modify: `tests/e2e/localization.spec.js` (Node-level tray settles, sites: 69, 73 — Pattern B if followed by a `LOCAL.` scan assertion, else C/D)
- Modify: `tests/e2e/permissions-auto-open.spec.js` (site: 60 — Pattern E, the negative assertion)

- [ ] **Step 1: Read both files.** For `localization.spec.js`, check what each settle precedes (a sheet/tray render then a text scan). For `permissions-auto-open.spec.js`, study `buildTurnEffectActorData` (`tests/shared/builders.js`) + the turn-start handler to find the positive signal for Pattern E.
- [ ] **Step 2: Convert** localization sites (B/C/D) and the negative site (E — positive turn-start signal, then assert `rendered === false`; bounded `titanWait` fallback with comment if no clean signal).
- [ ] **Step 3: Verify** `npx playwright test tests/e2e/localization.spec.js tests/e2e/permissions-auto-open.spec.js --reporter=line`. Expected: all pass.
- [ ] **Step 4: Commit** `test(e2e): replace tray-localization + auto-open sleeps with conditions`.

### Task 4: item/effect sheet CRUD settles (Patterns B / C)

**Files:**
- Modify: `tests/e2e/traits.spec.js`, `tests/e2e/trait-add-custom.spec.js`, `tests/e2e/effect-traits.spec.js`, `tests/e2e/rules-element-crud.spec.js`, `tests/e2e/interaction-dialogs.spec.js`

- [ ] **Step 1: Read each file.** These render a sheet (already `titanWait`'d at mount), perform a CRUD action, then `waitForTimeout` before asserting. Classify each `waitForTimeout`: before `expect(locator)` → B (delete); before a `page.evaluate` read → C (`expect.poll`).
- [ ] **Step 2: Convert** all 12 sites.
- [ ] **Step 3: Verify** `npx playwright test tests/e2e/traits.spec.js tests/e2e/trait-add-custom.spec.js tests/e2e/effect-traits.spec.js tests/e2e/rules-element-crud.spec.js tests/e2e/interaction-dialogs.spec.js --reporter=line`. Expected: all pass.
- [ ] **Step 4: Commit** `test(e2e): replace sheet-CRUD waitForTimeout sleeps with conditions`.

### Task 5: reactive sheet rows — group A (Pattern B dominant)

**Files:**
- Modify: `tests/e2e/reactive-ability.spec.js`, `tests/e2e/reactive-armor-shield.spec.js`, `tests/e2e/reactive-spell.spec.js`, `tests/e2e/reactive-weapon.spec.js`

- [ ] **Step 1: Read each file.** Pattern: render sheet → external in-place doc update → `waitForTimeout` → assert the rendered row updated. The post-update `waitForTimeout` precedes an auto-retrying `expect(locator).toHaveText/…` → Pattern B (delete). Where it precedes a `page.evaluate` read → Pattern C.
- [ ] **Step 2: Convert** all 16 sites.
- [ ] **Step 3: Verify** `npx playwright test tests/e2e/reactive-ability.spec.js tests/e2e/reactive-armor-shield.spec.js tests/e2e/reactive-spell.spec.js tests/e2e/reactive-weapon.spec.js --reporter=line`. Expected: all pass.
- [ ] **Step 4: Commit** `test(e2e): replace reactive-row sleeps (group A) with conditions`.

### Task 6: reactive sheet rows — group B (Pattern B dominant)

**Files:**
- Modify: `tests/e2e/reactive-effect-rows.spec.js`, `tests/e2e/reactive-inventory-basic.spec.js`, `tests/e2e/reactive-expanded-toggle.spec.js`, `tests/e2e/spells-filter.spec.js`, `tests/e2e/effect-reactivity.spec.js`

- [ ] **Step 1: Read each file.** Same reactive pattern as Task 5 — classify each `waitForTimeout` as B (delete before auto-retrying locator) or C (`expect.poll` before a `page.evaluate` read).
- [ ] **Step 2: Convert** all 23 sites.
- [ ] **Step 3: Verify** `npx playwright test tests/e2e/reactive-effect-rows.spec.js tests/e2e/reactive-inventory-basic.spec.js tests/e2e/reactive-expanded-toggle.spec.js tests/e2e/spells-filter.spec.js tests/e2e/effect-reactivity.spec.js --reporter=line`. Expected: all pass.
- [ ] **Step 4: Commit** `test(e2e): replace reactive-row sleeps (group B) with conditions`.

---

## Final verification (after all 6 tasks)

- [ ] **Grep proof:** `git grep -nE "setTimeout|waitForTimeout" -- tests/e2e` returns ONLY `tests/e2e/poll.js:25` (the polling primitive). Zero other matches.
- [ ] **Final reviewer subagent** over the whole diff for spec compliance (no assertion weakened) + code quality.
- [ ] **Docs:** update `docs/TODO.md` (close #14; note the `waitForTimeout` sweep folded in), `docs/superpowers/e2e-suite-status.md` (one concise line), and the `titan-codebase` conventions note (fixed sleeps are banned in e2e; use `titanWait` / `expect.poll`).
- [ ] Offer the user a final full-suite run (`npm run test:e2e`, ~34 min, world-launch-gated) as the at-parity gate, plus `docs/OPEN_BUGS.md` #1 remains open (its real fix is Phase 2 / TODO #15).

## Self-review notes

- **Spec coverage:** the design spec's goal "remove every fixed `setTimeout` settle… replacing with condition polling" and success criterion (c) "zero fixed sleeps remain" — covered by the grep proof + the 92-site table. The `waitForTimeout` half is the user-approved scope expansion beyond TODO #14's literal `setTimeout`-only wording.
- **Type/name consistency:** all conversions use the existing `titanWait(predicate, { message })` signature (`poll.js`) and Playwright's `expect.poll(fn, { message }).toBe(...)` / `page.waitForFunction(fn, arg, { timeout })`. No new helpers introduced.
- **Negative case:** Pattern E is the only site that retains a *bounded* wait if no positive signal is found — explicitly sanctioned by the design spec.
