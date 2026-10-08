import { expect, flushPageErrors, test } from './harness.js';
import { login } from './fixtures.js';
import {
   addCombatant,
   addEffect,
   addRulesElement,
   applyCondition,
   createActor,
   createCombat,
   createOwnedItem,
   createScene,
   endCombat,
   nextTurn,
   placeToken,
   previousTurn,
   rollInitiative,
   setOwnership,
   setResource,
   startCombat,
   viewScene,
} from './flows.js';
import { forceDice, resetDice } from './dice.js';
import { setClientSetting, setWorldSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps, reloadWorld, showChatLog } from './world.js';

/**
 * The turns of a combat, run through the Combat Tracker as a GM runs them, with three clients connected: E2E GM 1 runs
 * the combat, E2E GM 2 is a second GM and E2E Player 1 owns the characters whose turns are watched. Persistent damage,
 * fast healing and resolve regain applied by the best owner (the first active GM) replicate to the other clients and
 * are reverted by the previous turn; a turn advanced by the second GM applies once; the sheet of the character whose
 * turn starts opens on the GM's and the player's clients according to their settings; the turn reports post and
 * render; and no combat code path logs the deprecated `getCombatantByActor` warning (CLOSED_BUGS #108).
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who runs the combat. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E GM 2, who is not the best owner. */
let gm2;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who owns the characters. */
let player;
/** @type {string[]} Uncaught page errors collected on the first GM's page during the current test. */
let errors;
/** @type {string[]} The console warnings of any client that name the deprecated `getCombatantByActor`. */
const deprecations = [];
/** @type {string} The id of the scene the combats belong to. */
let sceneId;
/** @type {Record<string, {id: string, name: string, uuid: string, tokenId: string}>} The session's characters. */
const cast = {};

/** @type {string} The text of the core deprecation warning of `Combat#getCombatantByActor`. */
const DEPRECATION = 'getCombatantByActor';

/**
 * Records the console warnings of a page that name the deprecated core call.
 * @param {import('@playwright/test').Page} page - The page to listen on, before it navigates.
 * @param {string} user - The user the page is for, named in the record.
 * @returns {void}
 */
function listenForDeprecation(page, user) {
   page.on('console', (message) => {
      if (message.text().includes(DEPRECATION)) {
         deprecations.push(`${user}: ${message.text()}`);
      }
   });
}

/**
 * Opens a client as a user in its own browser context, with the deprecation listener attached before the page boots.
 * @param {import('@playwright/test').Browser} browser - The Playwright browser.
 * @param {string} user - The Foundry user's display name.
 * @returns {Promise<import('@playwright/test').Page>} The logged-in page.
 */
async function openClient(browser, user) {
   /** @type {import('@playwright/test').Page} The client's page, in a context of its own. */
   const page = await (await browser.newContext()).newPage();
   listenForDeprecation(page, user);
   await login(page, user);
   return page;
}

/**
 * Makes a character, gives it abilities and a token on the session's scene, and gives the player ownership of it.
 * @param {string} role - The role in the session; it names the character and keys `cast`.
 * @param {object[]} abilities - The abilities to give it, each `{ name, elements }` where `elements` are the rules
 * elements `addRulesElement` takes.
 * @param {boolean} owned - Whether E2E Player 1 owns the character.
 * @returns {Promise<void>} Resolves once the character is in `cast`.
 */
async function makeCharacter(role, abilities, owned) {
   /** @type {string} The character's id. */
   const id = await createActor(gm, {
      name: `E2E Turns ${role}`,
      type: 'player',
   });
   for (const { name, elements } of abilities) {
      /** @type {string} The ability's uuid. */
      const uuid = `Actor.${id}.Item.${await createOwnedItem(gm, id, 'ability', name)}`;
      for (const element of elements) {
         await addRulesElement(gm, uuid, element);
      }
   }
   if (owned) {
      await setOwnership(gm, id, 'E2E Player 1', 'OWNER');
   }
   cast[role] = {
      id,
      name: `E2E Turns ${role}`,
      uuid: `Actor.${id}`,
      tokenId: await placeToken(gm, id),
   };
}

/**
 * Starts an encounter of the session scene with the Combat Tracker: a combat, the subject and the plain character as
 * combatants, initiative rolled with forced dice so the plain character goes first and the subject second, and the
 * combat begun. The next turn button then starts the subject's turn.
 * @param {string} subject - The role of the character whose turn is watched.
 * @returns {Promise<string>} The combat's id.
 */
async function startEncounter(subject) {
   /** @type {string} The id of the combat the tracker's create button made. */
   const combatId = await createCombat(gm);
   await addCombatant(gm, cast[subject].tokenId);
   await addCombatant(gm, cast.plain.tokenId);

   // The subject rolls first: 1 and 1; the plain character second: 6 and 6.
   await forceDice(gm, [
      1,
      1,
      6,
      6,
   ]);
   await rollInitiative(gm);
   await resetDice(gm);
   await startCombat(gm);

   // The tracker made a combat whose combatants resolve to characters, and which has more than one turn.
   expect(await gm.evaluate(() => ({
      characters: game.combat.getCharacterCombatants().length,
      turns: game.combat.turns.length,
   })), 'both combatants resolve to characters and make turns').toEqual({
      characters: 2,
      turns: 2,
   });
   expect(await gm.evaluate(() => game.combat.combatant.name), 'the plain character acts first')
      .toBe(cast.plain.name);
   return combatId;
}

/**
 * Reads the current value of a resource on a client.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} role - The character's role.
 * @param {string} resource - The resource (`stamina`, `resolve`).
 * @returns {Promise<number>} The resource's current value.
 */
function readResource(page, role, resource) {
   return page.evaluate(
      ({ id, resource }) => game.actors.get(id).system.resource[resource].value,
      {
         id: cast[role].id,
         resource,
      },
   );
}

/**
 * Waits until a client reads a resource of a character with the given value.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} role - The character's role.
 * @param {string} resource - The resource (`stamina`, `resolve`).
 * @param {number} value - The value to wait for.
 * @returns {Promise<void>} Resolves once the client reads the value.
 */
async function expectResource(page, role, resource, value) {
   await page.waitForFunction(
      ({ id, resource, value }) => game.actors.get(id)?.system.resource[resource].value === value,
      {
         id: cast[role].id,
         resource,
         value,
      },
      { timeout: 1000 },
   );
}

/**
 * Reads the type of each chat message created after a baseline, in order.
 * @param {number} baseline - The number of messages before the action.
 * @returns {Promise<string[]>} The types of the messages created since.
 */
function messageTypesSince(baseline) {
   return gm.evaluate((baseline) => game.messages.contents.slice(baseline).map((message) => message.type), baseline);
}

/**
 * Waits for a report of a type among the chat messages created after a baseline, then checks its card: mounted in the
 * chat log, visible and with text.
 * @param {number} baseline - The number of messages before the action.
 * @param {string} type - The report subtype.
 * @returns {Promise<string>} The report message's id.
 */
async function expectReport(baseline, type) {
   await expect.poll(() => messageTypesSince(baseline), { message: `a ${type} was posted` }).toContain(type);

   /** @type {string} The report's id. */
   const id = await gm.evaluate(
      ({ baseline, type }) => game.messages.contents.slice(baseline).find((message) => message.type === type).id,
      {
         baseline,
         type,
      },
   );

   // The tracker flows left the Combat tab open; the chat log is the tab that shows the card.
   await showChatLog(gm);

   /** @type {import('@playwright/test').Locator} The report's mounted card in the chat log. */
   const card = gm.locator(`#chat .message[data-message-id="${id}"] .report`).first();
   await expect(card, `the ${type} card is visible`).toBeVisible();
   await expect.poll(
      () => card.textContent().then((text) => (text ?? '').trim().length),
      { message: `the ${type} card has text` },
   ).toBeGreaterThan(0);
   return id;
}

/**
 * Counts the turn starts that have run to completion on a client, by wrapping the method that runs them. The wrapper
 * calls the real method and notes the character once it returns, so the count is the edge after which a character's
 * sheet has been opened or not: the sheet is opened at the start of the method, before its awaits.
 * @param {import('@playwright/test').Page} page - The client.
 * @returns {Promise<void>} Resolves once the method is wrapped.
 */
async function watchTurnStarts(page) {
   await page.evaluate(() => {
      /** @type {object} The prototype that defines the method. */
      let owner = Object.getPrototypeOf(game.actors.find((actor) => actor.system.isCharacter).system);
      while (!Object.hasOwn(owner, 'onTurnStart')) {
         owner = Object.getPrototypeOf(owner);
      }

      /** @type {Function} The real method. */
      const original = owner.onTurnStart;
      globalThis.__turnStartsDone = [];
      owner.onTurnStart = async function onTurnStart(...args) {
         try {
            return await original.apply(this, args);
         }
         finally {
            globalThis.__turnStartsDone.push(this.parent.id);
         }
      };
      globalThis.__unwatchTurnStarts = () => {
         owner.onTurnStart = original;
      };
   });
}

/**
 * Removes the wrapper `watchTurnStarts` installed.
 * @param {import('@playwright/test').Page} page - The client.
 * @returns {Promise<void>} Resolves once the real method is back.
 */
async function unwatchTurnStarts(page) {
   await page.evaluate(() => {
      globalThis.__unwatchTurnStarts?.();
      delete globalThis.__unwatchTurnStarts;
      delete globalThis.__turnStartsDone;
   });
}

/**
 * Waits until a character's turn start has completed on a client a number of times, so a sheet that was going to open
 * has been asked to.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} role - The character's role.
 * @param {number} [times] - How many completed turn starts of the character to wait for (1 by default).
 * @returns {Promise<void>} Resolves once the turn starts have completed.
 */
async function expectTurnStartDone(page, role, times = 1) {
   await page.waitForFunction(
      ({ id, times }) => globalThis.__turnStartsDone.filter((done) => done === id).length >= times,
      {
         id: cast[role].id,
         times,
      },
      { timeout: 1000 },
   );
}

/**
 * Reads whether a character's sheet is open on a client.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} role - The character's role.
 * @returns {Promise<boolean>} True when the sheet is rendered.
 */
function sheetOpen(page, role) {
   return page.evaluate((id) => game.actors.get(id).sheet.rendered === true, cast[role].id);
}

/**
 * Waits until a character's sheet reports rendered on a client. The turn start does not await the render of the
 * sheet it opens, so a single read after the turn start can precede it.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} role - The character's role.
 * @param {string} message - What the assertion states.
 * @returns {Promise<void>} Resolves once the sheet is rendered.
 */
async function expectSheetOpen(page, role, message) {
   await expect.poll(() => sheetOpen(page, role), { message }).toBe(true);
}

test.beforeAll(async ({ browser }) => {
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   listenForDeprecation(gm, 'E2E GM 1');
   await login(gm);
   await clearChat(gm);

   // The session's scene, made before the other clients join: with none viewed, creating it draws the canvas, which
   // is done while only this client is connected.
   sceneId = await createScene(gm, { name: 'E2E Turns Scene' });
   gm2 = await openClient(browser, 'E2E GM 2');
   player = await openClient(browser, 'E2E Player 1');
   await showChatLog(gm);

   // The scene is viewed by both GMs, so a combat made on it is the active combat of both clients.
   await viewScene(gm, sceneId);
   await viewScene(gm2, sceneId);

   // The characters. The abilities carry the turn effects; the player owns the ones whose turns are watched.
   await makeCharacter('plain', [], false);
   await makeCharacter('damage', [
      {
         name: 'E2E Turns Persistent Damage',
         elements: [
            {
               operation: 'persistentDamage',
               selector: 'turnStart',
               value: 1,
            },
         ],
      },
   ], true);
   await makeCharacter('healer', [
      {
         name: 'E2E Turns Fast Healing Start',
         elements: [
            {
               operation: 'fastHealing',
               selector: 'turnStart',
               value: 2,
            },
         ],
      },
      {
         name: 'E2E Turns Fast Healing End',
         elements: [
            {
               operation: 'fastHealing',
               selector: 'turnEnd',
               value: 2,
            },
         ],
      },
   ], true);
   await makeCharacter('regain', [
      {
         name: 'E2E Turns Resolve Regain',
         elements: [
            {
               operation: 'flatModifier',
               selector: 'mod',
               key: 'resolveRegain',
               value: 1,
            },
         ],
      },
   ], true);
   await makeCharacter('conditioned', [], false);
   await makeCharacter('timed', [], false);
   await applyCondition(gm, cast.conditioned.tokenId, 'blinded');
   await closeAllApps(gm);
});

test.afterEach(async () => {
   // A test that failed before its own endCombat would leave a started combat, which is the viewed combat of every
   // later spec (it has no scene).
   if (await gm.evaluate(() => game.combat?.started === true)) {
      await endCombat(gm);
   }
   await resetDice(gm);
   await closeAllApps(gm);
   await closeAllApps(player);
   await closeAllApps(gm2);
   expect(deprecations, `the deprecated ${DEPRECATION} was called:\n${deprecations.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   // Each second client delivers its errors before its context closes: a closed page cannot be flushed.
   for (const client of [
      gm2,
      player,
   ]) {
      await flushPageErrors(client);
      await client.context().close();
   }
   await gm?.close();
});

test.describe('turn effects replicate between clients', () => {
   test('persistent damage applied by the GM replicates to the player client', async () => {
      await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');
      await startEncounter('damage');

      /** @type {number} Stamina before the damage. */
      const before = await readResource(gm, 'damage', 'stamina');
      await nextTurn(gm);
      await expectResource(player, 'damage', 'stamina', before - 1);

      // Exactly once: the value is the one damage lower, not two.
      expect(await readResource(player, 'damage', 'stamina')).toBe(before - 1);
      await endCombat(gm);
   });

   test('fast healing applied by the GM replicates to the player client', async () => {
      await setWorldSetting(gm, 'autoApplyFastHealing', 'enabled');

      // Stamina starts at 1 so a heal of 2 is observable (a heal stops at the maximum).
      await setResource(gm, cast.healer.uuid, 'stamina', 1);
      await expectResource(player, 'healer', 'stamina', 1);
      await startEncounter('healer');
      await nextTurn(gm);
      await expectResource(player, 'healer', 'stamina', 3);
      await endCombat(gm);
   });

   test('resolve regain applied by the GM replicates to the player client', async () => {
      await setWorldSetting(gm, 'autoRegainResolve', 'enabled');

      // Resolve starts at 0 so the regain is observable (a regain raises only a resource below its maximum).
      await setResource(gm, cast.regain.uuid, 'resolve', 0);
      await expectResource(player, 'regain', 'resolve', 0);
      await startEncounter('regain');
      await nextTurn(gm);

      // The regain is the base regain of 1 plus the ability's 1, and stops at the maximum of 1.
      await expectResource(player, 'regain', 'resolve', 1);
      await endCombat(gm);
   });

   test('the previous turn reverts the applied effect and replicates to the player client', async () => {
      await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');
      await setWorldSetting(gm, 'autoRevertPersistentDamage', 'enabled');
      await startEncounter('damage');

      /** @type {number} Stamina before the damage. */
      const before = await readResource(gm, 'damage', 'stamina');
      await nextTurn(gm);
      await expectResource(player, 'damage', 'stamina', before - 1);
      await previousTurn(gm);
      await expectResource(player, 'damage', 'stamina', before);
      await endCombat(gm);
   });

   test('a GM who is not the best owner advancing the turn triggers exactly one apply by the best owner', async () => {
      await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');

      // GM 1 is the first active GM, so the best owner and the only client that applies.
      expect(
         await gm.evaluate(() => game.users.filter((user) => user.active && user.isGM)[0].id === game.user.id),
         'GM 1 is the first active GM',
      ).toBe(true);
      await startEncounter('damage');

      /** @type {number} Stamina before the damage. */
      const before = await readResource(gm, 'damage', 'stamina');

      // GM 2 presses Next Turn once the combat has reached its tracker.
      await expect.poll(() => gm2.evaluate(() => game.combat?.started), { message: 'GM 2 sees the started combat' })
         .toBe(true);
      await nextTurn(gm2);
      await expectResource(gm2, 'damage', 'stamina', before - 1);

      // The first GM reads the same value: the damage did not apply twice.
      expect(await readResource(gm, 'damage', 'stamina')).toBe(before - 1);
      await endCombat(gm);
   });
});

test.describe('the sheet of the character whose turn starts', () => {
   test.beforeEach(async () => {
      await watchTurnStarts(gm);
      await watchTurnStarts(player);
   });

   test.afterEach(async () => {
      await unwatchTurnStarts(gm);
      await unwatchTurnStarts(player);
   });

   test('GM "all": the current actor sheet opens on the GM client at turn start', async () => {
      await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'all');
      await startEncounter('healer');
      expect(await sheetOpen(gm, 'healer'), 'the sheet is closed before the turn').toBe(false);
      await nextTurn(gm);
      await expectTurnStartDone(gm, 'healer');
      await expectSheetOpen(gm, 'healer', 'the sheet opened');
      await endCombat(gm);
   });

   test('GM "disabled": no sheet opens on the GM client at turn start', async () => {
      // With "all" the character's sheet opens at its turn start, so the closed sheet under "disabled" is the setting's
      // doing: the same character's next turn comes after the plain character's.
      await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'all');
      await startEncounter('healer');
      await nextTurn(gm);
      await expectTurnStartDone(gm, 'healer');
      await expectSheetOpen(gm, 'healer', 'the sheet opened under "all"');
      await closeAllApps(gm);
      await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'disabled');
      await nextTurn(gm);
      await nextTurn(gm);
      await expectTurnStartDone(gm, 'healer', 2);
      expect(await sheetOpen(gm, 'healer'), 'the sheet stayed closed under "disabled"').toBe(false);
      await endCombat(gm);
   });

   test('GM "Player owned actors" opens the sheet of an owned character and "Non-Player owned actors" does not',
      async () => {
         await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'pcsOnly');
         await startEncounter('healer');
         await nextTurn(gm);
         await expectTurnStartDone(gm, 'healer');
         await expectSheetOpen(gm, 'healer', 'the sheet of the player-owned character opened');
         await closeAllApps(gm);

         // Under "Non-Player owned actors" the character no player owns gets its sheet opened on its turn, and the
         // player-owned character's sheet stays closed on its next turn.
         await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'npcsOnly');
         await nextTurn(gm);
         await expectTurnStartDone(gm, 'plain');
         await expectSheetOpen(gm, 'plain', 'the character no player owns had its sheet opened');
         await closeAllApps(gm);
         await nextTurn(gm);
         await expectTurnStartDone(gm, 'healer', 2);
         expect(await sheetOpen(gm, 'healer'), 'the sheet of the player-owned character stayed closed').toBe(false);
         await endCombat(gm);
      });

   test('player: the sheet of an owned character opens on the player client at its turn start when the setting is on',
      async () => {
         await setClientSetting(player, 'autoOpenCharacterSheetsPlayer', true);
         await startEncounter('healer');
         expect(await sheetOpen(player, 'healer'), 'the sheet is closed before the turn').toBe(false);
         await nextTurn(gm);
         await expectTurnStartDone(player, 'healer');
         await expectSheetOpen(player, 'healer', 'the sheet opened');
         await endCombat(gm);
      });

   test('player: the sheet stays closed at the turn start when the setting is off', async () => {
      // With the setting on the sheet opens at the character's turn start, so the closed sheet with it off is the
      // setting's doing.
      await setClientSetting(player, 'autoOpenCharacterSheetsPlayer', true);
      await startEncounter('healer');
      await nextTurn(gm);
      await expectTurnStartDone(player, 'healer');
      await expectSheetOpen(player, 'healer', 'the sheet opened with the setting on');
      await closeAllApps(player);
      await setClientSetting(player, 'autoOpenCharacterSheetsPlayer', false);
      await nextTurn(gm);
      await nextTurn(gm);
      await expectTurnStartDone(player, 'healer', 2);
      expect(await sheetOpen(player, 'healer'), 'the sheet stayed closed with the setting off').toBe(false);
      await endCombat(gm);
      await setClientSetting(player, 'autoOpenCharacterSheetsPlayer', true);
   });
});

test.describe('turn reports', () => {
   test.beforeEach(async () => {
      // Turn reports list effects and conditions; nothing expires away mid-test, and a fast healing report offers an
      // apply button instead of healing.
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'disabled');
      await setWorldSetting(gm, 'autoApplyFastHealing', 'showButton');
   });

   test('the start of a turn posts a turnStartReport card', async () => {
      // Stamina below its maximum so the fast healing report branch fires.
      await setResource(gm, cast.healer.uuid, 'stamina', 0);
      await startEncounter('healer');

      /** @type {number} The number of messages before the turn. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      await expectReport(baseline, 'turnStartReport');
      await endCombat(gm);
   });

   test('the end of a turn posts a turnEndReport card', async () => {
      await setResource(gm, cast.healer.uuid, 'stamina', 0);
      await startEncounter('healer');
      await nextTurn(gm);

      /** @type {number} The number of messages before the healer's turn ends. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      await expectReport(baseline, 'turnEndReport');
      await endCombat(gm);
   });

   test('going back from a turn posts a NON-EMPTY turnStartRevertReport card', async () => {
      await startEncounter('healer');
      await nextTurn(gm);

      /** @type {number} The number of messages before the healer's turn start is reverted. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await previousTurn(gm);
      await expectReport(baseline, 'turnStartRevertReport');
      await endCombat(gm);
   });

   test('going back to a turn posts a NON-EMPTY turnEndRevertReport card', async () => {
      await startEncounter('healer');
      await nextTurn(gm);
      await nextTurn(gm);

      /** @type {number} The number of messages before the healer's turn end is reverted. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await previousTurn(gm);
      await expectReport(baseline, 'turnEndRevertReport');
      await endCombat(gm);
   });

   test('clicking apply heals the actor and partial-merges fastHealing (total survives)', async () => {
      await setResource(gm, cast.healer.uuid, 'stamina', 0);
      await startEncounter('healer');

      /** @type {number} The number of messages before the turn. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);

      /** @type {string} The turn start report's id. */
      const id = await expectReport(baseline, 'turnStartReport');
      expect(await gm.evaluate((id) => game.messages.get(id).system.fastHealing.total, id), 'the report offers 2')
         .toBe(2);
      expect(await gm.evaluate((id) => game.messages.get(id).system.fastHealing.confirmed, id), 'it is unconfirmed')
         .not.toBe(true);

      // The fast healing apply button is the only button on this card; its label carries the amount.
      /** @type {import('@playwright/test').Locator} The report's card. */
      const card = gm.locator(`#chat .message[data-message-id="${id}"] .report`).first();
      /** @type {import('@playwright/test').Locator} The button that applies the healing. */
      const applyButton = card.locator('button').first();
      await expect(applyButton, 'the apply button shows the amount').toContainText('2');
      await applyButton.click();
      await expectResource(gm, 'healer', 'stamina', 2);

      // The handler updates the actor first and the message second, so the message state is polled too.
      await expect.poll(
         () => gm.evaluate((id) => game.messages.get(id).system.fastHealing.confirmed === true, id),
         { message: 'fastHealing.confirmed flipped true after apply' },
      ).toBe(true);
      expect(
         await gm.evaluate((id) => game.messages.get(id).system.fastHealing.total, id),
         'fastHealing.total survived the partial-merge update',
      ).toBe(2);

      // The confirmed card swaps the apply button for the fast healing tag, which carries the themed stamina colors.
      /** @type {import('@playwright/test').Locator} The fast healing tag. */
      const tag = card.locator('.tag.fast-healing');
      await expect(tag, 'the tag replaces the apply button').toBeVisible();

      /** @type {{background: string, color: string, stamina: string, staminaFont: string}} The tag's colors. */
      const colors = await tag.evaluate((element) => {
         /**
          * Resolves a token through a throwaway child so hex values normalize to the computed rgb() form.
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
            stamina: resolve('--titan-stamina-background'),
            staminaFont: resolve('--titan-stamina-font-color'),
         };
      });
      expect(colors.background, 'the tag background is the stamina token').toBe(colors.stamina);
      expect(colors.color, 'the tag text is the stamina font token').toBe(colors.staminaFont);
      await endCombat(gm);
   });

   test('the effects-expired report renders after an initiative effect expires', async () => {
      await setWorldSetting(gm, 'autoDecreaseEffectDuration', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'enabled');

      // The two combatants roll 1 and 1, and 6 and 6, on top of the same initiative rating; an effect with an
      // initiative 7 above the rating lies between them, so the turn from the plain character to the timed one
      // decrements it from 1 to 0.
      /** @type {number} The timed character's initiative rating. */
      const rating = await gm.evaluate((id) => game.actors.get(id).system.rating.initiative.value, cast.timed.id);
      await addEffect(gm, cast.timed.id, 'E2E Expiring Effect', {
         duration: 'initiative',
         initiative: rating + 7,
         remaining: 1,
      });
      await startEncounter('timed');

      /** @type {number} The number of messages before the turn. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      await expectReport(baseline, 'effectsExpiredReport');
      await endCombat(gm);
   });
});

test.describe('conditions and turn effects in a turn start report', () => {
   test.beforeEach(async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'disabled');
   });

   test('a turn-start report stores the description key and its tooltip shows the text, with no effect', async () => {
      await startEncounter('conditioned');

      /** @type {number} The number of messages before the turn. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);

      /** @type {string} The turn start report's id. */
      const id = await expectReport(baseline, 'turnStartReport');

      /** @type {{conditions: object[], expected: string, label: string}} The stored conditions and the text shown. */
      const stored = await gm.evaluate((id) => ({
         conditions: game.messages.get(id).system.toObject().conditions,
         expected: foundry.utils.cleanHTML(game.i18n.localize('LOCAL.blinded.desc.text')),
         label: game.i18n.localize('LOCAL.blinded.text'),
      }), id);
      expect(stored.conditions).toEqual([
         {
            descriptionKey: 'blinded.desc',
            img: expect.any(String),
            label: stored.label,
         },
      ]);

      /** @type {import('@playwright/test').Locator} The report card's Blinded tag. */
      const tag = gm.locator(`#chat .message[data-message-id="${id}"] .report .effects .tag`).first();
      await expect(tag).toContainText(stored.label);

      /**
       * Reads the tooltip content tippy holds for the tag.
       * @returns {Promise<string|undefined>} The tooltip content.
       */
      const tooltip = () => tag.evaluate((element) => element._tippy?.props?.content);
      await expect.poll(tooltip, { message: 'the tag\'s tooltip is the localized text' }).toBe(stored.expected);
      expect(await tooltip()).not.toContain('LOCAL.');
      await endCombat(gm);
   });

   test('a turn-start report tags a turn-start effect with the Turn Start tag and its duration lead', async () => {
      await addEffect(gm, cast.timed.id, 'E2E Turn Start Effect', {
         duration: 'turnStart',
         remaining: 3,
      });
      await startEncounter('timed');

      /** @type {number} The number of messages before the turn. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);

      /** @type {string} The turn start report's id. */
      const id = await expectReport(baseline, 'turnStartReport');
      expect(
         await gm.evaluate((id) => (game.messages.get(id).system.toObject().effects?.turnStart ?? [])
            .map((entry) => entry.label), id),
         'the report lists the turn-start effect',
      ).toEqual(['E2E Turn Start Effect']);

      /** @type {import('@playwright/test').Locator} The report's turn-start effect entry. */
      const entry = gm.locator(`#chat .message[data-message-id="${id}"] .report .effects .effect`, {
         hasText: 'E2E Turn Start Effect',
      });
      await expect(entry.locator('i.fa-hourglass-start')).toHaveCount(1);

      // The Turn Start icon rendered above (the positive edge); the Turn End icon is absent from the same entry.
      await expect(entry.locator('i.fa-hourglass-end')).toHaveCount(0);
      await expect.poll(() => entry.locator('.tag .tag').evaluate((element) => element._tippy?.props?.content))
         .toBe(await gm.evaluate(
            () => foundry.utils.cleanHTML(game.i18n.localize('LOCAL.effect.turnStart.desc.text')),
         ));

      // This combat ends like the others. A new combat is then created and left unstarted for the suite-end teardown to
      // delete: a started combat left behind is the viewed combat of every later spec, and an unstarted one is not
      // read as a running combat (`game.combat?.started`).
      await endCombat(gm);
      await createCombat(gm);
   });
});

// The last test of the file: it reloads the page and leaves its new scene active.
test('with no scene active, a token placed on a new scene is on a fully drawn canvas', async () => {
   // A world boot inside the test exceeds the 60 s default under the throttled runner.
   test.setTimeout(120_000);

   // Precondition, established here: no scene is active and the client boots with a blank canvas. Only a test scene
   // may be deactivated, and Foundry has no control that deactivates a scene, so the flag is cleared directly. The
   // earlier tests apply conditions, whose scrolling text core animates for 2 s on the interface group, so the page
   // reloads first, which ends those animations, and then the scene is deactivated and the page reloads again to boot
   // with a blank canvas (deactivating the viewed scene while the text animates throws in core: OPEN_BUGS #114).
   /** @type {string|null} The name of the scene active at the start, if any. */
   const activeName = await gm.evaluate(() => game.scenes.active?.name ?? null);
   expect(activeName === null || activeName.startsWith('E2E '), `the active scene is a test scene: ${activeName}`)
      .toBe(true);
   await reloadWorld(gm);
   expect(
      await gm.evaluate(() => Reflect.ownKeys(foundry.canvas.animation.CanvasAnimation.animations)
         .some((key) => foundry.canvas.animation.CanvasAnimation.animations[key].context === canvas.interface)),
      'no scrolling text animates on the interface group',
   ).toBe(false);
   await gm.evaluate(async () => {
      await game.scenes.active?.update({ active: false });
   });
   await reloadWorld(gm);
   expect(await gm.evaluate(() => ({
      active: game.scenes.active?.id ?? null,
      viewed: canvas.scene?.id ?? null,
   })), 'no scene is active or drawn').toEqual({
      active: null,
      viewed: null,
   });

   // A scene made in the Scenes tab while none is viewed is drawn at once; the flow waits for the draw, then a token is
   // dropped on it.
   /** @type {string} The new scene's id. */
   const freshId = await createScene(gm, { name: `E2E Turns Fresh Scene ${Date.now()}` });
   /** @type {string} The id of the token placed on it. */
   const tokenId = await placeToken(gm, cast.plain.id);

   // The token sits on the new scene's token layer, and the canvas has finished drawing that scene.
   expect(await gm.evaluate((tokenId) => {
      /** @type {Token} The token's placeable. */
      const token = canvas.scene.tokens.get(tokenId).object;
      return {
         viewed: canvas.scene.id,
         ready: canvas.ready,
         parented: token.parent === canvas.tokens.objects,
      };
   }, tokenId), 'the token is on the token layer of the drawn scene').toEqual({
      viewed: freshId,
      ready: true,
      parented: true,
   });

   // Changing the actor through the Token HUD re-renders the token through its render flags, which read the token layer
   // of a fully drawn scene; the harness gate fails the test on a page error.
   await applyCondition(gm, tokenId, 'deafened');
   expect(await gm.evaluate((id) => game.actors.get(id).statuses.has('deafened'), cast.plain.id))
      .toBe(true);
});
