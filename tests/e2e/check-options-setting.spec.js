import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { GM_USERS } from './users.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * The `getCheckOptions` choice: under the default `situational` a check opens its dialog only when a situational
 * modifier applies, and a Boolean held in client storage is rewritten to its choice when the world loads.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Check Options Actor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async () => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
   });
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('the situational setting opens the dialog only for a check with a situational modifier', async () => {
   // Seed one situational modifier, choose the situational setting, and request a check. The effect is permanent:
   // a timed effect's `disabled` follows its remaining duration, so disabling it below would not take.
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Underwater',
            type: 'effect',
            system: {
               duration: {
                  type: 'permanent',
               },
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'Underwater',
                     modifierType: 'dice',
                     operation: 'conditionalCheckModifier',
                     selector: 'situation',
                     skill: '',
                     uuid: 'e2e-check-options-underwater',
                     value: -1,
                  },
               ],
            },
         },
      ]);
      await actor.system.requestAttributeCheck({ attribute: 'body' });
   }, ACTOR_NAME);

   // With a situational modifier the dialog opens.
   /** @type {import('@playwright/test').Locator} The Attribute Check dialog window. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();
   await closeAllApps(page);
   await expect(dialog).toHaveCount(0);

   // Disable the effect: no situational modifier remains, so the same request rolls straight to chat.
   /** @type {number} The chat-message count before the second request. */
   const baseline = await page.evaluate(async (actorName) => {
      /** @type {TitanActor} The seeded actor. */
      const actor = game.actors.getName(actorName);
      await actor.effects.getName('E2E Underwater').update({ disabled: true });
      await titanWait(
         () => actor.system.getSituationalCheckModifiers('attribute', { skill: 'none' }).length === 0,
         { message: 'the situational modifier is gone' },
      );

      /** @type {number} The chat-message count before the request. */
      const size = game.messages.size;
      await actor.system.requestAttributeCheck({ attribute: 'body' });
      return size;
   }, ACTOR_NAME);
   await expect.poll(
      () => page.evaluate(
         (base) => game.messages.contents.slice(base).some((message) => message.type === 'attributeCheck'),
         baseline,
      ),
      { message: 'the check rolled straight to chat' },
   ).toBe(true);

   // The roll finished after the dialog decision, so no dialog opened for it.
   await expect(dialog).toHaveCount(0);
});

/** @type {{stored: string, choice: string}[]} Each legacy Boolean's stored text and the choice it resolves to. */
const LEGACY_BOOLEANS = [
   {
      stored: 'true',
      choice: 'always',
   },
   {
      stored: 'false',
      choice: 'situational',
   },
];

for (const { stored, choice } of LEGACY_BOOLEANS) {
   test(`a stored Boolean ${stored} resolves to ${choice} and is rewritten on load`, async ({ browser }) => {
      /** @type {import('@playwright/test').Page} A second client whose storage holds a Boolean for the setting. */
      const legacyPage = await browser.newPage();
      try {
         // Seed the Boolean before Foundry's scripts run on each navigation of this client.
         await legacyPage.addInitScript((text) => {
            localStorage.setItem('titan.getCheckOptions', text);
         }, stored);
         await login(legacyPage, GM_USERS[1].name);

         // The rewrite is not awaited by registration, so poll the stored text until it holds the choice.
         await expect.poll(
            () => legacyPage.evaluate(() => ({
               raw: localStorage.getItem('titan.getCheckOptions'),
               value: game.settings.get('titan', 'getCheckOptions'),
            })),
            { message: `the stored ${stored} is rewritten to "${choice}"` },
         ).toEqual({
            raw: JSON.stringify(choice),
            value: choice,
         });
      }
      finally {
         await legacyPage.close();
      }
   });
}
