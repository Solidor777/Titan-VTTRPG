import { expect, flushPageErrors, test } from './harness.js';
import {
   DURATION_INITIATIVE,
   DURATION_TURN_END,
   DURATION_TURN_START,
} from '~/system/DurationTypes.js';
import { login } from './fixtures.js';
import {
   activateScene,
   addEffect,
   addRulesElement,
   addCombatant,
   controlPlacedToken,
   createActor,
   createCombat,
   createOwnedItem,
   createScene,
   endCombat,
   nextTurn,
   placeToken,
   previousTurn,
   rollInitiative,
   setEquipped,
   setOwnership,
   startCombat,
   toggleTokenLink,
} from './flows.js';
import { forceDice, resetDice } from './dice.js';
import { setWorldSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Report cards are whispered to the owners of the character they report on. Four clients: E2E GM 1 and E2E GM 2
 * (owners of every character), E2E Player 1 (owns the character `owned`) and E2E Player 2 (owns neither). The
 * Player HUD posts the utility reports; the Combat Tracker posts the turn reports. A report of the owned character is
 * in the chat log DOM of both GMs and Player 1 only; a report of the other character is in the DOM of both GMs only.
 */

/** @type {Record<string, import('@playwright/test').Page>} The clients by audience name. */
const clients = {};
/** @type {string[]} Uncaught page errors of GM 1's page. */
let errors;
/** @type {Record<string, {id: string, tokenId: string}>} The characters by `owned` and `other`. */
const cast = {};
/** @type {string} The scene both characters stand on. */
let sceneId;

/** @type {Record<string, string>} The display names by audience name. */
const NAMES = {
   gm1: 'E2E GM 1',
   gm2: 'E2E GM 2',
   p1: 'E2E Player 1',
   p2: 'E2E Player 2',
};

/** @type {Record<string, string[]>} The audience of a report by the character it reports on. */
const AUDIENCE = {
   owned: [
      'gm1',
      'gm2',
      'p1',
   ],
   other: [
      'gm1',
      'gm2',
   ],
};

/** @type {string[]} The world settings that gate the reports of the HUD's direct actions. */
const REPORT_SETTINGS = [
   'reportTakingDamage',
   'reportHealingDamage',
   'reportSpendingResolve',
   'reportRendingArmor',
   'reportRepairingArmor',
   'reportResting',
];

/**
 * Asserts one report message on every client: the chat log DOM and the message collection.
 * @param {string} id - The message id.
 * @param {string[]} audience - The audience names that see it.
 * @param {string} label - A description for failure messages.
 * @returns {Promise<void>} Resolves once every client matches.
 */
async function expectAudience(id, audience, label) {
   for (const [name, page] of Object.entries(clients)) {
      await showChatLog(page);

      /** @type {boolean} Whether the client should see it. */
      const sees = audience.includes(name);
      await expect(
         page.locator(`#chat .chat-log li[data-message-id="${id}"]`),
         `${label}: ${NAMES[name]} ${sees ? 'sees' : 'does not see'} it`,
      ).toHaveCount(sees ? 1 : 0);
   }
}

/**
 * Reads the report messages posted after a count, with the character each reports on.
 * @param {number} baseline - The message count before the action.
 * @returns {Promise<{id: string, type: string, actorId: string}[]>} The reports, from GM 1's collection.
 */
function reportsSince(baseline) {
   return clients.gm1.evaluate(
      (baseline) => game.messages.contents.slice(baseline)
         .filter((message) => message.type.endsWith('Report'))
         .map((message) => ({
            id: message.id,
            type: message.type,
            actorId: message.speaker.actor,
         })),
      baseline,
   );
}

/**
 * Asserts the audience of every report posted after a count, by the character each reports on.
 * @param {number} baseline - The message count before the action.
 * @param {string} label - A description for failure messages.
 * @returns {Promise<string[]>} The report types that were checked.
 */
async function expectReportsSince(baseline, label) {
   /** @type {{id: string, type: string, actorId: string}[]} The reports. */
   const reports = await reportsSince(baseline);
   for (const report of reports) {
      await expectAudience(
         report.id,
         ownedIds().includes(report.actorId) ? AUDIENCE.owned : AUDIENCE.other,
         `${label} ${report.type} of ${ownedIds().includes(report.actorId) ? 'an owned' : 'the other'} character`,
      );
   }
   return reports.map((report) => report.type);
}

/**
 * Lists the ids of the characters Player 1 owns.
 * @returns {string[]} The ids.
 */
function ownedIds() {
   return [
      cast.owned.id,
      cast.unlinked.id,
   ];
}

/**
 * Counts the chat messages on GM 1's client.
 * @returns {Promise<number>} The count.
 */
function count() {
   return clients.gm1.evaluate(() => game.messages.size);
}

/**
 * Uses a utility option of the Player HUD of the controlled character on a client.
 * @param {import('@playwright/test').Page} page - The client that controls the token.
 * @param {string} key - The utility sub-option key.
 * @param {number} [amount] - The amount typed into the amount dialog, for the options that ask for one.
 * @returns {Promise<void>} Resolves once the click (and the dialog confirmation) is dispatched.
 */
async function useUtility(page, key, amount) {
   await showChatLog(page);

   /** @type {import('@playwright/test').Locator} The utility category button. */
   const category = page.locator('[data-testid="player-hud-category-utility"]');
   await expect(category).toBeVisible();
   if (!await category.evaluate((element) => element.classList.contains('active'))) {
      await category.click();
   }
   await page.locator(`[data-testid="player-hud-sub-option-utility-${key}"]`).click();
   if (amount !== undefined) {
      await page.locator('[data-testid="hud-amount-input"]').fill(String(amount));
      await page.locator('[data-testid="hud-amount-confirm"]').click();
   }
}

test.beforeAll(async ({ browser }) => {
   clients.gm1 = await browser.newPage();
   errors = attachPageErrors(clients.gm1);
   await login(clients.gm1);
   await clearChat(clients.gm1);
   for (const name of [
      'gm2',
      'p1',
      'p2',
   ]) {
      clients[name] = await (await browser.newContext()).newPage();
      await login(clients[name], NAMES[name]);
   }
   for (const key of REPORT_SETTINGS) {
      await setWorldSetting(clients.gm1, key, true);
   }
   await setWorldSetting(clients.gm1, 'reportEffects', true);
   await setWorldSetting(clients.gm1, 'autoRemoveExpiredEffects', 'disabled');

   sceneId = await createScene(clients.gm1, { name: 'E2E Visibility Reports Scene' });
   if (!await clients.gm1.evaluate((id) => game.scenes.get(id).active, sceneId)) {
      await activateScene(clients.gm1, sceneId);
   }
   for (const name of [
      'gm2',
      'p1',
      'p2',
   ]) {
      await clients[name].waitForFunction(
         (id) => canvas.scene?.id === id && canvas.ready,
         sceneId,
         { timeout: 15_000 },
      );
   }
   for (const key of [
      'owned',
      'other',
      'unlinked',
   ]) {
      const id = await createActor(clients.gm1, {
         name: `E2E Visibility Report ${key}`,
         type: 'player',
      });
      if (key === 'unlinked' && await clients.gm1.evaluate((id) => game.actors.get(id).prototypeToken.actorLink, id)) {
         await toggleTokenLink(clients.gm1, id);
      }
      cast[key] = {
         id,
         tokenId: await placeToken(clients.gm1, id),
      };
      const armorId = await createOwnedItem(clients.gm1, id, 'armor', `E2E Visibility Report Armor ${key}`);
      await setEquipped(clients.gm1, id, armorId, true);

      // A turn report posts only when it has content: a turn message at the start and at the end of the turn.
      const abilityUuid = `Actor.${id}.Item.${await createOwnedItem(clients.gm1, id, 'ability', `E2E Turn ${key}`)}`;
      for (const selector of [
         DURATION_TURN_START,
         DURATION_TURN_END,
      ]) {
         await addRulesElement(clients.gm1, abilityUuid, {
            operation: 'turnMessage',
            selector,
            message: `E2E turn message ${key}`,
         });
      }
   }
   await setOwnership(clients.gm1, cast.owned.id, NAMES.p1, 'OWNER');
   await setOwnership(clients.gm1, cast.unlinked.id, NAMES.p1, 'OWNER');
   await closeAllApps(clients.gm1);
});

test.afterEach(async () => {
   for (const page of Object.values(clients)) {
      await closeAllApps(page);
   }
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   for (const [name, page] of Object.entries(clients)) {
      if (name !== 'gm1') {
         await flushPageErrors(page);
         await page?.context().close();
      }
   }
   await clients.gm1?.close();
});

/** @type {{key: string, type: string, amount?: number}[]} The utility actions and the report each posts. */
const UTILITY = [
   {
      key: 'applyDamage',
      type: 'damageReport',
      amount: 20,
   },
   {
      key: 'applyHealing',
      type: 'healingReport',
      amount: 1,
   },
   {
      key: 'spendResolve',
      type: 'spendResolveReport',
   },
   {
      key: 'applyRend',
      type: 'rendReport',
      amount: 1,
   },
   {
      key: 'applyRepairs',
      type: 'repairsReport',
      amount: 1,
   },
   {
      key: 'removeCombatEffects',
      type: 'removeCombatEffectsReport',
   },
   {
      key: 'shortRest',
      type: 'shortRestReport',
   },
   {
      key: 'longRest',
      type: 'longRestReport',
   },
];

for (const [role, controller] of [
   [
      'owned',
      'p1',
   ],
   [
      'other',
      'gm1',
   ],
]) {
   test(`HUD reports of the ${role} character, used from ${NAMES[controller]}, reach only its owners`, async () => {
      await closeAllApps(clients[controller]);
      await clients[controller].evaluate(() => canvas.tokens.releaseAll());
      await controlPlacedToken(clients[controller], cast[role].tokenId);

      /** @type {string[]} The report types seen across the actions. */
      const seen = [];
      for (const { key, type, amount } of UTILITY) {
         /** @type {number} The count before the action. */
         const baseline = await count();
         await useUtility(clients[controller], key, amount);
         await expect.poll(async () => (await reportsSince(baseline)).map((r) => r.type), {
            message: `${key} posted a ${type}`,
         }).toContain(type);
         seen.push(...await expectReportsSince(baseline, key));
      }
      expect(new Set(seen).size, 'every utility action posted its report').toBe(UTILITY.length);
   });
}

test('turn reports of a combat reach only the owners of the character they report on', async () => {
   await controlPlacedToken(clients.gm1, cast.owned.tokenId);
   await createCombat(clients.gm1);
   await addCombatant(clients.gm1, cast.owned.tokenId);
   await addCombatant(clients.gm1, cast.other.tokenId);
   await forceDice(clients.gm1, [
      1,
      1,
      6,
      6,
   ]);
   await rollInitiative(clients.gm1);
   await resetDice(clients.gm1);

   /** @type {number} The count before the combat starts. */
   const baseline = await count();
   await startCombat(clients.gm1);
   for (let step = 0; step < 4; step++) {
      await nextTurn(clients.gm1);
   }
   await previousTurn(clients.gm1);
   await previousTurn(clients.gm1);
   await expect.poll(async () => (await reportsSince(baseline)).length, {
      message: 'the turns posted reports',
   }).toBeGreaterThan(0);

   /** @type {string[]} The report types the turns posted. */
   const types = await expectReportsSince(baseline, 'turn');
   expect(types, 'start and end reports were posted').toEqual(expect.arrayContaining([
      'turnStartReport',
      'turnEndReport',
   ]));
   await endCombat(clients.gm1);
});

test('effects-expired reports reach only the owners of the character whose effect expired', async () => {
   await setWorldSetting(clients.gm1, 'autoDecreaseEffectDuration', true);
   await setWorldSetting(clients.gm1, 'autoRemoveExpiredEffects', 'enabled');
   for (const key of [
      'owned',
      'other',
   ]) {
      // An initiative effect one point of initiative above the rating lies between the two combatants' rolls.
      const rating = await clients.gm1.evaluate(
         (id) => game.actors.get(id).system.rating.initiative.value,
         cast[key].id,
      );
      await addEffect(clients.gm1, cast[key].id, `E2E Visibility Expiring ${key}`, {
         duration: DURATION_INITIATIVE,
         initiative: rating + 7,
         remaining: 1,
      });
   }
   await closeAllApps(clients.gm1);
   await createCombat(clients.gm1);
   await addCombatant(clients.gm1, cast.owned.tokenId);
   await addCombatant(clients.gm1, cast.other.tokenId);
   await forceDice(clients.gm1, [
      1,
      1,
      6,
      6,
   ]);
   await rollInitiative(clients.gm1);
   await resetDice(clients.gm1);
   await startCombat(clients.gm1);

   /** @type {number} The count before the turn that passes the effects' initiative. */
   const baseline = await count();
   await nextTurn(clients.gm1);
   await expect.poll(async () => (await reportsSince(baseline)).map((r) => r.type), {
      message: 'the turn posted an effects-expired report',
   }).toContain('effectsExpiredReport');
   await expectReportsSince(baseline, 'expired');
   await endCombat(clients.gm1);
});
