import { expect, test } from './harness.js';
import { clickRoll, openCheckDialog, readNewestCheckFlags, setCheckbox, setNumberField } from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addCheck, createActor, createOwnedItem, setAttributeBase, setResource } from './flows.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Resolve spent by a roll, for the four check kinds the casting spec does not cover: Attribute, Resistance, Attack and
 * Item checks. Every kind rolls through one `_rollCheck` that spends the Resolve of doubled Training or Expertise and
 * of an Item Check's Resolve Cost, each under its own client setting (`autoSpendResolveDoubleExpertise`,
 * `autoSpendResolveChecks`, both on by default). Each test rolls the check with the setting on (1 or 2 Resolve spent),
 * then off on the same character and the same flow (nothing spent).
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the roller, who has Soul 6 and so a maximum Resolve of ceil(6 * 0.5) = 3. */
let rollerUuid;
/** @type {string} The uuid of the roller's weapon. */
let weaponUuid;
/** @type {string} The uuid of the roller's equipment, whose check costs 2 Resolve. */
let kitUuid;

test.beforeAll(async ({ browser }) => {
   test.setTimeout(120_000);
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   /** @type {string} The roller's id. */
   const rollerId = await createActor(page, {
      name: 'E2E Resolve Roller',
      type: 'player',
   });
   rollerUuid = `Actor.${rollerId}`;
   await setAttributeBase(page, rollerUuid, 'body', 3);
   await setAttributeBase(page, rollerUuid, 'soul', 6);
   weaponUuid = `${rollerUuid}.Item.${await createOwnedItem(page, rollerId, 'weapon', 'E2E Resolve Weapon')}`;
   kitUuid = `${rollerUuid}.Item.${await createOwnedItem(page, rollerId, 'equipment', 'E2E Resolve Kit')}`;
   await addCheck(page, kitUuid, {
      label: 'E2E Resolve Check',
      resolveCost: 2,
   });
   await closeAllApps(page);
});

test.beforeEach(async () => {
   await setResource(page, rollerUuid, 'resolve', 3);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await resetDice(page);
   await setClientSetting(page, 'getCheckOptions', 'never');
   await setClientSetting(page, 'autoSpendResolveDoubleExpertise', true);
   await setClientSetting(page, 'autoSpendResolveChecks', true);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads the roller's current Resolve.
 * @returns {Promise<number>} The Resolve.
 */
function readResolve() {
   return page.evaluate((uuid) => fromUuid(uuid).then((actor) => actor.system.resource.resolve.value), rollerUuid);
}

/**
 * Rolls a check from its dialog with Expertise doubled and returns the Resolve before the roll. The roll spends its
 * Resolve before it posts the card (`_rollCheck` awaits `_expendCheckResolve`), so once the card exists the Resolve is
 * final.
 * @param {string} type - The check type: attribute, resistance or attack.
 * @param {string} uuid - The uuid of the actor (attribute, resistance) or the weapon (attack) whose button opens it.
 * @returns {Promise<number>} The Resolve before the roll.
 */
async function rollDoubledExpertise(type, uuid) {
   await setClientSetting(page, 'getCheckOptions', 'always');

   /** @type {number} The Resolve before the roll. */
   const before = await readResolve();
   /** @type {import('@playwright/test').Locator} The check's dialog. */
   const dialog = await openCheckDialog(page, type, uuid);
   await setNumberField(dialog, 'expertiseMod', 1);
   await setCheckbox(dialog, 'doubleExpertise', true);
   await forceDice(page, [
      6,
      6,
      6,
      6,
   ]);

   /** @type {number} The message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{parameters: object}} The posted check. */
   const posted = await readNewestCheckFlags(page, baseline, `${type}Check`);
   expect(posted.parameters.doubleExpertise, 'the card carries the doubled Expertise').toBe(true);
   await resetDice(page);
   return before;
}

for (const [type, uuid] of [
   [
      'attribute',
      () => rollerUuid,
   ],
   [
      'resistance',
      () => rollerUuid,
   ],
   [
      'attack',
      () => weaponUuid,
   ],
]) {
   test(`a ${type} check spends 1 Resolve for doubled Expertise while the setting is on, and none once it is off`,
      async () => {
         // Presence: the setting is on.
         /** @type {number} The Resolve before the first roll. */
         const first = await rollDoubledExpertise(type, uuid());
         expect(first, 'the roller starts with 3 Resolve').toBe(3);
         await expect.poll(readResolve, { message: 'the roll spent 1 Resolve' }).toBe(2);

         // Absence on the same roll flow: the setting is off.
         await setClientSetting(page, 'autoSpendResolveDoubleExpertise', false);
         /** @type {number} The Resolve before the second roll. */
         const second = await rollDoubledExpertise(type, uuid());
         expect(await readResolve(), 'the setting is off, so the roll spent nothing').toBe(second);
      });
}

test('an item check spends its Resolve Cost while the setting is on, and none once it is off', async () => {
   /**
    * Rolls the equipment's check from its sheet's roll button, which rolls straight to chat, and returns the Resolve
    * before the roll.
    * @returns {Promise<number>} The Resolve before the roll.
    */
   async function rollKit() {
      /** @type {number} The Resolve before the roll. */
      const before = await readResolve();
      /** @type {number} The message count before the roll. */
      const baseline = await page.evaluate(() => game.messages.size);
      await forceDice(page, [
         6,
         6,
         6,
      ]);
      await (await openSheetByUuid(page, kitUuid)).locator('.sidebar-check .header .roll button').first().click();
      /** @type {{parameters: object}} The posted check. */
      const posted = await readNewestCheckFlags(page, baseline, 'itemCheck');
      expect(posted.parameters.resolveCost, 'the card carries the Resolve Cost').toBe(2);
      await resetDice(page);
      return before;
   }

   /** @type {number} The Resolve before the first roll. */
   const first = await rollKit();
   expect(first, 'the roller starts with 3 Resolve').toBe(3);
   await expect.poll(readResolve, { message: 'the roll spent its Resolve Cost of 2' }).toBe(1);

   await setClientSetting(page, 'autoSpendResolveChecks', false);
   await setResource(page, rollerUuid, 'resolve', 3);
   await closeAllApps(page);
   /** @type {number} The Resolve before the second roll. */
   const second = await rollKit();
   expect(await readResolve(), 'the setting is off, so the roll spent nothing').toBe(second);
});
