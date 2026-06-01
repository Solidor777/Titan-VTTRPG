# Phase 3d Reactive-Control Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Find and fix every sheet control that displays a stale value because it reads `<prop>.system.x` off a passed Document prop instead of through the reactive `document.data` store (the Svelte 4→5 stale-until-remount bug class), proving each fix with a behavioral red→green e2e test.

**Architecture:** Two stages. **Stage A** is a read-only static audit that enumerates every candidate read into a committed worklist. **Stage B** walks the worklist: for each candidate, write a behavioral test that mutates the value in place and asserts the rendered control updates without a tab switch — if it goes RED the antipattern is a real bug and we fix it by re-reading through `document.data.<collection>.get(id)?.system.x`; if it can't be driven red it is not a bug and is recorded as such. The candidate set is data produced by Stage A, so this plan front-loads the audit, fully specifies the per-candidate recipe (worked from the real bug #8 fix), and includes a re-plan checkpoint that instantiates the recipe per confirmed candidate.

**Tech Stack:** Foundry VTT v14 (ApplicationV2), Svelte 5 (runes), Playwright e2e (against the live Foundry on :30000), `npm run build:e2e` for the gated build.

---

## Working agreements (apply to every task)

- **Delegation:** route ALL `.svelte` / `.js` / `.svelte.js` edits through the **`titan-svelte-dev`** subagent (it loads `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase`); follow `.claude/CLAUDE.md` style. The Stage A audit is read-only analysis — use an `Explore` or general agent for it.
- **Login `E2E GM 1`** via `login(page)` (`tests/e2e/fixtures.js`); never the human `Gamemaster`.
- **Stay on `development`**; no git worktree (the live Foundry on :30000 serves this directory's built `index.js`).
- **Build discipline:** after ANY `src/` edit run `npm run build:e2e` before running e2e/probe specs. Test-only changes need no build.
- **In-place asserts stay within the active tab** — `Tabs.svelte` lazy-mounts only the active tab, so a cross-tab change always re-mounts and would mask the bug.
- **Reference template:** the bug #8 fix (`CharacterSheetEffectToggleActiveButton.svelte`) and its test (`tests/e2e/effect-reactivity.spec.js`) are the canonical pattern for both the fix and the test.

---

## Task 1: Stage A — static audit → committed worklist

**Files:**
- Create: `docs/superpowers/specs/2026-05-31-titan-e2e-3d-reactive-sweep-worklist.md`

- [ ] **Step 1: Dispatch the audit (read-only Explore/general agent)**

Prompt the agent to scan `src/document/**` and `src/check/**` `.svelte` files for the reactivity antipattern and return a structured table. Exact instructions for the agent:

> Scan every `.svelte` file under `src/document/` and `src/check/` for the Svelte 5 stale-read antipattern. A candidate is a component that:
> 1. receives a per-entry Document or sub-document via `$props()` (names like `effect`, `item`, `trait`, `attack`, `aspect`, `skill`, `mod`, `resource`, `rulesElement`), AND
> 2. reads `<prop>.system.<path>` or `<prop>.<path>` in a **reactive render position** — i.e. in markup `{...}`, in a `$derived(...)`, or inside a rendered `{#snippet}` / `{@render}` — rather than through `document.data.<collection>.get(<prop>.id)?.system.<path>`.
>
> EXCLUDE (these are NOT the bug, record nothing for them):
> - reads inside an event handler body (`onclick={() => ...prop.system.x}`, `onchange`, `ondragstart`, etc.) — handlers run at click time, not as a tracked render dependency;
> - `$bindable` props bound two-way for local UI state (e.g. `bind:isExpanded`, `bind:value` on an input) — these are local state, not a `document.data` display read;
> - components whose only prop IS the sheet's own `document` (already routed through `document.data`);
> - chat-message / report components under `**/chat-message/**` and `**/report/**` (render-once roll snapshots), UNLESS the read is on a live-editable embedded document.
>
> For every candidate return a row: `| file (relative path) | prop name | exact read expression | owning collection (effects/items/…) hypothesis | can the displayed value change while the row stays mounted? (yes/maybe/no + one-line reason) | how a test could drive it in place |`. Group rows by family: **effect rows**, **inventory/ability/spell/weapon-attack/skill rows**, **sidebar**, **header**, **other**. Do not edit any file.

- [ ] **Step 2: Write the worklist doc**

Save the agent's table to `docs/superpowers/specs/2026-05-31-titan-e2e-3d-reactive-sweep-worklist.md` with a short header (date, source spec link) and a leading status column `status` defaulting to `pending` for every row (values will become `fixed`, `not-a-bug`, or `pending`).

- [ ] **Step 3: Sanity-check the worklist against two known anchors**

Confirm the worklist contains (proves the audit caught the obvious cases):
- `CharacterSheetEffect.svelte` reads such as `effect.system.isExpired` and `effect.system.duration.type` (display reads → candidates), and
- does NOT list the already-fixed `CharacterSheetEffectToggleActiveButton.svelte` (it already routes through `document.data`).

If either anchor check fails, re-run the audit with a corrected prompt before proceeding.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-31-titan-e2e-3d-reactive-sweep-worklist.md
git commit -m "docs(e2e): Phase 3d reactive-sweep candidate worklist (Stage A audit)"
```

---

## Task 2: Classify the item/effect `expanded` toggle (named backlog item)

**Context:** `CharacterSheetItem.svelte` declares `isExpanded = $bindable(undefined)`, and `CharacterSheetEffectList.svelte` binds it two-way as `bind:isExpanded={isExpandedMap[effect.id]}` — `isExpandedMap` is the sheet's own local `$props()` object, NOT a `document.data` value. So expansion is local UI state and is very likely **not** the reactivity antipattern. This task verifies that with a behavioral test and records the classification.

**Files:**
- Create: `tests/e2e/reactive-expanded-toggle.spec.js`
- Read only (no expected edit): `src/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte`, `.../CharacterSheetItemExpandButton.svelte`

- [ ] **Step 1: Read `CharacterSheetItemExpandButton.svelte` and confirm the toggle source**

Open `src/document/types/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte`. Confirm the expand click flips the bound `isExpanded` (local), and that no `item.system.x` / `effect.system.x` *display* read gates the expanded state. Record the finding in the worklist (expanded toggle → `not-a-bug`, reason: local `$bindable` UI state) OR, if it unexpectedly reads expansion off a doc prop, add it as a candidate row and handle it via Task 3's recipe instead.

- [ ] **Step 2: Write a green regression test that expand works in place**

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Regression: expanding an effect row on a Character reveals its expandable content in place (no tab
 * switch). Expansion is local bindable UI state (isExpandedMap[effect.id]), NOT a document.data read, so
 * this is expected to PASS as written — it documents that the named "expanded toggle" is not the Svelte
 * 4->5 stale-read antipattern (it works reactively because the bound local $state is tracked).
 */

const ACTOR_NAME = 'E2E Expanded Toggle Actor';

test.describe('item expanded toggle reactivity', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      await page.evaluate(async (actorName) => {
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            { name: 'E2E Expand Effect', type: 'effect', disabled: false },
         ]);
         await actor.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 600);
         });
      }, ACTOR_NAME);
      await page.getByText('Effects', { exact: true }).first().click();
      await page.waitForTimeout(400);
   });

   test('clicking expand reveals the expandable content without a tab switch', async ({ page }) => {
      const row = page.locator('[data-effect-id]');
      await expect(row.locator('.expandable-content'), 'starts collapsed').toHaveCount(0);

      // Click the expand button (chevron) in the row header — staying on the Effects tab.
      await row.locator('.header .button').first().click();
      await page.waitForTimeout(400);

      await expect(row.locator('.expandable-content'), 'expanded content revealed in place').toHaveCount(1);
   });
});
```

- [ ] **Step 3: Build and run the test**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/reactive-expanded-toggle.spec.js --reporter=list`
Expected: PASS (expansion is local reactive state; confirms not-a-bug).

If it FAILS, the expand path is genuinely broken — STOP and treat it as a real bug via Task 3's recipe (write the red test first, fix through the store / local state, green).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/reactive-expanded-toggle.spec.js docs/superpowers/specs/2026-05-31-titan-e2e-3d-reactive-sweep-worklist.md
git commit -m "test(e2e): expanded toggle is local reactive state, not the stale-read antipattern"
```

---

## Task 3 (CANONICAL RECIPE): fix one confirmed candidate, red→green

This is the **repeatable recipe** applied once per `pending` worklist row that is a real bug. Worked here against the canonical example (the bug #8 pattern, generalized). When executing, substitute the row's concrete `<Component>`, `<prop>`, `<collection>`, `.system.<path>`, owning sheet, and in-place drive path. Every substitution is data already captured in the worklist; the steps below are fully concrete.

**Files (per candidate):**
- Test: `tests/e2e/reactive-<family>.spec.js` (one spec file per family — `reactive-effect-rows.spec.js`, `reactive-inventory.spec.js`, `reactive-ability.spec.js`, `reactive-spell.spec.js`, `reactive-weapon.spec.js`, `reactive-skills.spec.js`, `reactive-sidebar.spec.js`, `reactive-header.spec.js`; append a `test(...)` per candidate)
- Modify: the candidate `.svelte` component (the one read expression)

- [ ] **Step 1: Write the failing test (RED) — mutate the value in place, assert the render updates**

Skeleton (substitute the worklist row's specifics). This mirrors `effect-reactivity.spec.js`: seed an actor carrying the embedded doc, render the sheet, activate the owning tab, mutate the displayed value through a real path WITHOUT switching tabs, assert the rendered text/icon updates, and assert the underlying data changed.

```javascript
test('<read> updates in place when <value> changes (no tab switch)', async ({ page }) => {
   // Locate the row without re-mounting (stay on the active tab).
   const row = page.locator('[data-effect-id]'); // or [data-item-id], per family

   // Assert the INITIAL rendered value.
   await expect(row.getByText('<initial rendered value>')).toBeVisible();

   // Mutate the underlying value in place — via the control, or directly through the document.
   await page.evaluate((actorName) => {
      const doc = game.actors.getName(actorName).effects.contents[0]; // substitute collection/entry
      return doc.update({ system: { /* <path>: <newValue> */ } });
   }, ACTOR_NAME);
   await page.waitForTimeout(400);

   // The rendered control MUST reflect the new value WITHOUT a tab switch.
   await expect(row.getByText('<new rendered value>'), 'updated reactively in place').toBeVisible();
});
```

- [ ] **Step 2: Build and run — verify it FAILS (proves the stale bug)**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/reactive-<family>.spec.js -g "<test title>" --reporter=list`
Expected: FAIL — the rendered value stays at `<initial>` because the read off the prop has no reactive dependency.

**If it PASSES (no red):** the value does not actually go stale in place → it is NOT a bug. Set the worklist row `status = not-a-bug` (reason: value cannot change in place / read is already tracked), DELETE this test (or keep it only if it is a meaningful green regression), and move to the next candidate. Do NOT change the component.

- [ ] **Step 3: Fix the component — re-read through `document.data` (delegate to `titan-svelte-dev`)**

Replace the prop read with a store-routed `$derived`. Canonical before/after (from bug #8):

```svelte
<!-- BEFORE (stale): reads off the passed prop -->
active={effect.system.isActive}

<!-- AFTER (reactive): derive through the document.data store, keyed by the entry id -->
<script>
   const reactiveValue = $derived(
      document.data.<collection>.get(<prop>.id)?.system.<path>
   );
</script>
... use {reactiveValue} in the markup ...
```

Rules for the fix: derive via `document.data.<collection>.get(<prop>.id)?.system.<path>`; use the same `getContext('document')` store the component (or its parent) already exposes — if the component lacks the `document` context, read it via `getContext('document')` (every sheet provides it). Preserve any existing fallback (`?? <default>`). Change ONLY the read; leave handlers/structure intact.

- [ ] **Step 4: Build and run — verify it PASSES (GREEN)**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/reactive-<family>.spec.js -g "<test title>" --reporter=list`
Expected: PASS — the rendered value now updates in place.

- [ ] **Step 5: Update the worklist row and commit**

Set the worklist row `status = fixed`. Commit the test + component together:

```bash
git add tests/e2e/reactive-<family>.spec.js src/<component path> docs/superpowers/specs/2026-05-31-titan-e2e-3d-reactive-sweep-worklist.md
git commit -m "fix(<component>): re-read <value> through document.data so it updates in place"
```

---

## Task 4: Re-plan checkpoint — instantiate Task 3 per remaining candidate

**This is a planning checkpoint, not code.** With the Task 1 worklist in hand and the Task 3 recipe proven on the first real candidate, expand the remaining work concretely.

- [ ] **Step 1: Order the remaining `pending` worklist rows** by family, per spec §6: effect rows → inventory/ability/spell/weapon-attack/skill rows → sidebar → header.

- [ ] **Step 2: For each `pending` row, run the Task 3 recipe** (red → classify → fix-or-mark → green → commit). Use `subagent-driven-development`: one fresh subagent per candidate (Sonnet for the mechanical red→green when the read and drive path are unambiguous; Opus when classifying a borderline "maybe-stale" row or when the drive path is non-obvious).

- [ ] **Step 3: Stop condition** — every worklist row is `fixed` or `not-a-bug`; no row left `pending`.

---

## Task 5: Final verification & handoff updates

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: `.claude/skills/titan-codebase/` conventions (the reactivity rule, if not already complete)
- Modify: the resume memory at `C:\Users\emper\.claude\projects\C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan\memory\e2e-suite-progress.md` + `MEMORY.md`

- [ ] **Step 1: Run the full unit suite**

Run: `npx vitest run`
Expected: 35 passing (no unit impact).

- [ ] **Step 2: Run the full e2e suite**

Run: `npm run build:e2e` then `npx playwright test --reporter=list`
Expected: 276 prior + N new reactive tests, all passing (Foundry running on :30000, or the `webServer` config launches it).

- [ ] **Step 3: Update the status doc** — mark Phase 3d done, list each bug found in the bug log (component, value, commit), the final new-test count, and that the worklist is fully triaged. Note Phase 3c (manifests) remains the next phase.

- [ ] **Step 4: Update `titan-codebase` conventions** — ensure the "read display values through `document.data`, not off a passed Document prop" rule is documented with the `document.data.<collection>.get(id)?.system.x` form (extend, don't duplicate, if already noted from bug #8).

- [ ] **Step 5: Update the resume memory** — current state, suite counts, that 3d is done, next = 3c.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase/
git commit -m "docs(e2e): Phase 3d reactive sweep complete — status, conventions, worklist triaged"
```

---

## Self-review notes

- **Spec coverage:** Stage A audit → Task 1; triage criterion (§4) → Task 3 Step 2 red/pass fork; fix bar behavioral-red-first (§5) → Task 3 Steps 1–2; ordering (§6) → Task 4 Step 1; conventions (§7) → working-agreements block; verification/DoD (§8) → Task 5; risks (§9: false positives, drive-path, `$bindable`, handler reads) → audit EXCLUDE rules in Task 1 Step 1 + Task 2 + Task 3 Step 2 fork.
- **Discovery dependency:** Stage B candidates are audit data, so Tasks 3–4 are a fully-specified recipe + instantiation checkpoint rather than N pre-written tasks. This is intentional, not a placeholder — every step's code/command is concrete; only the per-row substitutions (captured in the worklist) vary.
- **Naming consistency:** worklist `status` values are `pending` / `fixed` / `not-a-bug` throughout; fix form is `document.data.<collection>.get(<prop>.id)?.system.<path>` throughout.
