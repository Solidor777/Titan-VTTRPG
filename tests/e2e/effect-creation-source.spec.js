import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * An Active Effect the stored-actor migration writes as data (into an Adventure's stored actors or scene tokens) must
 * store what the document workflow stores, except `start`, which records a creation moment inline data lacks.
 * `TitanActiveEffect.buildCreationSource` constructs the effect, so its schema cleans the data as creation cleans it,
 * then applies the creation changes `_preCreate` applies (getEffectCreationChanges, and core's `transfer: false` for an
 * actor-owned effect). For each creation input below, the data built for an Adventure stores the `disabled`,
 * `showIcon`, and `transfer` the same input stores when created as a document on a world actor, and both equal the
 * expected values. One input has the shape `buildEffectData` gives a legacy effect Item (stamp, description, v2.1.0
 * rules elements, no `check`/`customTrait`). A parentless effect's data preparation reports a failure through
 * `Hooks.onError` (`client/documents/abstract/client-document.mjs` `_safePrepareData`), never as a page error. The
 * report reaches the `attachPageErrors` collector, which `afterEach` asserts empty, and core also logs it to the
 * console as "Failed data preparation for <uuid>", which the test reads and asserts absent.
 */

/** @type {string} Name of the throwaway world actor the document path creates its effects on. */
const ACTOR_NAME = 'E2E Effect Creation Source Actor';

/**
 * The creation inputs: timed effects whose stored `remaining` is a string or missing (as legacy data stores it), an
 * expired and a running timed effect, a disabled and an enabled permanent effect (creation keeps a permanent effect's
 * `disabled`), and a condition (creation changes nothing). `showIcon` names a `CONST.ACTIVE_EFFECT_SHOW_ICON` mode.
 * @type {Array<{data: object, expected: {disabled: boolean, showIcon: string}, label: string}>}
 */
const CASES = [
   {
      data: {
         name: 'E2E String Remaining',
         system: {
            duration: {
               remaining: '0',
               type: 'turnStart',
            },
         },
         type: 'effect',
      },
      expected: {
         disabled: true,
         showIcon: 'ALWAYS',
      },
      label: 'a timed effect whose remaining is the string "0"',
   },
   {
      data: {
         name: 'E2E Missing Remaining',
         system: {
            duration: { type: 'turnEnd' },
         },
         type: 'effect',
      },
      expected: {
         disabled: false,
         showIcon: 'ALWAYS',
      },
      label: 'a timed effect with no remaining (the schema initial, 1)',
   },
   {
      data: {
         disabled: false,
         name: 'E2E Expired',
         system: {
            duration: {
               remaining: 0,
               type: 'initiative',
            },
         },
         type: 'effect',
      },
      expected: {
         disabled: true,
         showIcon: 'ALWAYS',
      },
      label: 'an expired timed effect stored enabled',
   },
   {
      data: {
         disabled: true,
         name: 'E2E Running',
         system: {
            duration: {
               remaining: 2,
               type: 'turnStart',
            },
         },
         type: 'effect',
      },
      expected: {
         disabled: false,
         showIcon: 'ALWAYS',
      },
      label: 'a running timed effect stored disabled',
   },
   {
      data: {
         disabled: true,
         name: 'E2E Permanent Off',
         system: {
            duration: {
               remaining: 0,
               type: 'permanent',
            },
         },
         type: 'effect',
      },
      expected: {
         disabled: true,
         showIcon: 'ALWAYS',
      },
      label: 'a disabled permanent effect',
   },
   {
      data: {
         disabled: false,
         name: 'E2E Permanent On',
         system: {
            duration: {
               remaining: 0,
               type: 'permanent',
            },
         },
         type: 'effect',
      },
      expected: {
         disabled: false,
         showIcon: 'ALWAYS',
      },
      label: 'an enabled permanent effect',
   },
   {
      data: {
         img: 'icons/svg/blind.svg',
         name: 'Blinded',
         statuses: ['blinded'],
         type: 'condition',
      },
      expected: {
         disabled: false,
         showIcon: 'CONDITIONAL',
      },
      label: 'a condition',
   },
   {
      // The shape buildEffectData gives a template-era legacy effect Item: its `check` and `customTrait` are absent.
      data: {
         description: '<p>E2E legacy description</p>',
         disabled: false,
         flags: {
            titan: {
               convertedFromItem: 'e2eLegacyItem001',
            },
         },
         img: 'icons/svg/aura.svg',
         name: 'E2E Legacy Shaped',
         system: {
            duration: {
               custom: '',
               initiative: 0,
               remaining: 2,
               type: 'turnStart',
            },
            rulesElement: [
               {
                  key: 'melee',
                  operation: 'flatModifier',
                  selector: 'rating',
                  uuid: 'e2e-legacy-melee',
                  value: -1,
               },
            ],
         },
         transfer: false,
         type: 'effect',
      },
      expected: {
         disabled: false,
         showIcon: 'ALWAYS',
      },
      label: 'a legacy-shaped effect as buildEffectData builds it',
   },
];

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string[]} Console error texts collected on the shared page. */
const consoleErrors = [];

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   page.on('console', (message) => {
      if (message.type() === 'error') {
         consoleErrors.push(message.text());
      }
   });
   await login(page);
   await deleteFixtureActor(page, ACTOR_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('an effect built as data stores the disabled state, icon, and transfer a created document stores', async () => {
   // Presence first: the console capture sees this page's errors.
   consoleErrors.length = 0;
   await page.evaluate(() => console.error('E2E console capture probe'));
   await expect.poll(() => consoleErrors.some((line) => line.includes('E2E console capture probe'))).toBe(true);
   consoleErrors.length = 0;

   /** @type {{modes: Record<string, number>, results: object[]}} Core's icon modes, and each case's two values. */
   const outcome = await page.evaluate(async ({ actorName, cases }) => {
      /** @type {TitanActor} The throwaway actor the document path creates its effects on. */
      const actor = await Actor.create({
         name: actorName,
         type: 'npc',
      });

      /** @type {object[]} Each case's built and created values. */
      const results = [];
      for (const { data } of cases) {
         /** @type {object} The data an effect built for an Adventure stores. */
         const built = CONFIG.ActiveEffect.documentClass.buildCreationSource({
            ...foundry.utils.deepClone(data),
            _id: foundry.utils.randomID(),
         });

         /** @type {TitanActiveEffect[]} The same input created as a document, alone in the array. */
         const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [foundry.utils.deepClone(data)]);
         results.push({
            built: {
               disabled: built.disabled,
               showIcon: built.showIcon,
               transfer: built.transfer,
            },
            created: {
               disabled: created._source.disabled,
               showIcon: created._source.showIcon,
               transfer: created._source.transfer,
            },
         });
      }
      return {
         modes: { ...CONST.ACTIVE_EFFECT_SHOW_ICON },
         results,
      };
   }, {
      actorName: ACTOR_NAME,
      cases: CASES,
   });
   for (const [index, { expected, label }] of CASES.entries()) {
      /** @type {{disabled: boolean, showIcon: number, transfer: boolean}} The values both paths must store. */
      const values = {
         disabled: expected.disabled,
         showIcon: outcome.modes[expected.showIcon],
         transfer: false,
      };
      expect(outcome.results[index].created, `${label}: created as a document`).toEqual(values);
      expect(outcome.results[index].built, `${label}: built as data`).toEqual(values);
   }

   // No input failed data preparation, which core reports only on the console.
   expect(consoleErrors.filter((line) => line.includes('Failed data preparation'))).toEqual([]);
});
