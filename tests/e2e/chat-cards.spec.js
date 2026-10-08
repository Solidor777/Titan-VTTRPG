import { expect, test } from './harness.js';
import { clickSheetTab, commitText } from './actions.js';
import { clickRoll, readNewestCheckFlags, setNumberField } from './checkDialog.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addAttackCustomTrait,
   addCheck,
   addCustomAspect,
   addCustomTrait,
   addEffect,
   addRulesElement,
   addTrait,
   controlPlacedToken,
   createActor,
   createOwnedItem,
   createWorldItem,
   deleteOwnedItem,
   enableAspect,
   placeToken,
   sendToChat,
   setAttackStat,
   setAttributeBase,
   setDescription,
   setEquipped,
   setSkillTraining,
   shared,
   typeChatMessage,
   viewScene,
} from './flows.js';
import { selectTitanOption } from './select.js';
import { setClientSetting } from './settings.js';
import { settle } from './settle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Chat message cards, on documents made through the sheets and posted with the buttons a user clicks. Item and effect
 * cards are first-class `ChatMessage` subtypes that mount a Svelte card into the message's content region: each shows
 * the snapshot of the document it was posted from, a check button on the card rolls from that snapshot, and the
 * card's tags follow the same components as the sheets'. Rolled check cards show their Advantage, Automatic Failure
 * and situation tags from the stored parameters. A message renders into up to three elements (the chat log, the
 * notification pane and the chat popout), each with its own mount that every removal path tears down.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the character that owns the effect and the equipment of the card tests. */
let cardActorId;
/** @type {string} The uuid of that character. */
let cardActorUuid;
/** @type {string} The id of that character's placed token. */
let cardTokenId;

/** @type {string[]} The seven item subtypes that post first-class chat-message cards. */
const ITEM_TYPES = [
   'weapon',
   'armor',
   'spell',
   'ability',
   'shield',
   'equipment',
   'commodity',
];

/** @type {string} Selector for the Attribute Check dialog window. */
const ATTRIBUTE_DIALOG = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {string} Selector for the Item Check dialog window. */
const ITEM_DIALOG = '.application.titan-dialog[id^="titan-item-check-dialog-"]';

/** @type {string} Selector for the Attack Check dialog window. */
const ATTACK_DIALOG = '.application.titan-dialog[id^="titan-attack-check-dialog-"]';

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // A check rolls straight to chat unless a test asks for the dialog, and deleting an item asks for no confirmation.
   await setClientSetting(page, 'getCheckOptions', 'never');
   await setClientSetting(page, 'confirmDeletingItems', false);

   // The character whose token the cards' check buttons roll for.
   cardActorId = await createActor(page, {
      name: 'E2E Cards Roller',
      type: 'player',
   });
   cardActorUuid = `Actor.${cardActorId}`;
   await viewScene(page, await shared(page, 'scene'));
   cardTokenId = await placeToken(page, cardActorId);

   // Cards in a collapsed sidebar sit outside the viewport.
   await showChatLog(page);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await resetDice(page);
   await closeAllApps(page);
   await setClientSetting(page, 'getCheckOptions', 'never');
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Locates the card an item or effect chat message mounted in the chat log.
 * @param {string} messageId - The chat message's id.
 * @returns {import('@playwright/test').Locator} The message's item card.
 */
function itemCard(messageId) {
   return page.locator(`#chat .message[data-message-id="${messageId}"] .item-chat-message`).first();
}

/**
 * Locates a chat message in the chat log.
 * @param {string} messageId - The chat message's id.
 * @returns {import('@playwright/test').Locator} The message's element.
 */
function chatMessage(messageId) {
   return page.locator(`#chat .message[data-message-id="${messageId}"]`);
}

/**
 * Posts the card of an item or effect with the Send to Chat button of its sheet and brings the chat log on screen: the
 * sheet flows open sidebar tabs, which hide the chat log.
 * @param {string} documentUuid - The uuid of the item or effect.
 * @returns {Promise<string>} The id of the posted message.
 */
async function postCard(documentUuid) {
   /** @type {string} The posted message's id. */
   const messageId = await sendToChat(page, documentUuid);
   await showChatLog(page);
   return messageId;
}

/**
 * Rolls an Attribute Check of Body with the Body button of an actor's sheet.
 * @param {string} actorUuid - The uuid of the character.
 * @param {object} [options] - Optional settings.
 * @param {boolean} [options.showChat] - Whether to bring the chat log on screen after the roll (true by default).
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The rolled check's message.
 */
async function rollBodyFromSheet(actorUuid, { showChat = true } = {}) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await sheet.getByRole('button', {
      name: 'Body',
      exact: true,
   }).first().click();
   await settle(page);
   if (showChat) {
      await showChatLog(page);
   }
   return readNewestCheckFlags(page, baseline, 'attributeCheck');
}

/**
 * Makes a character with one effect that carries the given conditional check modifiers.
 * @param {string} name - The character's name; the effect is named after it.
 * @param {object[]} elements - The rules elements, as `addRulesElement` takes them; each is a conditional check
 * modifier.
 * @returns {Promise<string>} The uuid of the character.
 */
async function makeModifiedActor(name, elements) {
   /** @type {string} The character's id. */
   const actorId = await createActor(page, {
      name,
      type: 'player',
   });

   /** @type {string} The effect's uuid. */
   const effectUuid = `Actor.${actorId}.ActiveEffect.${await addEffect(page, actorId, `${name} Effect`)}`;
   for (const element of elements) {
      await addRulesElement(page, effectUuid, {
         operation: 'conditionalCheckModifier',
         ...element,
      });
   }
   await closeAllApps(page);
   return `Actor.${actorId}`;
}

for (const type of ITEM_TYPES) {
   test(`a ${type} posts a ${type} card that shows its name and description`, async () => {
      /** @type {string} The item's name. */
      const name = `E2E ${type} card`;

      /** @type {string} The description typed into the item's editor. */
      const description = `E2E description of the ${type} card`;

      /** @type {string} The item's uuid. */
      const uuid = `Item.${await createWorldItem(page, {
         name,
         type,
      })}`;
      await setDescription(page, uuid, description);

      /** @type {string} The posted card's message id. */
      const messageId = await postCard(uuid);
      expect(await page.evaluate((id) => game.messages.get(id).type, messageId), 'the message subtype').toBe(type);

      /** @type {import('@playwright/test').Locator} The mounted card. */
      const card = itemCard(messageId);
      await expect(card, 'the mounted card shows').toBeVisible();
      await expect(card.getByText(name), 'the card shows the item name').toBeVisible();
      await expect(card.getByText(description), 'the card shows the item description').toBeVisible();
   });
}

test('the spell card lists the displayed aspect tags by size, as the character sheet row does', async () => {
   // The spell stores its standard aspects in the order range, damage, Inflict Condition and lists its custom aspects
   // after them. The tags sort by size: range 0, damage 1, the custom aspect (scaling off, a Reflexes resistance check)
   // 2 and Inflict Condition (one option and a resistance check) 3, so the custom aspect sorts ahead of Inflict
   // Condition. The Decrease Modifier is enabled without its required option, so it is stored disabled and listed on
   // neither surface.
   /** @type {string} The caster's id. */
   const actorId = await createActor(page, {
      name: 'E2E Card Caster',
      type: 'player',
   });

   /** @type {string} The spell's uuid. */
   const spellUuid = `Actor.${actorId}.Item.${await createOwnedItem(page, actorId, 'spell', 'E2E Tag Order Spell')}`;
   await enableAspect(page, spellUuid, 'damage');
   await enableAspect(page, spellUuid, 'range');
   await enableAspect(page, spellUuid, 'decreaseMod');
   await enableAspect(page, spellUuid, 'inflictCondition', {
      options: ['stunned'],
      resistanceCheck: 'resilience',
   });
   await addCustomAspect(page, spellUuid);

   // The custom aspect's name and resistance check are typed and chosen in its row.
   /** @type {import('@playwright/test').Locator} The custom aspect's row on the spell sheet. */
   const aspectRow = (await openSheetByUuid(page, spellUuid)).locator('li.reorder-row').first();
   await commitText(aspectRow.locator('.header .label input'), 'E2E Ward');
   if (await aspectRow.locator('.expandable-content').count() === 0) {
      await aspectRow.getByRole('button', { name: 'Expand' }).click();
   }
   await selectTitanOption(
      page,
      aspectRow.locator('.field').filter({ hasText: 'Resistance Check' }).locator('[role="combobox"]'),
      'reflexes',
   );
   await aspectRow.locator('.field').filter({ hasText: 'Scaling' }).locator('button').click();
   await settle(page);
   expect(await page.evaluate(async (uuid) => {
      /** @type {TitanItem} The spell. */
      const spell = await fromUuid(uuid);
      return {
         enabled: spell.system.aspect.filter((aspect) => aspect.enabled).map((aspect) => aspect.label),
         custom: spell.system.customAspect.map((aspect) => [
            aspect.label,
            aspect.resistanceCheck,
            aspect.scaling,
         ]),
      };
   }, spellUuid), 'the spell stores the aspects the tags list').toEqual({
      enabled: [
         'range',
         'damage',
         'inflictCondition',
      ],
      custom: [
         [
            'E2E Ward',
            'reflexes',
            false,
         ],
      ],
   });

   /** @type {string[]} The tags' labels, smallest first. */
   const labels = await page.evaluate(() => [
      game.i18n.localize('LOCAL.range.text'),
      game.i18n.localize('LOCAL.damage.text'),
      'E2E Ward',
      game.i18n.localize('LOCAL.inflictCondition.text'),
   ]);

   // Character sheet: the spell row expanded in place.
   /** @type {import('@playwright/test').Locator} The character's sheet, on the Spells tab. */
   const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
   await clickSheetTab(sheet, 'Spells');

   /** @type {import('@playwright/test').Locator} The spell's row. */
   const row = sheet.locator(`[data-item-id="${spellUuid.split('.').at(-1)}"]`);
   if (await row.locator('.expandable-content').count() === 0) {
      await row.locator('.header .label .button button').first().click();
   }
   await expect(row.locator('.tag-container > .tag .label'), 'the row lists the tags by size').toHaveText(labels);

   // Chat card: the same selection in the same order.
   /** @type {string} The posted card's message id. */
   const messageId = await postCard(spellUuid);
   await expect(itemCard(messageId).locator('.tag-container > .tag .label'), 'the card lists the tags by size')
      .toHaveText(labels);
});

test('the spell card shows the Tradition tag once the spell has a tradition', async () => {
   /** @type {string} The spell's uuid. */
   const uuid = `Item.${await createWorldItem(page, {
      name: 'E2E Tradition Spell',
      type: 'spell',
   })}`;

   /** @type {string} The card of the spell with no tradition. */
   const plainId = await postCard(uuid);
   await expect(itemCard(plainId), 'the card shows').toBeVisible();
   await expect(
      itemCard(plainId).locator('.tag').filter({ hasText: 'Tradition' }),
      'no Tradition tag shows when the spell has no tradition',
   ).toHaveCount(0);

   // The tradition is typed into the Tradition input of the spell sheet's header.
   /** @type {import('@playwright/test').Locator} The spell's sheet. */
   const sheet = await openSheetByUuid(page, uuid);
   await commitText(sheet.locator('.stat').filter({ hasText: 'Tradition' }).locator('input'), 'Air');
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.tradition, uuid),
      { message: 'the input stored the tradition' },
   ).toBe('Air');

   /** @type {string} The card of the spell with a tradition. */
   const traditionId = await postCard(uuid);

   /** @type {import('@playwright/test').Locator} The Tradition tag. */
   const tag = itemCard(traditionId).locator('.tag').filter({ hasText: 'Tradition' });
   await expect(tag, 'the Tradition tag shows').toBeVisible();
   await expect(tag, 'the tag shows the tradition').toContainText('Air');
});

test('an effect card shows the effect, and its check button rolls for the controlled character', async () => {
   /** @type {string} The effect's uuid. */
   const effectUuid = `${cardActorUuid}.ActiveEffect.${await addEffect(page, cardActorId, 'E2E Card Effect')}`;
   await setDescription(page, effectUuid, 'Effect card description body.');
   await addCustomTrait(page, effectUuid, 'E2E Card Trait', 'Trait for the effect card.');
   await addCheck(page, effectUuid, { label: 'E2E Effect Card Check' });

   /** @type {string} The posted card's message id. */
   const messageId = await postCard(effectUuid);
   expect(await page.evaluate((id) => game.messages.get(id).type, messageId), 'the message subtype').toBe('effect');

   /** @type {import('@playwright/test').Locator} The mounted card. */
   const card = itemCard(messageId);
   await expect(card.getByText('E2E Card Effect'), 'the card shows the effect name').toBeVisible();
   await expect(card.getByText('Effect card description body.'), 'the card shows the description').toBeVisible();
   await expect(card.getByText('E2E Card Trait'), 'the card shows the custom trait').toBeVisible();

   // The button rolls through the controlled character's token.
   await closeAllApps(page);
   await controlPlacedToken(page, cardTokenId);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await card.getByRole('button').filter({ hasText: 'E2E Effect Card Check' }).first().click();
   await settle(page);
   expect((await readNewestCheckFlags(page, baseline, 'itemCheck')).type, 'the button rolled an Item Check')
      .toBe('itemCheck');
});

test('an effect check rolled from the character sheet posts an Item Check card with the description', async () => {
   /** @type {string} The effect's uuid. */
   const effectUuid = `${cardActorUuid}.ActiveEffect.${await addEffect(page, cardActorId, 'E2E Sheet Check Effect')}`;
   await setDescription(page, effectUuid, 'Inline effect-check description.');
   await addCheck(page, effectUuid, { label: 'E2E Sheet Effect Check' });

   // The effect's row on the Effects tab, expanded, holds the check's roll button.
   /** @type {import('@playwright/test').Locator} The character's sheet, on the Effects tab. */
   const sheet = await openSheetByUuid(page, cardActorUuid);
   await clickSheetTab(sheet, 'Effects');

   /** @type {import('@playwright/test').Locator} The effect's row. */
   const row = sheet.locator(`[data-effect-id="${effectUuid.split('.').at(-1)}"]`);
   if (await row.locator('.expandable-content').count() === 0) {
      await row.locator('.header .label .button button').first().click();
   }

   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await row.getByRole('button').filter({ hasText: 'E2E Sheet Effect Check' }).first().click();
   await settle(page);
   await showChatLog(page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline, 'itemCheck');
   expect(flags.parameters.checkLabel, 'the rolled check is the effect\'s check').toBe('E2E Sheet Effect Check');
   expect(flags.parameters.itemDescription, 'the rolled check carries the effect description')
      .toContain('Inline effect-check description.');

   /** @type {import('@playwright/test').Locator} The rolled check's message element. */
   const message = chatMessage(flags.id);
   await expect(message.locator('.check-chat-message'), 'the check card mounts').toBeAttached();
   await expect(message, 'the message carries the titan class').toHaveClass(/(^|\s)titan(\s|$)/);
});

test('a message typed in the chat input is themed like a card only while core messages are themed', async () => {
   // A message gets its class when it renders, so each setting value is tested on a message typed under it. The
   // themed message shows the class is applied at all, which the unthemed message's missing class depends on.
   /** @type {string} The message posted while core messages are themed. */
   const themedId = await typeChatMessage(page, 'Core theming probe on');
   await expect(chatMessage(themedId), 'a themed core message gets the core-themed class')
      .toHaveClass(/titan-core-themed/);
   await expect(chatMessage(themedId), 'a core message never gets the titan class')
      .not.toHaveClass(/(^|\s)titan(\s|$)/);

   await setClientSetting(page, 'themeCoreMessages', false);
   try {
      /** @type {string} The message posted while core messages are not themed. */
      const plainId = await typeChatMessage(page, 'Core theming probe off');
      await expect(chatMessage(plainId), 'the message renders').toBeVisible();
      await expect(chatMessage(plainId), 'an unthemed core message is left unclassed')
         .not.toHaveClass(/titan-core-themed/);
   }
   finally {
      await setClientSetting(page, 'themeCoreMessages', true);
   }
});

test('an item card\'s check rolls through the shown dialog from the card snapshot', async () => {
   await setClientSetting(page, 'getCheckOptions', 'always');

   // An equipment with a trait, a description and one damaging check.
   /** @type {string} The equipment's uuid. */
   const itemUuid = `${cardActorUuid}.Item.${await createOwnedItem(
      page,
      cardActorId,
      'equipment',
      'E2E Card Dialog Item',
   )}`;
   await setDescription(page, itemUuid, 'Item card dialog description body.');
   await addCustomTrait(page, itemUuid, 'E2E Card Dialog Trait', 'Trait for the item card dialog.');
   await addCheck(page, itemUuid, {
      label: 'E2E Card Dialog Check',
      isDamage: true,
      initialValue: 3,
   });

   /** @type {{complexity: number, difficulty: number, skill: string}} The check as stored. */
   const stored = await page.evaluate(async (uuid) => {
      /** @type {object} The item's one check. */
      const check = (await fromUuid(uuid)).system.check[0];
      return {
         complexity: check.complexity,
         difficulty: check.difficulty,
         skill: check.skill,
      };
   }, itemUuid);

   // The card is posted, then the item is deleted: the card's snapshot is the only remaining source of its data.
   /** @type {string} The posted card's message id. */
   const messageId = await postCard(itemUuid);
   await deleteOwnedItem(page, cardActorUuid, 'Inventory', itemUuid);
   await closeAllApps(page);
   await showChatLog(page);
   await controlPlacedToken(page, cardTokenId);
   await itemCard(messageId).getByRole('button').filter({ hasText: 'E2E Card Dialog Check' }).first().click();

   /** @type {import('@playwright/test').Locator} The Item Check dialog the card's button opened. */
   const dialog = page.locator(ITEM_DIALOG).first();
   await expect(dialog).toBeVisible();
   await setNumberField(dialog, 'diceMod', 1);

   // Roll: the dialog closes and one Item Check message carries the snapshot and the dialog's edit.
   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   await showChatLog(page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline, 'itemCheck');
   await expect(page.locator(ITEM_DIALOG)).toHaveCount(0);
   expect(flags.parameters).toMatchObject({
      checkLabel: 'E2E Card Dialog Check',
      complexity: stored.complexity,
      damage: 3,
      diceMod: 1,
      difficulty: stored.difficulty,
      itemName: 'E2E Card Dialog Item',
      skill: stored.skill,
   });
   expect(flags.parameters.itemDescription).toContain('Item card dialog description body.');
   expect(flags.parameters.customTrait).toEqual([
      expect.objectContaining({
         name: 'E2E Card Dialog Trait',
      }),
   ]);
   await expect(chatMessage(flags.id).first(), 'the rolled card renders from the created message').toBeVisible();
});

test.describe('the attack tags of a weapon', () => {
   /** @type {string} The id of the character that owns the weapon. */
   let actorId;
   /** @type {string} The weapon's id. */
   let weaponId;
   /** @type {string} The weapon's uuid. */
   let weaponUuid;

   test.beforeAll(async () => {
      // A character with Body 4 and Melee Weapons training 2, wielding a weapon whose first attack deals 7 damage at
      // range 3 and carries a standard and a custom trait.
      actorId = await createActor(page, {
         name: 'E2E Attack Tags Actor',
         type: 'player',
      });
      await setAttributeBase(page, `Actor.${actorId}`, 'body', 4);
      await setSkillTraining(page, `Actor.${actorId}`, 'meleeWeapons', 2);
      weaponId = await createOwnedItem(page, actorId, 'weapon', 'E2E Attack Tags Weapon');
      weaponUuid = `Actor.${actorId}.Item.${weaponId}`;
      await setEquipped(page, actorId, weaponId, true);
      await setAttackStat(page, weaponUuid, 0, 'damage', 7);
      await setAttackStat(page, weaponUuid, 0, 'range', 3);

      // The damage is the intrinsic number alone: the extra-successes toggle beside it is switched off in the weapon's
      // Attacks tab.
      /** @type {import('@playwright/test').Locator} The weapon's sheet, on the Attacks tab. */
      const sheet = await openSheetByUuid(page, weaponUuid);
      await clickSheetTab(sheet, 'Attacks');
      await sheet.locator('li.reorder-row').first().locator('.input').filter({ hasText: '+ ES' }).locator('button')
         .click();
      await expect.poll(
         () => page.evaluate(
            async (uuid) => (await fromUuid(uuid)).system.attack[0].plusExtraSuccessDamage,
            weaponUuid,
         ),
         { message: 'the toggle stored the extra-successes setting' },
      ).toBe(false);
      await settle(page);
      await addTrait(page, weaponUuid, 'Piercing', { attackIndex: 0 });
      await addAttackCustomTrait(page, weaponUuid, 0, 'E2E Custom Trait', 'E2E custom trait description');
      await closeAllApps(page);
   });

   /**
    * Opens the character sheet on the Inventory tab with the weapon's row expanded.
    * @returns {Promise<import('@playwright/test').Locator>} The weapon's row.
    */
   async function openWeaponRow() {
      /** @type {import('@playwright/test').Locator} The character's sheet. */
      const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
      await clickSheetTab(sheet, 'Inventory');

      /** @type {import('@playwright/test').Locator} The weapon's row. */
      const row = sheet.locator(`[data-item-id="${weaponId}"]`);
      if (await row.locator('.expandable-content').count() === 0) {
         await row.locator('.header .label .button button').first().click();
      }
      await expect(row.locator('.expandable-content'), 'the weapon row expanded').toBeVisible();
      return row;
   }

   test('the character sheet row and the weapon sheet sidebar show the same tags', async () => {
      /** @type {import('@playwright/test').Locator} The weapon's row. */
      const row = await openWeaponRow();
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(row.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(row.getByTestId('attack-tags-type')).toBeVisible();
      await expect(row.getByTestId('attack-tags-attribute')).toBeVisible();

      // The standard trait shows its localized name; the custom trait shows its raw name.
      await expect(row.locator('.attack-tags').getByText('Piercing', { exact: true })).toBeVisible();
      await expect(row.locator('.attack-tags').getByText('E2E Custom Trait', { exact: true })).toBeVisible();

      // The sidebar of the weapon's own sheet shows the same component with the same values. It hides the type and
      // attribute tags, which its check header shows.
      await closeAllApps(page);

      /** @type {import('@playwright/test').Locator} The weapon's sheet. */
      const sheet = await openSheetByUuid(page, weaponUuid);
      await expect(sheet.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(sheet.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(sheet.getByTestId('attack-tags-type')).toHaveCount(0);
      await expect(sheet.locator('.sidebar-check .header').first()).toBeVisible();
      await expect(sheet.locator('.attack-tags').getByText('Piercing', { exact: true })).toBeVisible();
      await expect(sheet.locator('.attack-tags').getByText('E2E Custom Trait', { exact: true })).toBeVisible();
   });

   test('the row shows the dice of the character and its roll button opens the attack check dialog', async () => {
      await setClientSetting(page, 'getCheckOptions', 'always');

      /** @type {import('@playwright/test').Locator} The weapon's row. */
      const row = await openWeaponRow();

      // Body 4 and Melee Weapons training 2 give 6 dice.
      await expect(row.getByTestId('attack-row-dice').locator('.value')).toHaveText('6');
      await row.locator('.attack .header button').first().click();
      await expect(page.locator(ATTACK_DIALOG).first()).toBeVisible();
   });

   test('the weapon card shows the same tags and stays a snapshot when the weapon changes', async () => {
      /** @type {string} The posted card's message id. */
      const messageId = await postCard(weaponUuid);

      /** @type {import('@playwright/test').Locator} The mounted card. */
      const card = itemCard(messageId);
      await expect(card.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(card.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(card.locator('.attack-tags').getByText('Piercing', { exact: true })).toBeVisible();
      await expect(card.locator('.attack-tags').getByText('E2E Custom Trait', { exact: true })).toBeVisible();

      // The damage is edited in the weapon sheet; the character sheet row follows, and the card keeps the value it
      // was posted with.
      await setAttackStat(page, weaponUuid, 0, 'damage', 11);
      await closeAllApps(page);

      /** @type {import('@playwright/test').Locator} The weapon's row. */
      const row = await openWeaponRow();
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('11');
      await expect(card.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
   });
});

test.describe('the tags of a rolled check card', () => {
   test('a Disadvantage tag sits beside the DC and is styled as a tag', async () => {
      /** @type {string} The uuid of a character with a Disadvantage on every check. */
      const actorUuid = await makeModifiedActor('E2E Disadvantage Actor', [
         {
            modifierType: 'advantage',
            checkType: 'any',
            selector: 'any',
            advantageLevel: -1,
         },
      ]);
      await closeAllApps(page);

      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollBodyFromSheet(actorUuid);

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = chatMessage(message.id);
      await expect(card.locator('.check-chat-message')).toBeAttached();

      /** @type {string} The localized DC label. */
      const dcLabel = await page.evaluate(() => game.i18n.localize('LOCAL.dc.text'));
      await expect(card.getByTestId('check-chat-dc')).toHaveText(`${dcLabel} 5:0`);

      /** @type {import('@playwright/test').Locator} The Advantage tag. */
      const tag = card.getByTestId('check-chat-advantage');

      /** @type {string} The localized Disadvantage label. */
      const label = await page.evaluate(() => game.i18n.localize('LOCAL.disadvantage.text'));
      await expect(tag).toHaveText(label);

      // The tag's computed colors are the resolved tag tokens.
      /**
       * @type {{background: string, color: string, tagBackground: string, tagFont: string}} The tag's rendered
       * colors beside its resolved token colors.
       */
      const colors = await tag.evaluate((element) => {
         /**
          * Resolves a color token through a throwaway child so the value normalizes to computed rgb() form.
          * @param {string} token - The custom property name.
          * @returns {string} The computed color.
          */
         const resolve = (token) => {
            /** @type {HTMLSpanElement} The probe carrying the token. */
            const probe = document.createElement('span');
            probe.style.color = `var(${token})`;
            element.appendChild(probe);

            /** @type {string} The resolved color. */
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
         };

         /** @type {CSSStyleDeclaration} The tag's computed style. */
         const computed = getComputedStyle(element);
         return {
            background: computed.backgroundColor,
            color: computed.color,
            tagBackground: resolve('--titan-tag-background'),
            tagFont: resolve('--titan-tag-font-color'),
         };
      });
      expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(colors.background).not.toBe('transparent');
      expect(colors.background).toBe(colors.tagBackground);
      expect(colors.color).toBe(colors.tagFont);
   });

   test('opposing Advantage sources show no tag beside the unchanged DC', async () => {
      /** @type {string} The uuid of a character with an Advantage and a Disadvantage on every check. */
      const actorUuid = await makeModifiedActor('E2E Opposing Actor', [
         {
            modifierType: 'advantage',
            checkType: 'any',
            selector: 'any',
            advantageLevel: 1,
         },
         {
            modifierType: 'advantage',
            checkType: 'any',
            selector: 'any',
            advantageLevel: -1,
         },
      ]);
      await closeAllApps(page);

      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollBodyFromSheet(actorUuid);

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = chatMessage(message.id);

      // The DC renders at the unchanged Difficulty; the tag beside it is absent.
      /** @type {string} The localized DC label. */
      const dcLabel = await page.evaluate(() => game.i18n.localize('LOCAL.dc.text'));
      await expect(card.getByTestId('check-chat-dc')).toHaveText(`${dcLabel} 4:0`);

      /** @type {import('@playwright/test').Locator} The Advantage tag. */
      const tag = card.getByTestId('check-chat-advantage');

      // The tag is absent on the net-zero card (the DC above is the presence precondition).
      await expect(tag).toHaveCount(0);
   });

   test('an automatically failed card shows the Automatic Failure tag and no successes', async () => {
      /** @type {string} The uuid of a character that fails every check automatically. */
      const actorUuid = await makeModifiedActor('E2E Automatic Failure Actor', [
         {
            modifierType: 'automaticFailure',
            checkType: 'any',
            selector: 'any',
         },
      ]);
      await closeAllApps(page);
      await forceDice(page, [6]);

      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollBodyFromSheet(actorUuid);

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = chatMessage(message.id);

      /** @type {{automaticFailure: string, successes: string}} The localized labels. */
      const labels = await page.evaluate(() => ({
         automaticFailure: game.i18n.localize('LOCAL.automaticFailure.text'),
         successes: game.i18n.localize('LOCAL.successes.text'),
      }));

      /** @type {import('@playwright/test').Locator} The Automatic Failure tag. */
      const tag = card.getByTestId('check-chat-automatic-failure');
      await expect(tag).toHaveText(labels.automaticFailure);
      await expect(card.locator('.results')).toContainText(`0 ${labels.successes}`);
   });

   test('the card lists the ticked situations by label', async () => {
      /** @type {string} The uuid of a character with a Dice -1 situation. */
      const actorUuid = await makeModifiedActor('E2E Situation Actor', [
         {
            modifierType: 'dice',
            checkType: 'any',
            selector: 'situation',
            key: 'Underwater',
            value: -1,
         },
      ]);
      await closeAllApps(page);

      // The situation applies, so the situational setting opens the dialog; the user ticks it and rolls.
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {import('@playwright/test').Locator} The character's sheet. */
      const sheet = await openSheetByUuid(page, actorUuid);
      await sheet.getByRole('button', {
         name: 'Body',
         exact: true,
      }).first().click();

      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = page.locator(ATTRIBUTE_DIALOG);
      await expect(dialog).toBeVisible();
      await dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' })
         .locator('[data-testid^="situation-toggle-"]').click();

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      await showChatLog(page);

      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await readNewestCheckFlags(page, baseline, 'attributeCheck');
      expect(message.parameters.diceMod).toBe(-1);

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = chatMessage(message.id);
      await expect(card.getByTestId('check-chat-situation')).toHaveText(['Underwater']);
   });

   test('a card re-localizes a system situation from its stored labelKey', async () => {
      // Heavy armor offers the Swim, Fly, or Climb situation on Athletics checks.
      /** @type {string} The wearer's id. */
      const actorId = await createActor(page, {
         name: 'E2E Heavy Armor Actor',
         type: 'player',
      });

      /** @type {string} The armor's id. */
      const armorId = await createOwnedItem(page, actorId, 'armor', 'E2E Heavy Armor');
      await addTrait(page, `Actor.${actorId}.Item.${armorId}`, 'Heavy');
      await setEquipped(page, actorId, armorId, true);
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {import('@playwright/test').Locator} The character's sheet, on the Skills tab. */
      const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
      await clickSheetTab(sheet, 'Skills');
      await sheet.locator('.skill .check-button button', { hasText: 'Athletics' }).first().click();

      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = page.locator(ATTRIBUTE_DIALOG);
      await expect(dialog).toBeVisible();
      await dialog.getByTestId('situation-row-swim,Fly,OrClimb').locator('[data-testid^="situation-toggle-"]').click();

      /** @type {string} The localized label of the situation. */
      const swimLabel = await page.evaluate(() => game.i18n.localize('LOCAL.situationSwimFlyClimb.text'));

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      await showChatLog(page);

      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters.situations).toEqual([
         {
            key: 'swim,Fly,OrClimb',
            label: swimLabel,
            labelKey: 'situationSwimFlyClimb',
         },
      ]);

      /** @type {import('@playwright/test').Locator} The rolled check's situation tag. */
      const tag = chatMessage(flags.id).getByTestId('check-chat-situation');
      await expect(tag).toHaveText([swimLabel]);
   });
});

test.describe('chat message mount keying', () => {
   // Each test counts the live mounts against an empty chat log: a popout renders (and, once closed, sweeps) a mount
   // for every message the log already holds.
   test.beforeEach(async () => {
      await clearChat(page);
   });

   /**
    * Reads the number of registered `updateChatMessage` hook handlers. Each mounted card's reactive document holds one
    * registration while mounted, so the count's change counts the live mounts.
    * @returns {Promise<number>} The registration count.
    */
   function hookCount() {
      return page.evaluate(() => Hooks.events.updateChatMessage?.length ?? 0);
   }

   /**
    * Counts the rendered children of a message's content region under a root selector. A surface blanked by a mount
    * collision reports 0.
    * @param {string} rootSelector - Selector for the containing log root (`#chat`, `#chat-notifications`).
    * @param {string} messageId - The message id to look up.
    * @returns {Promise<number>} The content child count (0 when the card or content region is absent).
    */
   function contentChildCount(rootSelector, messageId) {
      return page.evaluate(({ rootSelector, messageId }) => {
         /** @type {HTMLElement | null} The card content region for the message under the root. */
         const content = document.querySelector(`${rootSelector} li[data-message-id="${messageId}"] .message-content`);
         return content?.children.length ?? 0;
      }, {
         rootSelector,
         messageId,
      });
   }

   /**
    * Updates a flag of a chat message, which has no control, and waits until core has replaced the message's element in
    * the chat log and, when the notification pane holds the message, its element there: core re-renders the log first
    * and then the notification pane in a second step, so each replacement is waited for.
    * @param {string} messageId - The chat message's id.
    * @param {number} value - The value written to the message's `e2eTouch` flag.
    * @returns {Promise<void>} Resolves once the re-render has landed and the operations have finished.
    */
   async function touchMessage(messageId, value) {
      /** @type {import('@playwright/test').ElementHandle} The message's element before the update. */
      const before = await page.locator(`#chat .message[data-message-id="${messageId}"]`).elementHandle();

      /** @type {import('@playwright/test').JSHandle} The message's notification element before the update, or null. */
      const beforeNotification = await page.evaluateHandle(
         (id) => document.querySelector(`#chat-notifications .message[data-message-id="${id}"]`),
         messageId,
      );
      await page.evaluate(async ({ id, value }) => {
         await game.messages.get(id).update({ 'flags.titan.e2eTouch': value });
      }, {
         id: messageId,
         value,
      });
      await expect.poll(
         () => before.evaluate((element) => element.isConnected),
         { message: 'the update re-rendered the log entry' },
      ).toBe(false);
      if (beforeNotification.asElement()) {
         await expect.poll(
            () => beforeNotification.evaluate((element) => element.isConnected),
            { message: 'the update re-rendered the notification entry' },
         ).toBe(false);
      }
      await settle(page);
   }

   /**
    * Deletes a chat message with the Delete entry of its context menu in the chat log, brought on screen first.
    * @param {string} messageId - The chat message's id.
    * @returns {Promise<void>} Resolves once the message is gone from the log.
    */
   async function deleteFromLog(messageId) {
      await showChatLog(page);
      await expect(chatMessage(messageId), 'the message shows in the log before it is deleted').toBeVisible();
      await chatMessage(messageId).click({ button: 'right' });
      await chooseContextMenuEntry(
         page,
         page.locator('#context-menu li.context-item', { hasText: 'Delete' }).first(),
      );
      await expect(chatMessage(messageId), 'the context menu deleted the message').toHaveCount(0);
      await settle(page);
   }

   test('notification pane and main log each hold a live mount through update, dismissal, delete', async () => {
      try {
         // Card notifications post because the sidebar is collapsed (a notification is suppressed while the chat tab
         // is open in an expanded sidebar). The notification duration is raised so the auto-dismiss ticker cannot
         // race the manual dismissal below: the static is read live each tick, and an update re-render carries the
         // notification's lifespan over.
         await page.evaluate(async () => {
            /** @type {object} The prior core `uiConfig` setting, stashed for the restore. */
            globalThis.__e2ePriorUiConfig = game.settings.get('core', 'uiConfig');

            /** @type {number} The prior notification auto-dismiss duration, stashed for the restore. */
            globalThis.__e2ePriorNotifyDuration = foundry.applications.sidebar.tabs.ChatLog.NOTIFY_DURATION;
            foundry.applications.sidebar.tabs.ChatLog.NOTIFY_DURATION = 600_000;
            await game.settings.set('core', 'uiConfig', {
               ...globalThis.__e2ePriorUiConfig,
               chatNotifications: 'cards',
            });
            ui.sidebar.collapse();
            ui.sidebar.changeTab('actors', 'primary');
         });

         /** @type {number} The hook-count baseline before the message exists. */
         const baseline = await hookCount();

         /** @type {string} The id of the freshly rolled check message under test. */
         const messageId = (await rollBodyFromSheet(cardActorUuid, { showChat: false })).id;

         // Both surfaces hold mounted content.
         await expect
            .poll(() => contentChildCount('#chat', messageId), { message: 'main log card has content' })
            .toBeGreaterThan(0);
         await expect
            .poll(
               () => contentChildCount('#chat-notifications', messageId),
               { message: 'notification card has content' },
            )
            .toBeGreaterThan(0);
         await expect.poll(hookCount, { message: 'two live mounts' }).toBe(baseline + 2);

         // An update re-renders both surfaces without blanking either or leaking mounts.
         await touchMessage(messageId, 1);
         await expect
            .poll(() => contentChildCount('#chat', messageId), { message: 'main log card after update' })
            .toBeGreaterThan(0);
         await expect
            .poll(
               () => contentChildCount('#chat-notifications', messageId),
               { message: 'notification card after update' },
            )
            .toBeGreaterThan(0);
         await expect.poll(hookCount, { message: 'still two live mounts after update' }).toBe(baseline + 2);

         // Dismissing the notification removes its element with no render; the observer unmounts it. Core animates the
         // dismissal for 250 ms and then 100 ms before it removes the element, so the poll checks every 100 ms.
         await page.locator(`#chat-notifications li[data-message-id="${messageId}"] [data-action="dismissMessage"]`)
            .click();
         await expect.poll(hookCount, {
            message: 'notification mount torn down',
            intervals: [100],
         }).toBe(baseline + 1);

         // Deleting the message from the chat log tears the remaining mount down.
         await deleteFromLog(messageId);
         await expect.poll(hookCount, { message: 'all mounts torn down' }).toBe(baseline);
      }
      finally {
         await page.evaluate(async () => {
            await game.settings.set('core', 'uiConfig', globalThis.__e2ePriorUiConfig);
            foundry.applications.sidebar.tabs.ChatLog.NOTIFY_DURATION = globalThis.__e2ePriorNotifyDuration;
            delete globalThis.__e2ePriorUiConfig;
            delete globalThis.__e2ePriorNotifyDuration;
         });
         await showChatLog(page);
      }
   });

   test('popout and main log each hold a live mount; closing the popout reaps via sweep', async () => {
      // The rendered popout suppresses notification cards, so the popout is the second surface. The message must be
      // created after the popout renders: rolled before it, a notification card would also post and break the count.
      await page.evaluate(async () => {
         await ui.chat.renderPopout();
         await globalThis.titanWait(() => ui.chat.popout?.rendered === true, { message: 'chat popout rendered' });
      });

      /** @type {number} The hook-count baseline, read after the popout opens (it re-renders existing messages). */
      const baseline = await hookCount();

      /** @type {string} The id of the freshly rolled check message under test. */
      const messageId = (await rollBodyFromSheet(cardActorUuid, { showChat: false })).id;

      // Both surfaces hold mounted content.
      await expect
         .poll(() => contentChildCount('#chat', messageId), { message: 'main log card has content' })
         .toBeGreaterThan(0);
      await expect
         .poll(() => contentChildCount('#chat-popout', messageId), { message: 'popout card has content' })
         .toBeGreaterThan(0);
      await expect.poll(hookCount, { message: 'two live mounts' }).toBe(baseline + 2);

      // Closing the popout removes its DOM; the next render's entry sweep reaps the orphaned mount. The character sheet
      // the roll opened sits over the popout's header, so it closes first.
      await page.locator('.application.titan-document-sheet .window-header [data-action="close"]').click();
      await page.locator('#chat-popout .window-header [data-action="close"]').click();
      await expect(page.locator('#chat-popout'), 'the popout is gone from the DOM').toHaveCount(0);
      await touchMessage(messageId, 2);
      await expect.poll(hookCount, { message: 'popout mount swept' }).toBe(baseline + 1);

      // Delete restores the baseline.
      await deleteFromLog(messageId);
      await expect.poll(hookCount, { message: 'all mounts torn down' }).toBe(baseline);
   });
});
