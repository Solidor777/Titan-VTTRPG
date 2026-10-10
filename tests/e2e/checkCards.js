import { expect } from '@playwright/test';
import { clickSheetTab, commitText } from './actions.js';
import { readNewestCheckFlags } from './checkDialog.js';
import {
   createActor,
   createOwnedItem,
   readServerSystem,
   setAttributeBase,
   setEquipped,
   setResource,
} from './flows.js';
import { login, openSheetByUuid } from './fixtures.js';
import { selectTitanOption } from './select.js';
import { settle } from './settle.js';
import { closeAllApps, showChatLog } from './world.js';

// Page objects for the cards of item checks and attack checks, the buttons those cards offer (Resist, Opposed, the
// damage buttons), the character that those buttons act on, and the settings of an item check row that `addCheck` does
// not fill in.

/**
 * Opens a second Foundry client for E2E Player 1, who sees the chat cards the GM rolls and clicks their buttons.
 * @param {import('@playwright/test').Browser} browser - The Playwright browser of the test fixture.
 * @returns {Promise<import('@playwright/test').Page>} The player's logged-in page, in its own browser context.
 */
export async function loginPlayer(browser) {
   /** @type {import('@playwright/test').Page} The player's page. */
   const page = await (await browser.newContext()).newPage();
   await login(page, 'E2E Player 1');
   return page;
}

/**
 * Makes a character the one that a player's chat-card buttons act on. A player's buttons act on the controlled tokens
 * first, then on the user's assigned character, then on the focused sheet, so this releases the tokens the client has
 * controlled and assigns the character to the user. Call `assignCharacter(page, previousId)` with the id this returns
 * to leave the user as it was.
 * @param {import('@playwright/test').Page} page - A logged-in player page.
 * @param {string} actorId - The id of the character the buttons should act on.
 * @returns {Promise<string|null>} The id of the character the user had assigned before, or null for none.
 */
export async function actAsCharacter(page, actorId) {
   /** @type {string|null} The character assigned before. */
   const previous = await page.evaluate(() => game.user.character?.id ?? null);
   await page.evaluate(() => canvas.tokens?.releaseAll());
   await expect.poll(
      () => page.evaluate(() => canvas.tokens?.controlled.length ?? 0),
      { message: 'no token is controlled' },
   ).toBe(0);
   await assignCharacter(page, actorId);
   return previous;
}

/**
 * Assigns a character to the logged-in user (or none), as the User Configuration's Character field does.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string|null} actorId - The id of the character, or null for none.
 * @returns {Promise<void>} Resolves once the client holds the assignment.
 */
export async function assignCharacter(page, actorId) {
   if (await page.evaluate(() => game.user.character?.id ?? null) !== actorId) {
      await page.evaluate((id) => game.user.update({ character: id }), actorId);
   }
   await expect.poll(
      () => page.evaluate(() => game.user.character?.id ?? null),
      { message: 'the user holds the assigned character' },
   ).toBe(actorId);
}

/**
 * Reads the name of the user who authored a chat message, as the given client holds it.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} messageId - The id of the chat message.
 * @returns {Promise<string>} The author's name.
 */
export function readMessageAuthor(page, messageId) {
   return page.evaluate((id) => game.messages.get(id).author.name, messageId);
}

/**
 * Counts the chat messages, so that the message a click adds is the one read.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @returns {Promise<number>} The number of messages the client holds.
 */
export function messageCount(page) {
   return page.evaluate(() => game.messages.size);
}

/**
 * Rolls an item's check with the roll button in the sidebar of the item's own sheet.
 * @param {import('@playwright/test').Page} page - A logged-in page; the `getCheckOptions` setting is `never`.
 * @param {string} itemUuid - The uuid of the owned ability, equipment or other item that holds the check.
 * @param {number} [index] - The position of the check among the item's checks.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted item check.
 */
export async function rollItemCheck(page, itemUuid, index = 0) {
   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await (await openSheetByUuid(page, itemUuid)).locator('.sidebar-check .header .roll button').nth(index).click();
   return readNewestCheckFlags(page, baseline, 'itemCheck');
}

/**
 * Rolls a weapon's attack with the roll button in the sidebar of the weapon's own sheet.
 * @param {import('@playwright/test').Page} page - A logged-in page; the `getCheckOptions` setting is `never`.
 * @param {string} weaponUuid - The uuid of the owned weapon.
 * @param {number} [index] - The position of the attack among the weapon's attacks.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted attack check.
 */
export async function rollWeaponAttack(page, weaponUuid, index = 0) {
   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await (await openSheetByUuid(page, weaponUuid)).locator('.sidebar-check .header .roll button').nth(index).click();
   return readNewestCheckFlags(page, baseline, 'attackCheck');
}

/**
 * Makes a character's sheet the focused window. A GM who targets nothing has the buttons of a chat card act on the
 * character whose sheet is focused.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorUuid - The uuid of the character.
 * @returns {Promise<void>} Resolves once the sheet is the active window.
 */
export async function focusCharacter(page, actorUuid) {
   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await sheet.locator('.window-header').click();
   await expect.poll(
      () => page.evaluate(() => ui.activeWindow?.document?.uuid ?? null),
      { message: 'the character\'s sheet is the focused window' },
   ).toBe(actorUuid);
}

/**
 * Finds a card's chat log entry in the open chat log.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} messageId - The id of the chat message.
 * @returns {import('@playwright/test').Locator} The message's list entry.
 */
export function cardOf(page, messageId) {
   return page.locator(`#chat .chat-log li[data-message-id="${messageId}"]`);
}

/**
 * Clicks a Resist button of a card and returns the Resistance Check it rolls for the focused or targeted character.
 * @param {import('@playwright/test').Page} page - A logged-in GM page showing the chat log.
 * @param {string} messageId - The id of the card's chat message.
 * @param {string} resistance - The Resistance of the button (`reflexes`, `resilience`, `willpower`).
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted Resistance Check.
 */
export async function clickResist(page, messageId, resistance) {
   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await cardOf(page, messageId).locator(`.button.${resistance} button`).click();
   return readNewestCheckFlags(page, baseline, 'resistanceCheck');
}

/**
 * Clicks the Opposed button of a card and returns the Attribute Check it rolls for the focused or targeted character.
 * @param {import('@playwright/test').Page} page - A logged-in GM page showing the chat log.
 * @param {string} messageId - The id of the card's chat message.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted Attribute Check.
 */
export async function clickOpposed(page, messageId) {
   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await cardOf(page, messageId).locator('.opposed-check-button button').click();
   return readNewestCheckFlags(page, baseline, 'attributeCheck');
}

/**
 * Reads the text of the Resist buttons and the Opposed button that a card shows.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @returns {Promise<{resist: string[], opposed: string[]}>} The whitespace-normalised button texts, in DOM order.
 */
export async function readCardButtons(card) {
   return card.evaluate((entry) => {
      /**
       * Normalises whitespace.
       * @param {Element} element - The element to read.
       * @returns {string} The element's text.
       */
      const text = (element) => element.textContent.replace(/\s+/g, ' ').trim();

      // Every Resist and Opposed button ends with its Difficulty and Complexity ("Reflexes 4:3"); a Resist button is
      // the one outside the Opposed button's wrapper, whatever Resistance (or none) it names.
      /** @type {Element[]} The buttons of the card whose text ends with a Difficulty and Complexity. */
      const buttons = [...entry.querySelectorAll('button')].filter((button) => /\d:\d+$/.test(text(button)));
      return {
         resist: buttons.filter((button) => !button.closest('.opposed-check-button')).map(text),
         opposed: buttons.filter((button) => button.closest('.opposed-check-button')).map(text),
      };
   });
}

/**
 * Reads the result rows of a check card, including the damage rows.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @returns {Promise<{dc: string, successes: string, outcome: string|null, rows: string[]}>} The Difficulty and
 * Complexity text, the Successes text, the Succeeded or Failed text, and the text of every other stat row.
 */
export async function readResultRows(card) {
   return card.locator('.results').evaluate((results) => {
      /**
       * Normalises whitespace.
       * @param {Element|null} element - The element to read.
       * @returns {string|null} The element's text, or null for no element.
       */
      const text = (element) => (element ? element.textContent.replace(/\s+/g, ' ').trim() : null);

      /** @type {string} The Difficulty and Complexity text. */
      const dc = text(results.querySelector('[data-testid="check-chat-dc"]'));

      /** @type {string[]} The text of every stat row. */
      const stats = [...results.querySelectorAll('.stat')].map(text);
      return {
         dc,
         successes: stats[0].slice(dc.length).trim(),
         outcome: text(results.querySelector('.result')),
         rows: stats.slice(1),
      };
   });
}

/**
 * Creates a character with the given Attributes through the Actors tab and the sheet's Attribute inputs.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} name - The character's name; it starts with `E2E `.
 * @param {object} attributes - The base values to type; an Attribute left out keeps its default.
 * @param {number} [attributes.body] - The Body base value.
 * @param {number} [attributes.mind] - The Mind base value.
 * @param {number} [attributes.soul] - The Soul base value.
 * @returns {Promise<string>} The character's id.
 */
export async function createCharacter(page, name, { body, mind, soul }) {
   /** @type {string} The character's id. */
   const id = await createActor(page, {
      name,
      type: 'player',
   });
   for (const [attribute, value] of Object.entries({
      body,
      mind,
      soul,
   })) {
      if (value !== undefined) {
         await setAttributeBase(page, `Actor.${id}`, attribute, value);
      }
   }
   return id;
}

/**
 * Opens an Armor item's sheet and finds its Armor stat (the current and maximum inputs).
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} armorUuid - The uuid of the armor.
 * @returns {Promise<import('@playwright/test').Locator>} The Armor stat of the sheet's header.
 */
async function openArmorStat(page, armorUuid) {
   return (await openSheetByUuid(page, armorUuid)).locator('.header .stat, .header .labeled-element')
      .filter({ has: page.getByText('Armor', { exact: true }) }).last();
}

/**
 * Sets the current Armor value of an Armor item with the current-value input of its sheet, so that a test that
 * rends or repairs starts from a known value.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} armorUuid - The uuid of the armor.
 * @param {number} value - The current Armor value to type.
 * @returns {Promise<void>} Resolves once the armor stores the value.
 */
export async function setArmorValue(page, armorUuid, value) {
   /** @type {import('@playwright/test').Locator} The armor sheet's Armor stat. */
   const armor = await openArmorStat(page, armorUuid);
   await commitText(armor.locator('input').nth(0), String(value));
   await expect.poll(
      async () => (await readServerSystem(page, armorUuid)).armor.value,
      { message: 'the input stored the Armor value' },
   ).toBe(value);
}

/**
 * Gives a character an Armor item worn at a value: creates the Armor, types its Armor stat, and equips it with the
 * Equipped toggle of its row in the Inventory tab.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorId - The id of the character.
 * @param {string} name - The armor's name; it starts with `E2E `.
 * @param {number} value - The Armor value, current and maximum.
 * @returns {Promise<string>} The uuid of the armor.
 */
export async function wearArmor(page, actorId, name, value) {
   /** @type {string} The id of the armor. */
   const armorId = await createOwnedItem(page, actorId, 'armor', name);

   /** @type {string} The uuid of the armor. */
   const armorUuid = `Actor.${actorId}.Item.${armorId}`;

   /** @type {import('@playwright/test').Locator} The armor sheet's Armor stat. */
   const armor = await openArmorStat(page, armorUuid);
   await commitText(armor.locator('input').nth(1), String(value));
   await commitText(armor.locator('input').nth(0), String(value));
   await expect.poll(
      async () => (await readServerSystem(page, armorUuid)).armor,
      { message: 'the inputs stored the Armor value' },
   ).toMatchObject({
      max: value,
      value,
   });
   await setEquipped(page, actorId, armorId, true);
   return armorUuid;
}

/**
 * Reads a character's Stamina and Wounds as the client holds them.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the character.
 * @returns {Promise<{stamina: number, wounds: number, staminaMax: number, woundsMax: number}>} The current and maximum
 * Stamina and Wounds.
 */
export function readVitals(page, actorId) {
   return page.evaluate((id) => {
      /** @type {object} The character's resources. */
      const { resource } = game.actors.get(id).system;
      return {
         stamina: resource.stamina.value,
         wounds: resource.wounds.value,
         staminaMax: resource.stamina.max,
         woundsMax: resource.wounds.max,
      };
   }, actorId);
}

/**
 * Tops a character's Stamina up to its maximum with the Stamina input of the sheet, so that the damage a test applies
 * does not depend on what earlier tests took.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorId - The id of the character.
 * @returns {Promise<void>} Resolves once the character has full Stamina and the sheet is closed.
 */
export async function restoreStamina(page, actorId) {
   /** @type {{stamina: number, staminaMax: number}} The character's Stamina. */
   const { stamina, staminaMax } = await readVitals(page, actorId);
   if (stamina < staminaMax) {
      await setResource(page, `Actor.${actorId}`, 'stamina', staminaMax);
      await closeAllApps(page);
   }
}

/**
 * Sets the opposed Attribute and Skill and the scaling toggle of an item check row on the Checks tab. A field the
 * caller leaves out stays as it is.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} itemUuid - The uuid of the item that holds the check.
 * @param {number} index - The position of the check among the item's checks.
 * @param {object} settings - What to set.
 * @param {string} [settings.opposedAttribute] - The Attribute of the opposed check.
 * @param {string} [settings.opposedSkill] - The Skill of the opposed check (`none` for none).
 * @param {boolean} [settings.scaling] - Whether the Scaling box is ticked.
 * @returns {Promise<void>} Resolves once the item stores every requested field.
 */
export async function setCheckExtras(page, itemUuid, index, { opposedAttribute, opposedSkill, scaling }) {
   /** @type {import('@playwright/test').Locator} The item's sheet, on the Checks tab. */
   const sheet = await openSheetByUuid(page, itemUuid);
   await clickSheetTab(sheet, 'Checks');
   await settle(page, { transitions: true });

   /** @type {import('@playwright/test').Locator} The check's row. */
   const row = sheet.locator('.check').filter({ has: page.locator('.header .label input') }).nth(index);

   /**
    * Reads one field of the check as the server stores it.
    * @param {string} key - The check field.
    * @returns {Promise<*>} The stored value.
    */
   const stored = async (key) => (await readServerSystem(page, itemUuid)).check[index][key];

   /**
    * Finds the labelled select that follows the opposed check box: the second `Attribute` or `Skill` select of the row.
    * @param {string} label - The select's label.
    * @returns {import('@playwright/test').Locator} The select's trigger.
    */
   const opposedSelect = (label) => row.locator('.labeled-element')
      .filter({ has: page.locator('.label', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) })
      .nth(1).locator('[role="combobox"]');
   if (opposedAttribute !== undefined) {
      await selectTitanOption(page, opposedSelect('Attribute'), opposedAttribute);
      await expect.poll(async () => (await stored('opposedCheck')).attribute, {
         message: 'the select stored the opposed Attribute',
      }).toBe(opposedAttribute);
   }
   if (opposedSkill !== undefined) {
      await selectTitanOption(page, opposedSelect('Skill'), opposedSkill);
      await expect.poll(async () => (await stored('opposedCheck')).skill, {
         message: 'the select stored the opposed Skill',
      }).toBe(opposedSkill);
   }
   if (scaling !== undefined && await stored('scaling') !== scaling) {
      await row.locator('.field').filter({ has: page.getByText('Scaling', { exact: true }) }).first()
         .locator('button').click();
      await expect.poll(() => stored('scaling'), { message: 'the Scaling box stored its state' }).toBe(scaling);
   }
}

/**
 * Chooses the Resistance Check of a custom aspect on the Custom Aspects tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} spellUuid - The uuid of the spell.
 * @param {number} index - The position of the custom aspect among the spell's custom aspects.
 * @param {string} resistance - The Resistance to choose (`reflexes`, `resilience`, `willpower`).
 * @returns {Promise<void>} Resolves once the spell stores the Resistance.
 */
export async function setCustomAspectResistance(page, spellUuid, index, resistance) {
   /** @type {import('@playwright/test').Locator} The spell's sheet, on the Custom Aspects tab. */
   const sheet = await openSheetByUuid(page, spellUuid);
   await clickSheetTab(sheet, 'Custom Aspects');
   await settle(page, { transitions: true });

   /** @type {import('@playwright/test').Locator} The aspect's row. */
   const row = sheet.locator('li.reorder-row').nth(index);
   await selectTitanOption(
      page,
      row.locator('.field').filter({ has: page.getByText('Resistance Check', { exact: true }) }).first()
         .locator('[role="combobox"]'),
      resistance,
   );
   await expect.poll(
      async () => (await readServerSystem(page, spellUuid)).customAspect[index].resistanceCheck,
      { message: 'the select stored the custom aspect\'s resistance' },
   ).toBe(resistance);
}

/**
 * The icon class of each damage button of an attack card, by the button's kind.
 * @type {Record<string, string>}
 */
const DAMAGE_BUTTON_ICONS = {
   apply: 'fa-burst',
   cleave: 'fa-scythe',
   ignoreArmor: 'fa-shield-slash',
   half: 'fa-heart-half-stroke',
   heal: 'fa-heart',
   rend: 'fa-hammer-crash',
   repair: 'fa-screwdriver-wrench',
};

/**
 * Finds a damage, Rend or Repair button of a card.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @param {'apply'|'cleave'|'ignoreArmor'|'half'|'heal'|'rend'|'repair'} kind - Which button.
 * @returns {import('@playwright/test').Locator} The button.
 */
export function cardButton(card, kind) {
   return card.locator(`button:has(i.${DAMAGE_BUTTON_ICONS[kind]})`);
}

/**
 * Reads the system data of the newest chat message of a type created after a baseline count.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {number} baseline - The chat-message count before the action.
 * @param {string} type - The message subtype (`damageReport`, `rendReport`, `repairsReport`).
 * @returns {Promise<object>} The message's system data, once the message exists.
 */
export async function readNewestMessage(page, baseline, type) {
   /** @type {object|null} The newest message's system data. */
   let system = null;
   await expect.poll(
      async () => {
         system = await page.evaluate(({ base, subtype }) => {
            /** @type {ChatMessage|undefined} The newest message of the type among those created after the baseline. */
            const message = [...game.messages.contents.slice(base)].reverse().find((entry) => entry.type === subtype);
            return message ? message.system.toObject() : null;
         }, {
            base: baseline,
            subtype: type,
         });
         return system;
      },
      { message: `a ${type} message should be created after the click` },
   ).not.toBeNull();
   return system;
}

/**
 * Clicks a damage button of a card with a character's sheet focused, and returns the damage report the character
 * posts with the Stamina and Wounds it had before and after.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} messageId - The id of the card's chat message.
 * @param {string} actorId - The id of the character that takes the damage.
 * @param {'apply'|'cleave'|'ignoreArmor'|'half'|'heal'} kind - Which damage button to click.
 * @returns {Promise<{report: object, before: object, after: object}>} The damage report's system data and the
 * character's vitals (see `readVitals`) around the click.
 */
export async function pressDamageButton(page, messageId, actorId, kind) {
   await focusCharacter(page, `Actor.${actorId}`);
   await showChatLog(page);
   await expect(cardOf(page, messageId), 'the card is in the chat log').toBeVisible();

   /** @type {object} The vitals before the click. */
   const before = await readVitals(page, actorId);

   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await cardButton(cardOf(page, messageId), kind).click();

   /** @type {object} The damage report. */
   const report = await readNewestMessage(page, baseline, 'damageReport');
   return {
      report,
      before,
      after: await readVitals(page, actorId),
   };
}

/**
 * Clicks the Rend or Repair button of an attack card with a character's sheet focused, and returns the report the
 * character posts with the value of its worn Armor before and after.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} messageId - The id of the card's chat message.
 * @param {string} actorId - The id of the character whose Armor is rent or repaired.
 * @param {'rend'|'repair'} kind - Which button to click.
 * @returns {Promise<{report: object, before: number, after: number}>} The report's system data and the Armor value
 * before and after the click.
 */
export async function pressRendButton(page, messageId, actorId, kind) {
   await focusCharacter(page, `Actor.${actorId}`);
   await showChatLog(page);
   await expect(cardOf(page, messageId), 'the card is in the chat log').toBeVisible();

   /** @type {number} The Armor value before the click. */
   const before = await readArmorValue(page, actorId);

   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await cardButton(cardOf(page, messageId), kind).click();

   /** @type {object} The report. */
   const report = await readNewestMessage(page, baseline, kind === 'rend' ? 'rendReport' : 'repairsReport');
   return {
      report,
      before,
      after: await readArmorValue(page, actorId),
   };
}

/**
 * Reads the value of the Armor a character wears.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the character.
 * @returns {Promise<number>} The worn Armor's current value.
 */
export function readArmorValue(page, actorId) {
   return page.evaluate((id) => game.actors.get(id).system.getEquippedArmor().system.armor.value, actorId);
}

/**
 * Adds a trait that has a number value (Blast) to a weapon attack through the sheet's Edit Traits button and its
 * dialog: the number is typed into the trait's input.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {number} attackIndex - The position of the attack.
 * @param {string} label - The trait's label in the dialog (`Blast`).
 * @param {number} value - The number to type.
 * @returns {Promise<void>} Resolves once the attack stores the trait with the value.
 */
export async function addValuedAttackTrait(page, weaponUuid, attackIndex, label, value) {
   /** @type {import('@playwright/test').Locator} The weapon's sheet, on the Attacks tab. */
   const sheet = await openSheetByUuid(page, weaponUuid);
   await clickSheetTab(sheet, 'Attacks');
   await settle(page, { transitions: true });
   await sheet.locator('.traits:has(.traits-header)').nth(attackIndex).getByText('Edit Traits', { exact: true })
      .first().click();

   /** @type {import('@playwright/test').Locator} The Edit Traits dialog. */
   const dialog = page.locator('.application.titan-dialog', { has: page.getByRole('button', { name: 'Apply Edits' }) });
   await expect(dialog, 'the Edit Traits dialog opens').toBeVisible();
   await commitText(dialog.locator('li', { has: page.getByText(label, { exact: true }) }).locator('input'), value);
   await dialog.getByRole('button', { name: 'Apply Edits' }).click();
   await expect.poll(
      async () => (await readServerSystem(page, weaponUuid)).attack[attackIndex].trait
         .find((trait) => trait.value === value && trait.value > 0)?.value,
      { message: `the dialog stored the ${label} trait with its value` },
   ).toBe(value);
   await expect(dialog, 'Apply Edits closes the dialog').toHaveCount(0);
   await settle(page);
}

/**
 * Opens a weapon's row on the Inventory tab of its owner's sheet, expanded.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the owner.
 * @param {string} weaponId - The id of the owned weapon.
 * @returns {Promise<import('@playwright/test').Locator>} The weapon's row.
 */
export async function openWeaponRow(page, actorUuid, weaponId) {
   /** @type {import('@playwright/test').Locator} The owner's sheet, on the Inventory tab. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await clickSheetTab(sheet, 'Inventory');
   await settle(page, { transitions: true });

   /** @type {import('@playwright/test').Locator} The weapon's row. */
   const row = sheet.locator(`[data-item-id="${weaponId}"]`);
   await expect(row, 'the weapon\'s row renders').toBeVisible();
   if (await row.locator('.expandable-content').count() === 0) {
      await row.locator('.header .label .button button').first().click();
   }
   await expect(row.locator('.expandable-content'), 'the weapon\'s row is expanded').toBeVisible();
   return row;
}

/**
 * Clicks the Multi-Attack button of an expanded weapon row until the weapon holds the wanted state.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {import('@playwright/test').Locator} row - The weapon's expanded row.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {boolean} multiAttack - The state to leave the weapon in.
 * @returns {Promise<void>} Resolves once the weapon stores the state.
 */
export async function setMultiAttack(page, row, weaponUuid, multiAttack) {
   if ((await readServerSystem(page, weaponUuid)).multiAttack !== multiAttack) {
      await row.getByRole('button', { name: 'Multi-Attack' }).click();
   }
   await expect.poll(
      async () => (await readServerSystem(page, weaponUuid)).multiAttack,
      { message: 'the Multi-Attack button left the weapon in the wanted state' },
   ).toBe(multiAttack);
   await settle(page);
}

/**
 * Sets the "+ ES" box of a weapon attack (whether each extra success adds 1 damage) with the box in the attack's row of
 * the Attacks tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {number} index - The position of the attack.
 * @param {boolean} enabled - The state to leave the box in.
 * @returns {Promise<void>} Resolves once the weapon stores the state.
 */
export async function setPlusExtraSuccesses(page, weaponUuid, index, enabled) {
   /** @type {import('@playwright/test').Locator} The weapon's sheet, on the Attacks tab. */
   const sheet = await openSheetByUuid(page, weaponUuid);
   await clickSheetTab(sheet, 'Attacks');
   await settle(page, { transitions: true });

   /**
    * Reads the stored state of the box.
    * @returns {Promise<boolean>} Whether the attack adds its extra successes to the damage.
    */
   const stored = async () => (await readServerSystem(page, weaponUuid)).attack[index].plusExtraSuccessDamage;
   if (await stored() !== enabled) {
      await sheet.locator('li.reorder-row').nth(index).locator('.field')
         .filter({ has: page.getByText('Damage', { exact: true }) }).locator('.input:not(.number) button').click();
   }
   await expect.poll(stored, { message: 'the box left the attack in the wanted state' }).toBe(enabled);
}
