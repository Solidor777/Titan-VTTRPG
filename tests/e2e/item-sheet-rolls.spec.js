import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addAttack, addCheck, createActor, createOwnedItem, createWorldItem } from './flows.js';
import { selectTitanOption } from './select.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, closeAllApps, newestMessageType } from './world.js';

/**
 * Rolling from an item sheet of a character's owned item. The sidebar shows a condensed roll button for each check,
 * attack or casting check and the expanded Checks tab row shows a roll-preview button; clicking one rolls through the
 * parent actor and posts the matching check subtype. An item check configured as damage in the sheet's check editor
 * (Damage, an enabled Opposed Check or a Resistance Check, and Damage Reduced By) rolls with those settings in the
 * posted message's parameters. A check added while the sheet is open renders its row.
 *
 * The actor and its equipment, weapon and spell are made once in `beforeAll`; the damage-reduction tests each make an
 * ability of their own.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the actor that owns the items. */
let actorId;
/** @type {string} The uuid of that actor. */
let actorUuid;
/** @type {{equipment: string, weapon: string, spell: string}} The uuids of the actor's items. */
const itemUuids = {
   equipment: '',
   weapon: '',
   spell: '',
};

/** @type {string} The label of the first attack of the weapon. */
const FIRST_ATTACK_LABEL = 'E2E Rolls Attack One';
/** @type {string} The label of the second attack of the weapon. */
const SECOND_ATTACK_LABEL = 'E2E Rolls Attack Two';

test.beforeAll(async ({ browser }) => {
   test.setTimeout(120_000);
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);

   // Rolls go straight to chat: no options dialog.
   await setClientSetting(page, 'getCheckOptions', 'never');

   actorId = await createActor(page, {
      name: 'E2E Item Rolls Actor',
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;

   /** @type {string} The id of the equipment that carries the item check. */
   const equipmentId = await createOwnedItem(page, actorId, 'equipment', 'E2E Rolls Equipment');
   itemUuids.equipment = `${actorUuid}.Item.${equipmentId}`;
   await addCheck(page, itemUuids.equipment, { label: 'E2E Rolls Item Check' });

   /** @type {string} The id of the weapon that carries two attacks. */
   const weaponId = await createOwnedItem(page, actorId, 'weapon', 'E2E Rolls Weapon');
   itemUuids.weapon = `${actorUuid}.Item.${weaponId}`;
   await addAttack(page, itemUuids.weapon);

   // The two attacks get distinct labels in the Attacks tab, so a rolled attack names its row.
   /** @type {import('@playwright/test').Locator} The weapon's label inputs, one per attack. */
   const attackLabels = (await openSheetByUuid(page, itemUuids.weapon)).locator('.attack .header .label input');
   await expect(attackLabels).toHaveCount(2);
   for (const [index, label] of [
      FIRST_ATTACK_LABEL,
      SECOND_ATTACK_LABEL,
   ].entries()) {
      await attackLabels.nth(index).fill(label);
      await attackLabels.nth(index).blur();
   }
   await expect.poll(
      () => page.evaluate(
         async (uuid) => (await fromUuid(uuid)).system.attack.map((attack) => attack.label),
         itemUuids.weapon,
      ),
      { message: 'the label inputs stored the attack labels' },
   ).toEqual([
      FIRST_ATTACK_LABEL,
      SECOND_ATTACK_LABEL,
   ]);

   /** @type {string} The id of the spell that rolls the casting check. */
   const spellId = await createOwnedItem(page, actorId, 'spell', 'E2E Rolls Spell');
   itemUuids.spell = `${actorUuid}.Item.${spellId}`;
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Clicks a roll button and waits for the message it posts.
 * @param {import('@playwright/test').Locator} button - The sheet's roll button to click.
 * @param {string} type - The message subtype the roll must post.
 * @returns {Promise<object>} The posted message's `system.parameters`.
 */
async function rollAndRead(button, type) {
   /** @type {number} The world message count before the roll. */
   const before = await page.evaluate(() => game.messages.size);
   await button.click();
   await expect.poll(() => newestMessageType(page, before), { message: `the roll posts a ${type} message` }).toBe(type);
   return page.evaluate(() => game.messages.contents[game.messages.size - 1].system.parameters);
}

test.describe('sidebar roll buttons', () => {
   test('the equipment sidebar roll button posts an itemCheck', async () => {
      /** @type {import('@playwright/test').Locator} The equipment's sheet. */
      const sheet = await openSheetByUuid(page, itemUuids.equipment);

      /** @type {import('@playwright/test').Locator} The sidebar roll button. */
      const button = sheet.locator('.sidebar-check .header .roll button').first();
      await expect(button, 'the sidebar roll button renders for the owner').toBeVisible();
      await rollAndRead(button, 'itemCheck');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the weapon sidebar second attack row rolls the second attack and posts an attackCheck', async () => {
      /** @type {import('@playwright/test').Locator} The weapon's sheet. */
      const sheet = await openSheetByUuid(page, itemUuids.weapon);

      /** @type {import('@playwright/test').Locator} The roll buttons, one per attack row, in order. */
      const buttons = sheet.locator('.sidebar-check .header .roll button');
      await expect(buttons, 'both attack rows render a roll button').toHaveCount(2);

      /** @type {object} The rolled message's parameters. */
      const parameters = await rollAndRead(buttons.nth(1), 'attackCheck');
      expect(parameters.attackName, 'the second row rolled the second attack').toBe(SECOND_ATTACK_LABEL);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the spell sidebar casting button posts a castingCheck', async () => {
      /** @type {import('@playwright/test').Locator} The spell's sheet. */
      const sheet = await openSheetByUuid(page, itemUuids.spell);

      /** @type {import('@playwright/test').Locator} The casting sidebar roll button. */
      const button = sheet.locator('.sidebar-check .header .roll button').first();
      await expect(button, 'the casting roll button renders for the owner').toBeVisible();
      await rollAndRead(button, 'castingCheck');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});

test.describe('the Checks tab', () => {
   test('the equipment check settings panel shows the roll-preview button', async () => {
      /** @type {import('@playwright/test').Locator} The equipment's sheet. */
      const sheet = await openSheetByUuid(page, itemUuids.equipment);
      await sheet.locator('.tab-list').getByText('Checks', { exact: true }).first().click();

      // A check row mounts expanded, so the preview is read without a click (a click would collapse the row).
      await expect(
         sheet.locator('.check .expandable-content .check-button button').first(),
         'the settings panel shows the roll-preview button',
      ).toBeVisible();
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('adding a check while the sheet is open renders the new check row', async () => {
      /** @type {string} The new weapon's uuid. */
      const uuid = `Item.${await createWorldItem(page, {
         name: 'E2E Rolls Added Check Weapon',
         type: 'weapon',
      })}`;

      /** @type {import('@playwright/test').Locator} The weapon's sheet, left open while the check is added. */
      const sheet = await openSheetByUuid(page, uuid);

      /** @type {number} The number of checks the sidebar shows before the add. */
      const before = await sheet.locator('.sidebar-check').count();
      await addCheck(page, uuid, { label: 'E2E Rolls Added Check' });
      await expect(sheet.locator('.sidebar-check'), 'the sidebar shows the new check').toHaveCount(before + 1);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});

test.describe('damage reduction', () => {
   /**
    * Makes an ability with one damaging check on the actor, configures the check in the ability's Checks tab and
    * rolls it from the sidebar.
    * @param {string} name - The ability's name.
    * @param {object} settings - What to set in the check editor.
    * @param {boolean} [settings.opposed] - Whether to tick Opposed Check.
    * @param {string} [settings.resistanceCheck] - The Resistance Check to choose.
    * @param {string} settings.damageReducedBy - The Damage Reduced By option to choose.
    * @returns {Promise<object>} The rolled message's `system.parameters`.
    */
   async function rollConfiguredCheck(name, { opposed, resistanceCheck, damageReducedBy }) {
      /** @type {string} The new ability's uuid. */
      const uuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', name)}`;
      await addCheck(page, uuid, { label: 'E2E Rolls Reduction Check' });

      /** @type {import('@playwright/test').Locator} The ability's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await sheet.locator('.tab-list').getByText('Checks', { exact: true }).first().click();

      /** @type {import('@playwright/test').Locator} The check's row. */
      const row = sheet.locator('.check').filter({ has: page.locator('.header .label input') }).first();

      /**
       * Finds a field of the check row by its label.
       * @param {string} text - The field's label.
       * @returns {import('@playwright/test').Locator} The field's element.
       */
      const field = (text) => row.locator('.field').filter({ has: page.getByText(text, { exact: true }) }).first();

      /**
       * Reads one field of the stored check.
       * @param {string} property - The check property.
       * @returns {Promise<*>} The stored value.
       */
      const stored = (property) => page.evaluate(
         async ({ uuid, property }) => (await fromUuid(uuid)).system.check[0][property],
         {
            uuid,
            property,
         },
      );

      if (opposed) {
         await field('Opposed Check').locator('button').click();
         await expect.poll(async () => (await stored('opposedCheck')).enabled, { message: 'Opposed Check ticked' })
            .toBe(true);
      }
      if (resistanceCheck !== undefined) {
         await selectTitanOption(page, field('Resistance Check').locator('[role="combobox"]'), resistanceCheck);
         await expect.poll(() => stored('resistanceCheck'), { message: 'the Resistance Check chosen' })
            .toBe(resistanceCheck);
      }
      await field('Damage').locator('button').click();
      await expect.poll(() => stored('isDamage'), { message: 'Damage ticked' }).toBe(true);

      /** @type {import('@playwright/test').Locator} The Initial Value input, shown once Damage is ticked. */
      const initialValue = field('Initial Value').locator('input');
      await initialValue.fill('3');
      await initialValue.blur();
      await expect.poll(() => stored('initialValue'), { message: 'the Initial Value typed' }).toBe(3);
      await selectTitanOption(page, field('Damage Reduced By').locator('[role="combobox"]'), damageReducedBy);
      await expect.poll(() => stored('damageReducedBy'), { message: 'Damage Reduced By chosen' })
         .toBe(damageReducedBy);

      return rollAndRead(sheet.locator('.sidebar-check .header .roll button').first(), 'itemCheck');
   }

   test('an opposed-reduction item check carries isDamage, opposedCheck.enabled and damageReducedBy', async () => {
      /** @type {object} The rolled message's parameters. */
      const parameters = await rollConfiguredCheck('E2E Rolls Opposed Ability', {
         opposed: true,
         damageReducedBy: 'opposedCheck',
      });
      expect(parameters.isDamage, 'isDamage propagated from the check').toBe(true);
      expect(parameters.opposedCheck.enabled, 'opposedCheck.enabled propagated').toBe(true);
      expect(parameters.damageReducedBy, 'damageReducedBy carries the opposed source').toBe('opposedCheck');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('a resistance-reduction item check carries damageReducedBy and the resistance', async () => {
      /** @type {object} The rolled message's parameters. */
      const parameters = await rollConfiguredCheck('E2E Rolls Resistance Ability', {
         resistanceCheck: 'resilience',
         damageReducedBy: 'resistanceCheck',
      });
      expect(parameters.isDamage, 'isDamage propagated from the check').toBe(true);
      expect(parameters.damageReducedBy, 'damageReducedBy carries the resistance source').toBe('resistanceCheck');
      expect(parameters.resistanceCheck, 'the configured resistance propagated').toBe('resilience');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
