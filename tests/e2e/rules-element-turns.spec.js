import { expect, test } from './harness.js';
import { DURATION_TURN_END, DURATION_TURN_START } from '~/system/DurationTypes.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import {
   activateScene,
   addCombatant,
   addRulesElement,
   controlPlacedToken,
   createActor,
   createCombat,
   createOwnedItem,
   createScene,
   endCombat,
   nextTurn,
   placeToken,
   rollInitiative,
   setAttributeBase,
   setResource,
   startCombat,
   viewScene,
} from './flows.js';
import { getSetting, setWorldSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * The rules elements that do not change a displayed stat: Fast Healing and Persistent Damage (turn start and turn end),
 * and the Resolve Regain and Wound Regain mods. A character with the elements takes a turn in a combat made with the
 * Combat Tracker; the turn reports carry the totals the elements sum to, and a Long Rest from the Player HUD heals the
 * wounds the Wound Regain allows. The expected totals are the element values typed in the editor and the world
 * settings' base regain values.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {{id: string, uuid: string, tokenId: string}} The character with the elements. */
let subject;
/** @type {{id: string, uuid: string, tokenId: string}} The character the combat needs as a second combatant. */
let other;
/** @type {number} The run stamp in the fixture names. */
const RUN = Date.now();

/**
 * Makes a character with three Attributes of 4 and a placed token.
 * @param {string} name - The character's name.
 * @returns {Promise<{id: string, uuid: string, tokenId: string}>} The character.
 */
async function makeCharacter(name) {
   /** @type {string} The character's id. */
   const id = await createActor(page, {
      name,
      type: 'player',
   });
   for (const attribute of [
      'body',
      'mind',
      'soul',
   ]) {
      await setAttributeBase(page, `Actor.${id}`, attribute, 4);
   }
   return {
      id,
      uuid: `Actor.${id}`,
      tokenId: await placeToken(page, id),
   };
}

/**
 * Reads the newest chat message of a type after a message count.
 * @param {number} baseline - The message count before the action.
 * @param {string} type - The message type.
 * @returns {Promise<object>} The message's system data.
 */
async function reportAfter(baseline, type) {
   /** @type {object|null} The report. */
   let report = null;
   await expect.poll(async () => {
      report = await page.evaluate(
         ({ base, wanted }) => {
            /** @type {ChatMessage|undefined} The newest message of the type after the baseline. */
            const message = game.messages.contents.slice(base).reverse().find((entry) => entry.type === wanted);
            return message ? message.system.toObject() : null;
         },
         {
            base: baseline,
            wanted: type,
         },
      );
      return report !== null;
   }, { message: `a ${type} was posted` }).toBe(true);
   return report;
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   /** @type {string} The scene the tokens stand on. */
   const sceneId = await createScene(page, { name: `E2E Element Turns Scene ${RUN}` });
   await viewScene(page, sceneId);
   if (!await page.evaluate((id) => game.scenes.get(id).active, sceneId)) {
      await activateScene(page, sceneId);
   }
   subject = await makeCharacter(`E2E Element Turns Subject ${RUN}`);
   other = await makeCharacter(`E2E Element Turns Other ${RUN}`);

   /** @type {string} The uuid of the ability that carries the elements. */
   const abilityId = await createOwnedItem(page, subject.id, 'ability', 'E2E Turn Elements');
   const abilityUuid = `${subject.uuid}.Item.${abilityId}`;
   for (const element of [
      {
         operation: 'fastHealing',
         selector: DURATION_TURN_START,
         value: 2,
      },
      {
         operation: 'fastHealing',
         selector: DURATION_TURN_END,
         value: 5,
      },
      {
         operation: 'persistentDamage',
         selector: DURATION_TURN_START,
         value: 3,
      },
      {
         operation: 'persistentDamage',
         selector: DURATION_TURN_END,
         value: 4,
      },
      {
         operation: 'flatModifier',
         selector: 'mod',
         key: 'resolveRegain',
         value: 2,
      },
      {
         operation: 'flatModifier',
         selector: 'mod',
         key: 'woundRegain',
         value: 2,
      },
   ]) {
      await addRulesElement(page, abilityUuid, element);
   }
   await closeAllApps(page);
});

test.afterEach(async () => {
   if (await page.evaluate(() => game.combat?.started === true)) {
      await endCombat(page);
   }
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('turn reports carry the sums of the elements', () => {
   test.describe.configure({ timeout: 180_000 });

   test('turn start and turn end totals, and the Resolve Regain total', async () => {
      // Reports with their buttons: nothing is applied, so the totals are read whatever the stamina is.
      await setWorldSetting(page, 'autoApplyFastHealing', 'showButton');
      await setWorldSetting(page, 'autoApplyPersistentDamage', 'showButton');
      await setWorldSetting(page, 'autoRegainResolve', 'showButton');
      await setResource(page, subject.uuid, 'resolve', 0);

      await createCombat(page);
      await addCombatant(page, subject.tokenId);
      await addCombatant(page, other.tokenId);
      await forceDice(page, [
         1,
         1,
         6,
         6,
      ]);
      await rollInitiative(page);
      await resetDice(page);
      await startCombat(page);

      // The other character acts first; the next turn starts the subject's.
      /** @type {number} The message count before the subject's turn starts. */
      const startBaseline = await page.evaluate(() => game.messages.size);
      await nextTurn(page);
      /** @type {object} The turn start report. */
      const start = await reportAfter(startBaseline, 'turnStartReport');
      expect(start.fastHealing.total, 'Fast Healing at turn start').toBe(2);
      expect(start.persistentDamage.total, 'Persistent Damage at turn start').toBe(3);
      expect(start.resolveRegain.total, 'Resolve Regain: the base value plus the mod of 2')
         .toBe(await getSetting(page, 'resolveBaseRegain') + 2);

      // The subject's turn ends when the next one starts.
      /** @type {number} The message count before the subject's turn ends. */
      const endBaseline = await page.evaluate(() => game.messages.size);
      await nextTurn(page);
      /** @type {object} The turn end report. */
      const end = await reportAfter(endBaseline, 'turnEndReport');
      expect(end.fastHealing.total, 'Fast Healing at turn end').toBe(5);
      expect(end.persistentDamage.total, 'Persistent Damage at turn end').toBe(4);
   });
});

test.describe('Wound Regain', () => {
   test('a Long Rest from the Player HUD heals the base regain plus the mod', async () => {
      await controlPlacedToken(page, subject.tokenId);
      await setResource(page, subject.uuid, 'wounds', 5);

      /** @type {number} The wounds the base regain heals. */
      const base = await getSetting(page, 'woundsBaseRegain');
      await page.getByTestId('player-hud-long-rest').click();
      await expect.poll(
         () => page.evaluate((id) => game.actors.get(id).system.resource.wounds.value, subject.id),
         { message: 'the Long Rest healed the wounds' },
      ).toBe(5 - Math.min(base + 2, 5));
   });
});
