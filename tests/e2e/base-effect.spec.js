import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addEffect,
   applyCondition,
   controlPlacedToken,
   createActor,
   createCompendium,
   createOwnedItem,
   createScene,
   effectActiveToggle,
   hudEffectToggleIcon,
   openTrayPack,
   placeToken,
   readServerDocument,
   removeCondition,
   setAttributeBase,
   unlinkPlacedToken,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, closeAllApps, reloadWorld } from './world.js';

/**
 * A third party's `base` Active Effect (core's own type) on a TITAN actor, an item, a token and a pack: TITAN
 * stores it, loads it after a reload, lists it as a plain row (name, image, core's `disabled` toggle, open and delete
 * controls) that opens core's default effect sheet, and never uses it in its stats, while core applies its native
 * `changes`.
 *
 * EXCEPTION to "documents come from real flows": a `base` effect has no TITAN creation control (TITAN offers only the
 * `effect` and `condition` subtypes), so each one is created through the document API as a module would create it
 * (invalid-data / module-made data). Each carries a name and the type, as a module's minimal call has it; the main
 * actor's also carries the `prone` status and TITAN's description flag, as a foreign export may. Everything it sits
 * on is made through flows: the scene, the actors, the token, the owned ability, the effect pack and the TITAN
 * `effect` that proves the lists render other effects. Every edit after the creation goes through a control (the Add
 * change button and the form of core's Active Effect Config sheet, the rows' toggle and delete buttons), except the
 * deletion of the base effects that the native-change tests remove, which the document API deletes.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The scene the tokens stand on. */
let sceneId;
/** @type {Record<string, string>} The ids of the actors, by `main`, `hud` and `token`. */
const actorIds = {};
/** @type {Record<string, string>} The ids of the placed tokens, by `main`, `hud` and `token`. */
const tokenIds = {};
/** @type {string} The TITAN effect on the main actor. */
let markerId;
/** @type {string} The base effect on the main actor. */
let baseId;
/** @type {string} The ability the main actor owns. */
let abilityId;
/** @type {string} The base effect on the ability. */
let abilityBaseId;
/** @type {string} The TITAN effect on the HUD actor. */
let hudMarkerId;
/** @type {string} The base effect on the HUD actor. */
let hudBaseId;
/** @type {string} The base effect on the unlinked token's synthetic actor. */
let tokenBaseId;
/** @type {string} The derived stats of the main actor before its base effects, as JSON. */
let baselineDerived;
/** @type {number} The main actor's Awareness rating before any native change. */
let baselineAwareness;

/** @type {number} The run stamp in every fixture name, so a worker restart that repeats the hook finds no duplicate. */
const RUN = Date.now();

/** @type {string} The name of the base effect on the main actor. */
const BASE_NAME = `E2E Base Effect ${RUN}`;

/** @type {string} The key a native change targets: a TITAN stat that core's change pipeline can reach. */
const NATIVE_KEY = 'system.rating.awareness.mod.static';

/**
 * Selects an element of the Player HUD by its test id.
 * @param {string} id - The test id.
 * @returns {import('@playwright/test').Locator} The element.
 */
function hud(id) {
   return page.locator(`[data-testid="${id}"]`);
}

/**
 * Reads the derived stats of the main actor that rules elements and effects feed.
 * @returns {Promise<string>} The stats as JSON.
 */
function readDerived() {
   return page.evaluate((actorId) => {
      /** @type {Actor} The main actor. */
      const actor = game.actors.get(actorId);
      return JSON.stringify({
         rating: actor.system.rating,
         attribute: actor.system.attribute,
         resource: actor.system.resource,
         resistance: actor.system.resistance,
         speed: actor.system.speed,
         skill: actor.system.skill,
         mod: actor.system.mod,
      });
   }, actorIds.main);
}

/**
 * Reads the main actor's Awareness rating.
 * @returns {Promise<number>} The rating's value.
 */
function readAwareness() {
   return page.evaluate((actorId) => game.actors.get(actorId).system.rating.awareness.value, actorIds.main);
}

/**
 * Creates a `base` Active Effect on a document through the document API, as a module would.
 * @param {string} parentUuid - The uuid of the actor or item that receives the effect.
 * @param {string} name - The label the effect carries.
 * @param {object} [extra] - More creation data, as a foreign export carries it (`statuses`, `flags`).
 * @returns {Promise<string>} The new effect's id.
 */
function createBaseEffect(parentUuid, name, extra = {}) {
   return page.evaluate(async ({ parentUuid, name, extra }) => {
      /** @type {foundry.abstract.Document} The actor or item. */
      const parent = await fromUuid(parentUuid);

      /** @type {ActiveEffect[]} The created effects. */
      const created = await parent.createEmbeddedDocuments('ActiveEffect', [{
         ...extra,
         name,
         type: 'base',
      }]);
      return created[0]?.id ?? '';
   }, {
      parentUuid,
      name,
      extra,
   });
}

/**
 * Asserts that the main actor holds its base effect, with the foreign data it was created with, so that an assertion
 * of absence or of unchanged stats that follows is about an effect that exists.
 * @returns {Promise<void>} Resolves once asserted.
 */
async function expectBaseEffectHeld() {
   expect(baseId, 'the base effect was created').not.toBe('');
   expect(
      await page.evaluate(({ actorId, effectId }) => {
         /** @type {ActiveEffect|undefined} The base effect. */
         const effect = game.actors.get(actorId).effects.get(effectId);
         return effect && {
            type: effect.type,
            statuses: [...effect.statuses],
            description: effect.flags.titan?.description,
            actorStatus: game.actors.get(actorId).statuses.has('prone'),
         };
      }, {
         actorId: actorIds.main,
         effectId: baseId,
      }),
      'the actor holds the base effect with its foreign data',
   ).toEqual({
      type: 'base',
      statuses: ['prone'],
      description: 'E2E foreign description',
      actorStatus: true,
   });
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);

   sceneId = await createScene(page, { name: `E2E Base Scene ${RUN}` });
   await viewScene(page, sceneId);
   actorIds.main = await createActor(page, {
      name: `E2E Base Main ${RUN}`,
      type: 'player',
   });
   actorIds.hud = await createActor(page, {
      name: `E2E Base Hud ${RUN}`,
      type: 'player',
   });
   actorIds.token = await createActor(page, {
      name: `E2E Base Token ${RUN}`,
      type: 'player',
   });
   for (const key of Object.keys(actorIds)) {
      tokenIds[key] = await placeToken(page, actorIds[key]);
   }
   markerId = await addEffect(page, actorIds.main, `E2E Base Marker ${RUN}`);
   hudMarkerId = await addEffect(page, actorIds.hud, `E2E Base Hud Marker ${RUN}`);
   abilityId = await createOwnedItem(page, actorIds.main, 'ability', `E2E Base Ability ${RUN}`);

   // Attributes of 8, so that a condition's quarter-of-base penalty (2) shows in the derived ratings.
   for (const attribute of [
      'body',
      'mind',
      'soul',
   ]) {
      await setAttributeBase(page, `Actor.${actorIds.main}`, attribute, 8);
   }
   await closeAllApps(page);

   baselineDerived = await readDerived();
   baselineAwareness = await readAwareness();

   // The module-made effects: on the actor, on its owned ability, on a second actor, and on an unlinked token's actor.
   // The main actor's carries the data of a foreign export that TITAN would read if it read `base` effects: the
   // `prone` status (a TITAN condition id, whose rules lower Melee and Accuracy) and TITAN's description flag.
   baseId = await createBaseEffect(`Actor.${actorIds.main}`, BASE_NAME, {
      statuses: ['prone'],
      flags: { titan: { description: 'E2E foreign description' } },
   });
   abilityBaseId = await createBaseEffect(`Actor.${actorIds.main}.Item.${abilityId}`, `E2E Base Ability Effect ${RUN}`);
   hudBaseId = await createBaseEffect(`Actor.${actorIds.hud}`, `E2E Base Hud Effect ${RUN}`);
   await unlinkPlacedToken(page, tokenIds.token);
   await closeAllApps(page);
   tokenBaseId = await page.evaluate(async ({ sceneId, tokenId }) => {
      /** @type {Actor} The token's synthetic actor. */
      const actor = game.scenes.get(sceneId).tokens.get(tokenId).actor;
      const created = await actor.createEmbeddedDocuments('ActiveEffect', [{
         name: 'E2E Base Token Effect',
         type: 'base',
      }]);
      return created[0]?.id ?? '';
   }, {
      sceneId,
      tokenId: tokenIds.token,
   });
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('storage', () => {
   test('every base effect was created, and the server holds each one as the base type', async () => {
      for (const id of [
         baseId,
         hudBaseId,
         tokenBaseId,
         abilityBaseId,
      ]) {
         expect(id, 'the creation returned an effect id').not.toBe('');
      }
      expect((await readServerDocument(page, `Actor.${actorIds.main}.ActiveEffect.${baseId}`)).type).toBe('base');
      expect(
         (await readServerDocument(
            page,
            `Actor.${actorIds.main}.Item.${abilityId}.ActiveEffect.${abilityBaseId}`,
         )).type,
      ).toBe('base');
      expect((await readServerDocument(page, `Actor.${actorIds.hud}.ActiveEffect.${hudBaseId}`)).type).toBe('base');
   });

   test('the base effects load after a reload, with no invalid document', async () => {
      await reloadWorld(page);
      const state = await page.evaluate(({ actorIds, sceneId, tokenId, abilityId }) => {
         /** @type {Actor} The main actor. */
         const main = game.actors.get(actorIds.main);

         /** @type {Actor} The unlinked token's synthetic actor. */
         const tokenActor = game.scenes.get(sceneId).tokens.get(tokenId).actor;
         return {
            mainTypes: main.effects.map((effect) => `${effect.type}:${effect.name}`).sort(),
            mainInvalid: [...main.effects.invalidDocumentIds],
            baseSystemClass: main.effects.find((effect) => effect.type === 'base').system.constructor.name,
            abilityTypes: main.items.get(abilityId).effects.map((effect) => effect.type),
            abilityInvalid: [...main.items.get(abilityId).effects.invalidDocumentIds],
            hudTypes: game.actors.get(actorIds.hud).effects.map((effect) => effect.type).sort(),
            tokenTypes: tokenActor.effects.map((effect) => effect.type),
            tokenInvalid: [...tokenActor.effects.invalidDocumentIds],
            ready: game.ready,
         };
      }, {
         actorIds,
         sceneId,
         tokenId: tokenIds.token,
         abilityId,
      });
      expect(state.ready).toBe(true);
      expect(state.mainTypes).toEqual([
         `base:${BASE_NAME}`,
         `effect:E2E Base Marker ${RUN}`,
      ]);
      expect(state.mainInvalid).toEqual([]);
      expect(state.baseSystemClass, 'the system of a base effect is core\'s model')
         .toBe('ActiveEffectTypeDataModel');
      expect(state.abilityTypes).toEqual(['base']);
      expect(state.abilityInvalid).toEqual([]);
      expect(state.hudTypes).toEqual([
         'base',
         'effect',
      ]);
      expect(state.tokenTypes).toEqual(['base']);
      expect(state.tokenInvalid).toEqual([]);
   });
});

test.describe('TITAN never uses a base effect', () => {
   test('the derived stats and conditions are those of the actor without it', async () => {
      await expectBaseEffectHeld();
      // Checks only that listing the base effect leaves the derived stats unchanged.
      // Not mutation-proven. Inferred: a base effect carries no rules elements, so no plausible regression changes
      // them.
      expect(await readDerived(), 'the stats equal those before the effect').toBe(baselineDerived);
      expect(
         await page.evaluate((actorId) => game.actors.get(actorId).system.getConditions(), actorIds.main),
         'the `prone` status makes no TITAN condition',
      ).toBeNull();

      // Control: a TITAN condition changes the same stats, so equal stats above mean the base effect was not read.
      await viewScene(page, sceneId);
      await applyCondition(page, tokenIds.main, 'blinded');
      try {
         await expect.poll(readDerived, { message: 'the Blinded condition changed the stats' })
            .not.toBe(baselineDerived);
      }
      finally {
         await removeCondition(page, tokenIds.main, 'blinded');
      }
      await expect.poll(readDerived, { message: 'the stats return once the condition is removed' })
         .toBe(baselineDerived);
   });

   test('the Effects tab lists the TITAN effect and the base effect, and the stats stay those without it', async () => {
      /** @type {import('@playwright/test').Locator} The main actor's sheet. */
      const sheet = await openSheetByUuid(page, `Actor.${actorIds.main}`);
      await expectBaseEffectHeld();
      await clickSheetTab(sheet, 'Effects');
      await expect(sheet.locator(`[data-effect-id="${markerId}"]`), 'the TITAN effect has a row').toBeVisible();
      await expect(sheet.locator(`[data-effect-id="${baseId}"]`), 'the base effect has a row').toBeVisible();
      await expect(sheet.locator('li.effect')).toHaveCount(2);
      // Checks only that listing the base effect in the Effects tab leaves the derived stats unchanged.
      // Not mutation-proven. Inferred: a base effect carries no rules elements, so no plausible regression changes
      // them.
      expect(await readDerived(), 'the listed base effect leaves the stats as they were').toBe(baselineDerived);
   });

   test('the Player HUD lists the TITAN effect and the base effect, and only the TITAN effect has a menu option',
      async () => {
         await expectBaseEffectHeld();
         await viewScene(page, sceneId);
         await controlPlacedToken(page, tokenIds.main);
         await expect(hud('player-hud-effects-panel')).toBeVisible();
         await expect(hud('player-hud-effect-row')).toHaveCount(2);
         await expect(hud('player-hud-effect-row').filter({ hasText: `E2E Base Marker ${RUN}` })).toHaveCount(1);
         await expect(hud('player-hud-effect-row').filter({ hasText: BASE_NAME })).toHaveCount(1);

         // The menu lists only effects with checks by default; the filter is off so that an effect without a check
         // shows.
         await setClientSetting(page, 'playerHudOptions', { actionMenu: { filters: { effectsWithChecks: false } } });
         try {
            await hud('player-hud-category-effects').click();
            await expect(hud(`player-hud-sub-option-effects-${markerId}`), 'the TITAN effect has a sub-option')
               .toBeVisible();
            await expect(hud(`player-hud-sub-option-effects-${baseId}`)).toHaveCount(0);
            await expect(page.locator('[data-testid^="player-hud-sub-option-effects-"]')).toHaveCount(1);
         }
         finally {
            await setClientSetting(page, 'playerHudOptions', {});
         }
      });

   test('the Effects panel stays while only a base effect is left', async () => {
      await viewScene(page, sceneId);
      await controlPlacedToken(page, tokenIds.hud);
      await expect(hud('player-hud-effects-panel'), 'the panel shows while a TITAN effect is there').toBeVisible();
      await expect(hud('player-hud-effect-row')).toHaveCount(2);

      // The HUD row's Delete control and its confirmation remove the TITAN effect.
      /** @type {import('@playwright/test').Locator} The TITAN effect's row. */
      const row = hud('player-hud-effect-row').filter({ hasText: `E2E Base Hud Marker ${RUN}` });
      await row.getByRole('button', { name: /: Expand$/ }).click();
      await expect(row.getByRole('button', { name: /: Collapse$/ }), 'the row is expanded').toBeVisible();
      await row.locator('[data-testid="player-hud-effect-delete"]').click();
      /** @type {import('@playwright/test').Locator} The confirmation dialog. */
      const dialog = page.locator('.application.titan-dialog[id^="titan-confirmation-dialog"]');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete Effect' }).click();
      await expect.poll(
         () => page.evaluate(
            ({ actorId, effectId }) => game.actors.get(actorId).effects.has(effectId),
            {
               actorId: actorIds.hud,
               effectId: hudMarkerId,
            },
         ),
         { message: 'the TITAN effect is gone' },
      ).toBe(false);
      expect(
         await page.evaluate(
            ({ actorId, effectId }) => game.actors.get(actorId).effects.get(effectId)?.type,
            {
               actorId: actorIds.hud,
               effectId: hudBaseId,
            },
         ),
         'the base effect is still stored',
      ).toBe('base');
      await expect(hud('player-hud-effect-row'), 'only the base effect has a row').toHaveCount(1);
      await expect(hud('player-hud-effect-row')).toContainText(`E2E Base Hud Effect ${RUN}`);
      await expect(hud('player-hud-effects-panel'), 'the panel stays for the base effect').toBeVisible();
   });
});

test.describe('the row of a base effect', () => {
   /**
    * Opens the main actor's Effects tab.
    * @returns {Promise<import('@playwright/test').Locator>} The actor's sheet.
    */
   async function openEffectsTab() {
      /** @type {import('@playwright/test').Locator} The main actor's sheet. */
      const sheet = await openSheetByUuid(page, `Actor.${actorIds.main}`);
      await clickSheetTab(sheet, 'Effects');
      return sheet;
   }

   /**
    * Selects the Active Effect Config sheet of one effect: an application's element id ends in its document's id.
    * @param {string} effectId - The id the sheet's element id ends in.
    * @returns {import('@playwright/test').Locator} The sheet's window element.
    */
   function configOf(effectId) {
      return page.locator(`.application.active-effect-config[id$="-ActiveEffect-${effectId}"]`);
   }

   /**
    * Reads whether the server holds the base effect disabled.
    * @param {string} uuid - The uuid of the base effect.
    * @returns {Promise<boolean>} The stored `disabled` flag.
    */
   async function readDisabled(uuid) {
      return (await readServerDocument(page, uuid)).disabled;
   }

   /**
    * Reads the image of the main actor's base effect.
    * @returns {Promise<string>} The effect's image path.
    */
   function readBaseImage() {
      return page.evaluate(
         ({ actorId, effectId }) => game.actors.get(actorId).effects.get(effectId).img,
         {
            actorId: actorIds.main,
            effectId: baseId,
         },
      );
   }

   test('a base effect resolves to core\'s Active Effect Config class', async () => {
      expect(
         await page.evaluate(({ actorId, effectId }) => {
            /** @type {ActiveEffect} The base effect. */
            const effect = game.actors.get(actorId).effects.get(effectId);
            return {
               name: effect.sheet.constructor.name,
               isCore: effect.sheet instanceof foundry.applications.sheets.ActiveEffectConfig,
            };
         }, {
            actorId: actorIds.main,
            effectId: baseId,
         }),
      ).toEqual({
         name: 'ActiveEffectConfig',
         isCore: true,
      });
   });

   test('the sheet row shows the name, image, toggle, open and delete controls and no TITAN control', async () => {
      /** @type {import('@playwright/test').Locator} The main actor's sheet. */
      const sheet = await openEffectsTab();
      /** @type {import('@playwright/test').Locator} The base effect's row. */
      const row = sheet.locator(`li.effect[data-effect-id="${baseId}"]`);
      await expect(row, 'the base effect has a row').toBeVisible();
      await expect(row).toContainText(BASE_NAME);

      /** @type {string} The effect's image. */
      const img = await readBaseImage();
      expect(img, 'the effect has an image').toBeTruthy();
      await expect(row.locator('img.item-image')).toHaveAttribute('src', img);
      await expect(effectActiveToggle(sheet, baseId, false), 'the toggle shows the effect active').toBeVisible();
      await expect(row.getByRole('button', { name: 'Edit Item' })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Delete Effect' })).toBeVisible();

      // Control: the TITAN effect's row carries the controls the base row lacks.
      await expect(
         sheet.locator(`li.effect[data-effect-id="${markerId}"]`).getByRole('button', { name: 'Send to Chat' }),
         'the TITAN effect has a Send to Chat control',
      ).toBeVisible();
      await expect(row.getByRole('button', { name: 'Send to Chat' })).toHaveCount(0);
   });

   test('the sheet row toggle switches the stored disabled flag and back', async () => {
      /** @type {string} The uuid of the base effect. */
      const uuid = `Actor.${actorIds.main}.ActiveEffect.${baseId}`;
      /** @type {import('@playwright/test').Locator} The main actor's sheet. */
      const sheet = await openEffectsTab();
      expect(await readDisabled(uuid), 'the server holds the effect enabled').toBe(false);
      try {
         await effectActiveToggle(sheet, baseId, false).click();
         await expect.poll(() => readDisabled(uuid), { message: 'the toggle stored the effect disabled' }).toBe(true);
         await expect(effectActiveToggle(sheet, baseId, true), 'the toggle shows the effect inactive').toBeVisible();
      }
      finally {
         if (await readDisabled(uuid)) {
            await effectActiveToggle(sheet, baseId, true).click();
         }
      }
      await expect.poll(() => readDisabled(uuid), { message: 'the toggle stored the effect enabled' }).toBe(false);
      // Checks only that listing and toggling the base effect leaves the derived stats unchanged.
      // Not mutation-proven. Inferred: a base effect carries no rules elements, so no plausible regression changes
      // them.
      expect(await readDerived(), 'the toggles left the stats as they were').toBe(baselineDerived);
   });

   test('the sheet row open control opens core\'s Active Effect Config', async () => {
      /** @type {import('@playwright/test').Locator} The main actor's sheet. */
      const sheet = await openEffectsTab();
      await sheet.locator(`li.effect[data-effect-id="${baseId}"]`).getByRole('button', { name: 'Edit Item' }).click();

      /** @type {import('@playwright/test').Locator} The base effect's own Active Effect Config sheet. */
      const config = configOf(baseId);
      await expect(config).toBeVisible();
      await expect(config.locator('[name="name"]')).toHaveValue(BASE_NAME);
   });

   test('the sheet row delete control removes the stored effect', async () => {
      /** @type {string} The id of an effect made for this test. */
      const id = await createBaseEffect(`Actor.${actorIds.main}`, `E2E Base Delete ${RUN}`);
      expect(id, 'the creation returned an effect id').not.toBe('');
      expect(
         (await readServerDocument(page, `Actor.${actorIds.main}.ActiveEffect.${id}`)).type,
         'the server holds the base effect',
      ).toBe('base');

      /** @type {import('@playwright/test').Locator} The main actor's sheet. */
      const sheet = await openEffectsTab();
      /** @type {import('@playwright/test').Locator} The effect's row. */
      const row = sheet.locator(`li.effect[data-effect-id="${id}"]`);
      await expect(row, 'the effect has a row').toBeVisible();
      await row.getByRole('button', { name: 'Delete Effect' }).click();

      /** @type {import('@playwright/test').Locator} The confirmation dialog. */
      const dialog = page.locator('.application.titan-dialog[id^="titan-confirmation-dialog"]');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete Effect' }).click();
      await expect(row, 'the row is gone').toHaveCount(0);
      // Measured (task-10b-logs/fix2/mutations/g1-local-only-delete.log): a delete that removes the effect from the
      // client collection only leaves the row on screen, so the row-gone assertion fails first; this server read is not
      // separated from it by any mutation.
      await expect.poll(
         async () => (await readServerDocument(page, `Actor.${actorIds.main}`)).effects.some(
            (effect) => effect._id === id,
         ),
         { message: 'the server no longer holds the effect' },
      ).toBe(false);
   });

   test('an expanded row shows the description a base effect carries', async () => {
      /** @type {string} The text of the description the module-made effect carries. */
      const text = `E2E base description ${RUN}`;
      /** @type {string} The name of the effect made for this test. */
      const name = `E2E Base Described ${RUN}`;
      /** @type {string} The id of the effect made for this test. */
      const id = await createBaseEffect(`Actor.${actorIds.main}`, name, { description: `<p>${text}</p>` });
      expect(id, 'the creation returned an effect id').not.toBe('');
      try {
         /** @type {import('@playwright/test').Locator} The main actor's sheet. */
         const sheet = await openEffectsTab();
         /** @type {import('@playwright/test').Locator} The effect's row. */
         const row = sheet.locator(`li.effect[data-effect-id="${id}"]`);
         await expect(row, 'the effect has a row').toBeVisible();
         await row.locator('[data-view-controls] button').click();
         await expect(row.getByText(text), 'the expanded row shows the description').toBeVisible();
         await row.locator('[data-view-controls] button').click();
         await expect(row.getByText(text), 'the collapsed row hides the description').toHaveCount(0);

         await viewScene(page, sceneId);
         await controlPlacedToken(page, tokenIds.main);

         /** @type {import('@playwright/test').Locator} The effect's HUD row. */
         const hudRow = hud('player-hud-effect-row').filter({ hasText: name });
         await expect(hudRow, 'the effect has a HUD row').toBeVisible();
         await hudRow.getByRole('button', { name: /: Expand$/ }).click();
         await expect(hudRow.getByText(text), 'the expanded HUD row shows the description').toBeVisible();
         await hudRow.getByRole('button', { name: /: Collapse$/ }).click();
         await expect(hudRow.getByText(text), 'the collapsed HUD row hides the description').toHaveCount(0);
      }
      finally {
         // A base effect made for one test is removed through the document API, as no test keeps it.
         await page.evaluate(
            ({ actorId, effectId }) => game.actors.get(actorId).effects.get(effectId)?.delete(),
            {
               actorId: actorIds.main,
               effectId: id,
            },
         );
      }
   });

   test('the HUD row expands to the toggle, open and delete controls of a base effect', async () => {
      /** @type {string} The uuid of the base effect. */
      const uuid = `Actor.${actorIds.main}.ActiveEffect.${baseId}`;
      await viewScene(page, sceneId);
      await controlPlacedToken(page, tokenIds.main);

      /** @type {import('@playwright/test').Locator} The base effect's HUD row. */
      const row = hud('player-hud-effect-row').filter({ hasText: BASE_NAME });
      await expect(row, 'the base effect has a HUD row').toBeVisible();
      await row.getByRole('button', { name: /: Expand$/ }).click();
      await expect(row.locator('[data-testid="player-hud-effect-sheet"]')).toBeVisible();
      await expect(row.locator('[data-testid="player-hud-effect-delete"]')).toBeVisible();
      await expect(row.locator('[data-testid="player-hud-effect-chat"]'), 'no TITAN-only control').toHaveCount(0);
      await expect(row.locator('[data-testid="player-hud-effect-duration-up"]')).toHaveCount(0);
      await expect(
         row.locator('.description'),
         'the foreign prone status adds no TITAN condition text to the row',
      ).toHaveCount(0);

      /** @type {import('@playwright/test').Locator} The row's active toggle. */
      const toggle = row.locator('[data-testid="player-hud-effect-active"]');
      await expect(hudEffectToggleIcon(toggle, true), 'the toggle shows the effect active').toBeVisible();
      expect(await readDisabled(uuid), 'the server holds the effect enabled').toBe(false);
      try {
         await toggle.click();
         await expect.poll(() => readDisabled(uuid), { message: 'the HUD toggle stored the effect disabled' })
            .toBe(true);
         await expect(hudEffectToggleIcon(toggle, false), 'the toggle shows the effect inactive').toBeVisible();
      }
      finally {
         if (await readDisabled(uuid)) {
            await toggle.click();
         }
      }
      await expect.poll(() => readDisabled(uuid), { message: 'the HUD toggle stored the effect enabled' })
         .toBe(false);

      await row.locator('[data-testid="player-hud-effect-sheet"]').click();
      await expect(configOf(baseId), 'the open control opens core\'s sheet of the base effect').toBeVisible();
   });

   test('the HUD row delete control removes the stored base effect', async () => {
      /** @type {string} The name of the effect made for this test. */
      const name = `E2E Base Hud Delete ${RUN}`;
      /** @type {string} The id of the effect made for this test. */
      const id = await createBaseEffect(`Actor.${actorIds.main}`, name);
      expect(id, 'the creation returned an effect id').not.toBe('');
      try {
         await viewScene(page, sceneId);
         await controlPlacedToken(page, tokenIds.main);

         /** @type {import('@playwright/test').Locator} The effect's HUD row. */
         const row = hud('player-hud-effect-row').filter({ hasText: name });
         await expect(row, 'the effect has a HUD row').toBeVisible();
         await row.getByRole('button', { name: /: Expand$/ }).click();
         await row.locator('[data-testid="player-hud-effect-delete"]').click();

         /** @type {import('@playwright/test').Locator} The confirmation dialog. */
         const dialog = page.locator('.application.titan-dialog[id^="titan-confirmation-dialog"]');
         await expect(dialog).toBeVisible();
         await dialog.getByRole('button', { name: 'Delete Effect' }).click();
         await expect(row, 'the HUD row is gone').toHaveCount(0);
         // Measured (task-10b-logs/fix2/mutations/g1-local-only-delete.log): a delete that removes the effect from
         // the client collection only leaves the row on screen, so the row-gone assertion fails first; this server
         // read is not separated from it by any mutation.
         await expect.poll(
            async () => (await readServerDocument(page, `Actor.${actorIds.main}`)).effects.some(
               (effect) => effect._id === id,
            ),
            { message: 'the server no longer holds the effect' },
         ).toBe(false);
      }
      finally {
         // Removes the effect when the test failed before the control did; a no-op once it is gone.
         await page.evaluate(
            ({ actorId, effectId }) => game.actors.get(actorId).effects.get(effectId)?.delete(),
            {
               actorId: actorIds.main,
               effectId: id,
            },
         );
      }
   });

   test('the HUD tray lists a base effect as an icon whose popout holds its controls', async () => {
      /** @type {string} The uuid of the base effect. */
      const uuid = `Actor.${actorIds.main}.ActiveEffect.${baseId}`;
      await viewScene(page, sceneId);
      await controlPlacedToken(page, tokenIds.main);
      await setClientSetting(page, 'playerHudOptions', { effectsPanel: { style: 'tray' } });
      try {
         /** @type {import('@playwright/test').Locator} The base effect's tray icon. */
         const icon = page.locator(`[data-testid="player-hud-effect-icon"][data-effect-id="${baseId}"]`);
         await expect(icon, 'the base effect has a tray icon').toBeVisible();
         await icon.click();

         /** @type {import('@playwright/test').Locator} The icon's detail popout. */
         const popout = hud('player-hud-effect-popout');
         await expect(popout).toBeVisible();
         await expect(popout).toContainText(BASE_NAME);
         await expect(popout.locator('[data-testid="player-hud-effect-delete"]')).toBeVisible();
         await expect(popout.locator('[data-testid="player-hud-effect-chat"]'), 'no TITAN-only control')
            .toHaveCount(0);

         /** @type {import('@playwright/test').Locator} The popout's active toggle. */
         const toggle = popout.locator('[data-testid="player-hud-effect-active"]');
         await expect(hudEffectToggleIcon(toggle, true), 'the toggle shows the effect active').toBeVisible();
         try {
            await toggle.click();
            await expect.poll(() => readDisabled(uuid), { message: 'the popout toggle stored the effect disabled' })
               .toBe(true);
            await expect(hudEffectToggleIcon(toggle, false), 'the toggle shows the effect inactive').toBeVisible();
         }
         finally {
            if (await readDisabled(uuid)) {
               await toggle.click();
            }
         }
         await expect.poll(() => readDisabled(uuid), { message: 'the popout toggle stored the effect enabled' })
            .toBe(false);

         await popout.locator('[data-testid="player-hud-effect-sheet"]').click();
         await expect(configOf(baseId), 'the open control opens core\'s sheet of the base effect').toBeVisible();
      }
      finally {
         await setClientSetting(page, 'playerHudOptions', {});
      }
   });
});

test.describe('the sheet of a base effect', () => {
   test("the Effect Tray lists a pack's base effect and a click opens core's Active Effect Config", async () => {
      /** @type {string} The new effect pack's collection id. */
      const packId = await createCompendium(page, {
         label: `E2E Base Pack ${RUN}`,
         type: 'ActiveEffect',
      });
      await page.evaluate(async ({ packId, name }) => {
         await ActiveEffect.create({
            name,
            type: 'base',
         }, { pack: packId });
      }, {
         packId,
         name: `E2E Base Pack Effect ${RUN}`,
      });
      await openTrayPack(page, packId);

      /** @type {import('@playwright/test').Locator} The tray row of the base effect. */
      const row = page.locator('[data-testid="effect-tray-row"]', { hasText: `E2E Base Pack Effect ${RUN}` });
      await expect(row).toBeVisible();
      await row.click();

      /** @type {import('@playwright/test').Locator} The sheet the click opened. */
      const config = page.locator('.application.active-effect-config');
      await expect(config).toBeVisible();
      await expect(config.locator('[name="name"]')).toHaveValue(`E2E Base Pack Effect ${RUN}`);
      await expect(page.locator('.application.titan-document-sheet')).toHaveCount(0);
   });

   test('an actor\'s base effect opens core\'s Active Effect Config', async () => {
      await page.evaluate(async ({ actorId, effectId }) => {
         await game.actors.get(actorId).effects.get(effectId).sheet.render({ force: true });
      }, {
         actorId: actorIds.main,
         effectId: baseId,
      });

      /** @type {import('@playwright/test').Locator} The sheet. */
      const config = page.locator('.application.active-effect-config');
      await expect(config).toBeVisible();
      await expect(config.locator('[name="name"]')).toHaveValue(BASE_NAME);
      await expect(page.locator('.application.titan-document-sheet')).toHaveCount(0);
   });
});

test.describe('core applies its native changes', () => {
   test('a change entered in the config sheet applies to a TITAN stat until the effect is deleted', async () => {
      await page.evaluate(async ({ actorId, effectId }) => {
         /** @type {foundry.applications.sheets.ActiveEffectConfig} The effect's sheet, core's config sheet. */
         const sheet = game.actors.get(actorId).effects.get(effectId).sheet;
         await sheet.render({ force: true });
         await sheet.changeTab('changes', 'sheet');
      }, {
         actorId: actorIds.main,
         effectId: baseId,
      });

      /** @type {import('@playwright/test').Locator} The config sheet. */
      const config = page.locator('.application.active-effect-config');
      await expect(config).toBeVisible();
      await config.locator('[data-action="addChange"]').click();
      await expect(config.locator('ol[data-changes] li')).toHaveCount(1);
      await config.locator('[name="system.changes.0.key"]').fill(NATIVE_KEY);
      await config.locator('[name="system.changes.0.value"]').fill('3');
      await config.locator('button[type="submit"]').click();

      await expect.poll(readAwareness, { message: 'core applied the change to Awareness' })
         .toBe(baselineAwareness + 3);
      expect(
         (await readServerDocument(page, `Actor.${actorIds.main}.ActiveEffect.${baseId}`)).system.changes[0].key,
         'the server holds the change',
      ).toBe(NATIVE_KEY);

      // A base effect has no deletion control, so the document API deletes it.
      await page.evaluate(
         ({ actorId, effectId }) => game.actors.get(actorId).effects.get(effectId).delete(),
         {
            actorId: actorIds.main,
            effectId: baseId,
         },
      );
      await expect.poll(readAwareness, { message: 'the deleted effect no longer applies' }).toBe(baselineAwareness);
      expect(
         await page.evaluate(
            ({ actorId, effectId }) => game.actors.get(actorId).effects.has(effectId),
            {
               actorId: actorIds.main,
               effectId: baseId,
            },
         ),
         'the base effect is gone',
      ).toBe(false);
   });

   test('a change entered on an owned ability\'s base effect transfers to the actor until it is deleted', async () => {
      /** @type {string} The uuid of the ability's base effect. */
      const uuid = `Actor.${actorIds.main}.Item.${abilityId}.ActiveEffect.${abilityBaseId}`;
      await page.evaluate(async (uuid) => {
         /** @type {foundry.applications.sheets.ActiveEffectConfig} The effect's sheet, core's config sheet. */
         const sheet = (await fromUuid(uuid)).sheet;
         await sheet.render({ force: true });
         await sheet.changeTab('changes', 'sheet');
      }, uuid);

      /** @type {import('@playwright/test').Locator} The config sheet. */
      const config = page.locator('.application.active-effect-config');
      await expect(config).toBeVisible();
      await config.locator('[data-action="addChange"]').click();
      await expect(config.locator('ol[data-changes] li')).toHaveCount(1);
      await config.locator('[name="system.changes.0.key"]').fill(NATIVE_KEY);
      await config.locator('[name="system.changes.0.value"]').fill('2');
      await config.locator('button[type="submit"]').click();
      await expect.poll(readAwareness, { message: 'core transferred the change to the actor' })
         .toBe(baselineAwareness + 2);

      await page.evaluate(async (uuid) => (await fromUuid(uuid)).delete(), uuid);
      await expect.poll(readAwareness, { message: 'the deleted effect no longer transfers' })
         .toBe(baselineAwareness);
   });
});
