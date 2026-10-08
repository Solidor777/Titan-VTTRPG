import { expect, test } from './harness.js';
import { clickSheetTab, commitText, dragGrip } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addAttack,
   addCheck,
   addCustomAspect,
   addEffect,
   addRulesElement,
   createActor,
   createFolder,
   createOwnedItem,
   createWorldItem,
   dragItemOntoSheet,
   openSidebarTab,
   readServerSystem,
   shared,
} from './flows.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Real pointer drags. The grip of a row on a character sheet's Inventory and Effects tabs reorders the list and stores
 * the new sort order; the grip of a rules element, attack, check or custom aspect row on an item sheet reorders that
 * list, and the expansion state of an attack, check or custom aspect moves with its row. A row dragged from one item
 * sheet onto the same kind of list on another sheet is copied there with a fresh uuid, and a row of another kind is
 * refused. A world item dragged from the Items directory onto an actor sheet creates an owned copy, an Item folder
 * dragged there creates an owned copy of each item in it, and a folder of another type creates nothing.
 *
 * The documents come from flows, made once in `beforeAll` (the folder and drop tests make their own actors).
 */

/**
 * @typedef {object} ListPair
 * @property {import('@playwright/test').Locator} source - The rows of the list a row is dragged from.
 * @property {import('@playwright/test').Locator} target - The rows of the list a row is dropped on.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the character whose Inventory and Effects lists the tests reorder. */
let characterUuid;
/** @type {string} The uuid of the weapon whose rules elements, attacks and checks the tests reorder and copy from. */
let sourceWeaponUuid;
/** @type {string} The uuid of the weapon that receives copied rules elements, attacks and checks. */
let targetWeaponUuid;
/** @type {string} The uuid of the spell whose custom aspects the tests reorder and copy from. */
let sourceSpellUuid;
/** @type {string} The uuid of the spell that receives copied custom aspects. */
let targetSpellUuid;

/**
 * The item sheet lists a grip can reorder. `tab` is the tab that shows the list, `token` finds the part of a row that
 * tells the rows apart (a label input, or the value input of a rules element), and `expands` tells whether the rows
 * keep an expansion state.
 * @type {Record<string, {tab: string, token: string, expands: boolean}>}
 */
const LISTS = {
   rulesElement: {
      tab: 'Rules Elements',
      token: '.field.number input',
      expands: false,
   },
   attack: {
      tab: 'Attacks',
      token: '.header .label input',
      expands: true,
   },
   check: {
      tab: 'Checks',
      token: '.header .label input',
      expands: true,
   },
   customAspect: {
      tab: 'Custom Aspects',
      token: '.header .label input',
      expands: true,
   },
};

test.beforeAll(async ({ browser }) => {
   test.setTimeout(240_000);
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);

   // The character: three weapons and three effects.
   /** @type {string} The new actor's id. */
   const actorId = await createActor(page, {
      name: 'E2E Drag Character',
      type: 'player',
   });
   characterUuid = `Actor.${actorId}`;
   for (const letter of [
      'A',
      'B',
      'C',
   ]) {
      await createOwnedItem(page, actorId, 'weapon', `E2E Drag Weapon ${letter}`);
      await addEffect(page, actorId, `E2E Drag Effect ${letter}`);
   }

   // The source weapon and spell hold three rows in each list; the targets hold one.
   sourceWeaponUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Drag Source Weapon',
      type: 'weapon',
   })}`;
   targetWeaponUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Drag Target Weapon',
      type: 'weapon',
   })}`;
   sourceSpellUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Drag Source Spell',
      type: 'spell',
   })}`;
   targetSpellUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Drag Target Spell',
      type: 'spell',
   })}`;
   await fillList(sourceWeaponUuid, 'rulesElement', [
      '1',
      '2',
      '3',
   ]);
   await fillList(sourceWeaponUuid, 'attack', [
      'E2E Drag Source Attack 1',
      'E2E Drag Source Attack 2',
      'E2E Drag Source Attack 3',
   ]);
   await fillList(sourceWeaponUuid, 'check', [
      'E2E Drag Source Check 1',
      'E2E Drag Source Check 2',
      'E2E Drag Source Check 3',
   ]);
   await fillList(sourceSpellUuid, 'customAspect', [
      'E2E Drag Source Aspect 1',
      'E2E Drag Source Aspect 2',
      'E2E Drag Source Aspect 3',
   ]);
   await fillList(targetWeaponUuid, 'rulesElement', ['9']);
   await fillList(targetWeaponUuid, 'attack', ['E2E Drag Target Attack']);
   await fillList(targetWeaponUuid, 'check', ['E2E Drag Target Check']);
   await fillList(targetSpellUuid, 'customAspect', ['E2E Drag Target Aspect']);
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
 * Reads the tokens of a list of an item from the data the server stores (see `LISTS`).
 * @param {string} uuid - The uuid of the item.
 * @param {string} kind - A key of `LISTS`.
 * @returns {Promise<string[]>} The tokens of the list in stored order: a rules element's value, or an entry's label.
 */
async function readTokens(uuid, kind) {
   /** @type {object} The item's stored system data. */
   const system = await readServerSystem(page, uuid);
   return kind === 'rulesElement'
      ? system.rulesElement.map((entry) => String(entry.value))
      : system[kind].map((entry) => entry.label);
}

/**
 * Opens an item sheet on the tab of a list.
 * @param {string} uuid - The uuid of the item.
 * @param {string} kind - A key of `LISTS`.
 * @returns {Promise<import('@playwright/test').Locator>} The item sheet's window element.
 */
async function openList(uuid, kind) {
   /** @type {import('@playwright/test').Locator} The item's sheet. */
   const sheet = await openSheetByUuid(page, uuid);

   // The window is made tall so that every row of a list shows at once (a window size is not a document). At the
   // default window height three checks with one expanded did not fit: the first row was scrolled out of view behind
   // the filter and a drag from its grip to the last row moved nothing
   // (`.superpowers/sdd/test-suite-rewrite/phase-3/zz-check-drag.log` and `zz-check-drag.png`, local).
   await page.evaluate(
      (id) => foundry.applications.instances.get(id).setPosition({
         top: 10,
         height: 1000,
      }),
      await sheet.getAttribute('id'),
   );
   await clickSheetTab(sheet, LISTS[kind].tab);
   return sheet;
}

/**
 * Adds rows through the list's add button until the item holds one per wanted token, then types each token into its
 * row: a label for a list with labels, a value for a rules element. A list that already holds more rows than tokens
 * keeps them.
 * @param {string} uuid - The uuid of the item.
 * @param {string} kind - A key of `LISTS`.
 * @param {string[]} tokens - The token of each row, in list order.
 * @returns {Promise<void>} Resolves once the rows are stored with their tokens.
 */
async function fillList(uuid, kind, tokens) {
   /** @type {number} The number of rows the item holds. */
   let held = (await readTokens(uuid, kind)).length;
   while (held < tokens.length) {
      if (kind === 'rulesElement') {
         await addRulesElement(page, uuid, {});
      }
      else if (kind === 'attack') {
         await addAttack(page, uuid);
      }
      else if (kind === 'check') {
         await addCheck(page, uuid);
      }
      else {
         await addCustomAspect(page, uuid);
      }
      held += 1;
   }

   /** @type {import('@playwright/test').Locator} The list's rows. */
   const rows = (await openList(uuid, kind)).locator('li.reorder-row');
   await expect(rows).toHaveCount(held);
   for (const [index, token] of tokens.entries()) {
      /** @type {import('@playwright/test').Locator} The input that tells row `index` apart. */
      const input = rows.nth(index).locator(LISTS[kind].token).first();
      await commitText(input, token);

      // A stored row re-renders the list, which can reset a later row's input, so each token is awaited first.
      await expect.poll(
         async () => (await readTokens(uuid, kind))[index],
         { message: `row ${index} of the ${kind} list stored its token` },
      ).toBe(token);
   }
   await expect.poll(
      async () => (await readTokens(uuid, kind)).slice(0, tokens.length),
      { message: `the inputs stored the ${kind} tokens` },
   ).toEqual(tokens);
}

/**
 * Reads the tokens the rows of a rendered list show.
 * @param {import('@playwright/test').Locator} rows - The list's `li.reorder-row` rows.
 * @param {string} kind - A key of `LISTS`.
 * @returns {Promise<string[]>} The tokens in rendered order.
 */
function readRenderedTokens(rows, kind) {
   return rows.evaluateAll(
      (elements, token) => elements.map((element) => element.querySelector(token).value),
      LISTS[kind].token,
   );
}

/**
 * Drags the grip of a row onto another row of its own list, which must move the row, and waits until the dragged row's
 * element has a new position in its list (the list keys its rows, so a reorder moves the element) or has been replaced.
 * @param {import('@playwright/test').Locator} source - The row whose grip is dragged.
 * @param {import('@playwright/test').Locator} target - The row of the same list the grip is dropped on.
 * @param {'top' | 'bottom'} half - Whether the drop lands in the upper or the lower half of the target row.
 * @returns {Promise<void>} Resolves once the row has moved and the operations of the drop have finished.
 */
async function dragGripToMove(source, target, half) {
   /** @type {import('@playwright/test').ElementHandle} The dragged row's element. */
   const handle = await source.elementHandle();

   /** @type {number} The row's position in its list before the drag. */
   const from = await handle.evaluate((element) => [...element.parentElement.children].indexOf(element));
   await dragGrip(source, target, half);
   await expect.poll(
      () => handle.evaluate(
         (element, index) => !element.isConnected || [...element.parentElement.children].indexOf(element) !== index,
         from,
      ),
      { message: 'the dragged row moved in its list' },
   ).toBe(true);
}

test.describe('character sheet lists', () => {
   for (const [label, tab, attribute] of [
      [
         'weapon',
         'Inventory',
         'data-item-id',
      ],
      [
         'effect',
         'Effects',
         'data-effect-id',
      ],
   ]) {
      test(`dragging a row's grip in the ${label} list to the end and back stores the sort order`, async () => {
         /** @type {import('@playwright/test').Locator} The character's sheet. */
         const sheet = await openSheetByUuid(page, characterUuid);
         await clickSheetTab(sheet, tab);

         /** @type {import('@playwright/test').Locator} The list's rows. */
         const rows = sheet.locator(`li.reorder-row[${attribute}]`);
         await expect(rows, 'three rows render').toHaveCount(3);

         /**
          * Reads the rendered row ids.
          * @returns {Promise<string[]>} The ids in rendered order.
          */
         const renderedIds = () => rows.evaluateAll(
            (elements, name) => elements.map((element) => element.getAttribute(name)),
            attribute,
         );

         /**
          * Reads the stored ids in sort order.
          * @returns {Promise<string[]>} The ids of the character's weapons or effects, by their `sort`.
          */
         const storedIds = () => page.evaluate(async ({ uuid, collection }) => (await fromUuid(uuid))[collection]
            .filter((document) => document.type === (collection === 'items' ? 'weapon' : 'effect'))
            .sort((a, b) => a.sort - b.sort)
            .map((document) => document.id), {
            uuid: characterUuid,
            collection: label === 'weapon' ? 'items' : 'effects',
         });

         /** @type {string[]} The ids before any drag. */
         const [first, second, third] = await renderedIds();

         // The first row goes below the last one.
         await dragGripToMove(rows.nth(0), rows.nth(2), 'bottom');
         await expect.poll(renderedIds, { message: 'the first row moved to the end' }).toEqual([
            second,
            third,
            first,
         ]);
         await expect.poll(storedIds, { message: 'the sort order stored the move' }).toEqual([
            second,
            third,
            first,
         ]);

         // The row at the end goes back above the first one, which restores the list for the next test.
         await dragGripToMove(rows.nth(2), rows.nth(0), 'top');
         await expect.poll(renderedIds, { message: 'the last row moved back to the top' }).toEqual([
            first,
            second,
            third,
         ]);
         await expect.poll(storedIds, { message: 'the sort order stored the move back' }).toEqual([
            first,
            second,
            third,
         ]);
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      });
   }

   test('a weapon dragged from its own sheet onto another row sorts it relative to that row', async () => {
      /** @type {import('@playwright/test').Locator} The character's sheet on the Inventory tab. */
      const sheet = await openSheetByUuid(page, characterUuid);
      await clickSheetTab(sheet, 'Inventory');

      /** @type {import('@playwright/test').Locator} The weapon rows. */
      const rows = sheet.locator('li.reorder-row[data-item-id]');
      await expect(rows, 'three rows render').toHaveCount(3);

      /**
       * Reads the stored weapon ids in sort order.
       * @returns {Promise<string[]>} The ids of the character's weapons, by their `sort`.
       */
      const storedIds = () => page.evaluate(
         async (uuid) => (await fromUuid(uuid)).items
            .filter((item) => item.type === 'weapon')
            .sort((a, b) => a.sort - b.sort)
            .map((item) => item.id),
         characterUuid,
      );

      /** @type {string[]} The weapon ids before any drag. */
      const [first, second, third] = await rows.evaluateAll(
         (elements) => elements.map((element) => element.dataset.itemId),
      );

      /**
       * Drags an owned weapon's Copy UUID button, which is a drag source for the item (read: core
       * `DocumentSheetV2#_renderFrame`), onto a row of the actor's sheet. This is a drop of an owned item that no list
       * zone owns, so the sheet's own drop handler sorts it.
       * @param {string} itemId - The id of the owned weapon whose item sheet supplies the drag.
       * @param {import('@playwright/test').Locator} row - The row the weapon is dropped on.
       * @returns {Promise<void>} Resolves once the drop's operations have finished and the item sheet is closed.
       */
      const dropOwnSheetOn = async (itemId, row) => {
         /** @type {import('@playwright/test').Locator} The weapon's item sheet. */
         const itemSheet = await openSheetByUuid(page, `${characterUuid}.Item.${itemId}`);

         // The two windows open on top of each other, so they are moved apart (a window position is not a document).
         await page.evaluate(([itemSheetId, actorSheetId]) => {
            foundry.applications.instances.get(itemSheetId).setPosition({ left: 10 });
            foundry.applications.instances.get(actorSheetId).setPosition({ left: 900 });
         }, [
            await itemSheet.getAttribute('id'),
            await sheet.getAttribute('id'),
         ]);
         await itemSheet.locator('button[data-action="copyUuid"]').dragTo(row, {
            targetPosition: {
               x: 20,
               y: 3,
            },
         });
         await settle(page);
         await itemSheet.locator('header.window-header [data-action="close"]').click();
      };

      // Core's sort direction is automatic (read: Foundry 14.364 `performIntegerSort`, `client/utils/helpers.mjs:277`):
      // the dropped item goes before the target when its sort is greater than the target's, otherwise after it. Equal
      // sorts (a list no drag has touched) give no direction, so a grip drag out and back first stores distinct sorts.
      await dragGripToMove(rows.nth(0), rows.nth(2), 'bottom');
      await expect.poll(storedIds, { message: 'the first grip drag moved the first weapon last' }).toEqual([
         second,
         third,
         first,
      ]);
      await dragGripToMove(rows.nth(2), rows.nth(0), 'top');
      await expect.poll(storedIds, { message: 'the grip drags stored distinct sorts in the original order' }).toEqual([
         first,
         second,
         third,
      ]);

      // The last weapon has the greatest sort, so dropped on the first row it goes before it.
      await dropOwnSheetOn(third, rows.nth(0));
      await expect.poll(storedIds, { message: 'a drop on a row of lower sort sorted the weapon before it' }).toEqual([
         third,
         first,
         second,
      ]);
      await expect.poll(
         () => rows.evaluateAll((elements) => elements.map((element) => element.dataset.itemId)),
         { message: 'the rendered list follows' },
      ).toEqual([
         third,
         first,
         second,
      ]);

      // That weapon now has the least sort, so dropped on the last row it goes after it, which restores the list.
      await dropOwnSheetOn(third, rows.nth(2));
      await expect.poll(storedIds, { message: 'a drop on a row of greater sort sorted the weapon after it' }).toEqual([
         first,
         second,
         third,
      ]);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});

test.describe('item sheet lists', () => {
   for (const [kind, uuid] of [
      [
         'rulesElement',
         () => sourceWeaponUuid,
      ],
      [
         'attack',
         () => sourceWeaponUuid,
      ],
      [
         'check',
         () => sourceWeaponUuid,
      ],
      [
         'customAspect',
         () => sourceSpellUuid,
      ],
   ]) {
      test(`dragging a row's grip in the ${kind} list to the end and back reorders the list`, async () => {
         /** @type {import('@playwright/test').Locator} The rows of the list. */
         const rows = (await openList(uuid(), kind)).locator('li.reorder-row');
         await expect(rows, 'three rows render').toHaveCount(3);
         await expect(rows.locator('[data-drag-handle]'), 'each row renders a grip').toHaveCount(3);

         /** @type {string[]} The tokens before any drag. */
         const [first, second, third] = await readRenderedTokens(rows, kind);

         /**
          * Reads which rows are expanded.
          * @returns {Promise<boolean[]>} Whether each row, in rendered order, shows its expandable content.
          */
         const readExpansion = () => rows.evaluateAll(
            (elements) => elements.map((element) => element.querySelector('.expandable-content') !== null),
         );
         if (LISTS[kind].expands) {
            // The first and last rows are collapsed and the middle one is expanded, so a misaligned expansion state
            // shows after a move. The collapsed last row is also short enough for the drop to land in its lower half.
            // The last row goes first, so the collapse of the first row cannot move the button still to be clicked.
            await rows.nth(2).getByRole('button', { name: 'Collapse' }).click();
            await settle(page, { transitions: true });
            await rows.nth(0).getByRole('button', { name: 'Collapse' }).click();
            await settle(page, { transitions: true });
            await expect(rows.nth(0).locator('.expandable-content'), 'the first row is collapsed').toHaveCount(0);
            await expect(rows.nth(1).locator('.expandable-content'), 'the middle row is expanded').toHaveCount(1);
            await expect(rows.nth(2).locator('.expandable-content'), 'the last row is collapsed').toHaveCount(0);
         }

         await dragGripToMove(rows.nth(0), rows.nth(2), 'bottom');
         await expect.poll(() => readTokens(uuid(), kind), { message: 'the stored order moved the first row last' })
            .toEqual([
               second,
               third,
               first,
            ]);
         await expect.poll(() => readRenderedTokens(rows, kind), { message: 'the rendered order follows' }).toEqual([
            second,
            third,
            first,
         ]);
         if (LISTS[kind].expands) {
            await expect.poll(readExpansion, { message: 'the expansion state moved with the rows' }).toEqual([
               true,
               false,
               false,
            ]);
         }

         // The row at the end goes back above the first one, which restores the list.
         await dragGripToMove(rows.nth(2), rows.nth(0), 'top');
         await expect.poll(() => readTokens(uuid(), kind), { message: 'the stored order moved the row back' })
            .toEqual([
               first,
               second,
               third,
            ]);
         await expect.poll(() => readRenderedTokens(rows, kind), { message: 'the rendered order follows back' })
            .toEqual([
               first,
               second,
               third,
            ]);
         if (LISTS[kind].expands) {
            await expect.poll(readExpansion, { message: 'the expansion state moved back with the rows' }).toEqual([
               false,
               true,
               false,
            ]);

            // The rows are expanded again, as they mount.
            await rows.nth(2).getByRole('button', { name: 'Expand' }).click();
            await settle(page, { transitions: true });
            await rows.nth(0).getByRole('button', { name: 'Expand' }).click();
            await settle(page, { transitions: true });
            for (const index of [
               0,
               1,
               2,
            ]) {
               await expect(rows.nth(index).locator('.expandable-content'), `row ${index} is expanded again`)
                  .toHaveCount(1);
            }
         }
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      });
   }
});

test.describe('copying a row between item sheets', () => {
   /**
    * Opens a source sheet and a target sheet on the tab of the same list, side by side.
    * @param {string} sourceUuid - The uuid of the item the row is dragged from.
    * @param {string} sourceKind - A key of `LISTS` for the source sheet's tab.
    * @param {string} targetUuid - The uuid of the item the row is dropped on.
    * @param {string} targetKind - A key of `LISTS` for the target sheet's tab.
    * @returns {Promise<ListPair>} The rows of the two lists.
    */
   async function openPair(sourceUuid, sourceKind, targetUuid, targetKind) {
      /** @type {import('@playwright/test').Locator} The sheet the row is dragged from. */
      const sourceSheet = await openList(sourceUuid, sourceKind);

      /** @type {import('@playwright/test').Locator} The sheet the row is dropped on. */
      const targetSheet = await openList(targetUuid, targetKind);

      // The two windows open on top of each other, so they are moved apart (a window position is not a document).
      await page.evaluate(([sourceId, targetId]) => {
         foundry.applications.instances.get(sourceId).setPosition({ left: 10 });
         foundry.applications.instances.get(targetId).setPosition({ left: 900 });
      }, [
         await sourceSheet.getAttribute('id'),
         await targetSheet.getAttribute('id'),
      ]);
      return {
         source: sourceSheet.locator('li.reorder-row'),
         target: targetSheet.locator('li.reorder-row'),
      };
   }

   /**
    * Reads the list entries (the whole objects) the server stores for an item.
    * @param {string} uuid - The uuid of the item.
    * @param {string} property - The `system` property that holds the list.
    * @returns {Promise<object[]>} The entries in stored order.
    */
   async function readEntries(uuid, property) {
      return (await readServerSystem(page, uuid))[property];
   }

   for (const [kind, property, sourceUuid, targetUuid] of [
      [
         'rulesElement',
         'rulesElement',
         () => sourceWeaponUuid,
         () => targetWeaponUuid,
      ],
      [
         'attack',
         'attack',
         () => sourceWeaponUuid,
         () => targetWeaponUuid,
      ],
      [
         'check',
         'check',
         () => sourceWeaponUuid,
         () => targetWeaponUuid,
      ],
      [
         'customAspect',
         'customAspect',
         () => sourceSpellUuid,
         () => targetSpellUuid,
      ],
   ]) {
      test(`dropping a row of the ${kind} list on another sheet's list copies it with a fresh uuid`,
         async () => {
            /** @type {object[]} The source entries before the drop. */
            const sourceBefore = await readEntries(sourceUuid(), property);

            /** @type {object[]} The target entries before the drop. */
            const targetBefore = await readEntries(targetUuid(), property);

            /** @type {ListPair} The rows of the two lists. */
            const { source, target } = await openPair(sourceUuid(), kind, targetUuid(), kind);
            await expect(target, 'the target list renders its rows').toHaveCount(targetBefore.length);
            try {
               await dragGrip(source.nth(0), target.nth(0), 'top');
               await expect.poll(
                  async () => (await readEntries(targetUuid(), property)).length,
                  { message: 'the drop added an entry to the target' },
               ).toBe(targetBefore.length + 1);

               /** @type {object[]} The target entries after the drop. */
               const targetAfter = await readEntries(targetUuid(), property);
               expect(targetAfter[0], 'the copy carries the dragged row').toMatchObject(
                  kind === 'rulesElement'
                     ? {
                        operation: sourceBefore[0].operation,
                        value: sourceBefore[0].value,
                     }
                     : { label: sourceBefore[0].label },
               );
               expect(
                  [
                     ...sourceBefore,
                     ...targetBefore,
                  ].map((entry) => entry.uuid),
                  'the copy has a uuid no other entry has',
               ).not.toContain(targetAfter[0].uuid);
               expect(
                  targetAfter.slice(1).map((entry) => entry.uuid),
                  'the target kept its own entries after the copy',
               ).toEqual(targetBefore.map((entry) => entry.uuid));
               expect(
                  (await readEntries(sourceUuid(), property)).map((entry) => entry.uuid),
                  'the source kept its entries',
               ).toEqual(sourceBefore.map((entry) => entry.uuid));
               await expect(target, 'the target list renders the copy').toHaveCount(targetBefore.length + 1);
               expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
            }
            finally {
               // The copy is deleted through its row's delete button, which restores the target for the next test.
               if ((await readEntries(targetUuid(), property)).length > targetBefore.length) {
                  await target.nth(0).getByRole('button', {
                     name: 'Delete',
                     exact: true,
                  }).click();
                  await expect.poll(
                     async () => (await readEntries(targetUuid(), property)).length,
                     { message: 'the copy was deleted' },
                  ).toBe(targetBefore.length);
                  await settle(page, { transitions: true });
               }
            }
         });
   }

   test('a row of another kind is refused by a list that does not take it', async () => {
      /** @type {object[]} The target spell's custom aspects before any drop. */
      const before = await readEntries(targetSpellUuid, 'customAspect');

      // A custom aspect from the source spell is accepted by the target spell's custom aspect list.
      /** @type {ListPair} The rows of the two spells' custom aspects. */
      const { source, target } = await openPair(sourceSpellUuid, 'customAspect', targetSpellUuid, 'customAspect');
      try {
         await dragGrip(source.nth(0), target.nth(0), 'top');
         await expect.poll(
            async () => (await readEntries(targetSpellUuid, 'customAspect')).length,
            { message: 'the custom aspect drop is accepted' },
         ).toBe(before.length + 1);
         await expect(target).toHaveCount(before.length + 1);

         // A check from the source weapon is dropped on the same list and refused.
         await closeAllApps(page);

         /** @type {ListPair} The rows of the weapon's checks and of the spell's custom aspects. */
         const pair = await openPair(sourceWeaponUuid, 'check', targetSpellUuid, 'customAspect');
         await expect(pair.target).toHaveCount(before.length + 1);
         await dragGrip(pair.source.nth(0), pair.target.nth(0), 'top');

         // The refused drop adds no row.
         await expect(pair.target, 'the refused check added no row').toHaveCount(before.length + 1);

         // A custom aspect dropped after the refusal is accepted. The list then holds the two custom aspect copies and
         // no copy of the check, so a drop the refusal let through late would have shown as a third entry.
         await closeAllApps(page);

         /** @type {ListPair} The rows of the two spells' custom aspects, opened again. */
         const again = await openPair(sourceSpellUuid, 'customAspect', targetSpellUuid, 'customAspect');
         await dragGrip(again.source.nth(0), again.target.nth(0), 'top');
         await expect.poll(
            async () => (await readEntries(targetSpellUuid, 'customAspect')).length,
            { message: 'the custom aspect dropped after the refusal is accepted' },
         ).toBe(before.length + 2);
         expect(
            (await readEntries(targetSpellUuid, 'customAspect')).map((entry) => entry.label),
            'the refused check was not copied',
         ).toEqual([
            'E2E Drag Source Aspect 1',
            'E2E Drag Source Aspect 1',
            ...before.map((entry) => entry.label),
         ]);
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      }
      finally {
         // The accepted copies are deleted through their rows' delete buttons, which restores the target spell.
         await closeAllApps(page);

         /** @type {import('@playwright/test').Locator} The target spell's custom aspect rows. */
         const rows = (await openList(targetSpellUuid, 'customAspect')).locator('li.reorder-row');

         /** @type {number} The number of custom aspects the target spell still holds. */
         let held = (await readEntries(targetSpellUuid, 'customAspect')).length;
         while (held > before.length) {
            await rows.nth(0).getByRole('button', {
               name: 'Delete',
               exact: true,
            }).click();
            held -= 1;
            await expect.poll(
               async () => (await readEntries(targetSpellUuid, 'customAspect')).length,
               { message: 'a copy was deleted' },
            ).toBe(held);
            await settle(page, { transitions: true });
         }
      }
   });
});

test.describe('dropping directory entries on an actor sheet', () => {
   test('a world item dragged from the Items directory creates an owned copy that keeps its name', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Drag Drop Actor',
         type: 'player',
      });

      /** @type {string} The id of the owned copy. */
      const copyId = await dragItemOntoSheet(page, await shared(page, 'equipment'), actorId);
      expect(await page.evaluate(
         ({ actorId, copyId }) => {
            /** @type {TitanItem} The owned copy. */
            const copy = game.actors.get(actorId).items.get(copyId);
            return {
               name: copy.name,
               type: copy.type,
               count: game.actors.get(actorId).items.size,
            };
         },
         {
            actorId,
            copyId,
         },
      ), 'the owned copy keeps the source name and type').toEqual({
         name: 'E2E Shared Equipment',
         type: 'equipment',
         count: 1,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('an Item folder creates an owned copy of each item in it and an Actor folder creates nothing', async () => {
      /** @type {string} The id the Items directory gave the new Item folder. */
      const itemFolderId = await createFolder(page, 'items', 'E2E Drag Item Folder');
      await createWorldItem(page, {
         name: 'E2E Drag Folder Weapon',
         type: 'weapon',
         folderId: itemFolderId,
      });
      await createWorldItem(page, {
         name: 'E2E Drag Folder Spell',
         type: 'spell',
         folderId: itemFolderId,
      });

      /** @type {string} The id the Actors directory gave the new Actor folder. */
      const actorFolderId = await createFolder(page, 'actors', 'E2E Drag Actor Folder');
      await createActor(page, {
         name: 'E2E Drag Folder Member',
         type: 'player',
         folderId: actorFolderId,
      });

      /** @type {string} The actor that receives the drops. */
      const actorId = await createActor(page, {
         name: 'E2E Drag Folder Target',
         type: 'player',
      });

      /**
       * Reads the actor's owned items.
       * @returns {Promise<{name: string, type: string}[]>} The owned items' names and types, sorted by name.
       */
      const readOwned = () => page.evaluate(
         (id) => game.actors.get(id).items.map((item) => ({
            name: item.name,
            type: item.type,
         })).sort((a, b) => a.name.localeCompare(b.name)),
         actorId,
      );

      /** @type {import('@playwright/test').Locator} The target actor's sheet. */
      const sheet = await openSheetByUuid(page, `Actor.${actorId}`);

      /** @type {import('@playwright/test').Locator} The Items directory panel. */
      const items = await openSidebarTab(page, 'items');
      await items.locator(`.directory-item.folder[data-folder-id="${itemFolderId}"] > header`).dragTo(sheet);
      await expect.poll(readOwned, { message: 'the Item folder created one owned item per folder item' }).toEqual([
         {
            name: 'E2E Drag Folder Spell',
            type: 'spell',
         },
         {
            name: 'E2E Drag Folder Weapon',
            type: 'weapon',
         },
      ]);

      // The Actor folder is dropped on the same sheet: it creates no owned item and raises no error.
      /** @type {import('@playwright/test').Locator} The Actors directory panel. */
      const actors = await openSidebarTab(page, 'actors');
      await actors.locator(`.directory-item.folder[data-folder-id="${actorFolderId}"] > header`).dragTo(sheet);

      // Nothing observable marks the end of a refused drop, so the check below follows a later item drop, which is
      // inferred to be handled after the folder drop (drops are dispatched in order; not measured). The owned items
      // must be only the Item folder's two and the dropped one.
      await dragItemOntoSheet(page, await shared(page, 'equipment'), actorId);
      expect(await readOwned(), 'the Actor folder added nothing').toEqual([
         {
            name: 'E2E Drag Folder Spell',
            type: 'spell',
         },
         {
            name: 'E2E Drag Folder Weapon',
            type: 'weapon',
         },
         {
            name: 'E2E Shared Equipment',
            type: 'equipment',
         },
      ]);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
