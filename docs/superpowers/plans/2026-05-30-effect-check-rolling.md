# Effect Check-Rolling From the Character-Sheet Row — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore inline check-roll buttons on effect rows in the character sheet, matching item-check rows, by driving the existing item-check engine through its `itemRollData` passthrough branch.

**Architecture:** The item-check engine on `CharacterDataModel` is already source-agnostic — every method branches on `options.itemRollData` and skips `actor.items.get(id)` when roll data is supplied. So the engine, the options dialog, and the chat report need **no changes**. The work is: one line on the effect data model (carry `description` in roll data), two new presentational Svelte components that resolve effects from `document.data.effects` and feed the shared engine, and wiring them into the effect row.

**Tech Stack:** Foundry VTT v14 (ApplicationV2), Svelte 5 (runes), SCSS, Vite. Tests: Playwright e2e (`npm run test:e2e`) against a live Foundry world; ESLint + Stylelint for static checks; manual in-client verification for the rendered UI.

**Delegation note (project convention):** All `.js` / `.svelte` work routes to the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded. This plan's code blocks are the authoritative source for that work.

---

## File Structure

- **Modify** `src/document/types/active-effect/TitanActiveEffectDataModel.js` — add `description` to `getRollData()` so the resulting check card shows the effect's description (item roll data already carries it).
- **Create** `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte` — one check button + stat tags for one effect check; resolves via `document.data.effects.get(effectId)`, drives the shared engine with `itemRollData`. Mirror of `CharacterSheetItemCheck.svelte`.
- **Create** `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte` — iterates `effect.system.check`, renders one `CharacterSheetEffectCheck` per entry. Mirror of `CharacterSheetItemChecks.svelte`.
- **Modify** `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte` — render a checks section when the effect has checks.
- **Create** `tests/e2e/effect-checks.spec.js` — Playwright coverage: roll-data carries description; an effect check rolled via the engine posts an `itemCheck` message and renders its card without error.
- **Modify** `docs/superpowers/BACKLOG.md` — remove item #4 once shipped.

---

## Task 1: Carry `description` in effect roll data

**Files:**
- Modify: `src/document/types/active-effect/TitanActiveEffectDataModel.js:118-125`

- [ ] **Step 1: Add `description` to `getRollData()`**

The current method (around line 118):

```javascript
getRollData() {
   const retVal = super.getRollData();
   retVal.duration = structuredClone(this.duration);
   retVal.check = structuredClone(this.check);
   retVal.customTrait = structuredClone(this.customTrait);

   return retVal;
}
```

Add the native `description` field (an Active Effect stores `description` at the document root, not under `system`), so `getItemCheckParameters` can populate `parameters.itemDescription` for the rolled check card — item roll data already carries `description`:

```javascript
getRollData() {
   const retVal = super.getRollData();
   retVal.description = this.parent.description;
   retVal.duration = structuredClone(this.duration);
   retVal.check = structuredClone(this.check);
   retVal.customTrait = structuredClone(this.customTrait);

   return retVal;
}
```

- [ ] **Step 2: Static check**

Run: `npm run eslint`
Expected: PASS (no new errors in `TitanActiveEffectDataModel.js`).

- [ ] **Step 3: Commit**

```bash
git add src/document/types/active-effect/TitanActiveEffectDataModel.js
git commit -m "feat(effects): carry description in effect roll data for check cards"
```

(Behavioral verification of this field lands in Task 5's e2e.)

---

## Task 2: `CharacterSheetEffectCheck.svelte`

**Files:**
- Create: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte`

Reference original (do not modify): `src/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte`. This component differs only in how it resolves its source document: it reads the effect from `document.data.effects.get(effectId)` and passes `effect.getRollData()` as `options.itemRollData`, instead of passing an `itemId` for the engine to resolve from `document.data.items`.

- [ ] **Step 1: Create the component**

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import autoSpendResolveChecks from '~/helpers/Settings/AutoSpendResolveChecks.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import {
      DICE_ICON,
      EXPERTISE_ICON,
      SPEND_RESOLVE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @typedef {object} CharacterSheetEffectCheckProps
    * @property {string} [effectId] The ID of the effect to get the check from.
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetEffectCheckProps} */
   const { effectId = undefined, checkIdx = undefined } = $props();

   /** @type {boolean} Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = autoSpendResolveChecks();

   /**
    * Builds the Check Options for this effect check, resolving fresh roll data from the effect.
    * The shared item-check engine cannot resolve an effect from the item collection, so the
    * effect's roll data is supplied directly via the engine's itemRollData passthrough branch.
    * @returns {ItemCheckOptions | undefined} The check options, or undefined if the effect or check is invalid.
    */
   function getCheckOptions() {
      // Resolve the effect from the reactive collection and ensure the check index is valid.
      const effect = document.data.effects.get(effectId);
      if (effect?.system.check.length > checkIdx) {
         return {
            itemRollData: effect.getRollData(),
            checkIdx: checkIdx,
         };
      }
      return undefined;
   }

   /** @type {ItemCheckParameters | undefined} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Build the options from current effect roll data, then calculate the display parameters.
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         return document.data.system.getItemCheckParameters(
            document.data.system.initializeItemCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /**
    * Rolls the effect's Check via the shared item-check engine.
    */
   function rollEffectCheck() {
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         document.data.system.requestItemCheck(checkOptions);
      }
   }
</script>

<!--Check-->
{#if checkParameters}
   <div class="check">
      <!--Buttons-->
      <div class="buttons">
         {#if checkParameters.resolveCost}
            {#if autoSpendResolve}
               <!--Combined Item Check and Spend Resolve button-->
               <ItemCheckButton
                  label={checkParameters.checkLabel}
                  attribute={checkParameters.attribute}
                  disabled={!document.data.isOwner}
                  resolveCost={checkParameters.resolveCost}
                  onclick={() => rollEffectCheck()}
               />
            {:else}
               <!--Check Button-->
               <div>
                  <ItemCheckButton
                     label={checkParameters.checkLabel}
                     attribute={checkParameters.attribute}
                     disabled={!document.data.isOwner}
                     onclick={() => rollEffectCheck()}
                  />
               </div>

               <!--Resolve Cost Button-->
               <div class="resolve-cost-button">
                  <SpendResolveButton
                     resolveCost={checkParameters.resolveCost}
                     onclick={() => document.data.system.spendResolve(checkParameters.resolveCost)}
                  />
               </div>
            {/if}
         {:else}
            <!--Check Button-->
            <ItemCheckButton
               label={checkParameters.checkLabel}
               attribute={checkParameters.attribute}
               disabled={!document.data.isOwner}
               resolveCost={checkParameters.resolveCost}
               onclick={() => rollEffectCheck()}
            />
         {/if}
      </div>

      <div class="stats">
         <!--DC, Attribute, and Skill-->
         <div class="stat">
            <AttributeCheckTag
               attribute={checkParameters.attribute}
               complexity={checkParameters.complexity}
               difficulty={checkParameters.difficulty}
               skill={checkParameters.skill}
            />
         </div>

         <!--Dice-->
         <div class="stat">
            <IconStatTag
               icon={DICE_ICON}
               label={localize('dice')}
               value={checkParameters.totalDice}
            />
         </div>

         <!--Training-->
         {#if checkParameters.totalTrainingDice}
            <div class="stat">
               <IconStatTag
                  label={localize('training')}
                  value={checkParameters.totalTrainingDice}
                  icon={TRAINING_ICON}
               />
            </div>
         {/if}

         <!--Expertise-->
         {#if checkParameters.totalExpertise}
            <div class="stat">
               <IconStatTag
                  label={localize('expertise')}
                  value={checkParameters.totalExpertise}
                  icon={EXPERTISE_ICON}
               />
            </div>
         {/if}

         <!--Resolve Cost-->
         {#if checkParameters.resolveCost}
            <div class="stat">
               <IconStatTag
                  label={localize('resolveCost')}
                  value={checkParameters.resolveCost}
                  icon={SPEND_RESOLVE_ICON}
               />
            </div>
         {/if}

         <!--Resistance Check-->
         {#if checkParameters.resistanceCheck !== 'none'}
            <div class="stat">
               <ResistedByTag resistance={checkParameters.resistanceCheck}/>
            </div>
         {/if}

         <!--Opposed Check-->
         {#if checkParameters.opposedCheck.enabled}
            <div class="stat">
               <OpposedCheckTag
                  attribute={checkParameters.opposedCheck.attribute}
                  skill={checkParameters.opposedCheck.skill}
               />
            </div>
         {/if}
      </div>
   </div>
{/if}

<style lang="scss">
   .check {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .buttons {
         @include flex-row;

         .resolve-cost-button {
            @include margin-left-large;
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;

         flex-wrap: wrap;

         .stat {
            @include tag-container-child-margin;
         }
      }
   }
</style>
```

**Note on reactivity (parity with the item version):** like `CharacterSheetItemCheck`, the derived re-runs when the check **array length** changes (the `effect.system.check.length` read registers the dependency). Edits to a field *within* an existing check redraw on the next length/structure change or sheet re-render — this matches the established item-check behavior and is intentional, not a regression.

**Note on the `{#if checkParameters}` guard:** added defensively so a transient invalid index (e.g. mid-deletion) renders nothing instead of dereferencing `undefined`. The item version omits this because its parent only mounts it for valid indices; the same holds here, but the guard costs nothing and hardens the mid-edit window.

- [ ] **Step 2: Static checks**

Run: `npm run eslint && npm run stylelint`
Expected: PASS for the new file.

- [ ] **Step 3: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte
git commit -m "feat(effects): add CharacterSheetEffectCheck row component"
```

---

## Task 3: `CharacterSheetEffectChecks.svelte`

**Files:**
- Create: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte`

Reference original (do not modify): `src/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte`. The only differences: the prop is an effect, the per-check component is `CharacterSheetEffectCheck`, and the id passed is `effect.id` (effects are keyed by `id` throughout the effect sheet code, e.g. `CharacterSheetEffectList`).

- [ ] **Step 1: Create the component**

```svelte
<script>

   import CharacterSheetEffectCheck
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte';

   /**
    * @typedef {object} CharacterSheetEffectChecksProps
    * @property {TitanActiveEffect} [effect] Reference to the effect Active Effect document.
    */

   /** @type {CharacterSheetEffectChecksProps} */
   const { effect = undefined } = $props();
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each effect.system.check as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetEffectCheck effectId={effect.id} {checkIdx}/>
      </div>
   {/each}

</div>

<style lang="scss">
   .checks {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .check {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include margin-top-standard;
            @include padding-top-standard;
         }
      }
   }
</style>
```

- [ ] **Step 2: Static checks**

Run: `npm run eslint && npm run stylelint`
Expected: PASS for the new file.

- [ ] **Step 3: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte
git commit -m "feat(effects): add CharacterSheetEffectChecks list component"
```

---

## Task 4: Render checks in the effect row

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte`

- [ ] **Step 1: Import the checks component**

In the `<script>` block, add the import alongside the existing effect imports (after the `CharacterSheetEffectToggleActiveButton` import, around line 14):

```javascript
   import CharacterSheetEffectChecks
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte';
```

- [ ] **Step 2: Render the checks section**

The current expandable body opens with the description section (around lines 119-124):

```svelte
   <!--Effect Description-->
   {#if effect.description !== '' && effect.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={effect.description}/>
      </div>
   {/if}

   <div class="section tags small-text">
```

Insert a checks section between the description block and the tags block:

```svelte
   <!--Effect Description-->
   {#if effect.description !== '' && effect.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={effect.description}/>
      </div>
   {/if}

   <!--Checks-->
   {#if effect.system.check.length > 0}
      <div class="section">
         <CharacterSheetEffectChecks {effect}/>
      </div>
   {/if}

   <div class="section tags small-text">
```

The existing `.section` SCSS in this file already supplies the border-top, top/bottom padding, and `flex-column` layout for a non-`rich-text`, non-`tags` section — no style changes needed.

- [ ] **Step 3: Static checks + build**

Run: `npm run eslint && npm run stylelint && npm run build`
Expected: ESLint/Stylelint PASS; `vite build` completes and writes output to the repo root (so the live Foundry world loads the new components).

- [ ] **Step 4: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte
git commit -m "feat(effects): render inline check rows on the character-sheet effect"
```

---

## Task 5: e2e — effect check rolls, posts, and renders (and carries description)

**Files:**
- Create: `tests/e2e/effect-checks.spec.js`

Reference pattern: `tests/e2e/interaction-rolls.spec.js`. This suite seeds a player actor with an embedded effect that carries one complete `check[]` entry and a description, then asserts (a) the effect's roll data carries its description and (b) rolling the check via the shared engine (`requestItemCheck` with `itemRollData`) posts an `itemCheck` message that renders its card with no uncaught errors.

> **Prerequisite:** the e2e suite runs against a live Foundry v14 world serving the freshly built system. Run `npm run build` (Task 4 Step 3) before `npm run test:e2e`. If the world is not already running, start it the way the existing e2e suite expects (the other specs in `tests/e2e/` share this prerequisite).

- [ ] **Step 1: Write the failing test**

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Effect check-rolling path: an effect that carries a check[] entry can be rolled through the shared
 * item-check engine via the itemRollData passthrough branch, and its roll data exposes the effect's
 * description for the resulting check card.
 *
 * Confirmed against source:
 *   - TitanActiveEffectDataModel.getRollData() returns { description, duration, check, customTrait, ... }.
 *   - CharacterDataModel.requestItemCheck/getItemCheckParameters branch on options.itemRollData and
 *     never touch actor.items.get(id) when roll data is supplied.
 *   - flags.titan.type for an item check is 'itemCheck'; the mounted card root is '.check-chat-message'.
 */

test.describe('v14 effect check rolling', () => {
   // The fixture actor name and its single seeded effect.
   const ACTOR_NAME = 'E2E Effect Roller';
   const EFFECT_NAME = 'E2E Check Effect';
   const EFFECT_DESCRIPTION = '<p>Inline effect-check description.</p>';

   // Log in and build the actor with one effect carrying a complete check[] entry.
   test.beforeEach(async ({ page }) => {
      const bootErrors = [];
      page.on('pageerror', (err) => {
         bootErrors.push(err.message);
      });

      await login(page);

      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before effect-check walk. Captured page errors:\n${bootErrors.join('\n')}`,
      ).toBe(true);

      await page.evaluate(async ({ actorName, effectName, effectDescription }) => {
         // Remove any stale fixture so each run starts clean.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // The roll-source actor.
         const actor = await Actor.create({ name: actorName, type: 'player' });

         // One effect with a description and a single COMPLETE check[] entry. The check object mirrors
         // createItemCheckTemplate() (src/check/types/item-check/ItemCheckTemplate.js) — the template
         // module is not importable in the browser context, so the full default object is inlined;
         // omitting fields like opposedCheck makes getItemCheckParameters throw.
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               description: effectDescription,
               system: {
                  check: [
                     {
                        attribute: 'body',
                        complexity: 1,
                        damageReducedBy: 'none',
                        difficulty: 4,
                        initialValue: 1,
                        isDamage: false,
                        isHealing: false,
                        label: 'E2E Effect Check',
                        opposedCheck: {
                           attribute: 'body',
                           enabled: false,
                           skill: 'athletics',
                        },
                        resistanceCheck: 'none',
                        resolveCost: 0,
                        scaling: true,
                        skill: 'arcana',
                        uuid: 'e2effec7-e2ef-4fec-8fec-e2effec7e2ef',
                     },
                  ],
               },
            },
         ]);
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME, effectDescription: EFFECT_DESCRIPTION });
   });

   test('effect roll data carries the effect description', async ({ page }) => {
      const description = await page.evaluate(({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.getName(effectName);
         return effect.getRollData().description;
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME });

      expect(description, 'effect roll data exposes the native description').toBe(EFFECT_DESCRIPTION);
   });

   test('effect check rolls, posts an itemCheck message, and renders its card', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      // Roll the effect's check through the shared engine using the itemRollData passthrough.
      const result = await page.evaluate(async ({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.getName(effectName);

         const before = game.messages.size;
         await actor.system.requestItemCheck({ itemRollData: effect.getRollData(), checkIdx: 0 });
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });

         const newest = game.messages.contents[game.messages.size - 1];
         return {
            before,
            after: game.messages.size,
            newestId: newest?.id,
            newestType: newest?.flags?.titan?.type,
         };
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME });

      expect(result.after, 'message count should increase after the roll').toBeGreaterThan(result.before);
      expect(result.newestType, 'newest message flag type').toBe('itemCheck');

      const rendered = await page.evaluate((messageId) => {
         const li = globalThis.document.querySelector(`.message[data-message-id="${messageId}"]`);
         return {
            hasElement: !!li,
            hasTitanClass: !!li?.classList.contains('titan'),
            hasCard: !!li?.querySelector('.check-chat-message'),
         };
      }, result.newestId);

      expect(rendered.hasElement, 'rendered chat-log element exists').toBe(true);
      expect(rendered.hasTitanClass, 'rendered element carries the titan class').toBe(true);
      expect(rendered.hasCard, 'mounted check-chat-message card is present').toBe(true);

      expect(errors, `uncaught errors during effect roll/render:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Run the test to verify it fails before Task 1's data-model change is built**

If running this task before Task 1's build is live, the description test fails (`description` undefined). With Tasks 1-4 built, both tests should pass. To see the meaningful failure first, you can temporarily check out the pre-Task-1 build; otherwise proceed to Step 3.

Run: `npm run test:e2e -- effect-checks`
Expected (pre-build): the description test FAILS with `expect(received).toBe(expected)` where received is `undefined`.

- [ ] **Step 3: Build and run to verify it passes**

Run: `npm run build && npm run test:e2e -- effect-checks`
Expected: both tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/effect-checks.spec.js
git commit -m "test(e2e): effect check rolls via shared engine and carries description"
```

---

## Task 6: Manual in-client UI verification + backlog update

The rendered effect-row UI (tab switching + row expansion) is verified in-client rather than via a brittle click-through e2e, matching this project's gated in-client testing posture.

**Files:**
- Modify: `docs/superpowers/BACKLOG.md`

- [ ] **Step 1: Manual in-client check**

With the built system loaded in a v14 world:

1. Open a character (player or NPC) sheet and go to the **Effects** tab.
2. Add or open an effect, edit it on its AE sheet, and add a **check** entry (set a label, attribute, difficulty; optionally a resolve cost).
3. Back on the character sheet, **expand** that effect's row.
4. Confirm a check button (`.item-check-button`) and its stat tags appear, matching item check rows.
5. Click the check button. Confirm a check chat card posts and renders without console errors. With a resolve cost set, confirm the resolve-cost affordance behaves like item checks (auto-spend vs. split button per the "auto spend resolve" setting).
6. Confirm the resulting card shows the effect's description.
7. Confirm an effect with **no** checks shows no checks section.

Expected: all confirmations hold; no uncaught errors in the console.

- [ ] **Step 2: Remove backlog item #4**

In `docs/superpowers/BACKLOG.md`, delete the `### 4. Effect check-rolling from the character-sheet row` section (the heading and its bullet list). Leave the surrounding items intact. (Renumbering the remaining items is optional and not required — they are reference labels, not load-bearing.)

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/BACKLOG.md
git commit -m "docs(backlog): remove shipped item #4 (effect check-rolling)"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** data-model `description` → Task 1; `CharacterSheetEffectCheck` → Task 2; `CharacterSheetEffectChecks` → Task 3; row wiring → Task 4; testing (engine passthrough + description) → Task 5; manual UI + out-of-scope confirmation → Task 6. The spec's "no engine changes" principle is honored — no task touches `CharacterDataModel` or the check classes.
- **Type/name consistency:** `effectId`/`checkIdx` props match between Tasks 2 and 3; `CharacterSheetEffectChecks` (Task 3) is the exact name imported in Task 4; `getCheckOptions`/`rollEffectCheck` are defined and used within Task 2 only; `effect.id` is used consistently (matching `CharacterSheetEffectList`).
- **Placeholders:** none — every code and test step contains complete content.
