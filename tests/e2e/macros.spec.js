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
} from './world.js';

/**
 * Hotbar macros: every macro kind the Create Macro dialog offers (`game.titan.macros.get<Kind>Macro`) is created in
 * the live world and executed through `Macro#execute`, so each generated command must resolve to a real method. A
 * check macro rolls for the controlled Character through its `request<Type>Check` (the `never` check-options choice
 * rolls straight to chat); the sheet-toggle macro opens and then closes the Item's sheet.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Macro Actor';

/** @type {string} Name prefix shared by every macro this spec creates, so cleanup finds them all. */
const MACRO_PREFIX = 'E2E Macro';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The `getCheckOptions` choice before this spec, restored afterwards. */
let originalCheckOptionsMode;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await deleteOrphanedTokens(page);

   // Roll straight to chat, and seed a Character owning a weapon, a spell, and an ability with one check.
   originalCheckOptionsMode = await page.evaluate(async ({ actorName, check }) => {
      /** @type {string} The current check-options choice. */
      const mode = game.settings.get('titan', 'getCheckOptions');
      await game.settings.set('titan', 'getCheckOptions', 'never');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The macro's Character. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Macro Weapon',
            type: 'weapon',
         },
         {
            name: 'E2E Macro Spell',
            type: 'spell',
         },
         {
            name: 'E2E Macro Ability',
            system: { check: [check] },
            type: 'ability',
         },
      ]);
      return mode;
   }, {
      actorName: ACTOR_NAME,
      check: buildCheck('E2E Macro Check', 'e2e-macro-check-0000-0000-000000000000', {
         opposedCheck: {
            attribute: 'body',
            enabled: false,
            skill: 'athletics',
         },
         resistanceCheck: 'none',
         resolveCost: 0,
      }),
   });

   // Check macros roll for the controlled Characters.
   await controlFixtureActorToken(page, {
      actorName: ACTOR_NAME,
      fallbackSceneName: 'E2E Macro Scene',
   });
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async ({ mode, prefix }) => {
      await game.settings.set('titan', 'getCheckOptions', mode);

      /** @type {string[]} The ids of the macros this spec created. */
      const macroIds = game.macros.filter((macro) => macro.name.startsWith(prefix)).map((macro) => macro.id);
      await Macro.deleteDocuments(macroIds);
   }, {
      mode: originalCheckOptionsMode,
      prefix: MACRO_PREFIX,
   });
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Creates a check macro for one of the seeded Items, executes it, and returns the subtype of the chat message it
 * posts.
 * @param {object} macroArgs - The macro to create.
 * @param {string} macroArgs.getter - The `game.titan.macros` method that creates the macro.
 * @param {string} macroArgs.itemName - The seeded Item the macro rolls.
 * @param {string} macroArgs.idMethod - How the command identifies the Item (uuid, name, or documentId).
 * @param {number} [macroArgs.idx] - The Attack or Item Check index, for the kinds that take one.
 * @returns {Promise<string>} The posted message's subtype.
 */
async function executeCheckMacro({ getter, itemName, idMethod, idx }) {
   /** @type {number} The chat-message count before the macro runs. */
   const baseline = await page.evaluate(async ({ actorName, args, prefix }) => {
      /** @type {TitanItem} The Item the macro rolls. */
      const item = game.actors.getName(actorName).items.getName(args.itemName);

      /** @type {Macro} The created macro. */
      const macro = await game.titan.macros[args.getter](
         item,
         `${prefix} ${args.getter} ${args.idMethod}`,
         item.img,
         args.idMethod,
         args.idx,
      );

      /** @type {number} The chat-message count before the macro runs. */
      const size = game.messages.size;
      await macro.execute();
      return size;
   }, {
      actorName: ACTOR_NAME,
      args: {
         getter,
         idMethod,
         idx,
         itemName,
      },
      prefix: MACRO_PREFIX,
   });

   // The macro's request rolls without being awaited by the command, so wait for its message.
   await expect.poll(
      () => page.evaluate((base) => game.messages.size > base, baseline),
      { message: `the ${getter} macro posts a message` },
   ).toBe(true);
   return page.evaluate((base) => game.messages.contents[base].type, baseline);
}

test('an Attack Check macro identified by the Item\'s TITAN uuid rolls the Attack Check', async () => {
   expect(await executeCheckMacro({
      getter: 'getAttackCheckMacro',
      idMethod: 'uuid',
      idx: 0,
      itemName: 'E2E Macro Weapon',
   })).toBe('attackCheck');
});

test('a Casting Check macro identified by the Item\'s name rolls the Casting Check', async () => {
   expect(await executeCheckMacro({
      getter: 'getCastingCheckMacro',
      idMethod: 'name',
      itemName: 'E2E Macro Spell',
   })).toBe('castingCheck');
});

test('an Item Check macro identified by the Item\'s document id rolls the Item Check', async () => {
   expect(await executeCheckMacro({
      getter: 'getItemCheckMacro',
      idMethod: 'documentId',
      idx: 0,
      itemName: 'E2E Macro Ability',
   })).toBe('itemCheck');
});

test('a sheet-toggle macro opens and then closes the Item\'s sheet', async () => {
   // Create the macro and run it once: the sheet opens.
   await page.evaluate(async ({ actorName, prefix }) => {
      /** @type {TitanItem} The Item whose sheet the macro toggles. */
      const item = game.actors.getName(actorName).items.getName('E2E Macro Weapon');

      /** @type {Macro} The created macro. */
      const macro = await game.titan.macros.getToggleDocumentSheetMacro(`${prefix} Sheet`, item.img, item.uuid);
      await macro.execute();
   }, {
      actorName: ACTOR_NAME,
      prefix: MACRO_PREFIX,
   });
   await expect.poll(
      () => page.evaluate(
         (actorName) => game.actors.getName(actorName).items.getName('E2E Macro Weapon').sheet.rendered,
         ACTOR_NAME,
      ),
      { message: 'the first run opens the sheet' },
   ).toBe(true);

   // Run the same macro again: the sheet closes.
   await page.evaluate(async (prefix) => {
      await game.macros.getName(`${prefix} Sheet`).execute();
   }, MACRO_PREFIX);
   await expect.poll(
      () => page.evaluate(
         (actorName) => game.actors.getName(actorName).items.getName('E2E Macro Weapon').sheet.rendered,
         ACTOR_NAME,
      ),
      { message: 'the second run closes the sheet' },
   ).toBe(false);
});
