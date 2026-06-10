import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   controlFixtureActorToken,
   deleteFixtureActor,
   deleteOrphanedTokens,
   newestMessageType,
} from './world.js';

/**
 * Embedded-context conversion lock (Stage 3, cross-surface check-tag parity): the shared CheckTags
 * component (src/document/svelte-components/check/CheckTags.svelte) renders a check's intrinsic tags
 * (attribute, resolve cost, resisted-by, opposed) from the nearest 'document' context on four
 * surfaces — the item-sheet sidebar (top-level 'document'), the character-sheet item and effect
 * check rows (embedded via EmbeddedDocumentProvider, with the actor-resolved attribute override),
 * and the Effect HUD (reusing the effect row's checks). This spec is the VALUE-parity lock: it
 * captures the four `check-tags-*` testId values on one surface and asserts the paired surface
 * renders identical text, anchored by presence and non-empty assertions on BOTH sides so a missing
 * tag can never pass vacuously. It also locks the roll path routed through 'sheetDocument' from the
 * character-sheet equipment row (with a rendered-card assertion) and from the expanded HUD row.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Check Parity Actor';

/** @type {string} Name of the seeded equipment item carrying the full intrinsic check. */
const ITEM_NAME = 'E2E Parity Equipment';

/** @type {string} Name of the seeded effect-subtype Active Effect carrying the same check config. */
const EFFECT_NAME = 'E2E Parity Effect';

/** @type {string} Label of the equipment item's seeded check (rendered on its ItemCheckButton). */
const ITEM_CHECK_LABEL = 'E2E Parity Item Check';

/** @type {string} Label of the effect's seeded check (rendered on its ItemCheckButton). */
const EFFECT_CHECK_LABEL = 'E2E Parity Effect Check';

/** @type {string[]} The four CheckTags testIds whose rendered values are compared across surfaces. */
const CHECK_TAG_TEST_IDS = [
   'check-tags-attribute',
   'check-tags-resolve-cost',
   'check-tags-resisted-by',
   'check-tags-opposed',
];

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {{itemId: string, effectId: string}} Seeded document ids (rebuilt fresh each test). */
let fixtureIds;
/** @type {string|undefined} Id of the scene created by the HUD token fallback (removed in afterAll). */
let fallbackSceneId;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // One-time sweep of orphaned fixture tokens left behind by prior runs (TODO #18).
   await deleteOrphanedTokens(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('cross-surface check-tag parity', () => {
   // Build a fresh fixture actor owning one equipment item and one effect, both carrying the SAME
   // complete check config with the FULL intrinsic set (so all four CheckTags render), then default
   // the gating setting off.
   test.beforeEach(async () => {
      // Precondition: the TITAN system must have initialized before any sheet or HUD interaction.
      /** @type {boolean} Whether the TITAN system finished initializing in the shared page. */
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before the parity walk. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);

      // Remove any stale fixture (and its scene tokens) from a prior run or a prior test.
      await deleteFixtureActor(page, ACTOR_NAME);

      // The shared buildCheck factory seeds the FULL intrinsic set so all four CheckTags render:
      // resolveCost 2, resistanceCheck 'reflexes', and an enabled mind/perception opposed check. The
      // attribute is concrete ('body', not 'default'), so the actor-resolved attribute on actor
      // surfaces must match the config read.
      fixtureIds = await page.evaluate(async ({
         actorName,
         itemName,
         effectName,
         itemCheck,
         effectCheck,
      }) => {
         // Seed the fresh player actor, its equipment item, and its effect-subtype Active Effect.
         const actor = await Actor.create({
            name: actorName,
            type: 'player',
         });
         const [item] = await actor.createEmbeddedDocuments('Item', [
            {
               name: itemName,
               type: 'equipment',
               system: {
                  check: [itemCheck],
               },
            },
         ]);
         const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               disabled: false,
               system: {
                  check: [effectCheck],
               },
            },
         ]);

         // Default the gating setting off so roll clicks post straight to chat.
         await game.settings.set('titan', 'getCheckOptions', false);

         return {
            itemId: item.id,
            effectId: effect.id,
         };
      }, {
         actorName: ACTOR_NAME,
         itemName: ITEM_NAME,
         effectName: EFFECT_NAME,
         itemCheck: buildCheck(ITEM_CHECK_LABEL, 'e2e-parity-item-check'),
         effectCheck: buildCheck(EFFECT_CHECK_LABEL, 'e2e-parity-effect-check'),
      });
   });

   // Unconditionally restore the gating setting: a mid-test failure must not leak `getCheckOptions`
   // into later tests or spec files (house pattern per embedded-context-items.spec.js).
   test.afterEach(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
      });
   });

   // In-file final-state hygiene (house pattern): re-assert the suite's test-default setting and
   // remove the fixture actor (and its scene token) once the describe completes. The setting is
   // client-scope and this spec's browser context is file-local, so nothing crosses spec files.
   // Inner-scope after-hooks run before the file-level page close, so `page` is still open.
   test.afterAll(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
      });
      await deleteFixtureActor(page, ACTOR_NAME);

      // Remove the fallback scene when a HUD case had to create one (the shared world normally has
      // an active scene, so this is usually a no-op).
      if (fallbackSceneId) {
         await page.evaluate(async (sceneId) => {
            await game.scenes.get(sceneId)?.delete();
         }, fallbackSceneId);
      }
   });

   /**
    * Opens the seeded equipment's ITEM sheet (closing other apps first so the Titan sheet root is
    * unambiguous) and waits for the Svelte mount. The sidebar check needs no expand click:
    * createTitanItemSheetData seeds `sidebar.checks.isExpanded` true per existing check, so the tags
    * mount visible (clicking the toggle here would COLLAPSE them and race the slide-out transition).
    * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
    */
   async function openEquipmentItemSheet() {
      await closeAllApps(page);
      await page.evaluate(async ({ actorName, itemId }) => {
         const item = game.actors.getName(actorName).items.get(itemId);
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'item sheet mounted' },
         );
      }, {
         actorName: ACTOR_NAME,
         itemId: fixtureIds.itemId,
      });
      return page.locator('.application.titan-document-sheet');
   }

   /**
    * Opens the fixture actor's character sheet (closing other apps first so the Titan sheet root is
    * unambiguous), waits for the Svelte mount, and activates the given tab via a click SCOPED to the
    * sheet root — the tab labels can also appear on other surfaces, so a page-global text click is
    * banned.
    * @param {string} tab - The localized tab label to activate (Inventory or Effects).
    * @returns {Promise<import('@playwright/test').Locator>} The character-sheet application root locator.
    */
   async function openCharacterSheetTab(tab) {
      await closeAllApps(page);
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ACTOR_NAME);

      /** @type {import('@playwright/test').Locator} The character-sheet root (the only sheet open). */
      const sheet = page.locator('.application.titan-document-sheet');
      await sheet.getByText(tab, { exact: true }).first().click();
      return sheet;
   }

   /**
    * Opens the character sheet's Inventory tab, asserts the seeded equipment row renders, and
    * expands it. The expand state is keyed by item id inside the sheet's per-render application
    * state and the fixture is re-created each test, so the row is known to mount collapsed — this is
    * the only expander click.
    * @returns {Promise<import('@playwright/test').Locator>} The expanded equipment-row locator.
    */
   async function openExpandedEquipmentRow() {
      /** @type {import('@playwright/test').Locator} The open character-sheet root. */
      const sheet = await openCharacterSheetTab('Inventory');

      /** @type {import('@playwright/test').Locator} The seeded equipment's list row (id-keyed). */
      const row = sheet.locator(`[data-item-id="${fixtureIds.itemId}"]`);
      await expect(row, 'equipment row renders').toBeVisible();

      // The expand toggle is the row-header label button (house-pattern CSS path shared with the
      // sibling row specs).
      await row.locator('.header .label .button button').first().click();
      await expect(row.locator('.expandable-content'), 'equipment expandable content mounts').toBeVisible();
      return row;
   }

   /**
    * Mounts the Effect HUD for the fixture actor and expands its single effect row. HUD rows hold
    * local collapsed expand state and the HUD is freshly resolved per test, so the row is known to
    * mount collapsed — this is the only header click.
    * @returns {Promise<import('@playwright/test').Locator>} The mounted HUD panel locator.
    */
   async function openExpandedHudRow() {
      // Close any open sheets first: the HUD is fixed-position in the bottom-right corner, and an
      // overlapping AppV2 window could intercept its clicks on a long shared-page session.
      await closeAllApps(page);

      // Precondition: the HUD controller must be attached at ready — without a controlled token a
      // GM-login HUD null-resolves and every "renders" assertion would pass falsely.
      /** @type {boolean} Whether the TITAN effect HUD controller exists on the game object. */
      const hudReady = await page.evaluate(() => typeof game.titan?.effectHud !== 'undefined');
      expect(hudReady, 'TITAN effect HUD controller must be attached at ready').toBe(true);

      // Place and control the fixture token (throws if the placeable never draws); remember the
      // first fallback-created scene so afterAll can remove it from the world.
      /** @type {string|null} The fallback scene's id when this call had to create one, else null. */
      const createdSceneId = await controlFixtureActorToken(page, {
         actorName: ACTOR_NAME,
         fallbackSceneName: 'E2E Check Parity Scene',
      });
      if (createdSceneId && !fallbackSceneId) {
         fallbackSceneId = createdSceneId;
      }

      /** @type {import('@playwright/test').Locator} The mounted HUD panel. */
      const panel = page.locator('#titan-effect-hud .titan-effect-hud');
      await expect(panel, 'HUD panel mounts for the controlled token actor').toBeVisible();

      // POSITIVE signal first: the header must show the seeded effect before the expander click.
      /** @type {import('@playwright/test').Locator} The effect row's header button. */
      const rowHeader = panel.locator('.row .row-header');
      await expect(rowHeader.locator('.name'), 'HUD row header shows the seeded effect').toHaveText(EFFECT_NAME);
      await rowHeader.click();
      return panel;
   }

   /**
    * Normalizes a rendered tag's text for cross-surface comparison: collapses whitespace runs (the
    * surrounding markup indentation differs per surface) and trims the ends.
    * @param {string|null} text - The raw textContent read from a tag root.
    * @returns {string} The normalized text.
    */
   function normalizeTagText(text) {
      return (text ?? '').replace(/\s+/g, ' ').trim();
   }

   /**
    * Captures the four CheckTags values under the given surface scope. The rendered `check-tags-*`
    * ids are first asserted set-equal to the expected list, then each tag is presence-asserted
    * (visible) BEFORE its text is read and each captured value is asserted non-empty, so a parity
    * comparison built from two captures can never pass vacuously on a missing, extra, or blank tag.
    * @param {import('@playwright/test').Locator} scope - A locator containing exactly one CheckTags render.
    * @param {string} surface - Human-readable surface name for the per-assertion messages.
    * @returns {Promise<{[testId: string]: string}>} Whitespace-normalized tag texts keyed by testId.
    */
   async function captureCheckTagValues(scope, surface) {
      // SET-EQUALITY GUARD (auto-retrying poll — the tags may still be mounting): the rendered
      // `check-tags-*` ids must be exactly the expected list, so a component-side tag addition or
      // rename fails loudly here and forces a deliberate CHECK_TAG_TEST_IDS update instead of
      // silently escaping the parity net. Sorted-array equality also rejects duplicate renders.
      await expect
         .poll(
            () => scope
               .locator('[data-testid^="check-tags-"]')
               .evaluateAll((elements) => elements.map((element) => element.dataset.testid).sort()),
            { message: `${surface} renders exactly the expected check-tags testIds` },
         )
         .toEqual([...CHECK_TAG_TEST_IDS].sort());

      /** @type {{[testId: string]: string}} The captured tag texts keyed by testId. */
      const values = {};
      for (const testId of CHECK_TAG_TEST_IDS) {
         /** @type {import('@playwright/test').Locator} The tag root carrying this testId. */
         const tag = scope.getByTestId(testId);
         await expect(tag, `${surface} renders ${testId}`).toBeVisible();

         // Non-retrying read, anchored by the auto-retrying visibility assertion above.
         values[testId] = normalizeTagText(await tag.textContent());
         expect(values[testId], `${surface} ${testId} renders non-empty text`).not.toBe('');
      }
      return values;
   }

   test('equipment check tags render identical values on the item sheet and the character sheet', async () => {
      // ITEM SHEET SIDEBAR: the sidebar check is seeded expanded, so the tags are visible at mount.
      /** @type {import('@playwright/test').Locator} The equipment item-sheet root. */
      const itemSheet = await openEquipmentItemSheet();
      /** @type {{[testId: string]: string}} The item-sheet sidebar's captured tag values. */
      const sidebarValues = await captureCheckTagValues(itemSheet, 'item-sheet sidebar');

      // CHARACTER SHEET: the expanded equipment row renders the SAME shared component.
      /** @type {import('@playwright/test').Locator} The expanded equipment row. */
      const row = await openExpandedEquipmentRow();
      /** @type {{[testId: string]: string}} The character-sheet row's captured tag values. */
      const rowValues = await captureCheckTagValues(row, 'character-sheet equipment row');

      // VALUE PARITY: each of the four tags renders identical text on both surfaces (both captures
      // are presence-anchored above, so this loop cannot pass vacuously on missing tags). The seeded
      // attribute is concrete ('body', not 'default'), so the actor-resolved attribute override on
      // the character-sheet surface must render the same attribute text as the item-sheet config read.
      for (const testId of CHECK_TAG_TEST_IDS) {
         expect(
            rowValues[testId],
            `${testId}: character-sheet equipment row must equal item-sheet sidebar`,
         ).toBe(sidebarValues[testId]);
      }

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('effect check tags render identical values on the character sheet and the Effect HUD', async () => {
      // CHARACTER SHEET: open the Effects tab and expand the seeded effect row (rows seed collapsed,
      // so this is the only expander click).
      /** @type {import('@playwright/test').Locator} The open character-sheet root. */
      const sheet = await openCharacterSheetTab('Effects');
      /** @type {import('@playwright/test').Locator} The seeded effect's list row (id-keyed). */
      const row = sheet.locator(`[data-effect-id="${fixtureIds.effectId}"]`);
      await expect(row, 'effect row renders').toBeVisible();
      await row.locator('.header .label .button button').first().click();

      /** @type {{[testId: string]: string}} The character-sheet effect row's captured tag values. */
      const rowValues = await captureCheckTagValues(row, 'character-sheet effect row');

      // EFFECT HUD: the expanded HUD row reuses the effect row's checks through the same contexts.
      /** @type {import('@playwright/test').Locator} The mounted HUD panel with its row expanded. */
      const panel = await openExpandedHudRow();
      /** @type {{[testId: string]: string}} The HUD row's captured tag values. */
      const hudValues = await captureCheckTagValues(panel, 'Effect HUD row');

      // VALUE PARITY: each of the four tags renders identical text on both surfaces (both captures
      // are presence-anchored above, so this loop cannot pass vacuously on missing tags).
      for (const testId of CHECK_TAG_TEST_IDS) {
         expect(
            hudValues[testId],
            `${testId}: Effect HUD row must equal character-sheet effect row`,
         ).toBe(rowValues[testId]);
      }

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('character-sheet equipment check roll posts a rendered itemCheck card', async () => {
      /** @type {import('@playwright/test').Locator} The expanded equipment row. */
      const row = await openExpandedEquipmentRow();

      // ROLL: with the check-options dialog gated off (seeded), the check button's click rolls
      // straight through the actor routed via 'sheetDocument' and posts the itemCheck subtype.
      /** @type {number} The world message count before the roll click. */
      const beforeRoll = await page.evaluate(() => game.messages.size);
      await row.getByRole('button').filter({ hasText: ITEM_CHECK_LABEL }).first().click();
      await expect
         .poll(
            () => newestMessageType(page, beforeRoll),
            { message: 'roll posts an itemCheck message' },
         )
         .toBe('itemCheck');

      // The auto-spend resolve path may post a spendResolveReport BEFORE the check, but _rollCheck
      // awaits the spend before posting the check itself, so the itemCheck observed above is final;
      // re-reading its identity here is anchored by the satisfied poll.
      /** @type {{id: string|undefined, type: string|undefined}} The newest message's identity. */
      const newest = await page.evaluate(() => ({
         id: game.messages.contents[game.messages.size - 1]?.id,
         type: game.messages.contents[game.messages.size - 1]?.type,
      }));
      expect(newest.type, 'newest message stays the itemCheck').toBe('itemCheck');

      // FUNCTIONALITY: the self-rendering subtype mounts non-empty card content in the chat log
      // (the card header renders the seeded check label).
      /** @type {import('@playwright/test').Locator} The mounted check card (first visible mount). */
      const card = page.locator(`.message[data-message-id="${newest.id}"] .check-chat-message`).first();
      await expect(card, 'itemCheck card mounts').toBeVisible();
      await expect(card, 'itemCheck card renders the check label').toContainText(ITEM_CHECK_LABEL);

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('Effect HUD check roll posts an itemCheck message', async () => {
      /** @type {import('@playwright/test').Locator} The mounted HUD panel with its row expanded. */
      const panel = await openExpandedHudRow();

      // POSITIVE signal first: the embedded check's roll button renders in the expanded row.
      /** @type {import('@playwright/test').Locator} The HUD row's embedded check roll button. */
      const checkButton = panel.getByRole('button').filter({ hasText: EFFECT_CHECK_LABEL }).first();
      await expect(checkButton, 'expanded HUD row renders the embedded check').toBeVisible();

      // ROLL: with the check-options dialog gated off (seeded), the click rolls through the HUD's
      // 'sheetDocument' actor bridge and posts the itemCheck subtype.
      /** @type {number} The world message count before the roll click. */
      const beforeRoll = await page.evaluate(() => game.messages.size);
      await checkButton.click();
      await expect
         .poll(
            () => newestMessageType(page, beforeRoll),
            { message: 'HUD check roll posts an itemCheck message' },
         )
         .toBe('itemCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
