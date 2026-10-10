import { expect } from '@playwright/test';
import { clickSheetTab } from './actions.js';
import { readNewestCheckFlags } from './checkDialog.js';
import { addCustomAspect, controlPlacedToken, createOwnedItem, enableAspect, setCustomAspect } from './flows.js';
import { openSheetByUuid } from './fixtures.js';
import { showChatLog } from './world.js';

// Page objects for the casting check cards: the three entry points that cast a spell (the spell sheet's roll button,
// the character sheet's spell row, the Player HUD's Spells category), the card's result rows, and the controls of its
// scaling aspects.

/**
 * The label of each control of a scaling aspect, by the position of its `.control` element in the aspect's
 * `.controls` row (the first child is the cost).
 * @type {Record<string, number>}
 */
const CONTROL_POSITION = {
   reset: 2,
   decrease: 3,
   increase: 4,
};

/**
 * Counts the chat messages, so that the message a click adds is the one read.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @returns {Promise<number>} The number of messages the client holds.
 */
function messageCount(page) {
   return page.evaluate(() => game.messages.size);
}

/**
 * Casts a spell with the roll button in the sidebar of the spell's own sheet.
 * @param {import('@playwright/test').Page} page - A logged-in page; the `getCheckOptions` setting is `never`.
 * @param {string} spellUuid - The uuid of the owned spell.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted casting check.
 */
export async function castFromSpellSheet(page, spellUuid) {
   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await (await openSheetByUuid(page, spellUuid)).locator('.sidebar-check .header .roll button').first().click();
   return readNewestCheckFlags(page, baseline, 'castingCheck');
}

/**
 * Casts a spell with the casting button of its row on the Spells tab of the character sheet.
 * @param {import('@playwright/test').Page} page - A logged-in page; the `getCheckOptions` setting is `never`.
 * @param {string} actorUuid - The uuid of the character.
 * @param {string} spellId - The id of the owned spell.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted casting check.
 */
export async function castFromCharacterSheet(page, actorUuid, spellId) {
   /** @type {import('@playwright/test').Locator} The character's sheet, on the Spells tab. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await clickSheetTab(sheet, 'Spells');

   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await sheet.locator(`[data-item-id="${spellId}"] .controls .check-button button`).click();
   return readNewestCheckFlags(page, baseline, 'castingCheck');
}

/**
 * Casts a spell with its entry in the Spells category of the Player HUD's action menu, after taking control of the
 * character's placed token.
 * @param {import('@playwright/test').Page} page - A logged-in page viewing the token's scene; the `getCheckOptions`
 * setting is `never`.
 * @param {string} tokenId - The id of the character's placed token.
 * @param {string} spellId - The id of the owned spell.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted casting check.
 */
export async function castFromHud(page, tokenId, spellId) {
   await controlPlacedToken(page, tokenId);

   /** @type {import('@playwright/test').Locator} The Spells category button. */
   const category = page.getByTestId('player-hud-category-spells');
   await expect(category).toBeVisible();
   if (!await category.evaluate((element) => element.classList.contains('active'))) {
      await category.click();
   }

   /** @type {number} The message count before the click. */
   const baseline = await messageCount(page);
   await page.getByTestId(`player-hud-sub-option-spells-${spellId}`).click();
   return readNewestCheckFlags(page, baseline, 'castingCheck');
}

/**
 * Returns the chat log entry of a message, after opening the chat log.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} messageId - The id of the chat message.
 * @returns {Promise<import('@playwright/test').Locator>} The message's list entry.
 */
export async function openCard(page, messageId) {
   await showChatLog(page);

   /** @type {import('@playwright/test').Locator} The entry. */
   const card = page.locator(`#chat .chat-log li[data-message-id="${messageId}"]`);
   await expect(card.locator('.check-chat-message'), 'the casting card is mounted').toBeAttached();
   return card;
}

/**
 * Reads the text rows of a casting card's results panel.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @returns {Promise<{dc: string, successes: string, outcome: string, extra: string|null, damage: string|null,
 * healing: string|null}>} The rows' whitespace-normalised text; a row the card does not show is null.
 */
export async function readCardRows(card) {
   return card.locator('.results').evaluate((results) => {
      /**
       * Normalises whitespace.
       * @param {Element|null} element - The element to read.
       * @returns {string|null} The element's text, or null for no element.
       */
      const text = (element) => (element ? element.textContent.replace(/\s+/g, ' ').trim() : null);

      /** @type {Element[]} The stat rows. */
      const stats = [...results.querySelectorAll('.stat')];

      /**
       * Finds the first stat row that starts with a word.
       * @param {string} prefix - The text the row starts with.
       * @returns {string|null} The row's text.
       */
      const startingWith = (prefix) => text(stats.find((stat) => text(stat).startsWith(prefix)) ?? null);

      /** @type {string} The Difficulty and Complexity text. */
      const dc = text(results.querySelector('[data-testid="check-chat-dc"]'));

      // The Successes count shares its row with the Difficulty and Complexity.
      /** @type {Element} The row that holds both. */
      const successesRow = stats.find((stat) => text(stat).startsWith(dc));
      return {
         dc,
         successes: text(successesRow).slice(dc.length).trim(),
         outcome: text(results.querySelector('.result')),
         extra: startingWith('Extra Successes'),
         damage: startingWith('Damage:'),
         healing: startingWith('Healing:'),
      };
   });
}

/**
 * Finds a scaling aspect's block on a casting card.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @param {number} index - The position of the aspect among the card's scaling aspects.
 * @returns {import('@playwright/test').Locator} The aspect's block.
 */
export function aspectBlock(card, index) {
   return card.locator('.aspects > .aspect').nth(index).locator('.aspect');
}

/**
 * Finds a control button of a scaling aspect block.
 * @param {import('@playwright/test').Locator} block - The aspect's block.
 * @param {'reset'|'decrease'|'increase'} control - Which control.
 * @returns {import('@playwright/test').Locator} The button.
 */
export function aspectControl(block, control) {
   return block.locator(`.controls .control:nth-child(${CONTROL_POSITION[control]}) button`);
}

/**
 * Reads what a scaling aspect block shows.
 * @param {import('@playwright/test').Locator} block - The aspect's block.
 * @returns {Promise<{label: string, value: string, cost: string, disabled: {reset: boolean, decrease: boolean,
 * increase: boolean}}>} The aspect's label and current value, the text of its cost, and which controls are disabled.
 */
export async function readAspectBlock(block) {
   return block.evaluate((element) => {
      /**
       * Normalises whitespace.
       * @param {Element} node - The element to read.
       * @returns {string} The element's text.
       */
      const text = (node) => node.textContent.replace(/\s+/g, ' ').trim();

      /** @type {NodeListOf<Element>} The control cells; the first child of the controls row is the cost. */
      const controls = element.querySelectorAll('.controls .control button');
      return {
         label: text(element.querySelector('.header .label div')),
         value: text(element.querySelector('.header .value')),
         cost: text(element.querySelector('.controls .cost .value')),
         disabled: {
            reset: controls[0].disabled,
            decrease: controls[1].disabled,
            increase: controls[2].disabled,
         },
      };
   });
}

/**
 * Reads the scaling state a casting message stores.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} messageId - The id of the casting message.
 * @returns {Promise<{values: number[], remaining: number, extra: number, damage: number, healing: number}>} The
 * current value of each scaling aspect, the extra successes still unspent and earned, and the damage and healing.
 */
export function readScaling(page, messageId) {
   return page.evaluate((id) => {
      /** @type {object} The message's stored system data. */
      const { results } = game.messages.get(id).system.toObject();
      return {
         values: results.scalingAspect.map((aspect) => aspect.currentValue),
         remaining: results.extraSuccessesRemaining,
         extra: results.extraSuccesses,
         damage: results.damage,
         healing: results.healing,
      };
   }, messageId);
}

/**
 * Builds a spell on a character with the spell sheet's controls: a new spell from the Spells tab, each standard aspect
 * enabled in the Standard Aspects tab, and each custom aspect added and filled in the Custom Aspects tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the character that receives the spell.
 * @param {string} name - The spell's name.
 * @param {object} aspects - The aspects the spell gets.
 * @param {object[]} [aspects.standard] - The standard aspects, in order: `{label, initialValue, options, unit,
 * resistanceCheck}` as `enableAspect` takes them.
 * @param {object[]} [aspects.custom] - The custom aspects, in order: `{label, cost, initialValue, damage, healing,
 * scaling}` as `setCustomAspect` takes them.
 * @returns {Promise<{id: string, uuid: string}>} The spell's id and uuid.
 */
export async function buildSpell(page, actorId, name, { standard = [], custom = [] }) {
   /** @type {string} The spell's id. */
   const id = await createOwnedItem(page, actorId, 'spell', name);

   /** @type {string} The spell's uuid. */
   const uuid = `Actor.${actorId}.Item.${id}`;
   for (const { label, ...settings } of standard) {
      await enableAspect(page, uuid, label, settings);
   }
   for (const [index, settings] of custom.entries()) {
      await addCustomAspect(page, uuid);
      await setCustomAspect(page, uuid, index, settings);
   }
   return {
      id,
      uuid,
   };
}

/**
 * Reads the text of the dice a casting card shows.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @returns {Promise<string[]>} The text of each die, in the order the card lists them.
 */
export function readCardDice(card) {
   return card.locator('.die').allInnerTexts();
}
