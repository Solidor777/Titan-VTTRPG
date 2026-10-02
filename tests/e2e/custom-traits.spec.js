import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addAttack, addCustomTrait, addEffect, createActor, createWorldItem } from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Custom traits on an item sheet and an effect sheet, driven through the sidebar's controls: the Add Custom Trait
 * dialog, the tag's edit and delete icons, the Edit dialog, and the tooltip that shows the trait description. Four
 * regressions are locked in. The trait list handed the tag a string index, so editing never replaced and deleting never
 * removed a trait. The tag's FontAwesome class sat on a `<button>`, whose `font-family` Foundry overrides, so the glyph
 * rendered as the missing-glyph box; the class belongs on an inner `<i>`. The user-written description was localized
 * for its tooltip; it is passed verbatim. A description edited to HTML with an event handler is cleaned in the tooltip
 * that is already mounted.
 *
 * The documents come from flows: world weapons made through the Items tab, one effect per test on a player actor.
 */

/** @type {string} The name of the trait the tests start from. */
const ORIGINAL_NAME = 'E2E Original Trait';

/** @type {string} The name a trait is edited to. */
const EDITED_NAME = 'E2E Edited Trait';

/**
 * The description of the starting trait. It is a real localization key ("addCustomTrait" localizes to "Add Custom
 * Trait"), so a tooltip that localized its text would differ from the typed text.
 * @type {string}
 */
const DESCRIPTION_KEY = 'addCustomTrait';

/** @type {string} HTML whose image carries an event handler that sets a page flag when the image fails to load. */
const PAYLOAD = '<p>E2E sanitized text</p><img src="e2e-missing-image.png" onerror="window.__titanXss = true">';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Makes a world weapon through the Items tab.
 * @param {string} name - Display name of the new weapon; the `E2E ` prefix lets the census find it.
 * @returns {Promise<string>} The weapon's uuid.
 */
async function makeWeapon(name) {
   return `Item.${await createWorldItem(page, {
      name,
      type: 'weapon',
   })}`;
}

/**
 * Makes a world weapon that carries one custom trait, added through the Add Custom Trait dialog.
 * @param {string} name - Display name of the new weapon; the `E2E ` prefix lets the census find it.
 * @param {string} [description] - Text typed into the dialog's description area.
 * @returns {Promise<string>} The weapon's uuid.
 */
async function makeWeaponWithTrait(name, description = DESCRIPTION_KEY) {
   /** @type {string} The new weapon's uuid. */
   const uuid = await makeWeapon(name);
   await addCustomTrait(page, uuid, ORIGINAL_NAME, description);
   return uuid;
}

/**
 * Finds the sidebar element that holds the trait tags; the weapon sheet renders more than one `.sidebar` element.
 * @param {import('@playwright/test').Locator} sheet - The open sheet.
 * @returns {import('@playwright/test').Locator} The innermost sidebar holding a trait's delete icon.
 */
function traitSidebar(sheet) {
   return sheet.locator('.sidebar').filter({ has: page.locator('.fa-trash') }).last();
}

/**
 * Reads the names of a document's custom traits.
 * @param {string} uuid - The uuid of the item or effect.
 * @returns {Promise<string[]>} The stored names, in list order.
 */
function readTraitNames(uuid) {
   return page.evaluate(
      async (uuid) => (await fromUuid(uuid)).system.customTrait.map((trait) => trait.name),
      uuid,
   );
}

/**
 * Edits the single custom trait of a document through the tag's edit icon and the Edit dialog, then asserts the new
 * name is stored in place and rendered.
 * @param {import('@playwright/test').Locator} sidebar - The open sheet's sidebar.
 * @param {string} uuid - The uuid of the item or effect.
 * @returns {Promise<void>} Resolves once the edit is asserted.
 */
async function editTrait(sidebar, uuid) {
   await expect(sidebar.getByText(ORIGINAL_NAME).first(), 'the trait renders').toBeVisible();

   // The dialog is found by its element-id prefix, which carries a generated suffix.
   await sidebar.locator('.fa-pen-to-square').click();
   /** @type {import('@playwright/test').Locator} The Edit Custom Trait dialog on the page. */
   const dialog = page.locator('[id^="titan-edit-custom-trait-dialog-"]');
   await expect(dialog, 'edit-custom-trait dialog should open').toBeVisible();
   await dialog.locator('input').first().fill(EDITED_NAME);
   await dialog.locator('.buttons .button button').first().click();

   // The trait's name changed in place: still exactly one trait.
   await expect.poll(() => readTraitNames(uuid), { message: 'the trait was edited in place' })
      .toEqual([EDITED_NAME]);
   await expect(sidebar.getByText(EDITED_NAME).first(), 'the edited name renders').toBeVisible();
   await expect(sidebar.getByText(ORIGINAL_NAME), 'the old name no longer renders').toHaveCount(0);
   expect(errors, `uncaught errors during the edit:\n${errors.join('\n')}`).toEqual([]);
}

/**
 * Deletes the single custom trait of a document through the tag's delete icon, then asserts it is gone.
 * @param {import('@playwright/test').Locator} sidebar - The open sheet's sidebar.
 * @param {string} uuid - The uuid of the item or effect.
 * @returns {Promise<void>} Resolves once the deletion is asserted.
 */
async function deleteTrait(sidebar, uuid) {
   await expect(sidebar.getByText(ORIGINAL_NAME).first(), 'the trait renders').toBeVisible();
   await sidebar.locator('.fa-trash').click();
   await expect.poll(() => readTraitNames(uuid), { message: 'the trait was removed from the document' }).toEqual([]);
   await expect(sidebar.getByText(ORIGINAL_NAME), 'the deleted tag no longer renders').toHaveCount(0);
   expect(errors, `uncaught errors during the delete:\n${errors.join('\n')}`).toEqual([]);
}

test.describe('custom traits on items', () => {
   test('the Add Custom Trait button opens the dialog; Add Trait persists and renders the trait', async () => {
      /** @type {string} The new weapon's uuid. */
      const uuid = await makeWeapon('E2E Trait Add Weapon');
      /** @type {import('@playwright/test').Locator} The document's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await sheet.getByText('Add Custom Trait', { exact: true }).first().click();

      /** @type {import('@playwright/test').Locator} The Add Custom Trait dialog on the page. */
      const dialog = page.locator('.titan-add-custom-item-trait-dialog');
      await expect(dialog, 'add-custom-trait dialog should open').toBeVisible();
      await dialog.locator('input').first().fill(ORIGINAL_NAME);
      await dialog.locator('.buttons .button button').first().click();

      // The trait persisted exactly once, under the typed name.
      await expect.poll(() => readTraitNames(uuid), { message: 'the trait persisted once under the typed name' })
         .toEqual([ORIGINAL_NAME]);
      await expect(sheet.locator('.sidebar').getByText(ORIGINAL_NAME).first(), 'the new trait renders as a tag')
         .toBeVisible();
      expect(errors, `uncaught errors during the add:\n${errors.join('\n')}`).toEqual([]);
   });

   test('editing a custom trait persists the new name and re-renders the tag', async () => {
      /** @type {string} The weapon's uuid. */
      const uuid = await makeWeaponWithTrait('E2E Trait Edit Weapon');
      /** @type {import('@playwright/test').Locator} The document's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await editTrait(sheet.locator('.sidebar'), uuid);
   });

   test('deleting a custom trait removes it and re-renders without the tag', async () => {
      /** @type {string} The weapon's uuid. */
      const uuid = await makeWeaponWithTrait('E2E Trait Delete Weapon');
      /** @type {import('@playwright/test').Locator} The document's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await deleteTrait(sheet.locator('.sidebar'), uuid);
   });

   test.describe('a weapon that keeps its trait', () => {
      /** @type {string} The uuid of the weapon the tests only read. */
      let uuid;

      test.beforeAll(async () => {
         uuid = await makeWeaponWithTrait('E2E Trait Read Weapon');
      });

      test('the edit and delete icons use the FontAwesome font (glyphs render)', async () => {
         // A glyph renders only when its element resolves to the FontAwesome family; on a bare `<button>` Foundry's UI
         // font wins and the glyph falls back to the missing-glyph box.
         /** @type {import('@playwright/test').Locator} The document's sheet. */
         const sheet = await openSheetByUuid(page, uuid);
         /** @type {object} The font families of the trait tag's glyph elements. */
         const families = await traitSidebar(sheet).evaluate((sidebar) => ({
            edit: getComputedStyle(sidebar.querySelector('.fa-pen-to-square')).fontFamily,
            delete: getComputedStyle(sidebar.querySelector('.fa-trash')).fontFamily,
         }));
         expect(families.edit, 'edit icon font-family').toMatch(/Font Awesome/i);
         expect(families.delete, 'delete icon font-family').toMatch(/Font Awesome/i);
      });

      test('the custom-trait description tooltip is shown verbatim, not localized', async () => {
         // The description is a real localization key; a localized tooltip would read its localized value.
         /** @type {import('@playwright/test').Locator} The document's sheet. */
         const sheet = await openSheetByUuid(page, uuid);
         await expect(sheet.locator('.sidebar').getByText(ORIGINAL_NAME).first()).toBeVisible();
         /** @type {object} The tooltip content read from the page. */
         const tooltipContent = await traitSidebar(sheet).evaluate((sidebar, name) => {
            /** @type {Element|undefined} The trait tag element that carries the marker. */
            const label = [...sidebar.querySelectorAll('.tag *')]
               .find((element) => element._tippy && element.textContent.trim() === name);
            return label ? label._tippy.props.content : null;
         }, ORIGINAL_NAME);
         expect(tooltipContent, 'the tooltip shows the raw description, not its localization').toBe(DESCRIPTION_KEY);
      });

      test('the edit dialog carries its stable CSS class', async () => {
         /** @type {import('@playwright/test').Locator} The document's sheet. */
         const sheet = await openSheetByUuid(page, uuid);
         await sheet.locator('.sidebar .fa-pen-to-square').click();
         await expect(page.locator('[id^="titan-edit-custom-trait-dialog-"]'), 'the edit dialog opens').toBeVisible();
         await expect(page.locator('.titan-edit-custom-trait-dialog'), 'the edit dialog carries its stable class')
            .toBeVisible();
      });
   });

   test('a live tooltip updated to user HTML is cleaned on update', async () => {
      /** @type {string} The weapon's uuid; the starting description is plain HTML. */
      const uuid = await makeWeaponWithTrait('E2E Trait Sanitize Weapon', '<p>E2E first description</p>');
      /** @type {import('@playwright/test').Locator} The document's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await expect(sheet.locator('.sidebar').getByText(ORIGINAL_NAME).first()).toBeVisible();

      // The cleaned forms core's cleaner returns for the starting description and for the payload.
      /** @type {{first: string, payload: string}} The expected tooltip contents. */
      const cleaned = await page.evaluate(({ payload }) => ({
         first: foundry.utils.cleanHTML('<p>E2E first description</p>'),
         payload: foundry.utils.cleanHTML(payload),
      }), { payload: PAYLOAD });
      expect(cleaned.payload).toContain('<img src="e2e-missing-image.png">');
      expect(cleaned.payload).not.toContain('onerror');

      // Mark the trait label that carries the tooltip, and read its first content.
      /** @type {string|null} The tooltip's first content, or null when the label is not found. */
      const first = await traitSidebar(sheet).evaluate((sidebar, name) => {
         /** @type {Element|undefined} The trait tag element that carries the marker. */
         const label = [...sidebar.querySelectorAll('.tag *')]
            .find((element) => element._tippy && element.textContent.trim() === name);
         if (!label) {
            return null;
         }
         label.__e2eMarked = true;
         return label._tippy.props.content;
      }, ORIGINAL_NAME);
      expect(first).toBe(cleaned.first);

      // The description is edited to the payload in the Edit dialog's description area.
      await sheet.locator('.sidebar .fa-pen-to-square').click();
      /** @type {import('@playwright/test').Locator} The Edit Custom Trait dialog on the page. */
      const dialog = page.locator('[id^="titan-edit-custom-trait-dialog-"]');
      await expect(dialog).toBeVisible();
      await dialog.locator('textarea').fill(PAYLOAD);
      await dialog.locator('.buttons .button button').first().click();
      await expect.poll(
         () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.customTrait[0].description, uuid),
         { message: 'the dialog stored the payload description' },
      ).toBe(PAYLOAD);

      // The same, still marked, label holds the cleaned payload: the mounted tooltip was cleaned on update.
      await expect.poll(() => traitSidebar(sheet).evaluate((sidebar) => {
         /** @type {Element|undefined} The trait tag element that carries the marker. */
         const label = [...sidebar.querySelectorAll('.tag *')].find((element) => element.__e2eMarked);
         return label ? label._tippy?.props?.content : 'the marked label was replaced';
      })).toBe(cleaned.payload);
   });
});

test.describe('custom traits on effects', () => {
   /** @type {string} The id of the player actor that holds the effects. */
   let hostId;

   test.beforeAll(async () => {
      hostId = await createActor(page, {
         name: 'E2E Effect Trait Host',
         type: 'player',
      });
   });

   /**
    * Adds an effect that carries one custom trait.
    * @param {string} name - Display name of the new effect.
    * @returns {Promise<string>} The effect's uuid.
    */
   async function makeEffectWithTrait(name) {
      /** @type {string} The new effect's id. */
      const id = await addEffect(page, hostId, name);

      /** @type {string} The effect's uuid. */
      const uuid = `Actor.${hostId}.ActiveEffect.${id}`;
      await addCustomTrait(page, uuid, ORIGINAL_NAME, 'E2E effect trait');
      return uuid;
   }

   test('editing an effect custom trait persists the new name and re-renders', async () => {
      /** @type {string} The effect's uuid. */
      const uuid = await makeEffectWithTrait('E2E Trait Edit Effect');
      /** @type {import('@playwright/test').Locator} The document's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await editTrait(sheet.locator('.sidebar'), uuid);
   });

   test('deleting an effect custom trait removes it and re-renders', async () => {
      /** @type {string} The effect's uuid. */
      const uuid = await makeEffectWithTrait('E2E Trait Delete Effect');
      /** @type {import('@playwright/test').Locator} The document's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await deleteTrait(sheet.locator('.sidebar'), uuid);
   });
});

test.describe('custom traits on a weapon attack', () => {
   /**
    * Makes a world weapon that has one attack and opens its Attacks tab.
    * @param {string} name - Display name of the new weapon.
    * @returns {Promise<{uuid: string, sheet: import('@playwright/test').Locator}>} The weapon's uuid and sheet.
    */
   async function weaponWithAttack(name) {
      /** @type {string} The new weapon's uuid. */
      const uuid = await makeWeapon(name);

      /** @type {number} The number of attacks the new weapon starts with. */
      const attacks = await page.evaluate(async (uuid) => (await fromUuid(uuid)).system.attack.length, uuid);
      if (attacks === 0) {
         await addAttack(page, uuid);
      }

      /** @type {import('@playwright/test').Locator} The weapon's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await sheet.locator('.tab-list').getByText('Attacks', { exact: true }).first().click();
      return {
         uuid: uuid,
         sheet: sheet,
      };
   }

   /**
    * Reads the names of the first attack's custom traits.
    * @param {string} uuid - The weapon's uuid.
    * @returns {Promise<string[]>} The stored names, in list order.
    */
   function readAttackTraitNames(uuid) {
      return page.evaluate(
         async (uuid) => (await fromUuid(uuid)).system.attack[0].customTrait.map((trait) => trait.name),
         uuid,
      );
   }

   test('the attack Add Custom Trait dialog stores the trait and renders its tag', async () => {
      /** @type {{uuid: string, sheet: import('@playwright/test').Locator}} The weapon's uuid and sheet. */
      const { uuid, sheet } = await weaponWithAttack('E2E Attack Trait Add Weapon');
      /** @type {import('@playwright/test').Locator} The attack's traits section. */
      const traits = sheet.locator('.traits:has(.traits-header)');
      await traits.getByText('Add Custom Trait', { exact: true }).click();

      /** @type {import('@playwright/test').Locator} The Add Custom Trait dialog of the attack. */
      const dialog = page.locator('[id^="add-custom-attack-trait-dialog-"]');
      await expect(dialog, 'the add dialog opens').toBeVisible();
      await dialog.locator('input').first().fill(ORIGINAL_NAME);
      await dialog.locator('.buttons .button button').first().click();

      await expect(dialog, 'Add Trait closes the dialog').toHaveCount(0);
      await expect.poll(() => readAttackTraitNames(uuid), { message: 'the attack stored the trait once' })
         .toEqual([ORIGINAL_NAME]);
      await expect(traits.getByText(ORIGINAL_NAME).first(), 'the trait renders as a tag').toBeVisible();
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the attack Edit dialog stores the edited trait in place', async () => {
      /** @type {{uuid: string, sheet: import('@playwright/test').Locator}} The weapon's uuid and sheet. */
      const { uuid, sheet } = await weaponWithAttack('E2E Attack Trait Edit Weapon');
      /** @type {import('@playwright/test').Locator} The attack's traits section. */
      const traits = sheet.locator('.traits:has(.traits-header)');
      await traits.getByText('Add Custom Trait', { exact: true }).click();
      await page.locator('[id^="add-custom-attack-trait-dialog-"] input').first().fill(ORIGINAL_NAME);
      await page.locator('[id^="add-custom-attack-trait-dialog-"] .buttons .button button').first().click();
      await expect.poll(() => readAttackTraitNames(uuid), { message: 'the attack stored the trait' })
         .toEqual([ORIGINAL_NAME]);

      await traits.locator('.traits-container .fa-pen-to-square').click();
      /** @type {import('@playwright/test').Locator} The Edit Custom Trait dialog of the attack. */
      const dialog = page.locator('[id^="edit-custom-attack-traits-dialog-"]');
      await expect(dialog, 'the edit dialog opens').toBeVisible();
      await dialog.locator('input').first().fill(EDITED_NAME);
      await dialog.locator('.buttons .button button').first().click();

      await expect(dialog, 'Apply Edits closes the dialog').toHaveCount(0);
      await expect.poll(() => readAttackTraitNames(uuid), { message: 'the trait was edited in place' })
         .toEqual([EDITED_NAME]);
      await expect(traits.getByText(EDITED_NAME).first(), 'the edited name renders').toBeVisible();
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the attack trait tag delete icon removes the trait', async () => {
      /** @type {{uuid: string, sheet: import('@playwright/test').Locator}} The weapon's uuid and sheet. */
      const { uuid, sheet } = await weaponWithAttack('E2E Attack Trait Delete Weapon');
      /** @type {import('@playwright/test').Locator} The attack's traits section. */
      const traits = sheet.locator('.traits:has(.traits-header)');
      await traits.getByText('Add Custom Trait', { exact: true }).click();
      await page.locator('[id^="add-custom-attack-trait-dialog-"] input').first().fill(ORIGINAL_NAME);
      await page.locator('[id^="add-custom-attack-trait-dialog-"] .buttons .button button').first().click();
      await expect.poll(() => readAttackTraitNames(uuid), { message: 'the attack stored the trait' })
         .toEqual([ORIGINAL_NAME]);

      await traits.locator('.traits-container .fa-trash').click();
      await expect.poll(() => readAttackTraitNames(uuid), { message: 'the trait was removed from the attack' })
         .toEqual([]);
      await expect(traits.getByText(ORIGINAL_NAME), 'the deleted tag no longer renders').toHaveCount(0);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
