import { expect, flushPageErrors, test } from './harness.js';
import { clickSheetTab, commitText } from './actions.js';
import { clickRoll, openCheckDialog, readNewestCheckFlags, setNumberField } from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addCheck,
   addCustomAspect,
   createActor,
   createOwnedItem,
   placeToken,
   readServerSystem,
   setAttributeBase,
   setOwnership,
   shared,
   toggleTokenLink,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { settle } from './settle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * What a player sees and can do on a character's sheet at each ownership level: an owner views and edits, an observer
 * views and reads every tab and row but edits nothing, a limited viewer is shown what the measured behaviour below
 * records, and the roll button of an item sheet shows only for the owner. One session: E2E GM 1 makes the character
 * and sets the level in the Configure Ownership window; E2E Player 1 opens the sheets.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who makes the documents and sets the levels. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who opens the sheets. */
let player;
/** @type {string[]} Uncaught page errors collected on the first GM's page during the current test. */
let errors;
/** @type {string} The id of the character the player is given a level on. */
let actorId;
/** @type {string} The uuid of that character. */
let actorUuid;
/** @type {string} The uuid of the character's equipment, which carries one check. */
let equipmentUuid;

/**
 * Gives E2E Player 1 an ownership level of a character and waits until the player's client holds it.
 * @param {'NONE'|'LIMITED'|'OBSERVER'|'OWNER'} level - The level to give.
 * @param {string} [id] - The id of the character; the file's character by default.
 * @returns {Promise<void>} Resolves once the player's client resolves that level.
 */
async function giveLevel(level, id = actorId) {
   await setOwnership(gm, id, 'E2E Player 1', level);
   await player.waitForFunction(
      ({ id, level }) => {
         /** @type {Actor|undefined} The character in the player's client. */
         const actor = game.actors.get(id);
         return actor?.getUserLevel(game.user) === CONST.DOCUMENT_OWNERSHIP_LEVELS[level];
      },
      {
         id,
         level,
      },
      { timeout: 1000 },
   );
}

/**
 * @typedef {object} TokenFixture
 * @property {string} actorId - The id of the world character whose prototype token is unlinked.
 * @property {string} tokenId - The id of the token placed for that character.
 * @property {string} sceneId - The id of the scene the token stands on.
 * @property {string} tokenActorUuid - The uuid of the token's synthetic actor.
 * @property {string} tokenItemUuid - The uuid of the equipment on the synthetic actor.
 */

/** @type {TokenFixture|undefined} The unlinked token the tests share, made by the first test that needs it. */
let tokenFixture;

/**
 * Returns an unlinked token of a new character that carries an equipment with one check. The token is made by dropping
 * the character, whose prototype token the character sheet's toggle has unlinked, on the shared scene.
 * @returns {Promise<TokenFixture>} The token's ids and the uuids of its synthetic actor and the actor's equipment.
 */
async function ensureToken() {
   if (tokenFixture) {
      return tokenFixture;
   }

   /** @type {string} The shared scene's id. */
   const sceneId = await shared(gm, 'scene');

   /** @type {string} The new character's id. */
   const id = await createActor(gm, {
      name: 'E2E Ownership Token Actor',
      type: 'player',
   });

   /** @type {string} The equipment's id. */
   const itemId = await createOwnedItem(gm, id, 'equipment', 'E2E Ownership Token Equipment');
   await addCheck(gm, `Actor.${id}.Item.${itemId}`, { label: 'E2E Ownership Token Check' });
   if (await gm.evaluate((id) => game.actors.get(id).prototypeToken.actorLink, id)) {
      await toggleTokenLink(gm, id);
   }
   await viewScene(gm, sceneId);

   /** @type {string} The placed token's id. */
   const tokenId = await placeToken(gm, id);
   await closeAllApps(gm);
   tokenFixture = {
      actorId: id,
      tokenId,
      sceneId,
      tokenActorUuid: `Scene.${sceneId}.Token.${tokenId}.Actor.${id}`,
      tokenItemUuid: `Scene.${sceneId}.Token.${tokenId}.Actor.${id}.Item.${itemId}`,
   };
   return tokenFixture;
}

/**
 * Counts the inputs and buttons of a sheet that a user can use.
 * @param {import('@playwright/test').Locator} sheet - The sheet's window.
 * @returns {Promise<{inputs: number, disabledInputs: number, tabs: string[]}>} The sheet's inputs, how many are
 * disabled, and the labels of its tab buttons.
 */
function readControls(sheet) {
   return sheet.evaluate((element) => ({
      inputs: element.querySelectorAll('input').length,
      disabledInputs: [...element.querySelectorAll('input')].filter((input) => input.disabled).length,
      tabs: [...element.querySelectorAll('.tab-list button')].map((button) => button.textContent.trim()),
   }));
}

test.beforeAll(async ({ browser }) => {
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   player = await (await browser.newContext()).newPage();
   await login(player, 'E2E Player 1');

   // The character has an ability and an equipment with one check; the tests set the player's level on it.
   actorId = await createActor(gm, {
      name: 'E2E Ownership Actor',
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   await createOwnedItem(gm, actorId, 'ability', 'E2E Ownership Ability');
   equipmentUuid = `${actorUuid}.Item.${await createOwnedItem(gm, actorId, 'equipment', 'E2E Ownership Equipment')}`;
   await addCheck(gm, equipmentUuid, { label: 'E2E Ownership Check' });
   await closeAllApps(gm);
});

test.afterEach(async () => {
   await closeAllApps(gm);
   await closeAllApps(player);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   // The second client delivers its errors before its context closes: a closed page cannot be flushed.
   await flushPageErrors(player);
   await player?.context().close();
   await gm?.close();
});

test('OWNER: the player can view and edit', async () => {
   await giveLevel('OWNER');
   expect(await player.evaluate((id) => ({
      observer: game.actors.get(id).testUserPermission(game.user, 'OBSERVER'),
      owner: game.actors.get(id).testUserPermission(game.user, 'OWNER'),
   }), actorId)).toEqual({
      observer: true,
      owner: true,
   });

   /** @type {import('@playwright/test').Locator} The player's view of the sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   /** @type {{inputs: number, disabledInputs: number, tabs: string[]}} The sheet's controls. */
   const controls = await readControls(sheet);
   expect(controls.tabs, 'every tab shows').toEqual([
      'Skills',
      'Inventory',
      'Abilities',
      'Spells',
      'Effects',
      'Notes',
   ]);
   expect(controls.disabledInputs, 'no input is disabled').toBe(0);

   // The sheet edits: the player types a Body base value and the character stores it; the original is typed back.
   /** @type {number} The Body base value before the edit. */
   const original = await player.evaluate((id) => game.actors.get(id).system.attribute.body.baseValue, actorId);
   await setAttributeBase(player, actorUuid, 'body', original + 1);
   expect(await gm.evaluate((id) => game.actors.get(id).system.attribute.body.baseValue, actorId), 'the GM client')
      .toBe(original + 1);
   await setAttributeBase(player, actorUuid, 'body', original);
});

test('OBSERVER: the player can view but not edit', async () => {
   await giveLevel('OBSERVER');
   expect(await player.evaluate((id) => ({
      observer: game.actors.get(id).testUserPermission(game.user, 'OBSERVER'),
      owner: game.actors.get(id).testUserPermission(game.user, 'OWNER'),
   }), actorId)).toEqual({
      observer: true,
      owner: false,
   });

   /** @type {import('@playwright/test').Locator} The player's view of the sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   /** @type {{inputs: number, disabledInputs: number, tabs: string[]}} The sheet's controls. */
   const controls = await readControls(sheet);
   expect(controls.inputs, 'the sheet has inputs').toBeGreaterThan(0);
   expect(controls.disabledInputs, 'every input is disabled').toBe(controls.inputs);
   expect(await player.evaluate((id) => game.actors.get(id).sheet.isEditable, actorId), 'the sheet is read-only')
      .toBe(false);
});

test('LIMITED: the TITAN sheet shows a limited viewer the whole sheet, read-only', async () => {
   // Pins the measured behaviour (the user's ruling: leave it as it is): a limited viewer meets the sheet's view
   // permission, so the sheet opens with every tab and the same controls as an observer's, all of them disabled.
   await giveLevel('LIMITED');
   expect(await player.evaluate((id) => ({
      limited: game.actors.get(id).testUserPermission(game.user, 'LIMITED'),
      observer: game.actors.get(id).testUserPermission(game.user, 'OBSERVER'),
      owner: game.actors.get(id).testUserPermission(game.user, 'OWNER'),
   }), actorId)).toEqual({
      limited: true,
      observer: false,
      owner: false,
   });

   /** @type {import('@playwright/test').Locator} The player's view of the sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   /** @type {{inputs: number, disabledInputs: number, tabs: string[]}} The limited viewer's controls. */
   const limited = await readControls(sheet);
   expect(limited.tabs, 'every tab shows to a limited viewer').toEqual([
      'Skills',
      'Inventory',
      'Abilities',
      'Spells',
      'Effects',
      'Notes',
   ]);
   expect(limited.inputs, 'the sheet has inputs').toBeGreaterThan(0);
   expect(limited.disabledInputs, 'every input is disabled').toBe(limited.inputs);
   expect(await player.evaluate((id) => game.actors.get(id).sheet.isEditable, actorId), 'the sheet is read-only')
      .toBe(false);

   // The same sheet at the observer level shows the same tabs and the same number of inputs.
   await closeAllApps(player);
   await giveLevel('OBSERVER');

   /** @type {{inputs: number, disabledInputs: number, tabs: string[]}} The observer's view of the same sheet. */
   const observer = await readControls(await openSheetByUuid(player, actorUuid));
   expect(observer, 'an observer sees the same controls').toEqual(limited);
});

test('an observer can switch character and item sheet tabs and expand rows, but not edit', async () => {
   await giveLevel('OBSERVER');
   expect(await player.evaluate((id) => game.actors.get(id).isOwner, actorId), 'the player is not an owner')
      .toBe(false);

   // Character sheet: switch to Abilities and expand the ability row.
   /** @type {import('@playwright/test').Locator} The player's view of the character sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   await expect(sheet.locator('.tab-list').getByText('Abilities', { exact: true }), 'the tab button is enabled')
      .toBeEnabled();
   await clickSheetTab(sheet, 'Abilities');

   /** @type {import('@playwright/test').Locator} The ability's row. */
   const row = sheet.locator('[data-item-id]').first();
   await expect(row, 'the Abilities tab opened').toBeVisible();

   /** @type {import('@playwright/test').Locator} The row's expand toggle. */
   const expand = row.locator('.header .label .button button').first();
   await expect(expand, 'the expand toggle is enabled').toBeEnabled();
   await expect(row.locator('.expandable-content')).toHaveCount(0);
   await expand.click();
   await expect(row.locator('.expandable-content'), 'the row expanded').toBeVisible();

   // Editing stays disabled: the ability row's delete button is owner-gated.
   await expect(row.getByRole('button', { name: 'Delete Item' }), 'editing controls stay disabled').toBeDisabled();

   // Item sheet: switch to the Checks tab.
   /** @type {import('@playwright/test').Locator} The player's view of the equipment's sheet. */
   const itemSheet = await openSheetByUuid(player, equipmentUuid);
   await expect(itemSheet.locator('.tab-list').getByText('Checks', { exact: true }), 'the item tab button is enabled')
      .toBeEnabled();
   await clickSheetTab(itemSheet, 'Checks');
});

test('the roll button of an item sheet shows only when the player owns the item\'s actor', async () => {
   /** @type {string} The selector of the sidebar check's roll button. */
   const rollButton = '.sidebar-check .header .roll button';
   /** @type {string} The selector of the sidebar check's static info line. */
   const infoLine = '.sidebar-check .header .info';

   // OWNER: the roll button renders and the static info line is gone.
   await giveLevel('OWNER');

   /** @type {import('@playwright/test').Locator} The owner's view of the equipment's sheet. */
   const ownedSheet = await openSheetByUuid(player, equipmentUuid);
   await expect(ownedSheet.locator(rollButton).first(), 'the owner sees the roll button').toBeVisible();
   await expect(ownedSheet.locator(infoLine).first(), 'the owner sees no info line').toHaveCount(0);

   // OBSERVER, on the same item: the info line shows first, then the button is absent from the same surface.
   await closeAllApps(player);
   await giveLevel('OBSERVER');

   /** @type {import('@playwright/test').Locator} The observer's view of the equipment's sheet. */
   const observedSheet = await openSheetByUuid(player, equipmentUuid);
   await expect(observedSheet.locator(infoLine).first(), 'the observer sees the static info line').toBeVisible();
   await expect(observedSheet.locator(rollButton), 'the observer sees no roll button').toHaveCount(0);
});

test('the roll button of an open item sheet follows the player\'s ownership of the item\'s actor', async () => {
   /** @type {string} The selector of the sidebar check's roll button. */
   const rollButton = '.sidebar-check .header .roll button';
   /** @type {string} The selector of the sidebar check's static info line. */
   const infoLine = '.sidebar-check .header .info';
   await giveLevel('OBSERVER');

   /** @type {import('@playwright/test').Locator} The observer's view of the equipment's sheet. */
   const sheet = await openSheetByUuid(player, equipmentUuid);
   await expect(sheet.locator(infoLine).first(), 'an observer sees the static info line').toBeVisible();
   await expect(sheet.locator(rollButton), 'an observer sees no roll button').toHaveCount(0);
   await giveLevel('OWNER');
   await expect(sheet.locator(rollButton).first(), 'the open sheet shows the roll button once the player owns it')
      .toBeVisible();
   await expect(sheet.locator(infoLine), 'the info line is gone').toHaveCount(0);
   await giveLevel('OBSERVER');
   await expect(sheet.locator(infoLine).first(), 'the open sheet shows the info line again').toBeVisible();
   await expect(sheet.locator(rollButton), 'the roll button is gone').toHaveCount(0);
});

test('the Edit Token button of an open character sheet follows the player\'s ownership', async () => {
   /** @type {object} The world's permission settings before the test. */
   const original = await gm.evaluate(() => game.settings.get('core', 'permissions'));
   try {
      // A player has no Configure Token permission by default; the setting is changed through the settings API.
      await gm.evaluate(async () => {
         /** @type {object} The permission settings with the player role allowed to configure tokens. */
         const permissions = foundry.utils.deepClone(game.settings.get('core', 'permissions'));
         permissions.TOKEN_CONFIGURE = [
            CONST.USER_ROLES.PLAYER,
            CONST.USER_ROLES.TRUSTED,
            CONST.USER_ROLES.ASSISTANT,
            CONST.USER_ROLES.GAMEMASTER,
         ];
         await game.settings.set('core', 'permissions', permissions);
      });
      await player.waitForFunction(() => game.user.can('TOKEN_CONFIGURE'), undefined, { timeout: 1000 });
      await giveLevel('OBSERVER');

      /** @type {import('@playwright/test').Locator} The observer's view of the character sheet. */
      const sheet = await openSheetByUuid(player, actorUuid);

      /** @type {import('@playwright/test').Locator} The sheet's Edit Token button. */
      const button = sheet.locator('.window-header .edit-token-button');
      await expect(button, 'an observer has no Edit Token button').toHaveCount(0);
      await giveLevel('OWNER');
      await expect(button, 'the open sheet shows the button once the player owns the character').toHaveCount(1);
      await giveLevel('OBSERVER');
      await expect(button, 'the open sheet hides the button again').toHaveCount(0);
   }
   finally {
      await gm.evaluate((permissions) => game.settings.set('core', 'permissions', permissions), original);
   }
});

test('the Edit Token button of an open character sheet follows the Configure Token permission', async () => {
   /** @type {object} The world's permission settings before the test. */
   const original = await gm.evaluate(() => game.settings.get('core', 'permissions'));
   try {
      await giveLevel('OWNER');

      /** @type {import('@playwright/test').Locator} The owner's view of the character sheet. */
      const sheet = await openSheetByUuid(player, actorUuid);

      /** @type {import('@playwright/test').Locator} The sheet's Edit Token button. */
      const button = sheet.locator('.window-header .edit-token-button');
      await expect(button, 'a player has no Configure Token permission by default').toHaveCount(0);
      await gm.evaluate(async () => {
         /** @type {object} The permission settings with the player role allowed to configure tokens. */
         const permissions = foundry.utils.deepClone(game.settings.get('core', 'permissions'));
         permissions.TOKEN_CONFIGURE = [
            CONST.USER_ROLES.PLAYER,
            CONST.USER_ROLES.TRUSTED,
            CONST.USER_ROLES.ASSISTANT,
            CONST.USER_ROLES.GAMEMASTER,
         ];
         await game.settings.set('core', 'permissions', permissions);
      });
      await expect(button, 'the open sheet shows the button once players may configure tokens').toHaveCount(1);
      await gm.evaluate((permissions) => game.settings.set('core', 'permissions', permissions), original);
      await expect(button, 'the open sheet hides the button again').toHaveCount(0);
   }
   finally {
      await gm.evaluate((permissions) => game.settings.set('core', 'permissions', permissions), original);
   }
});

test('an open compendium item sheet follows the compendium permission the GM sets for players', async () => {
   /** @type {{collection: string, id: string, ownership: object, locked: boolean}} The first item pack's entry. */
   const pack = await gm.evaluate(() => {
      /** @type {CompendiumCollection} The first item pack with an entry. */
      const found = game.packs.find((candidate) => candidate.documentName === 'Item' && candidate.index.size > 0);
      return {
         collection: found.collection,
         id: found.index.contents[0]._id,
         ownership: foundry.utils.deepClone(found.ownership),
         locked: found.locked,
      };
   });

   /**
    * Sets the pack's configuration through the settings API.
    * @param {object} configuration - The configuration keys to set.
    * @returns {Promise<void>} Resolves once the GM's client holds the setting.
    */
   const configure = (configuration) => gm.evaluate(
      ({ collection, configuration }) => game.packs.get(collection).configure(configuration),
      {
         collection: pack.collection,
         configuration,
      },
   );
   try {
      // An unlocked pack: a locked pack's sheets stay read-only whatever the permission.
      await configure({ locked: false });

      /** @type {import('@playwright/test').Locator} The player's view of the pack item's sheet. */
      const sheet = await openSheetByUuid(player, `Compendium.${pack.collection}.Item.${pack.id}`);

      /** @type {import('@playwright/test').Locator} The sheet's inputs. */
      const inputs = sheet.locator('input');
      expect(await inputs.count(), 'the sheet has inputs').toBeGreaterThan(0);
      await expect(inputs.first(), 'a player who only observes the pack cannot edit').toBeDisabled();
      await configure({
         ownership: {
            ...pack.ownership,
            PLAYER: 'OWNER',
         },
      });
      await expect(inputs.first(), 'the open sheet turns editable once players own the pack').toBeEnabled();
      await configure({ ownership: pack.ownership });
      await expect(inputs.first(), 'the open sheet turns read-only again').toBeDisabled();
   }
   finally {
      await configure({
         locked: pack.locked,
         ownership: pack.ownership,
      });
   }
});

test('an open compendium item sheet follows the first configuration of the compendium setting', async () => {
   /** @type {object} The world's compendium configuration before the test. */
   const original = await gm.evaluate(
      () => foundry.utils.deepClone(game.settings.get('core', 'compendiumConfiguration')),
   );

   /** @type {{collection: string, id: string}} The first item pack and its first entry. */
   const pack = await gm.evaluate(() => {
      /** @type {CompendiumCollection} The first item pack with an entry. */
      const found = game.packs.find((candidate) => candidate.documentName === 'Item' && candidate.index.size > 0);
      return {
         collection: found.collection,
         id: found.index.contents[0]._id,
      };
   });
   try {
      // The Setting document is removed, so that setting the configuration creates it, as the first configuration of a
      // world does (client/helpers/client-settings.mjs, #setWorld).
      await gm.evaluate(async () => {
         await game.settings.storage.get('world').getSetting('core.compendiumConfiguration').delete();
      });

      /** @type {import('@playwright/test').Locator} The player's view of the pack item's sheet. */
      const sheet = await openSheetByUuid(player, `Compendium.${pack.collection}.Item.${pack.id}`);

      /** @type {import('@playwright/test').Locator} The sheet's inputs. */
      const inputs = sheet.locator('input');
      expect(await inputs.count(), 'the sheet has inputs').toBeGreaterThan(0);
      await expect(inputs.first(), 'a player cannot edit the pack by default').toBeDisabled();
      await gm.evaluate(async ({ collection, original }) => {
         /** @type {object} The configuration with the pack unlocked and owned by players. */
         const configuration = foundry.utils.deepClone(original);
         configuration[collection] = {
            ...configuration[collection],
            locked: false,
            ownership: {
               ...configuration[collection]?.ownership,
               PLAYER: 'OWNER',
            },
         };
         await game.settings.set('core', 'compendiumConfiguration', configuration);
      }, {
         collection: pack.collection,
         original,
      });
      await expect(inputs.first(), 'the open sheet turns editable when the setting is created').toBeEnabled();
   }
   finally {
      await gm.evaluate(
         (configuration) => game.settings.set('core', 'compendiumConfiguration', configuration),
         original,
      );
   }
});

test('an item sheet that is open when the player loses ownership turns read-only, and editable again on regaining it',
   async () => {
      await giveLevel('OWNER');

      /** @type {import('@playwright/test').Locator} The player's view of the equipment's sheet. */
      const sheet = await openSheetByUuid(player, equipmentUuid);
      await clickSheetTab(sheet, 'Checks');

      /** @type {import('@playwright/test').Locator} The check's label input. */
      const input = sheet.locator('.check .header .label input').first();

      /** @type {import('@playwright/test').Locator} The button that adds a check. */
      const addCheckButton = sheet.getByRole('button', { name: 'Add Check' });
      await expect(input, 'an owner can edit the label').toBeEnabled();
      await expect(addCheckButton, 'an owner can add a check').toBeEnabled();
      await giveLevel('OBSERVER');
      await expect(input, 'the open sheet turns the label read-only').toBeDisabled();
      await expect(addCheckButton, 'the open sheet disables Add Check').toBeDisabled();
      await giveLevel('OWNER');
      await expect(input, 'the label is editable again').toBeEnabled();
      await expect(addCheckButton, 'Add Check works again').toBeEnabled();
   });

test('an open character sheet turns read-only on losing ownership and editable on regaining it', async () => {
   await giveLevel('OWNER');

   /** @type {import('@playwright/test').Locator} The player's view of the character sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);

   /** @type {import('@playwright/test').Locator} The Skills tab's Filter input, which no ownership binding gates. */
   const filter = sheet.locator('.skill-tab .filter input');
   await clickSheetTab(sheet, 'Skills');
   await expect(filter, 'an owner can use the filter').toBeEnabled();

   /** @type {{inputs: number, disabledInputs: number}} The owner's controls. */
   const owned = await readControls(sheet);
   expect(owned.inputs, 'the sheet has inputs').toBeGreaterThan(0);
   expect(owned.disabledInputs, 'an owner has no disabled input').toBe(0);
   await giveLevel('OBSERVER');
   await expect.poll(
      async () => {
         const controls = await readControls(sheet);
         return controls.inputs === owned.inputs && controls.disabledInputs === controls.inputs;
      },
      { message: 'every input of the open sheet is disabled' },
   ).toBe(true);
   await expect(filter, 'core disables the filter of a read-only sheet').toBeDisabled();
   await giveLevel('OWNER');
   await expect.poll(
      async () => (await readControls(sheet)).disabledInputs,
      { message: 'no input of the open sheet stays disabled' },
   ).toBe(0);
   await expect(filter, 'the filter is enabled again').toBeEnabled();
});

test('the Filter input of an open item sheet follows the ownership of the player', async () => {
   await giveLevel('OWNER');

   /** @type {import('@playwright/test').Locator} The player's view of the equipment's sheet. */
   const sheet = await openSheetByUuid(player, equipmentUuid);
   await clickSheetTab(sheet, 'Checks');

   /** @type {import('@playwright/test').Locator} The Checks tab's Filter input, which no ownership binding gates. */
   const filter = sheet.locator('.filter input');
   await expect(filter, 'an owner can use the filter').toBeEnabled();
   await giveLevel('OBSERVER');
   await expect(filter, 'the open sheet disables the filter for a viewer who cannot edit').toBeDisabled();
   await giveLevel('OWNER');
   await expect(filter, 'the filter is enabled again').toBeEnabled();
});

test('an unlinked token\'s actor sheet and item sheet follow the player\'s ownership of the base actor', async () => {
   const token = await ensureToken();
   await giveLevel('OWNER', token.actorId);
   await player.waitForFunction(
      ({ sceneId, tokenId }) => game.scenes.get(sceneId)?.tokens.get(tokenId)?.actor?.isOwner === true,
      token,
      { timeout: 1000 },
   );

   /** @type {import('@playwright/test').Locator} The player's view of the synthetic actor's sheet. */
   const actorSheet = await openSheetByUuid(player, token.tokenActorUuid);

   /** @type {import('@playwright/test').Locator} The player's view of the synthetic actor's equipment sheet. */
   const itemSheet = await openSheetByUuid(player, token.tokenItemUuid);
   await clickSheetTab(itemSheet, 'Checks');

   /** @type {import('@playwright/test').Locator} The equipment check's label input. */
   const label = itemSheet.locator('.check .header .label input').first();

   /** @type {import('@playwright/test').Locator} The synthetic actor's name input. */
   const name = actorSheet.locator('.document-name input');
   expect((await readControls(actorSheet)).inputs, 'the actor sheet has inputs').toBeGreaterThan(0);
   await expect(label, 'an owner can edit the label').toBeEnabled();
   await expect(name, 'an owner can edit the name').toBeEnabled();

   // The player's level of the base actor drops: neither the synthetic actor nor an ancestor of the open documents
   // updates, so the sheets follow only if the base actor's ownership reaches them.
   await giveLevel('OBSERVER', token.actorId);
   await expect(label, 'the open item sheet turns the label read-only').toBeDisabled();
   await expect(name, 'the open actor sheet turns the name read-only').toBeDisabled();
   await giveLevel('OWNER', token.actorId);
   await expect(label, 'the label is editable again').toBeEnabled();
   await expect(name, 'the name is editable again').toBeEnabled();
});

/**
 * Rolls an Attribute Check with one Expertise from a sheet as the GM and returns the card's id; the card's speaker is
 * the sheet's actor.
 * @param {string} uuid - The uuid of the actor whose sheet rolls.
 * @returns {Promise<string>} The new chat message's id.
 */
async function rollExpertiseCheck(uuid) {
   await setClientSetting(gm, 'getCheckOptions', 'always');

   /** @type {import('@playwright/test').Locator} The check dialog. */
   const dialog = await openCheckDialog(gm, 'attribute', uuid);
   await setNumberField(dialog, 'expertiseMod', 1);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, gm);
   await closeAllApps(gm);
   return (await readNewestCheckFlags(gm, baseline, 'attributeCheck')).id;
}

/**
 * Checks that a control of a check card in the player's open chat log follows the player's ownership of the card's
 * speaker. The control shows for an owner of the speaking actor only.
 * @param {string} messageId - The id of the card's chat message.
 * @param {string} baseActorId - The id of the world character the speaker's ownership comes from.
 * @param {Function} findControl - Receives the card's locator and returns (a promise of) the control's locator.
 * @returns {Promise<void>} Resolves once the card has shown the control, hidden it and shown it again.
 */
async function expectCardControlFollowsOwnership(messageId, baseActorId, findControl) {
   await giveLevel('OWNER', baseActorId);
   await showChatLog(player);

   /** @type {import('@playwright/test').Locator} The card in the player's chat log. */
   const card = player.locator(`#chat .chat-log li[data-message-id="${messageId}"]`);
   await expect(card, 'the player has the card').toBeVisible();

   /** @type {import('@playwright/test').Locator} The card's control. */
   const control = await findControl(card);
   await expect(control, 'an owner of the speaker sees the control').toHaveCount(1);
   await giveLevel('OBSERVER', baseActorId);
   await expect(control, 'the open card hides the control once the player no longer owns the speaker').toHaveCount(0);
   await giveLevel('OWNER', baseActorId);
   await expect(control, 'the open card shows the control again').toHaveCount(1);
}

/**
 * Finds the Reset Expertise button of a check card.
 * @param {import('@playwright/test').Locator} card - The card in the player's chat log.
 * @returns {Promise<import('@playwright/test').Locator>} The button's locator.
 */
async function findResetButton(card) {
   /** @type {string} The localized label of the Reset Expertise button. */
   const resetLabel = await player.evaluate(() => game.i18n.localize('LOCAL.resetExpertise.text'));
   return card.getByRole('button', { name: resetLabel });
}

test('the Reset Expertise button of an open check card follows the player\'s ownership of the speaking character',
   async () => {
      await expectCardControlFollowsOwnership(await rollExpertiseCheck(actorUuid), actorId, findResetButton);
   });

test('the Reset Expertise button of an open check card follows the player\'s ownership of a token\'s base actor',
   async () => {
      const token = await ensureToken();
      await expectCardControlFollowsOwnership(
         await rollExpertiseCheck(token.tokenActorUuid),
         token.actorId,
         findResetButton,
      );
   });

test('a focused label input that turns read-only shows the label another client sets after ownership returns',
   async () => {
      await giveLevel('OWNER');

      /** @type {import('@playwright/test').Locator} The player's view of the equipment's sheet. */
      const sheet = await openSheetByUuid(player, equipmentUuid);
      await clickSheetTab(sheet, 'Checks');

      /** @type {import('@playwright/test').Locator} The check's label input on the player's sheet. */
      const input = sheet.locator('.check .header .label input').first();
      await input.focus();
      await expect(input, 'the input has focus').toBeFocused();
      await giveLevel('OBSERVER');
      await expect(input, 'the open sheet turns the label read-only').toBeDisabled();
      await giveLevel('OWNER');
      await expect(input, 'the label is editable again').toBeEnabled();

      // The GM sets the label through the GM's own sheet; the player's input is not focused and must show it.
      /** @type {import('@playwright/test').Locator} The GM's view of the equipment's sheet. */
      const gmSheet = await openSheetByUuid(gm, equipmentUuid);
      await clickSheetTab(gmSheet, 'Checks');
      await commitText(gmSheet.locator('.check .header .label input').first(), 'E2E Remote Label');
      await expect.poll(
         async () => (await readServerSystem(gm, equipmentUuid)).check[0].label,
         { message: 'the server stores the GM\'s label' },
      ).toBe('E2E Remote Label');
      await expect(input, 'the input shows the GM\'s label').toHaveValue('E2E Remote Label');
   });

test('the scaling aspects of an open casting card follow the ownership of the player over the speaking character',
   async () => {
      /** @type {string} The uuid of a new spell of the character. */
      const spellUuid = `${actorUuid}.Item.${await createOwnedItem(gm, actorId, 'spell', 'E2E Ownership Spell')}`;
      await addCustomAspect(gm, spellUuid);

      /** @type {import('@playwright/test').Locator} The custom aspect's row on the spell's sheet. */
      const row = (await openSheetByUuid(gm, spellUuid)).locator('li.reorder-row').first();
      if (await row.locator('.expandable-content').count() === 0) {
         await row.getByRole('button', { name: 'Expand' }).click();
      }

      /**
       * Finds a labelled field of the aspect row.
       * @param {string} text - The field's label.
       * @returns {import('@playwright/test').Locator} The field's element.
       */
      const field = (text) => row.locator('.field').filter({ has: gm.getByText(text, { exact: true }) }).first();
      await settle(gm, { transitions: true });
      await field('Damage').locator('button').click();
      await commitText(field('Initial Value').locator('input'), '2');
      await expect.poll(
         async () => (await readServerSystem(gm, spellUuid)).customAspect[0].scaling,
         { message: 'the row stored a scaling aspect' },
      ).toBe(true);

      // Three forced successes against a complexity of one bank extra successes, which a scaling aspect spends: the
      // card then offers the aspect to an owner of the speaker.
      await setClientSetting(gm, 'getCheckOptions', 'always');
      await forceDice(gm, [
         6,
         6,
         6,
      ]);

      /** @type {import('@playwright/test').Locator} The casting check dialog. */
      const dialog = await openCheckDialog(gm, 'casting', spellUuid);
      await expect(dialog.getByTestId('check-field-damageMod'), 'the damaging spell offers the Damage Mod field')
         .toHaveCount(1);

      // Two more dice than the character's Mind gives, so that all three forced sixes are rolled.
      await setNumberField(dialog, 'diceMod', 2);

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, gm);

      /** @type {string} The id of the casting card. */
      const messageId = (await readNewestCheckFlags(gm, baseline, 'castingCheck')).id;
      await resetDice(gm);
      await closeAllApps(gm);
      await expectCardControlFollowsOwnership(messageId, actorId, (card) => card.locator('.aspect').first());
   });
