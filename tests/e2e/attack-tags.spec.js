import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/**
 * Shared-AttackTags proof (embedded-document-stores spec): one component renders a weapon's intrinsic
 * attack tags on the weapon item-sheet sidebar (top-level 'document'), the character sheet (embedded
 * weapon via EmbeddedDocumentProvider), and the weapon chat card (message snapshot via path parity).
 * Asserts value parity across all three surfaces, live reactivity on the sheets, the two-context split
 * (actor-derived tags + roll button via 'sheetDocument'), chat snapshot non-reactivity, and the
 * standard-trait / custom-trait render paths (the only coverage of those paths in the suite).
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E AttackTags Actor';

/** @type {string} Name of the seeded weapon. */
const WEAPON_NAME = 'E2E AttackTags Weapon';

/** @type {string} Display name of the seeded custom trait (rendered raw by the custom-trait Tag). */
const CUSTOM_TRAIT_NAME = 'E2E Custom Trait';

/** @type {string} Camelized form of CUSTOM_TRAIT_NAME, replicating Camelize.js output for the engine call. */
const CUSTOM_TRAIT_CAMELIZED = 'e2ECustomTrait';

/** @type {string} Localized label of the seeded standard trait 'piercing' (LOCAL.piercing.text). */
const STANDARD_TRAIT_LABEL = 'Piercing';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('shared AttackTags across surfaces', () => {
   test.beforeEach(async () => {
      await page.evaluate(async ({ actorName, weaponName, customTraitName }) => {
         // Remove any stale fixture from a prior run.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // Seed a fresh player actor owning one EQUIPPED weapon with a distinctive first attack:
         // damage 7 (intrinsic, no extra-success suffix so the tag text is exact), range 3 (so the
         // range tag renders), one standard trait, and one custom trait.
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            {
               name: weaponName,
               type: 'weapon',
               system: {
                  equipped: true,
               },
            },
         ]);

         // Shape the default attack in place (clone-and-write per the array-update convention). The
         // trait entry mirrors EditTraitsDialogBase output ({name, value:true} for a boolean trait);
         // the custom trait mirrors AddCustomAttackTraitDialogShell output ({name, description, uuid}).
         const weapon = actor.items.getName(weaponName);
         const attacks = foundry.utils.deepClone(weapon.system.attack);
         attacks[0].label = 'Parity Strike';
         attacks[0].damage = 7;
         attacks[0].plusExtraSuccessDamage = false;
         attacks[0].range = 3;
         attacks[0].trait = [
            {
               name: 'piercing',
               value: true,
            },
         ];
         attacks[0].customTrait = [
            {
               name: customTraitName,
               description: 'E2E custom trait description',
               uuid: 'e2e-custom-trait-uuid',
            },
         ];
         await weapon.update({
            system: {
               attack: attacks,
            },
         });
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME, customTraitName: CUSTOM_TRAIT_NAME });
   });

   /**
    * Opens the character sheet, activates the Inventory tab, and expands the weapon row.
    * @returns {Promise<import('@playwright/test').Locator>} The expanded weapon row locator.
    */
   async function openCharacterSheetWeaponRow() {
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ACTOR_NAME);

      // Activate the Inventory tab; the row click below auto-waits for the rendered row.
      await page.getByText('Inventory', { exact: true }).first().click();

      // The weapon's inventory row, then expand it (first button in the header label area).
      const row = page.locator('[data-item-id]').first();
      await row.locator('.header .label .button button').first().click();
      return row;
   }

   /**
    * Opens the weapon item sheet and expands the first sidebar attack. Closes all other apps first so
    * the `.titan-document-sheet` locator is unambiguous — call AFTER finishing with the character sheet.
    * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
    */
   async function openWeaponSheetSidebarAttack() {
      await closeAllApps(page);
      await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const app = await weapon.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'item sheet mounted' },
         );
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });

      /** @type {import('@playwright/test').Locator} The weapon item-sheet application root (only app open). */
      const sheet = page.locator('.application.titan-document-sheet').first();

      // Expand the first sidebar attack (the expand IconButton lives in the sidebar row-header spacer).
      await sheet.locator('.sidebar li .spacer button').first().click();
      return sheet;
   }

   test('intrinsic tags render with matching values on both sheets', async () => {
      const row = await openCharacterSheetWeaponRow();

      // Character sheet: intrinsic damage (no actor mods seeded → mod 0) and range from AttackTags.
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(row.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(row.getByTestId('attack-tags-type')).toBeVisible();
      await expect(row.getByTestId('attack-tags-attribute')).toBeVisible();

      // Trait render paths: the standard trait shows its localized name (TraitTag); the custom trait
      // shows its raw name (Tag). Scoped to the AttackTags root so footer/tab trait UI cannot match.
      await expect(row.locator('.attack-tags').getByText(STANDARD_TRAIT_LABEL, { exact: true })).toBeVisible();
      await expect(row.locator('.attack-tags').getByText(CUSTOM_TRAIT_NAME, { exact: true })).toBeVisible();

      // Weapon item sheet sidebar: the SAME component renders the SAME values.
      const sheet = await openWeaponSheetSidebarAttack();
      await expect(sheet.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(sheet.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(sheet.getByTestId('attack-tags-type')).toBeVisible();

      // Trait parity on the sidebar surface (scoped to AttackTags: the attack-settings tab also lists traits).
      await expect(sheet.locator('.attack-tags').getByText(STANDARD_TRAIT_LABEL, { exact: true })).toBeVisible();
      await expect(sheet.locator('.attack-tags').getByText(CUSTOM_TRAIT_NAME, { exact: true })).toBeVisible();

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('character-sheet AttackTags updates live when the weapon is edited (embedded bridge)', async () => {
      const row = await openCharacterSheetWeaponRow();
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');

      // Edit the attack damage IN PLACE through the live weapon document.
      await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const attacks = foundry.utils.deepClone(weapon.system.attack);
         attacks[0].damage = 9;
         await weapon.update({
            system: {
               attack: attacks,
            },
         });
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });

      // The embedded bridge re-resolves through the actor subscription: the row updates in place.
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('9');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('two-context: actor-derived tags render and the roll button fires requestAttackCheck', async () => {
      const row = await openCharacterSheetWeaponRow();

      // The dice tag is actor-derived (read via 'sheetDocument'); its value must match the engine math.
      // Mirrors the row recipe: attribute + (training + training mod) + dice mod, no multiAttack halving
      // (the fixture is not multi-attacking). Custom traits enter camelized per the engine recipe.
      /** @type {number} The expected dice pool computed from the live actor (engine-recipe call shape). */
      const expectedDice = await page.evaluate(({ actorName, weaponName, customTraits }) => {
         const actor = game.actors.getName(actorName);
         const weapon = actor.items.getName(weaponName);
         const attack = weapon.system.attack[0];
         const attackTraits = attack.trait.map((trait) => trait.name);
         return actor.system.attribute[attack.attribute].value +
            actor.system.skill[attack.skill].training.value +
            actor.system.getAttackCheckMod(
               'training',
               attack.attribute,
               attack.skill,
               weapon.system.multiAttack,
               attack.type,
               attackTraits,
               customTraits,
            ) +
            actor.system.getAttackCheckMod(
               'dice',
               attack.attribute,
               attack.skill,
               weapon.system.multiAttack,
               attack.type,
               attackTraits,
               customTraits,
            );
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME, customTraits: [CUSTOM_TRAIT_CAMELIZED] });
      await expect(row.getByTestId('attack-row-dice').locator('.value')).toHaveText(String(expectedDice));

      // Enable the dialog gate, then click the roll button (the equipped attack header button).
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', true);
      });
      await row.locator('.attack .header button').first().click();

      // requestAttackCheck on the actor opens the attack-check dialog (selector per checkDialog.js).
      await expect(
         page.locator('.application.titan-dialog[id^="titan-attack-check-dialog-"]').first(),
      ).toBeVisible();

      // Restore the dialog gate so later specs see the default-off setting (matches checks-dialog hygiene).
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('chat card renders the same tags and stays a snapshot when the weapon changes', async () => {
      // Post the weapon card.
      /** @type {string} The posted chat message id. */
      const messageId = await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const before = game.messages.size;
         const message = await weapon.sendToChat();
         await titanWait(() => game.messages.size > before, { message: 'weapon card posted' });
         return message.id;
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });

      /** @type {import('@playwright/test').Locator} The mounted weapon card (first visible mount). */
      const card = page.locator(`.message[data-message-id="${messageId}"] .item-chat-message`).first();
      await expect(card).toBeVisible();

      // Parity: the card's AttackTags shows the same intrinsic values as the sheets, traits included.
      await expect(card.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(card.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(card.locator('.attack-tags').getByText(STANDARD_TRAIT_LABEL, { exact: true })).toBeVisible();
      await expect(card.locator('.attack-tags').getByText(CUSTOM_TRAIT_NAME, { exact: true })).toBeVisible();

      // Edit the weapon, then wait for a POSITIVE signal that the change propagated to live readers
      // (the character sheet row), so the card assertion below is not a race.
      const row = await openCharacterSheetWeaponRow();
      await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const attacks = foundry.utils.deepClone(weapon.system.attack);
         attacks[0].damage = 11;
         await weapon.update({
            system: {
               attack: attacks,
            },
         });
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('11');

      // Snapshot semantics: the chat card still shows the value at post time.
      await expect(card.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
