import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addCheck,
   addEffect,
   controlPlacedToken,
   createActor,
   createOwnedItem,
   placeToken,
   shared,
   viewScene,
} from './flows.js';
import { selectTitanOption } from './select.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, closeAllApps, newestMessageType } from './world.js';

/**
 * The rows of the character sheet's Abilities, Spells, Inventory and Effects tabs, on documents made through the
 * sheet's own controls. Each row type is swept through its functional controls (expand, send to chat, edit, roll,
 * equip); the values a row displays and the inputs it holds follow an edit made in the item or effect sheet while the
 * actor sheet stays open, without a tab switch or a re-expand; the delete buttons confirm or delete at once according
 * to the confirmation settings; and the check tags a row renders match the item sheet's and the Effect HUD's.
 *
 * The actor, its items and its effects are made once in `beforeAll`. A test that edits one of them through a control
 * puts the field back through the same control before it ends, or uses an item or effect of its own.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the actor that owns the fixture rows. */
let actorId;
/** @type {string} The uuid of that actor. */
let actorUuid;
/** @type {Record<string, string>} The ids of the actor's items by type. */
const itemIds = {};
/** @type {Record<string, string>} The ids of the actor's effects by role (`timed`, `permanent`, `checked`). */
const effectIds = {};

/** @type {string} The label of the check on the checked item types and on the checked effect. */
const CHECK_LABEL = 'E2E Rows Check';

/** @type {number} The Resolve Cost of the intrinsic-tag check on the parity equipment and the parity effect. */
const PARITY_RESOLVE_COST = 2;

/**
 * The seven item types the actor owns, in creation order.
 * @type {{type: string, tab: string, checked: boolean}[]}
 */
const ITEM_TYPES = [
   {
      type: 'weapon',
      tab: 'Inventory',
      checked: false,
   },
   {
      type: 'armor',
      tab: 'Inventory',
      checked: true,
   },
   {
      type: 'shield',
      tab: 'Inventory',
      checked: true,
   },
   {
      type: 'equipment',
      tab: 'Inventory',
      checked: true,
   },
   {
      type: 'commodity',
      tab: 'Inventory',
      checked: true,
   },
   {
      type: 'spell',
      tab: 'Spells',
      checked: false,
   },
   {
      type: 'ability',
      tab: 'Abilities',
      checked: true,
   },
];

/**
 * Returns the name of the fixture item of a type.
 * @param {string} type - The item subtype whose fixture name is wanted.
 * @returns {string} The fixture's display name, such as `E2E Rows Weapon`.
 */
function itemName(type) {
   return `E2E Rows ${type[0].toUpperCase()}${type.slice(1)}`;
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(180_000);
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await setClientSetting(page, 'getCheckOptions', 'never');
   await setClientSetting(page, 'confirmDeletingItems', false);
   await setClientSetting(page, 'confirmDeletingEffects', false);

   actorId = await createActor(page, {
      name: 'E2E Rows Actor',
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   for (const { type, checked } of ITEM_TYPES) {
      itemIds[type] = await createOwnedItem(page, actorId, type, itemName(type));
      if (checked) {
         await addCheck(page, `${actorUuid}.Item.${itemIds[type]}`, { label: CHECK_LABEL });
      }
   }

   // The parity equipment carries a check with every intrinsic tag: a Resolve Cost, a resistance and an opposed check.
   itemIds.parity = await createOwnedItem(page, actorId, 'equipment', 'E2E Rows Parity Equipment');
   await addCheck(page, `${actorUuid}.Item.${itemIds.parity}`, {
      label: 'E2E Rows Parity Item Check',
      resolveCost: PARITY_RESOLVE_COST,
      resistanceCheck: 'reflexes',
      opposed: true,
   });
   effectIds.timed = await addEffect(page, actorId, 'E2E Rows Timed Effect');
   effectIds.permanent = await addEffect(page, actorId, 'E2E Rows Permanent Effect', { duration: 'permanent' });
   effectIds.checked = await addEffect(page, actorId, 'E2E Rows Checked Effect');
   await addCheck(page, `${actorUuid}.ActiveEffect.${effectIds.checked}`, {
      label: 'E2E Rows Parity Effect Check',
      resolveCost: PARITY_RESOLVE_COST,
      resistanceCheck: 'reflexes',
      opposed: true,
   });
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   await setClientSetting(page, 'getCheckOptions', 'never');
   await setClientSetting(page, 'confirmDeletingItems', false);
   await setClientSetting(page, 'confirmDeletingEffects', false);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Opens the fixture actor's sheet on a tab.
 * @param {string} tab - The tab's label.
 * @param {string} [uuid] - The uuid of the actor whose sheet opens; the fixture actor by default.
 * @returns {Promise<import('@playwright/test').Locator>} The actor sheet's window element.
 */
async function openActorTab(tab, uuid = actorUuid) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, uuid);
   await sheet.locator('.tab-list').getByText(tab, { exact: true }).first().click();
   return sheet;
}

/**
 * Expands a row. The sheet keeps each row's expanded state between renders, so a click is made only on a collapsed
 * row.
 * @param {import('@playwright/test').Locator} row - The item or effect row.
 * @returns {Promise<void>} Resolves once the row's expandable content shows.
 */
async function expandRow(row) {
   await expect(row, 'the row renders').toBeVisible();
   if (await row.locator('.expandable-content').count() === 0) {
      await row.locator('.header .label .button button').first().click();
   }
   await expect(row.locator('.expandable-content'), 'the row is expanded').toBeVisible();
}

/**
 * Opens a document's own sheet with the Edit button of its row, runs a function on it and closes it again.
 * @param {import('@playwright/test').Locator} row - The item or effect row.
 * @param {string} documentName - `Item` or `ActiveEffect`.
 * @param {string} id - Id of the document whose sheet the Edit button opens.
 * @param {(documentSheet: import('@playwright/test').Locator) => Promise<void>} edit - What to do in the sheet.
 * @returns {Promise<void>} Resolves once the sheet is closed.
 */
async function withDocumentSheet(row, documentName, id, edit) {
   await row.getByRole('button', { name: 'Edit Item' }).click();

   /** @type {import('@playwright/test').Locator} The document sheet the button opened. */
   const documentSheet = page.locator(`.application[id$="${documentName}-${id}"]`);
   await expect(documentSheet, 'the Edit button opens the document sheet').toBeVisible();
   await edit(documentSheet);
   await documentSheet.locator('header.window-header [data-action="close"]').click();
   await expect(documentSheet).toHaveCount(0);
}

/**
 * Types a value into a number input of a sheet and waits for the document to store it.
 * @param {import('@playwright/test').Locator} input - The number input that receives the typed text.
 * @param {number|string} value - The value to type.
 * @returns {Promise<void>} Resolves once the value has been typed and committed.
 */
async function typeInto(input, value) {
   await input.fill(String(value));
   await input.blur();
}

/**
 * Reads a path of a fixture document.
 * @param {string} uuid - The document's uuid.
 * @param {string} path - The dotted path below the document (`system.quantity`).
 * @returns {Promise<*>} The stored value.
 */
function readPath(uuid, path) {
   return page.evaluate(
      async ({ uuid, path }) => foundry.utils.getProperty(await fromUuid(uuid), path),
      {
         uuid,
         path,
      },
   );
}

/**
 * Returns the sheet row of a fixture item.
 * @param {import('@playwright/test').Locator} sheet - The actor sheet.
 * @param {string} id - Id of the item whose row is wanted.
 * @returns {import('@playwright/test').Locator} The element of the item's list entry.
 */
function itemRow(sheet, id) {
   return sheet.locator(`[data-item-id="${id}"]`);
}

/**
 * Returns the sheet row of a fixture effect.
 * @param {import('@playwright/test').Locator} sheet - The actor sheet.
 * @param {string} id - Id of the effect whose row is wanted.
 * @returns {import('@playwright/test').Locator} The element of the effect's list entry.
 */
function effectRow(sheet, id) {
   return sheet.locator(`[data-effect-id="${id}"]`);
}

/**
 * Returns a labelled stat of an item or effect sheet's header.
 * @param {import('@playwright/test').Locator} documentSheet - The open item or effect sheet.
 * @param {string} label - The stat's label (`Value`, `Quantity`, `XP`, `Tradition`, `Armor`, `Defense`, ...).
 * @returns {import('@playwright/test').Locator} The stat's element.
 */
function headerStat(documentSheet, label) {
   return documentSheet.locator('.header .stat, .header .labeled-element')
      .filter({ has: page.getByText(label, { exact: true }) })
      .last();
}

/**
 * Chooses a rarity in an item sheet's header.
 * @param {import('@playwright/test').Locator} documentSheet - The item sheet.
 * @param {string} rarity - The rarity key.
 * @returns {Promise<void>} Resolves once the select has been used.
 */
async function chooseRarity(documentSheet, rarity) {
   await selectTitanOption(page, documentSheet.locator('.header [role="combobox"]').first(), rarity);
}

/**
 * Sets whether an item is equipped with the row's Equipped toggle, clicking only when the state differs, and waits
 * for the document to show it. The row's controls and, when the item has checks or attacks, its expanded content each
 * carry a toggle; the first one is clicked.
 * @param {import('@playwright/test').Locator} row - The expanded item row.
 * @param {string} type - The item type: armor and shield equip into an actor slot, the others set their own flag.
 * @param {string} uuid - The item's uuid.
 * @param {boolean} equipped - The state to leave the item in.
 * @returns {Promise<void>} Resolves once the document shows the state.
 */
async function setEquipped(row, type, uuid, equipped) {
   /**
    * Reads whether the item is equipped.
    * @returns {Promise<boolean>} True when it is.
    */
   const read = () => page.evaluate(async ({ uuid, type }) => {
      const item = await fromUuid(uuid);
      return type === 'armor' || type === 'shield'
         ? item.parent.system.equipped[type] === item.id
         : item.system.equipped;
   }, {
      uuid,
      type,
   });
   if (await read() !== equipped) {
      await row.getByRole('button', { name: 'Equipped' }).first().click();
   }
   await expect.poll(read, { message: `the Equipped toggle left the ${type} ${equipped ? '' : 'un'}equipped` })
      .toBe(equipped);
}

test.describe('item rows: a functional sweep per type', () => {
   /**
    * Per type, how the row's displayed values follow edits made in the item sheet. Each entry of `stats` types the
    * value `to` into the labelled header input (`inputIndex` picks one of several) and expects the row's tag to show
    * the `shown` text; a `hiddenAtZero` stat's tag is absent while the value is 0.
    * @type {Record<string, {footer: string, stats: object[]}>}
    */
   const PROBES = {
      weapon: {
         footer: '.section.footer',
         stats: [
            {
               label: 'Value',
               path: 'system.value',
               hiddenAtZero: true,
               to: 7,
               tag: '.tag .value',
               shown: '7',
            },
         ],
      },
      armor: {
         footer: '.section.stats',
         stats: [
            {
               label: 'Armor',
               path: 'system.armor.max',
               inputIndex: 1,
               to: 5,
               tag: '.stat .value',
               shown: '1 / 5',
            },
            {
               label: 'Armor',
               path: 'system.armor.value',
               to: 3,
               tag: '.stat .value',
               shown: '3 / 5',
            },
         ],
      },
      shield: {
         footer: '.section.stats',
         stats: [
            {
               label: 'Defense',
               path: 'system.defense',
               to: 6,
               tag: '.stat .value',
               shown: '6',
            },
         ],
      },
      equipment: {
         footer: '.section.footer',
         stats: [
            {
               label: 'Value',
               path: 'system.value',
               hiddenAtZero: true,
               to: 7,
               tag: '.tag .value',
               shown: '7',
            },
         ],
      },
      commodity: {
         footer: '.section.footer',
         stats: [
            {
               label: 'Quantity',
               path: 'system.quantity',
               to: 5,
               tag: '.tag:has(> .label) .value',
               tagLabel: 'Quantity',
               shown: '5',
            },
         ],
      },
      spell: {
         footer: '.section.footer',
         stats: [
            {
               label: 'Tradition',
               path: 'system.tradition',
               to: 'Necromancy',
               tag: '.tag:has(> .label) .value',
               tagLabel: 'Tradition',
               shown: 'Necromancy',
            },
            {
               label: 'XP',
               path: 'system.xpCost',
               hiddenAtZero: true,
               to: 5,
               tag: '.tag:has(> .label) .value',
               tagLabel: 'XP Cost',
               shown: '5',
            },
         ],
      },
      ability: {
         footer: '.section.footer',
         stats: [
            {
               label: 'XP',
               path: 'system.xpCost',
               to: 5,
               tag: '.tag:has(> .label) .value',
               tagLabel: 'XP Cost',
               shown: '5',
            },
         ],
      },
   };

   for (const { type, tab, checked } of ITEM_TYPES) {
      test(`${type} row: expand, edit-sheet reactivity, send to chat, roll and equip`, async () => {
         const id = itemIds[type];
         const uuid = `${actorUuid}.Item.${id}`;
         const sheet = await openActorTab(tab);
         const row = itemRow(sheet, id);
         await expandRow(row);

         // The Edit button opens the item's own sheet; edits made there reach the row in place.
         const probe = PROBES[type];
         const footer = row.locator(probe.footer);
         await withDocumentSheet(row, 'Item', id, async (documentSheet) => {
            // A rarity edit moves the rarity tag from common to rare and back.
            await expect(footer.locator('.tag.common'), `${type} starts common`).toHaveCount(1);
            await chooseRarity(documentSheet, 'rare');
            await expect(footer.locator('.tag.rare'), `${type} rarity updates in place`).toHaveText('Rare');
            await expect(footer.locator('.tag.common'), `${type} is no longer common`).toHaveCount(0);

            /** @type {{stat: object, input: import('@playwright/test').Locator, original: *}[]} Edits to put back. */
            const edits = [];
            for (const stat of probe.stats) {
               /** @type {*} The stored value before the edit, put back afterwards. */
               const original = await readPath(uuid, stat.path);

               /** @type {import('@playwright/test').Locator} The probed tag's value. */
               const shown = stat.tagLabel
                  ? footer.locator('.tag:has(> .label)', { hasText: stat.tagLabel }).locator('.value')
                  : footer.locator(stat.tag).first();
               const input = headerStat(documentSheet, stat.label).locator('input').nth(stat.inputIndex ?? 0);

               // A tag that a zero hides is absent until the edit and appears in place.
               if (stat.hiddenAtZero) {
                  expect(original, `${type} ${stat.label} starts at 0`).toBe(0);
                  await expect(shown, `${type} ${stat.label} tag starts hidden`).toHaveCount(0);
               }
               await typeInto(input, stat.to);
               await expect.poll(() => readPath(uuid, stat.path), { message: `${type} ${stat.label} is stored` })
                  .toBe(stat.to);
               await expect(shown, `${type} ${stat.label} updates in place`).toHaveText(stat.shown);
               edits.push({
                  stat,
                  input,
                  original,
               });
            }

            // The edits are put back last to first, so a value is never above the maximum it depends on.
            for (const { stat, input, original } of edits.reverse()) {
               await typeInto(input, original);
               await expect.poll(() => readPath(uuid, stat.path), { message: `${type} ${stat.label} is restored` })
                  .toBe(original);
               if (stat.hiddenAtZero) {
                  await expect(
                     stat.tagLabel
                        ? footer.locator('.tag:has(> .label)', { hasText: stat.tagLabel })
                        : footer.locator(stat.tag),
                     `${type} ${stat.label} tag hides again`,
                  ).toHaveCount(0);
               }
            }
            await chooseRarity(documentSheet, 'common');
            await expect(footer.locator('.tag.common'), `${type} rarity is restored in place`).toHaveCount(1);
         });
         expect(await page.evaluate(
            (uuid) => foundry.applications.instances.values().some((app) => app.document?.uuid === uuid),
            uuid,
         ), `the ${type} sheet closed again`).toBe(false);

         // Send to chat posts the item card, whose message type is the item type.
         /** @type {number} The world message count before the click. */
         const beforeSend = await page.evaluate(() => game.messages.size);
         await row.getByRole('button', { name: 'Send to Chat' }).click();
         await expect.poll(() => newestMessageType(page, beforeSend), { message: `send to chat posts a ${type} card` })
            .toBe(type);

         // Roll: a weapon through its attack button (shown while it is equipped), a spell through its casting button,
         // every other type through the label of its check.
         /** @type {number} The world message count before the roll. */
         const beforeRoll = await page.evaluate(() => game.messages.size);
         if (type === 'weapon') {
            await setEquipped(row, 'weapon', uuid, true);
            await row.locator('.controls .check-button button').click();
            await expect.poll(() => newestMessageType(page, beforeRoll), { message: 'the attack posts a check card' })
               .toBe('attackCheck');
            await setEquipped(row, 'weapon', uuid, false);
         }
         else if (type === 'spell') {
            await row.locator('.controls .check-button button').click();
            await expect.poll(() => newestMessageType(page, beforeRoll), { message: 'casting posts a check card' })
               .toBe('castingCheck');
         }
         else if (checked) {
            await row.getByRole('button').filter({ hasText: CHECK_LABEL }).click();
            await expect.poll(() => newestMessageType(page, beforeRoll), { message: 'the check posts a check card' })
               .toBe('itemCheck');
         }

         // Equip: the toggle in the expanded content equips and unequips the item.
         if (type === 'armor' || type === 'shield') {
            await setEquipped(row, type, uuid, true);
            await setEquipped(row, type, uuid, false);
         }
         else if (type === 'equipment') {
            await setEquipped(row, type, uuid, true);
            await setEquipped(row, type, uuid, false);
         }
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      });
   }
});

test.describe('weapon and commodity rows', () => {
   test('the weapon row attack label and AttackTags follow edits made in the weapon sheet', async () => {
      const id = itemIds.weapon;
      const uuid = `${actorUuid}.Item.${id}`;
      const sheet = await openActorTab('Inventory');
      const row = itemRow(sheet, id);
      await expandRow(row);

      /** @type {{label: string, damage: number}} The first attack as made. */
      const original = await page.evaluate(async (uuid) => {
         const attack = (await fromUuid(uuid)).system.attack[0];
         return {
            label: attack.label,
            damage: attack.damage,
         };
      }, uuid);

      // The unequipped weapon renders its attack label as a plain header label.
      const attackLabel = row.locator('.attack .header .label').first();
      const damage = row.getByTestId('attack-tags-damage').locator('.value');

      // The tag shows the damage and, when the attack adds extra successes, a suffix after it.
      const shownDamage = (value) => new RegExp(`^${value}( |$)`);
      await expect(attackLabel, 'the attack label renders').toContainText(original.label);
      await expect(damage, 'the damage tag renders').toHaveText(shownDamage(original.damage));

      await withDocumentSheet(row, 'Item', id, async (documentSheet) => {
         await documentSheet.locator('.tab-list').getByText('Attacks', { exact: true }).first().click();
         const attack = documentSheet.locator('.attack').first();
         const labelInput = attack.locator('.header .label input');
         const damageInput = attack.locator('.field').filter({ has: page.getByText('Damage', { exact: true }) })
            .locator('input.titan-number-input').first();

         await typeInto(labelInput, 'E2E Renamed Strike');
         await typeInto(damageInput, original.damage + 3);
         await expect(attackLabel, 'the attack label updates in place').toContainText('E2E Renamed Strike');
         await expect(damage, 'the damage tag updates in place').toHaveText(shownDamage(original.damage + 3));

         await typeInto(labelInput, original.label);
         await typeInto(damageInput, original.damage);
         await expect(attackLabel, 'the attack label is restored in place').toContainText(original.label);
         await expect(damage, 'the damage tag is restored in place').toHaveText(shownDamage(original.damage));
      });
   });

   test('the commodity quantity input reflects an item sheet edit and persists typed and incremented values',
      async () => {
         const id = itemIds.commodity;
         const uuid = `${actorUuid}.Item.${id}`;
         const sheet = await openActorTab('Inventory');
         const row = itemRow(sheet, id);

         /** @type {number} The quantity the commodity was made with, put back at the end. */
         const original = await readPath(uuid, 'system.quantity');
         const quantityInput = row.locator('input.titan-number-input').first();
         await expect(quantityInput, 'the input shows the stored quantity').toHaveValue(String(original));

         // An edit made in the item sheet reaches the row's input in place.
         await withDocumentSheet(row, 'Item', id, async (documentSheet) => {
            await typeInto(headerStat(documentSheet, 'Quantity').locator('input.titan-number-input'), original + 4);
            await expect(quantityInput, 'the input updates in place').toHaveValue(String(original + 4));
         });

         // Typing a value in the row commits it.
         await quantityInput.fill(String(original + 7));
         await quantityInput.dispatchEvent('keyup', { key: 'End' });
         await expect.poll(() => readPath(uuid, 'system.quantity'), { message: 'the typed quantity is stored' })
            .toBe(original + 7);

         // The increment button commits too.
         await row.locator('.increment button').first().click();
         await expect.poll(() => readPath(uuid, 'system.quantity'), { message: 'the increment is stored' })
            .toBe(original + 8);

         await quantityInput.fill(String(original));
         await quantityInput.press('Enter');
         await expect.poll(() => readPath(uuid, 'system.quantity'), { message: 'the quantity is put back' })
            .toBe(original);
      });

   test('the commodity quantity input evaluates math expressions and relative deltas', async () => {
      const id = itemIds.commodity;
      const uuid = `${actorUuid}.Item.${id}`;
      const sheet = await openActorTab('Inventory');
      const quantityInput = itemRow(sheet, id).locator('input.titan-number-input').first();

      /** @type {number} The quantity the commodity was made with, put back at the end. */
      const original = await readPath(uuid, 'system.quantity');

      // An expression is evaluated when it is committed with Enter.
      await quantityInput.fill('10+5');
      await quantityInput.press('Enter');
      await expect(quantityInput, 'the expression is shown evaluated').toHaveValue('15');
      await expect.poll(() => readPath(uuid, 'system.quantity'), { message: 'the evaluated expression is stored' })
         .toBe(15);

      // A leading operator adjusts the current value.
      await quantityInput.fill('+5');
      await quantityInput.press('Enter');
      await expect(quantityInput, 'the relative delta is shown applied').toHaveValue('20');
      await expect.poll(() => readPath(uuid, 'system.quantity'), { message: 'the relative delta is stored' })
         .toBe(20);

      await quantityInput.fill(String(original));
      await quantityInput.press('Enter');
      await expect.poll(() => readPath(uuid, 'system.quantity'), { message: 'the quantity is put back' })
         .toBe(original);
   });
});

test.describe('effect rows', () => {
   /**
    * Opens the Effects tab and expands the fixture effect of a role.
    * @param {string} role - `timed`, `permanent` or `checked`.
    * @returns {Promise<{sheet: import('@playwright/test').Locator, row: import('@playwright/test').Locator}>} The
    * actor sheet and the expanded row.
    */
   async function openExpandedEffectRow(role) {
      const sheet = await openActorTab('Effects');
      const row = effectRow(sheet, effectIds[role]);
      await expandRow(row);
      return {
         sheet,
         row,
      };
   }

   /**
    * Chooses a duration type in an effect sheet's header.
    * @param {import('@playwright/test').Locator} documentSheet - The effect sheet.
    * @param {string} type - The duration type key.
    * @returns {Promise<void>} Resolves once the select has been used.
    */
   async function chooseDurationType(documentSheet, type) {
      await selectTitanOption(page, headerStat(documentSheet, 'Duration Type').locator('[role="combobox"]'), type);
   }

   test('the effect footer duration and expired tags follow edits made in the effect sheet', async () => {
      const uuid = `${actorUuid}.ActiveEffect.${effectIds.timed}`;
      const { row } = await openExpandedEffectRow('timed');

      // The DurationTag is told apart from the other tags by its bold label; its remaining count is its last value.
      const footer = row.locator('.section.footer');
      const durationTag = footer.locator('.tag', { has: page.locator('.label', { hasText: 'Duration' }) });
      const remaining = durationTag.locator('.value').last();

      // The Expired tag wraps a `Tag`, so only the wrapper is counted.
      const expired = footer.locator('.stats > .stat', { hasText: 'Expired' });
      await expect(remaining, 'the effect starts with a remaining count of 1').toHaveText('1');
      await expect(expired, 'the Expired tag is absent').toHaveCount(0);

      await withDocumentSheet(row, 'ActiveEffect', effectIds.timed, async (documentSheet) => {
         const input = headerStat(documentSheet, 'Remaining').locator('input.titan-number-input');
         await typeInto(input, 7);
         await expect(remaining, 'the remaining count updates in place').toHaveText('7');
         await expect(expired, 'the Expired tag stays absent while time remains').toHaveCount(0);

         await typeInto(input, 0);
         await expect(remaining, 'the remaining count reaches 0 in place').toHaveText('0');
         await expect(expired, 'the Expired tag appears in place').toHaveCount(1);

         await typeInto(input, 1);
         await expect(remaining, 'the remaining count is restored in place').toHaveText('1');
         await expect(expired, 'the Expired tag goes again').toHaveCount(0);
      });
      expect(await readPath(uuid, 'system.duration.remaining')).toBe(1);
   });

   test('the duration remaining input reflects an effect sheet edit and persists typed and incremented values',
      async () => {
         const uuid = `${actorUuid}.ActiveEffect.${effectIds.timed}`;
         const { row } = await openExpandedEffectRow('timed');

         // A timed effect renders only the remaining field, so the first number input is the remaining count.
         const remainingInput = row.locator('input.titan-number-input').first();
         await expect(remainingInput, 'the input starts at 1').toHaveValue('1');

         await withDocumentSheet(row, 'ActiveEffect', effectIds.timed, async (documentSheet) => {
            await typeInto(headerStat(documentSheet, 'Remaining').locator('input.titan-number-input'), 5);
            await expect(remainingInput, 'the input updates in place').toHaveValue('5');
         });

         await remainingInput.fill('8');
         await remainingInput.dispatchEvent('keyup', { key: 'End' });
         await expect.poll(() => readPath(uuid, 'system.duration.remaining'), { message: 'the typed value is stored' })
            .toBe(8);
         await row.locator('.increment button').first().click();
         await expect.poll(() => readPath(uuid, 'system.duration.remaining'), { message: 'the increment is stored' })
            .toBe(9);

         await remainingInput.fill('1');
         await remainingInput.dispatchEvent('keyup', { key: 'End' });
         await expect.poll(() => readPath(uuid, 'system.duration.remaining'), { message: 'the count is put back' })
            .toBe(1);
      });

   test('the duration initiative input reflects an effect sheet edit and persists typed values', async () => {
      const uuid = `${actorUuid}.ActiveEffect.${effectIds.timed}`;
      const { row } = await openExpandedEffectRow('timed');

      /** @type {number} The initiative the effect was made with, put back at the end. */
      const original = await readPath(uuid, 'system.duration.initiative');

      // With an initiative duration the initiative input comes before the remaining input.
      const initiativeInput = row.locator('input.titan-number-input').first();
      await withDocumentSheet(row, 'ActiveEffect', effectIds.timed, async (documentSheet) => {
         await chooseDurationType(documentSheet, 'initiative');
         const headerInputs = documentSheet.locator('.header input.titan-number-input');

         // The initiative input slides in before the remaining input.
         await expect(headerInputs, 'the header shows the initiative and remaining inputs').toHaveCount(2);
         await typeInto(headerInputs.first(), 3);
         await expect(initiativeInput, 'the initiative input shows the edit').toHaveValue('3');
         await typeInto(headerInputs.first(), 6);
         await expect(initiativeInput, 'the initiative input updates in place').toHaveValue('6');
      });

      await initiativeInput.fill('2');
      await initiativeInput.dispatchEvent('keyup', { key: 'End' });
      await expect.poll(() => readPath(uuid, 'system.duration.initiative'), { message: 'the typed value is stored' })
         .toBe(2);

      await initiativeInput.fill(String(original));
      await initiativeInput.dispatchEvent('keyup', { key: 'End' });
      await expect.poll(() => readPath(uuid, 'system.duration.initiative'), { message: 'the initiative is put back' })
         .toBe(original);
      await withDocumentSheet(row, 'ActiveEffect', effectIds.timed, async (documentSheet) => {
         await chooseDurationType(documentSheet, 'turnStart');
      });
      expect(await readPath(uuid, 'system.duration.type')).toBe('turnStart');
   });

   test('the effect row name and DurationTag update in place', async () => {
      const uuid = `${actorUuid}.ActiveEffect.${effectIds.timed}`;
      const { row } = await openExpandedEffectRow('timed');
      const name = row.locator('.header .label .name');

      // The DurationTag's values are, in order, the localized type and the remaining count.
      const durationTag = row.getByTestId('effect-row-duration');
      const durationType = durationTag.locator('.value').first();
      const durationRemaining = durationTag.locator('.value').last();
      await expect(name, 'the name renders').toHaveText('E2E Rows Timed Effect');
      await expect(durationType, 'the duration type renders').toHaveText('Turn Start');
      await expect(durationRemaining, 'the remaining count renders').toHaveText('1');

      await withDocumentSheet(row, 'ActiveEffect', effectIds.timed, async (documentSheet) => {
         const nameInput = documentSheet.locator('.document-name input');
         await typeInto(nameInput, 'E2E Rows Timed Effect Renamed');
         await chooseDurationType(documentSheet, 'turnEnd');
         await typeInto(headerStat(documentSheet, 'Remaining').locator('input.titan-number-input'), 3);
         await expect(name, 'the name updates in place').toHaveText('E2E Rows Timed Effect Renamed');
         await expect(durationType, 'the duration type updates in place').toHaveText('Turn End');
         await expect(durationRemaining, 'the remaining count updates in place').toHaveText('3');

         await typeInto(nameInput, 'E2E Rows Timed Effect');
         await chooseDurationType(documentSheet, 'turnStart');
         await typeInto(headerStat(documentSheet, 'Remaining').locator('input.titan-number-input'), 1);
         await expect(name, 'the name is restored in place').toHaveText('E2E Rows Timed Effect');
         await expect(durationType, 'the duration type is restored in place').toHaveText('Turn Start');
         await expect(durationRemaining, 'the remaining count is restored in place').toHaveText('1');
      });
      expect(await readPath(uuid, 'name')).toBe('E2E Rows Timed Effect');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('clicking the active toggle flips the rendered checkmark without a tab switch', async () => {
      const uuid = `${actorUuid}.ActiveEffect.${effectIds.permanent}`;
      const sheet = await openActorTab('Effects');

      // Only a permanent effect renders the toggle; its checkmark is the only square icon of the row.
      const row = effectRow(sheet, effectIds.permanent);
      await expect(row.locator('i.fa-square-check'), 'the effect starts active').toHaveCount(1);
      await row.locator('i.fa-square-check').click();
      await expect(row.locator('i.fa-square-check'), 'the checkmark clears in place').toHaveCount(0);
      await expect(row.locator('i.fa-square'), 'the unchecked icon shows').toHaveCount(1);
      expect(await readPath(uuid, 'system.isActive'), 'the effect is inactive').toBe(false);

      await row.locator('i.fa-square').click();
      await expect(row.locator('i.fa-square-check'), 'the checkmark returns in place').toHaveCount(1);
      expect(await readPath(uuid, 'system.isActive'), 'the effect is active again').toBe(true);
   });

   test('an effect row functional sweep: toggle, send to chat, check roll and confirm-gated delete', async () => {
      // A timed effect of its own: the sweep ends by deleting it.
      const id = await addEffect(page, actorId, 'E2E Rows Sweep Effect');
      const uuid = `${actorUuid}.ActiveEffect.${id}`;
      await addCheck(page, uuid, { label: CHECK_LABEL });
      const sheet = await openActorTab('Effects');
      const row = effectRow(sheet, id);
      await expandRow(row);

      // A timed effect shows no active toggle; a permanent duration chosen in its sheet adds one in place.
      await expect(row.locator('i.fa-square-check'), 'a timed effect shows no active toggle').toHaveCount(0);
      await withDocumentSheet(row, 'ActiveEffect', id, async (documentSheet) => {
         await chooseDurationType(documentSheet, 'permanent');
      });
      await expect(row.locator('i.fa-square-check'), 'the permanent effect starts active').toHaveCount(1);
      await row.locator('i.fa-square-check').click();
      await expect(row.locator('i.fa-square'), 'the toggle shows unchecked').toHaveCount(1);
      expect(await readPath(uuid, 'system.isActive')).toBe(false);

      /** @type {number} The world message count before the send. */
      const beforeSend = await page.evaluate(() => game.messages.size);
      await row.getByRole('button', { name: 'Send to Chat' }).click();
      await expect.poll(() => newestMessageType(page, beforeSend), { message: 'send to chat posts an effect card' })
         .toBe('effect');

      /** @type {number} The world message count before the roll. */
      const beforeRoll = await page.evaluate(() => game.messages.size);
      await row.getByRole('button').filter({ hasText: CHECK_LABEL }).first().click();
      await expect.poll(() => newestMessageType(page, beforeRoll), { message: 'the check posts a check card' })
         .toBe('itemCheck');

      // With confirmation on the delete button opens the dialog, and the effect lives until it is confirmed.
      await setClientSetting(page, 'confirmDeletingEffects', true);
      await row.getByRole('button', { name: 'Delete Effect' }).click();
      const dialog = page.locator('.application.titan-dialog');
      await expect(dialog.first(), 'the confirm dialog opens').toBeVisible();
      expect(await readPath(uuid, 'id'), 'the effect lives until it is confirmed').toBe(id);
      await dialog.getByRole('button', { name: 'Delete Effect' }).first().click();
      await expect.poll(
         () => page.evaluate(({ actorId, id }) => game.actors.get(actorId).effects.has(id), {
            actorId,
            id,
         }),
         { message: 'the confirmation deleted the effect' },
      ).toBe(false);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});

test.describe('expanding rows', () => {
   for (const [label, tab, selector] of [
      [
         'effect',
         'Effects',
         '[data-effect-id]',
      ],
      [
         'ability',
         'Abilities',
         '[data-item-id]',
      ],
      [
         'inventory',
         'Inventory',
         '[data-item-id]',
      ],
      [
         'spell',
         'Spells',
         '[data-item-id]',
      ],
   ]) {
      test(`${label} rows expand and collapse in place`, async () => {
         const sheet = await openActorTab(tab);
         const row = sheet.locator(selector).first();
         const content = row.locator('.expandable-content');
         const toggle = row.locator('.header .label .button button').first();

         // The sheet keeps a row's state between renders, so a row is collapsed first when it is not.
         if (await content.count() !== 0) {
            await toggle.click();
            await expect(content, `${label} row collapses`).toHaveCount(0);
         }
         await toggle.click();
         await expect(content, `${label} row expands in place`).toHaveCount(1);
         await toggle.click();
         await expect(content, `${label} row collapses in place`).toHaveCount(0);
      });
   }
});

test.describe('deleting rows', () => {
   /**
    * Makes a weapon of its own for a delete test.
    * @param {string} name - Display name of the new weapon.
    * @returns {Promise<string>} The weapon's id.
    */
   function makeWeapon(name) {
      return createOwnedItem(page, actorId, 'weapon', name);
   }

   /**
    * Reads whether the fixture actor still owns an item or effect.
    * @param {'items'|'effects'} collection - Which embedded collection of the actor to look in.
    * @param {string} id - The document's id.
    * @returns {Promise<boolean>} True when the actor still has it.
    */
   function actorHas(collection, id) {
      return page.evaluate(({ actorId, collection, id }) => game.actors.get(actorId)[collection].has(id), {
         actorId,
         collection,
         id,
      });
   }

   /**
    * Makes the next delete of a document type fail the way a hook of another module can make it fail: a `preDelete`
    * listener that returns false cancels the deletion. The listener counts the deletions it refused.
    * @param {'Item'|'ActiveEffect'} documentName - The document type.
    * @returns {Promise<void>} Resolves once the listener is installed.
    */
   async function refuseDeletes(documentName) {
      await page.evaluate((documentName) => {
         window.__e2eRefused = 0;
         window.__e2eRefuseHook = Hooks.on(`preDelete${documentName}`, () => {
            window.__e2eRefused += 1;
            return false;
         });
      }, documentName);
   }

   /**
    * Removes the listener that refuses deletes.
    * @param {'Item'|'ActiveEffect'} documentName - The document type.
    * @returns {Promise<void>} Resolves once the listener is gone.
    */
   async function allowDeletes(documentName) {
      await page.evaluate((documentName) => {
         Hooks.off(`preDelete${documentName}`, window.__e2eRefuseHook);
         delete window.__e2eRefuseHook;
         delete window.__e2eRefused;
      }, documentName);
   }

   /** @type {string} Selector of the confirmation dialog of an item or effect delete. */
   const CONFIRMATION = '.application.titan-dialog[id^="titan-confirmation-dialog"]';

   test('with confirmation on, an item row delete asks first: Cancel keeps the item, Delete Item removes it',
      async () => {
         const id = await makeWeapon('E2E Rows Confirm Weapon');
         const sheet = await openActorTab('Inventory');
         const row = itemRow(sheet, id);
         await setClientSetting(page, 'confirmDeletingItems', true);

         await row.getByRole('button', { name: 'Delete Item' }).click();
         const dialog = page.locator(CONFIRMATION);
         await expect(dialog, 'the confirmation dialog opens').toBeVisible();
         await dialog.getByRole('button', { name: 'Cancel' }).click();
         await expect(dialog, 'Cancel closes the dialog').toHaveCount(0);
         expect(await actorHas('items', id), 'Cancel keeps the item').toBe(true);

         await row.getByRole('button', { name: 'Delete Item' }).click();
         await expect(dialog, 'the dialog opens again').toBeVisible();
         expect(await actorHas('items', id), 'the item lives until the dialog is confirmed').toBe(true);
         await dialog.getByRole('button', { name: 'Delete Item' }).click();
         await expect.poll(() => actorHas('items', id), { message: 'the confirmation deletes the item' }).toBe(false);
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      });

   test('with confirmation on, an effect row delete asks first: Cancel keeps the effect', async () => {
      const id = await addEffect(page, actorId, 'E2E Rows Confirm Effect');
      const sheet = await openActorTab('Effects');
      const row = effectRow(sheet, id);
      await setClientSetting(page, 'confirmDeletingEffects', true);

      await row.getByRole('button', { name: 'Delete Effect' }).click();
      const dialog = page.locator(CONFIRMATION);
      await expect(dialog, 'the confirmation dialog opens').toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog, 'Cancel closes the dialog').toHaveCount(0);
      expect(await actorHas('effects', id), 'Cancel keeps the effect').toBe(true);
   });

   test('with confirmation off, an item row delete removes the item and opens no dialog', async () => {
      const id = await makeWeapon('E2E Rows Immediate Weapon');
      const sheet = await openActorTab('Inventory');
      await itemRow(sheet, id).getByRole('button', { name: 'Delete Item' }).click();
      await expect.poll(() => actorHas('items', id), { message: 'the click deleted the item at once' }).toBe(false);
      await expect(page.locator('.application.titan-dialog'), 'no dialog opened').toHaveCount(0);
   });

   test('with confirmation off, an effect row delete removes the effect and opens no dialog', async () => {
      const id = await addEffect(page, actorId, 'E2E Rows Immediate Effect');
      const sheet = await openActorTab('Effects');
      await effectRow(sheet, id).getByRole('button', { name: 'Delete Effect' }).click();
      await expect.poll(() => actorHas('effects', id), { message: 'the click deleted the effect at once' })
         .toBe(false);
      await expect(page.locator('.application.titan-dialog'), 'no dialog opened').toHaveCount(0);
   });

   test('with confirmation off, a refused item delete leaves the item and opens no dialog', async () => {
      const id = await makeWeapon('E2E Rows Refused Weapon');
      const sheet = await openActorTab('Inventory');
      await refuseDeletes('Item');
      try {
         await itemRow(sheet, id).getByRole('button', { name: 'Delete Item' }).click();
         await expect.poll(() => page.evaluate(() => window.__e2eRefused), { message: 'the delete was refused' })
            .toBe(1);
         await expect(page.locator('.application.titan-dialog'), 'no dialog opened').toHaveCount(0);
         expect(await actorHas('items', id), 'the refused delete left the item').toBe(true);
      }
      finally {
         await allowDeletes('Item');
      }
   });

   test('with confirmation off, a refused effect delete leaves the effect and opens no dialog', async () => {
      const id = await addEffect(page, actorId, 'E2E Rows Refused Effect');
      const sheet = await openActorTab('Effects');
      await refuseDeletes('ActiveEffect');
      try {
         await effectRow(sheet, id).getByRole('button', { name: 'Delete Effect' }).click();
         await expect.poll(() => page.evaluate(() => window.__e2eRefused), { message: 'the delete was refused' })
            .toBe(1);
         await expect(page.locator('.application.titan-dialog'), 'no dialog opened').toHaveCount(0);
         expect(await actorHas('effects', id), 'the refused delete left the effect').toBe(true);
      }
      finally {
         await allowDeletes('ActiveEffect');
      }
   });

   for (const confirming of [
      false,
      true,
   ]) {
      test(`deleting an equipped armor row with confirmation ${confirming ? 'on' : 'off'} un-equips it quietly`,
         async () => {
            const id = await createOwnedItem(page, actorId, 'armor', 'E2E Rows Worn Armor');
            const uuid = `${actorUuid}.Item.${id}`;
            const sheet = await openActorTab('Inventory');
            const row = itemRow(sheet, id);
            await expandRow(row);
            await setEquipped(row, 'armor', uuid, true);
            await setClientSetting(page, 'confirmDeletingItems', confirming);

            await row.getByRole('button', { name: 'Delete Item' }).click();
            if (confirming) {
               await page.locator(CONFIRMATION).getByRole('button', { name: 'Delete Item' }).click();
            }
            await expect.poll(() => actorHas('items', id), { message: 'the delete removed the armor' }).toBe(false);
            expect(
               await page.evaluate((actorId) => game.actors.get(actorId).system.equipped.armor, actorId),
               'the deleted armor is no longer equipped',
            ).toBeFalsy();
            await expect(page.locator('#notifications .notification.error'), 'no error notification').toHaveCount(0);
            expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
         });
   }
});

test.describe('owned items', () => {
   test('the Abilities tab add button gives a world actor an owned ability', async () => {
      /** @type {string} The new actor's id. */
      const id = await createActor(page, {
         name: 'E2E Rows Add Actor',
         type: 'player',
      });
      const itemId = await createOwnedItem(page, id, 'ability', 'E2E Rows Added Ability');
      expect(
         await page.evaluate(({ id, itemId }) => {
            const actor = game.actors.get(id);
            return {
               count: actor.items.size,
               type: actor.items.get(itemId)?.type,
            };
         }, {
            id,
            itemId,
         }),
         'the actor owns the new ability',
      ).toEqual({
         count: 1,
         type: 'ability',
      });
      const sheet = await openActorTab('Abilities', `Actor.${id}`);
      await expect(itemRow(sheet, itemId), 'the Abilities tab lists the new ability').toBeVisible();
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('equipping Heavy armor lowers non-zero speeds by 1', async () => {
      /** @type {string} The new actor's id. */
      const id = await createActor(page, {
         name: 'E2E Rows Heavy Actor',
         type: 'player',
      });
      const itemId = await createOwnedItem(page, id, 'armor', 'E2E Rows Heavy Plate');
      const uuid = `Actor.${id}.Item.${itemId}`;
      const sheet = await openActorTab('Inventory', `Actor.${id}`);
      const row = itemRow(sheet, itemId);
      await expandRow(row);

      // The Heavy trait is chosen in the armor's own Edit Traits dialog.
      await withDocumentSheet(row, 'Item', itemId, async (documentSheet) => {
         await documentSheet.getByText('Edit Traits', { exact: true }).first().click();
         const dialog = page.locator('.application.titan-dialog', {
            has: page.getByRole('button', { name: 'Apply Edits' }),
         });
         await expect(dialog, 'the Edit Traits dialog opens').toBeVisible();
         await dialog.locator('li', { has: page.getByText('Heavy', { exact: true }) }).locator('button').click();
         await dialog.getByRole('button', { name: 'Apply Edits' }).click();
         await expect(dialog).toHaveCount(0);
         await expect.poll(
            () => readPath(uuid, 'system.trait'),
            { message: 'the dialog stored the Heavy trait' },
         ).toEqual([
            {
               name: 'heavy',
               value: true,
            },
         ]);
      });

      /**
       * Reads the actor's stride and fly speeds.
       * @returns {Promise<{stride: number, fly: number}>} The speeds as the sheet derives them.
       */
      const speeds = () => page.evaluate((id) => {
         const actor = game.actors.get(id);
         return {
            stride: actor.system.speed.stride.value,
            fly: actor.system.speed.fly.value,
         };
      }, id);
      expect(await speeds(), 'the speeds before equipping').toEqual({
         stride: 5,
         fly: 0,
      });
      await setEquipped(row, 'armor', uuid, true);
      await expect.poll(speeds, { message: 'equipping Heavy armor lowers the non-zero speed' }).toEqual({
         stride: 4,
         fly: 0,
      });
   });
});

test.describe('check tags across surfaces', () => {
   /** @type {string[]} The CheckTags test ids whose rendered values are compared across surfaces. */
   const CHECK_TAG_TEST_IDS = [
      'check-tags-attribute',
      'check-tags-resolve-cost',
      'check-tags-resisted-by',
      'check-tags-opposed',
   ];

   /**
    * The test ids rendered on the item sheet sidebar, which hides the basics tag: an owner sees the condensed roll
    * button in the check header in its place.
    * @type {string[]}
    */
   const SIDEBAR_CHECK_TAG_TEST_IDS = CHECK_TAG_TEST_IDS.filter((testId) => testId !== 'check-tags-attribute');

   /**
    * Captures the check tag values under a surface. The rendered test ids must be exactly the expected ones, and each
    * tag must show and hold text before its text is read, so a comparison of two captures cannot pass on a missing
    * tag.
    * @param {import('@playwright/test').Locator} scope - A locator containing exactly one CheckTags render.
    * @param {string} surface - The surface's name for the messages.
    * @param {string[]} [expectedIds] - The test ids the surface renders.
    * @returns {Promise<Record<string, string>>} Whitespace-normalized tag texts by test id.
    */
   async function captureCheckTagValues(scope, surface, expectedIds = CHECK_TAG_TEST_IDS) {
      await expect.poll(
         () => scope.locator('[data-testid^="check-tags-"]')
            .evaluateAll((elements) => elements.map((element) => element.dataset.testid).sort()),
         { message: `${surface} renders exactly the expected check tags` },
      ).toEqual([...expectedIds].sort());

      /** @type {Record<string, string>} The captured texts. */
      const values = {};
      for (const testId of expectedIds) {
         const tag = scope.getByTestId(testId);
         await expect(tag, `${surface} renders ${testId}`).toBeVisible();
         values[testId] = ((await tag.textContent()) ?? '').replace(/\s+/g, ' ').trim();
         expect(values[testId], `${surface} ${testId} holds text`).not.toBe('');
      }
      return values;
   }

   test('equipment check tags render identical values on the item sheet and the character sheet', async () => {
      const itemSheet = await openSheetByUuid(page, `${actorUuid}.Item.${itemIds.parity}`);
      const sidebarValues = await captureCheckTagValues(itemSheet, 'item sheet sidebar', SIDEBAR_CHECK_TAG_TEST_IDS);

      // An owner's sidebar check header carries the condensed roll button in place of the hidden basics tag.
      await expect(itemSheet.locator('.sidebar-check .header .roll button').first(), 'the sidebar roll button')
         .toBeVisible();

      const sheet = await openActorTab('Inventory');
      const row = itemRow(sheet, itemIds.parity);
      await expandRow(row);
      const rowValues = await captureCheckTagValues(row, 'character sheet equipment row');
      expect(rowValues['check-tags-resolve-cost'], 'the resolve cost tag shows the typed cost')
         .toContain(String(PARITY_RESOLVE_COST));
      for (const testId of SIDEBAR_CHECK_TAG_TEST_IDS) {
         expect(rowValues[testId], `${testId}: the character sheet row equals the item sheet sidebar`)
            .toBe(sidebarValues[testId]);
      }
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('effect check tags render identical values on the character sheet and the Effect HUD', async () => {
      const sheet = await openActorTab('Effects');
      const row = effectRow(sheet, effectIds.checked);
      await expandRow(row);
      const rowValues = await captureCheckTagValues(row, 'character sheet effect row');

      // The HUD shows the effects of a controlled token's actor: the actor's token is placed on the shared scene and
      // taken under control with a click.
      await viewScene(page, await shared(page, 'scene'));
      const tokenId = await placeToken(page, actorId);
      await controlPlacedToken(page, tokenId);
      const panel = page.locator('[data-testid="player-hud-effects-panel"]');
      await expect(panel, 'the effects panel shows for the controlled token').toBeVisible();
      await panel.locator('[data-testid="player-hud-effect-row"]', { hasText: 'E2E Rows Checked Effect' }).click();
      const hudValues = await captureCheckTagValues(panel, 'Effect HUD row');
      for (const testId of CHECK_TAG_TEST_IDS) {
         expect(hudValues[testId], `${testId}: the Effect HUD row equals the character sheet row`)
            .toBe(rowValues[testId]);
      }
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
