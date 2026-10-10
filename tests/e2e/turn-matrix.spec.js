import { expect, flushPageErrors, test } from './harness.js';
import {
   DURATION_CUSTOM,
   DURATION_INITIATIVE,
   DURATION_PERMANENT,
   DURATION_TURN_END,
   DURATION_TURN_START,
   DURATION_TYPES,
} from '~/system/DurationTypes.js';
import { login, openSheetByUuid } from './fixtures.js';
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
   openSidebarTab,
   placeToken,
   previousTurn,
   removeCondition,
   restOnToken,
   rollInitiative,
   setOwnership,
   setResource,
   startCombat,
   toggleTokenLink,
   viewScene,
} from './flows.js';
import { forceDice, resetDice } from './dice.js';
import { clickSheetTab } from './actions.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { setWorldSetting } from './settings.js';
import { MODES } from './turnMatrix.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * The turns and rounds of a combat, effect expiry for every duration type and every Auto-remove value, and the turn
 * reports for every report setting variant, all run through the Combat Tracker and read from the chat DOM. The
 * matrices below are the enumeration the unit guard `tests/unit/TurnMatrixCoverage.test.js` checks against the source:
 * every duration type, every turn-produced report type and every turn setting must appear here.
 */

/** @type {import('@playwright/test').Page} E2E GM 1, who runs the combat. */
let gm;
/** @type {import('@playwright/test').Page} E2E GM 2. */
let gm2;
/** @type {import('@playwright/test').Page} E2E Player 1, who owns some characters. */
let player;
/** @type {string[]} Uncaught page errors on the first GM's page. */
let errors;
/** @type {Record<string, {id: string, name: string, uuid: string, tokenId: string}>} The session's characters. */
const cast = {};

/**
 * Opens a client as a user in a context of its own.
 * @param {import('@playwright/test').Browser} browser - The browser.
 * @param {string} user - The Foundry user's name.
 * @returns {Promise<import('@playwright/test').Page>} The logged-in page.
 */
async function openClient(browser, user) {
   /** @type {import('@playwright/test').Page} The page. */
   const page = await (await browser.newContext()).newPage();
   await login(page, user);
   return page;
}

/**
 * Makes a character with abilities carrying rules elements and a token on the scene.
 * @param {string} role - The role; keys `cast`.
 * @param {{name: string, elements: object[]}[]} abilities - The abilities to give it.
 * @param {boolean} owned - Whether E2E Player 1 owns it.
 * @returns {Promise<void>} Resolves once the character is in `cast`.
 */
async function makeCharacter(role, abilities, owned) {
   /** @type {string} The id. */
   const id = await createActor(gm, {
      name: `E2E Matrix ${role}`,
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
      name: `E2E Matrix ${role}`,
      uuid: `Actor.${id}`,
      tokenId: await placeToken(gm, id),
   };
}

/**
 * Starts an encounter: the plain character acts first (rolls 6 and 6), the subject second (rolls 1 and 1); with
 * `first` the subject acts first. The subject joins the combat first, so it rolls first.
 * @param {string} subject - The role of the subject character.
 * @param {object} [options] - Optional settings.
 * @param {boolean} [options.first] - Whether the subject acts first.
 * @returns {Promise<void>} Resolves once the combat is begun.
 */
async function startEncounter(subject, { first = false } = {}) {
   await createCombat(gm);
   await addCombatant(gm, cast[subject].tokenId);
   await addCombatant(gm, cast.plain.tokenId);
   await forceDice(gm, first
      ? [
         6,
         6,
         1,
         1,
      ]
      : [
         1,
         1,
         6,
         6,
      ]);
   await rollInitiative(gm);
   await resetDice(gm);
   await startCombat(gm);
}

/**
 * Reads a resource value on a client.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} role - The character.
 * @param {string} resource - The resource.
 * @returns {Promise<number>} The value.
 */
function readResource(page, role, resource) {
   return page.evaluate(({ id, resource }) => game.actors.get(id).system.resource[resource].value, {
      id: cast[role].id,
      resource,
   });
}

/**
 * Waits until a client reads a resource value.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} role - The character.
 * @param {string} resource - The resource.
 * @param {number} value - The value.
 * @returns {Promise<void>} Resolves when read.
 */
async function expectResource(page, role, resource, value) {
   await expect.poll(() => readResource(page, role, resource), { message: `${role} ${resource}` }).toBe(value);
}

/**
 * Reads the combat position and the tracker state.
 * @returns {Promise<{round: number, turn: number|null, active: string|null}>} The position and the active row's name.
 */
function position() {
   return gm.evaluate(() => ({
      round: game.combat.round,
      turn: game.combat.turn,
      active: document.querySelector('#combat .combatant.active .name')?.textContent ?? null,
   }));
}

/**
 * Collects the chat messages created since a baseline.
 * @param {number} baseline - The message count before the action.
 * @returns {Promise<{id: string, type: string, system: object}[]>} The messages, in order.
 */
function messagesSince(baseline) {
   return gm.evaluate((baseline) => game.messages.contents.slice(baseline).map((message) => ({
      id: message.id,
      type: message.type,
      system: message.system?.toObject?.() ?? {},
   })), baseline);
}

/**
 * Waits for a report of a type since a baseline and returns it.
 * @param {number} baseline - The message count before the action.
 * @param {string} type - The report type.
 * @returns {Promise<{id: string, type: string, system: object}>} The first such report.
 */
async function reportOf(baseline, type) {
   await expect.poll(
      async () => (await messagesSince(baseline)).some((message) => message.type === type),
      { message: `a ${type} was posted` },
   ).toBe(true);
   return (await messagesSince(baseline)).find((message) => message.type === type);
}

/**
 * Locates a report's card in a client's chat log.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} id - The message id.
 * @returns {import('@playwright/test').Locator} The card.
 */
function card(page, id) {
   return page.locator(`#chat .message[data-message-id="${id}"] .report`).first();
}

/**
 * Reads a subject's timed effects by name.
 * @param {string} role - The character.
 * @returns {Promise<Record<string, {remaining: number, expired: boolean}>>} The effects present, by name.
 */
function effectState(role) {
   return gm.evaluate((id) => Object.fromEntries(game.actors.get(id).effects.contents.map((effect) => [
      effect.name,
      {
         remaining: effect.system.duration.remaining,
         expired: effect.system.isExpired === true,
      },
   ])), cast[role].id);
}

/**
 * Deletes every effect of a character (suite cleanup of the test documents' effects between scenarios).
 * @param {string} role - The character.
 * @returns {Promise<void>} Resolves once none remain.
 */
async function clearEffects(role) {
   await gm.evaluate(
      (id) => game.actors.get(id).deleteEmbeddedDocuments('ActiveEffect', game.actors.get(id).effects.map((e) => e.id)),
      cast[role].id,
   );
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(240_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   /** @type {string} The scene. */
   const sceneId = await createScene(gm, { name: 'E2E Matrix Scene' });
   gm2 = await openClient(browser, 'E2E GM 2');
   player = await openClient(browser, 'E2E Player 1');
   await showChatLog(gm);
   await viewScene(gm, sceneId);
   await viewScene(gm2, sceneId);
   await makeCharacter('plain', [], false);
   await makeCharacter('timed', [], false);
   await makeCharacter('damage', [
      {
         name: 'E2E Matrix PD',
         elements: [
            {
               operation: 'persistentDamage',
               selector: DURATION_TURN_START,
               value: 1,
            },
         ],
      },
   ], true);
   await makeCharacter('healer', [
      {
         name: 'E2E Matrix FH Start',
         elements: [
            {
               operation: 'fastHealing',
               selector: DURATION_TURN_START,
               value: 2,
            },
         ],
      },
   ], true);
   await makeCharacter('healerEnd', [
      {
         name: 'E2E Matrix FH End',
         elements: [
            {
               operation: 'fastHealing',
               selector: DURATION_TURN_END,
               value: 2,
            },
         ],
      },
   ], true);
   await makeCharacter('damageEnd', [
      {
         name: 'E2E Matrix PD End',
         elements: [
            {
               operation: 'persistentDamage',
               selector: DURATION_TURN_END,
               value: 1,
            },
         ],
      },
   ], true);
   await makeCharacter('regain', [
      {
         name: 'E2E Matrix Regain',
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
   await closeAllApps(gm);
});

test.afterEach(async () => {
   if (await gm.evaluate(() => game.combat?.started === true)) {
      await endCombat(gm);
   }
   await resetDice(gm);
   await closeAllApps(gm);
   await closeAllApps(player);
   errors.length = 0;
});

test.afterAll(async () => {
   for (const client of [
      gm2,
      player,
   ]) {
      await flushPageErrors(client);
      await client.context().close();
   }
   await gm?.close();
});

test.describe('turns and rounds advance', () => {
   test('begin, next turn, wrap into the next round, previous turn, next and previous round', async () => {
      await startEncounter('timed');

      // Initiative order from forced dice: the plain character (6+6) acts before the timed one (1+1).
      await expect.poll(position).toEqual({
         round: 1,
         turn: 0,
         active: cast.plain.name,
      });
      expect(await gm.locator('#combat .combatant .name').allTextContents()).toEqual([
         cast.plain.name,
         cast.timed.name,
      ]);
      await expect(gm.locator('#combat .encounter-title')).toContainText('1');

      await nextTurn(gm);
      await expect.poll(position).toEqual({
         round: 1,
         turn: 1,
         active: cast.timed.name,
      });

      // Wrap-around from the last combatant.
      await nextTurn(gm);
      await expect.poll(position).toEqual({
         round: 2,
         turn: 0,
         active: cast.plain.name,
      });
      await expect(gm.locator('#combat .encounter-title')).toContainText('2');

      // Previous turn from the first combatant goes back to the last combatant of the prior round.
      await previousTurn(gm);
      await expect.poll(position).toEqual({
         round: 1,
         turn: 1,
         active: cast.timed.name,
      });
      await previousTurn(gm);
      await expect.poll(position).toEqual({
         round: 1,
         turn: 0,
         active: cast.plain.name,
      });

      // Next Round and Previous Round buttons.
      await gm.locator('#combat button[data-action="nextRound"]').click();
      await expect.poll(position).toEqual({
         round: 2,
         turn: 0,
         active: cast.plain.name,
      });
      await gm.locator('#combat button[data-action="previousRound"]').click();
      await expect.poll(position).toEqual({
         round: 1,
         turn: 1,
         active: cast.timed.name,
      });
   });

   test('a second GM and a player see the tracker move; the active owner ends their own turn', async () => {
      await startEncounter('healer');
      await nextTurn(gm);
      for (const client of [
         gm2,
         player,
      ]) {
         const panel = await openSidebarTab(client, 'combat');
         await expect(panel.locator('.combatant.active .name')).toHaveText(cast.healer.name);
         await expect(panel.locator('.combatant')).toHaveCount(2);
      }

      // The player owns the active combatant: End Turn (the large button) advances the combat.
      const panel = await openSidebarTab(player, 'combat');
      await panel.locator('button.combat-control-lg[data-action="nextTurn"]').click();
      await expect.poll(position).toEqual({
         round: 2,
         turn: 0,
         active: cast.plain.name,
      });
   });

   test('defeated combatants are marked, add and remove mid-combat, and ending the combat deletes it', async () => {
      await startEncounter('timed');

      // Mark the plain character defeated in the tracker.
      const row = gm.locator(`#combat .combatant[data-combatant-id]`, { hasText: cast.plain.name });
      await row.hover();
      await row.locator('[data-action="toggleDefeated"]').click();
      await expect(row).toHaveClass(/defeated/);

      // Add a third combatant mid-combat.
      await addCombatant(gm, cast.damage.tokenId);
      await expect.poll(() => gm.evaluate(() => game.combat.combatants.size)).toBe(3);
      await expect(gm.locator('#combat .combatant')).toHaveCount(3);

      // Remove it again with the Token HUD button.
      const centre = await gm.evaluate(
         (tokenId) => canvas.clientCoordinatesFromCanvas(canvas.scene.tokens.get(tokenId).object.center),
         cast.damage.tokenId,
      );
      await restOnToken(gm, cast.damage.tokenId, centre);
      await gm.mouse.click(centre.x, centre.y, { button: 'right' });
      await gm.locator('#token-hud [data-action="combat"]').click();
      await expect.poll(() => gm.evaluate(() => game.combat.combatants.size)).toBe(2);
      await expect(gm.locator('#combat .combatant')).toHaveCount(2);
      await gm.mouse.click(centre.x, centre.y);
      await expect(gm.locator('#token-hud')).toBeHidden();

      // Unmark the plain character: the Defeated mark is a status on its actor, which later tests share.
      await row.hover();
      await row.locator('[data-action="toggleDefeated"]').click();
      await expect(row).not.toHaveClass(/defeated/);
   });
});

test.describe('effect expiry for every duration type and Auto-remove value', () => {
   test.beforeEach(async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'autoDecreaseEffectDuration', true);
   });

   for (const mode of MODES) {
      test(`autoRemoveExpiredEffects ${mode}: every duration type through two turns`, async () => {
         await setWorldSetting(gm, 'autoRemoveExpiredEffects', mode);
         await clearEffects('timed');

         /** @type {number} The subject's initiative rating, so an initiative effect lies between the two turns. */
         const rating = await gm.evaluate((id) => game.actors.get(id).system.rating.initiative.value, cast.timed.id);
         /** @type {Record<string, string>} The effect name of each duration type. */
         const names = Object.fromEntries(DURATION_TYPES.map((type) => [
            type,
            `E2E Exp ${mode} ${type}`,
         ]));
         for (const type of DURATION_TYPES) {
            await addEffect(gm, cast.timed.id, names[type], {
               duration: type,
               remaining: type === DURATION_PERMANENT ? undefined : 1,
               ...type === DURATION_INITIATIVE ? { initiative: rating + 7 } : {},
            });
         }
         await startEncounter('timed');

         // Turn 1 (plain to timed): the initiative effect passes its initiative, the turn-start effect counts down.
         /** @type {number} The message count before turn 1. */
         const baseline = await gm.evaluate(() => game.messages.size);
         await nextTurn(gm);
         await expect.poll(async () => (await effectState('timed'))[names[DURATION_TURN_START]]?.remaining ?? 'gone')
            .toBe(mode === 'enabled' ? 'gone' : 0);
         const afterOne = await effectState('timed');
         if (mode === 'enabled') {
            expect(afterOne[names[DURATION_INITIATIVE]], 'initiative effect removed').toBeUndefined();
         }
         else {
            expect(afterOne[names[DURATION_INITIATIVE]]).toEqual({
               remaining: 0,
               expired: true,
            });
            expect(afterOne[names[DURATION_TURN_START]]).toEqual({
               remaining: 0,
               expired: true,
            });
         }
         expect(afterOne[names[DURATION_TURN_END]], 'turn-end effect has not counted yet').toEqual({
            remaining: 1,
            expired: false,
         });
         expect(afterOne[names[DURATION_CUSTOM]], 'custom never counts down').toEqual({
            remaining: 1,
            expired: false,
         });
         expect(afterOne[names[DURATION_PERMANENT]]?.expired, 'permanent never expires').toBe(false);

         // The initiative report and the turn-start report.
         const expiredReport = await reportOf(baseline, 'effectsExpiredReport');
         expect(expiredReport.system.effects.expired.map((entry) => entry.label))
            .toEqual([names[DURATION_INITIATIVE]]);
         expect(expiredReport.system.expiredEffectsRemoved).toBe(mode === 'enabled');
         const startReport = await reportOf(baseline, 'turnStartReport');
         /** @type {string[]} The labels the turn-start report lists as expired. */
         const startExpired = (startReport.system.effects?.expired ?? []).map((entry) => entry.label);
         expect(startExpired).toContain(names[DURATION_TURN_START]);
         expect(startReport.system.expiredEffectsRemoved).toBe(mode === 'enabled');
         await showChatLog(gm);
         await expect(card(gm, startReport.id)).toBeVisible();

         // The report is whispered to the owners of a character nobody else owns, so the player's client never holds
         // it.
         await showChatLog(player);
         await expect(player.locator(`#chat .message[data-message-id="${startReport.id}"]`)).toHaveCount(0);
         if (mode === 'showButton') {
            await expect(card(gm, startReport.id).locator('button')).not.toHaveCount(0);
         }
         else {
            await expect(card(gm, startReport.id).locator('button')).toHaveCount(0);
         }

         // Turn 2 (timed to plain): the turn-end effect counts down at the end of its bearer's turn.
         const baselineTwo = await gm.evaluate(() => game.messages.size);
         await nextTurn(gm);
         await expect.poll(async () => (await effectState('timed'))[names[DURATION_TURN_END]]?.remaining ?? 'gone')
            .toBe(mode === 'enabled' ? 'gone' : 0);
         const endReport = await reportOf(baselineTwo, 'turnEndReport');
         expect(endReport.system.effects.expired.map((entry) => entry.label)).toContain(names[DURATION_TURN_END]);
         expect(endReport.system.expiredEffectsRemoved).toBe(mode === 'enabled');
         const final = await effectState('timed');
         expect(final[names[DURATION_PERMANENT]], 'permanent effect still present').toBeDefined();
         expect(final[names[DURATION_CUSTOM]], 'custom effect still present').toBeDefined();
      });
   }

   test('autoDecreaseEffectDuration false: no duration type counts down', async () => {
      await setWorldSetting(gm, 'autoDecreaseEffectDuration', false);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'enabled');
      await clearEffects('timed');
      const rating = await gm.evaluate((id) => game.actors.get(id).system.rating.initiative.value, cast.timed.id);
      for (const type of [
         DURATION_TURN_START,
         DURATION_TURN_END,
         DURATION_INITIATIVE,
      ]) {
         await addEffect(gm, cast.timed.id, `E2E NoDecrease ${type}`, {
            duration: type,
            remaining: 1,
            ...type === DURATION_INITIATIVE ? { initiative: rating + 7 } : {},
         });
      }
      await startEncounter('timed');
      await nextTurn(gm);
      await nextTurn(gm);
      expect(await effectState('timed')).toEqual({
         'E2E NoDecrease turnStart': {
            remaining: 1,
            expired: false,
         },
         'E2E NoDecrease turnEnd': {
            remaining: 1,
            expired: false,
         },
         'E2E NoDecrease initiative': {
            remaining: 1,
            expired: false,
         },
      });
   });

   test('previous turn restores the remaining of turn-start, turn-end and initiative effects', async () => {
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'disabled');
      await clearEffects('timed');
      const rating = await gm.evaluate((id) => game.actors.get(id).system.rating.initiative.value, cast.timed.id);
      for (const type of [
         DURATION_TURN_START,
         DURATION_TURN_END,
         DURATION_INITIATIVE,
      ]) {
         await addEffect(gm, cast.timed.id, `E2E Revert ${type}`, {
            duration: type,
            remaining: 2,
            ...type === DURATION_INITIATIVE ? { initiative: rating + 7 } : {},
         });
      }
      await startEncounter('timed');
      await nextTurn(gm);
      await expect.poll(async () => (await effectState('timed'))['E2E Revert turnStart']?.remaining).toBe(1);
      expect((await effectState('timed'))['E2E Revert initiative'].remaining).toBe(1);
      await nextTurn(gm);
      await expect.poll(async () => (await effectState('timed'))['E2E Revert turnEnd']?.remaining).toBe(1);

      // Going back twice undoes the turn end and then the turn start and the initiative pass.
      await previousTurn(gm);
      await expect.poll(async () => (await effectState('timed'))['E2E Revert turnEnd']?.remaining).toBe(2);
      await previousTurn(gm);
      await expect.poll(async () => (await effectState('timed'))['E2E Revert turnStart']?.remaining).toBe(2);
      expect((await effectState('timed'))['E2E Revert initiative'].remaining).toBe(2);
   });
});

/**
 * The offer a turn report variant produces for each setting value, per family.
 * @type {{family: string, role: string, setting: string, key: string, revertSetting: string, revertKey: string,
 * resource: string, start: number|null, forward: number, total: number, tag: string}[]}
 */
const FAMILIES = [
   {
      family: 'fast healing',
      role: 'healer',
      setting: 'autoApplyFastHealing',
      key: 'fastHealing',
      revertSetting: 'autoRevertFastHealing',
      revertKey: 'fastHealingRevert',
      resource: 'stamina',
      start: 0,
      forward: 2,
      total: 2,
      tag: '.tag.fast-healing',
   },
   {
      family: 'persistent damage',
      role: 'damage',
      setting: 'autoApplyPersistentDamage',
      key: 'persistentDamage',
      revertSetting: 'autoRevertPersistentDamage',
      revertKey: 'persistentDamageRevert',
      resource: 'stamina',
      start: null,
      forward: -1,
      total: 1,
      tag: '.tag.persistent-damage',
   },
   {
      family: 'resolve regain',
      role: 'regain',
      setting: 'autoRegainResolve',
      key: 'resolveRegain',
      revertSetting: 'autoRevertResolveRegain',
      revertKey: 'resolveRegainRevert',
      resource: 'resolve',
      start: 0,
      forward: 1,
      total: 2,
      tag: '.tag.resolve-regain',
   },
];

test.describe('turn reports for every report setting value', () => {
   test.beforeEach(async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'reportHealingDamage', true);
      await setWorldSetting(gm, 'reportTakingDamage', true);
      await setWorldSetting(gm, 'reportRegainingResolve', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'disabled');
      await clearChat(gm);
   });

   for (const family of FAMILIES) {
      for (const mode of MODES) {
         test(`${family.family}: ${family.setting} ${mode} at turn start`, async () => {
            await setWorldSetting(gm, family.setting, mode);
            if (family.start !== null) {
               await setResource(gm, cast[family.role].uuid, family.resource, family.start);
            }
            await startEncounter(family.role);
            /** @type {number} The value before the turn. */
            const before = await readResource(gm, family.role, family.resource);
            const baseline = await gm.evaluate(() => game.messages.size);
            await nextTurn(gm);
            if (mode === 'disabled') {
               await expect.poll(() => gm.evaluate(() => game.combat.turn)).toBe(1);
               const posted = await messagesSince(baseline);
               expect(posted.map((message) => message.system[family.key]).filter(Boolean), 'no offer').toEqual([]);
               expect(await readResource(gm, family.role, family.resource)).toBe(before);
               return;
            }
            const report = await reportOf(baseline, 'turnStartReport');
            expect(report.system[family.key].total).toBe(family.total);
            expect(report.system[family.key].confirmed).toBe(mode === 'enabled');

            // The report's resource snapshot holds the value after the turn start (the offer unapplied under
            // showButton) and the resource's maximum, and a wounds snapshot only when the persistent damage is
            // reported for a character that has Wounds.
            const maxima = await gm.evaluate((id) => ({
               max: game.actors.get(id).system.resource.stamina.max,
               resolveMax: game.actors.get(id).system.resource.resolve.max,
               woundsMax: game.actors.get(id).system.resource.wounds.max,
            }), cast[family.role].id);
            expect(report.system.resource[family.resource]).toMatchObject({
               value: mode === 'enabled' ? before + family.forward : before,
               max: family.resource === 'resolve' ? maxima.resolveMax : maxima.max,
            });
            if (family.key === 'persistentDamage') {
               expect(Boolean(report.system.resource.wounds), 'wounds snapshot only with Wounds')
                  .toBe(maxima.woundsMax > 0);
            }
            await showChatLog(gm);
            const reportCard = card(gm, report.id);
            await expect(reportCard).toBeVisible();
            if (mode === 'enabled') {
               await expectResource(player, family.role, family.resource, before + family.forward);
               await expect(reportCard.locator(family.tag)).toBeVisible();
               await expect(reportCard.locator('button')).toHaveCount(0);
            }
            else {
               expect(await readResource(gm, family.role, family.resource)).toBe(before);
               await expect(reportCard.locator('button').first()).toContainText(String(family.total));
               await reportCard.locator('button').first().click();
               await expectResource(gm, family.role, family.resource, before + family.forward);
               await expect(reportCard.locator(family.tag)).toBeVisible();

               // The card's resource snapshot follows the apply (it is read from `system.resource`).
               await expect.poll(() => gm.evaluate(
                  ({ id, resource }) => game.messages.get(id).system.resource[resource].value,
                  {
                     id: report.id,
                     resource: family.resource,
                  },
               ), { message: 'the snapshot shows the applied value' }).toBe(before + family.forward);
            }

            // The report is whispered to the owning player: their chat DOM shows the card, and a character the player
            // does not own has no such message on the player's client.
            await showChatLog(player);
            await expect(card(player, report.id)).toBeVisible();
         });

         test(`${family.family}: ${family.revertSetting} ${mode} on the previous turn`, async () => {
            await setWorldSetting(gm, family.setting, 'enabled');
            await setWorldSetting(gm, family.revertSetting, mode);
            if (family.start !== null) {
               await setResource(gm, cast[family.role].uuid, family.resource, family.start);
            }
            await startEncounter(family.role);
            const before = await readResource(gm, family.role, family.resource);
            await nextTurn(gm);
            await expectResource(gm, family.role, family.resource, before + family.forward);
            const baseline = await gm.evaluate(() => game.messages.size);
            await previousTurn(gm);
            if (mode === 'disabled') {
               await expect.poll(() => gm.evaluate(() => game.combat.turn)).toBe(0);
               const posted = await messagesSince(baseline);
               expect(posted.map((message) => message.system[family.revertKey]).filter(Boolean)).toEqual([]);
               expect(await readResource(gm, family.role, family.resource)).toBe(before + family.forward);
               return;
            }
            const report = await reportOf(baseline, 'turnStartRevertReport');
            expect(report.system[family.revertKey].total).toBe(family.total);
            expect(report.system[family.revertKey].confirmed).toBe(mode === 'enabled');
            await showChatLog(gm);
            await expect(card(gm, report.id)).toBeVisible();
            if (mode === 'enabled') {
               await expectResource(gm, family.role, family.resource, before);
               await expect(card(gm, report.id).locator('button')).toHaveCount(0);
            }
            else {
               expect(await readResource(gm, family.role, family.resource)).toBe(before + family.forward);
               await card(gm, report.id).locator('button').first().click();
               await expectResource(gm, family.role, family.resource, before);
               await expect.poll(() => gm.evaluate(
                  ({ id, resource }) => game.messages.get(id).system.resource[resource].value,
                  {
                     id: report.id,
                     resource: family.resource,
                  },
               ), { message: 'the snapshot shows the reverted value' }).toBe(before);
            }
         });
      }
   }

   test('turn end: fast healing posts a turnEndReport and its revert posts a turnEndRevertReport', async () => {
      await setWorldSetting(gm, 'autoApplyFastHealing', 'enabled');
      await setWorldSetting(gm, 'autoRevertFastHealing', 'enabled');
      await setResource(gm, cast.healerEnd.uuid, 'stamina', 0);
      await startEncounter('healerEnd');
      await nextTurn(gm);
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      const report = await reportOf(baseline, 'turnEndReport');
      expect(report.system.fastHealing).toMatchObject({
         total: 2,
         confirmed: true,
      });
      await expectResource(gm, 'healerEnd', 'stamina', 2);
      const baselineRevert = await gm.evaluate(() => game.messages.size);
      await previousTurn(gm);
      const revert = await reportOf(baselineRevert, 'turnEndRevertReport');
      expect(revert.system.fastHealingRevert).toMatchObject({
         total: 2,
         confirmed: true,
      });
      await expectResource(gm, 'healerEnd', 'stamina', 0);
   });

   test('reportEffects false: no effect list; true: the effect is listed', async () => {
      await clearEffects('timed');
      await addEffect(gm, cast.timed.id, 'E2E Listed Effect', {
         duration: DURATION_TURN_START,
         remaining: 3,
      });
      for (const reported of [
         true,
         false,
      ]) {
         await setWorldSetting(gm, 'reportEffects', reported);
         await startEncounter('timed');
         const baseline = await gm.evaluate(() => game.messages.size);
         await nextTurn(gm);
         await expect.poll(() => gm.evaluate(() => game.combat.turn)).toBe(1);
         const posted = (await messagesSince(baseline)).filter((message) => message.type === 'turnStartReport');
         if (reported) {
            expect(posted).toHaveLength(1);
            expect(posted[0].system.effects[DURATION_TURN_START].map((entry) => entry.label))
               .toEqual(['E2E Listed Effect']);
         }
         else {
            expect(posted, 'no effects to report, no report').toHaveLength(0);
         }
         await endCombat(gm);
      }
   });

   test('reportEffects false with Auto-remove enabled removes expired effects and posts no blank report', async () => {
      await setWorldSetting(gm, 'reportEffects', false);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'enabled');
      await clearEffects('timed');
      await addEffect(gm, cast.timed.id, 'E2E Silent Start', {
         duration: DURATION_TURN_START,
         remaining: 1,
      });
      await addEffect(gm, cast.timed.id, 'E2E Silent End', {
         duration: DURATION_TURN_END,
         remaining: 1,
      });
      await startEncounter('timed');
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      await expect
         .poll(async () => 'E2E Silent Start' in await effectState('timed'), { message: 'start effect removed' })
         .toBe(false);
      await nextTurn(gm);
      await expect.poll(async () => 'E2E Silent End' in await effectState('timed'), { message: 'end effect removed' })
         .toBe(false);
      expect(
         (await messagesSince(baseline)).filter((message) => message.type.startsWith('turn')).map((m) => m.type),
         'no turn report card with nothing to show',
      ).toEqual([]);
   });
});

test.describe('removal button and immunity handling at expiry', () => {
   test.beforeEach(async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'autoDecreaseEffectDuration', true);
   });

   test('showButton: the card button removes the expired effects', async () => {
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'showButton');
      await clearEffects('timed');
      await addEffect(gm, cast.timed.id, 'E2E Button Removed', {
         duration: DURATION_TURN_START,
         remaining: 1,
      });
      await startEncounter('timed');
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      const report = await reportOf(baseline, 'turnStartReport');
      await showChatLog(gm);
      expect(Object.keys(await effectState('timed')), 'the expired effect stays until the button').toEqual([
         'E2E Button Removed',
      ]);
      await card(gm, report.id).locator('button').first().click();
      await expect.poll(async () => {
         // A confirmation dialog stands between the button and the removal when effect deletions are confirmed.
         const yes = gm.locator('dialog.application.dialog [data-action="yes"]');
         if (await yes.count()) {
            await yes.click();
         }
         return Object.keys(await effectState('timed'));
      }, { message: 'the button removed the expired effect' }).toEqual([]);
   });

   for (const handling of [
      'suppress',
      'remove',
   ]) {
      test(`immunityHandling ${handling}: a timed effect covered by an immunity`, async () => {
         await setWorldSetting(gm, 'immunityHandling', handling);
         await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'enabled');
         await clearEffects('timed');
         const timerName = `E2E Warded Timer ${handling}`;
         await addEffect(gm, cast.timed.id, timerName, {
            duration: DURATION_TURN_START,
            remaining: 1,
         });
         expect(Object.keys(await effectState('timed')), 'the timer exists before the ward').toEqual([timerName]);
         const wardId = await addEffect(gm, cast.timed.id, `E2E Ward ${handling}`, { duration: DURATION_PERMANENT });
         await addRulesElement(gm, `${cast.timed.uuid}.ActiveEffect.${wardId}`, {
            key: timerName,
            operation: 'immunity',
            selector: 'effect',
         });
         if (handling === 'remove') {
            await expect.poll(async () => timerName in await effectState('timed'), { message: 'the timer was removed' })
               .toBe(false);
            return;
         }
         expect((await effectState('timed'))[timerName], 'suppressed, not removed').toBeDefined();
         await startEncounter('timed');
         const baseline = await gm.evaluate(() => game.messages.size);
         await nextTurn(gm);
         await expect.poll(async () => timerName in await effectState('timed'), { message: 'the timer expired away' })
            .toBe(false);
         const report = await reportOf(baseline, 'turnStartReport');
         expect(report.system.effects.expired.map((entry) => [
            entry.label,
            entry.suppressedBy,
         ])).toEqual([[
            timerName,
            [`E2E Ward ${handling}`],
         ]]);
      });
   }
});

test.describe('every route that moves the turn runs the same turn hooks', () => {
   test.beforeEach(async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'disabled');
      await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');
      await setWorldSetting(gm, 'autoRevertPersistentDamage', 'enabled');
      await setWorldSetting(gm, 'autoApplyFastHealing', 'enabled');
      await setWorldSetting(gm, 'autoRevertFastHealing', 'enabled');
   });

   test('beginning the combat starts the first combatant\'s turn once and posts its report', async () => {
      await setResource(gm, cast.healer.uuid, 'stamina', 0);
      const baseline = await gm.evaluate(() => game.messages.size);
      await startEncounter('healer', { first: true });

      // Fast healing of 2 at the first combatant's turn start, applied once (not again by a later move).
      await expectResource(gm, 'healer', 'stamina', 2);
      const report = await reportOf(baseline, 'turnStartReport');
      expect(report.system.fastHealing).toMatchObject({
         total: 2,
         confirmed: true,
      });
      expect(await position()).toMatchObject({
         round: 1,
         turn: 0,
         active: cast.healer.name,
      });
      expect(await readResource(player, 'healer', 'stamina'), 'applied once, on every client').toBe(2);
   });

   test('beginning the combat with a first combatant that has nothing to report posts no turn report', async () => {
      // The same first-combatant flow posts a report when there is content (the test above); without content (Fast
      // Healing disabled, nothing else to list) the begin posts none.
      await setWorldSetting(gm, 'autoApplyFastHealing', 'disabled');
      await setResource(gm, cast.healer.uuid, 'stamina', 0);
      const baseline = await gm.evaluate(() => game.messages.size);
      await startEncounter('healer', { first: true });
      await nextTurn(gm);
      await nextTurn(gm);
      await expect.poll(position).toMatchObject({
         round: 2,
         turn: 0,
      });
      expect((await messagesSince(baseline)).filter((message) => message.type.startsWith('turn')), 'no report')
         .toEqual([]);
      expect(await readResource(gm, 'healer', 'stamina')).toBe(0);
   });

   test('Previous Turn from the first turn of round 1 reverts the begin\'s turn start', async () => {
      await setResource(gm, cast.healer.uuid, 'stamina', 0);
      await startEncounter('healer', { first: true });
      await expectResource(gm, 'healer', 'stamina', 2);
      const baseline = await gm.evaluate(() => game.messages.size);
      await previousTurn(gm);
      await expect.poll(() => gm.evaluate(() => ({
         round: game.combat.round,
         turn: game.combat.turn,
      }))).toEqual({
         round: 0,
         turn: null,
      });
      await expectResource(gm, 'healer', 'stamina', 0);
      const revert = await reportOf(baseline, 'turnStartRevertReport');
      expect(revert.system.fastHealingRevert).toMatchObject({
         total: 2,
         confirmed: true,
      });

      // Begin again so the combat can end through the tracker: the turn start runs again, once.
      await startCombat(gm);
      await expectResource(gm, 'healer', 'stamina', 2);
   });

   test('Next Round and Previous Round end and start turns and revert them like Next Turn and Previous Turn',
      async () => {
         const before = await readResource(gm, 'damage', 'stamina');
         await startEncounter('damage', { first: true });

         // Begin: persistent damage of 1 at the first turn start.
         await expectResource(gm, 'damage', 'stamina', before - 1);
         const panel = await openSidebarTab(gm, 'combat');
         await panel.locator('button.combat-control[data-action="nextRound"]').click();
         await expect.poll(position).toMatchObject({
            round: 2,
            turn: 0,
         });
         await expectResource(gm, 'damage', 'stamina', before - 2);
         await panel.locator('button.combat-control[data-action="previousRound"]').click();
         await expect.poll(position).toMatchObject({
            round: 1,
            turn: 1,
         });
         await expectResource(gm, 'damage', 'stamina', before - 1);
         expect(await readResource(player, 'damage', 'stamina'), 'no double firing on the player client')
            .toBe(before - 1);
      });
});

test.describe('persistent damage and resolve regain at the end of a turn', () => {
   test.beforeEach(async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'reportTakingDamage', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'disabled');
      await clearChat(gm);
   });

   for (const mode of MODES) {
      test(`persistent damage at turn end: autoApplyPersistentDamage ${mode}`, async () => {
         await setWorldSetting(gm, 'autoApplyPersistentDamage', mode);
         await startEncounter('damageEnd');
         const before = await readResource(gm, 'damageEnd', 'stamina');
         await nextTurn(gm);
         const baseline = await gm.evaluate(() => game.messages.size);
         await nextTurn(gm);
         if (mode === 'disabled') {
            await expect.poll(position).toMatchObject({
               round: 2,
               turn: 0,
            });
            expect((await messagesSince(baseline)).map((message) => message.system.persistentDamage).filter(Boolean))
               .toEqual([]);
            expect(await readResource(gm, 'damageEnd', 'stamina')).toBe(before);
            return;
         }
         const report = await reportOf(baseline, 'turnEndReport');
         expect(report.system.persistentDamage).toMatchObject({
            total: 1,
            confirmed: mode === 'enabled',
         });
         expect(report.system.resolveRegain, 'a turn end never regains Resolve').toBeUndefined();
         expect(report.system.resource.stamina).toMatchObject({ value: mode === 'enabled' ? before - 1 : before });
         await showChatLog(gm);
         const reportCard = card(gm, report.id);
         await expect(reportCard).toBeVisible();
         if (mode === 'enabled') {
            await expectResource(player, 'damageEnd', 'stamina', before - 1);
            await expect(reportCard.locator('.tag.persistent-damage')).toBeVisible();
            await expect(reportCard.locator('button')).toHaveCount(0);
         }
         else {
            await expect(reportCard.locator('button').first()).toContainText('1');
            await reportCard.locator('button').first().click();
            await expectResource(gm, 'damageEnd', 'stamina', before - 1);
            await expect.poll(() => gm.evaluate(
               (id) => game.messages.get(id).system.resource.stamina.value,
               report.id,
            )).toBe(before - 1);
         }
      });
   }

   test('resolve regain happens at the start of a turn only', async () => {
      await setWorldSetting(gm, 'autoRegainResolve', 'enabled');
      await setResource(gm, cast.regain.uuid, 'resolve', 0);
      await startEncounter('regain');
      await nextTurn(gm);
      await expectResource(gm, 'regain', 'resolve', 1);
      await setResource(gm, cast.regain.uuid, 'resolve', 0);
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      await expect.poll(position).toMatchObject({
         round: 2,
         turn: 0,
      });
      expect(await readResource(gm, 'regain', 'resolve'), 'the turn end regained nothing').toBe(0);
      expect((await messagesSince(baseline)).map((message) => message.system.resolveRegain).filter(Boolean))
         .toEqual([]);
   });
});

test.describe('conditions, suppressed tags, unlinked tokens and the character sheet', () => {
   test.beforeEach(async () => {
      await setWorldSetting(gm, 'autoDecreaseEffectDuration', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'disabled');
   });

   for (const reported of [
      true,
      false,
   ]) {
      test(`reportEffects ${reported}: the conditions section of the turn-start report`, async () => {
         await setWorldSetting(gm, 'reportEffects', reported);
         await clearEffects('timed');
         await applyCondition(gm, cast.timed.tokenId, 'blinded');
         await startEncounter('timed');
         const baseline = await gm.evaluate(() => game.messages.size);
         await nextTurn(gm);
         if (reported) {
            const report = await reportOf(baseline, 'turnStartReport');
            expect(report.system.conditions).toMatchObject([{ descriptionKey: 'blinded.desc' }]);
            await showChatLog(gm);
            await expect(card(gm, report.id).locator('.effects .tag').first()).toBeVisible();
         }
         else {
            await expect.poll(position).toMatchObject({
               round: 1,
               turn: 1,
            });
            expect((await messagesSince(baseline)).filter((message) => message.type === 'turnStartReport'))
               .toEqual([]);
         }
         await endCombat(gm);
         await removeCondition(gm, cast.timed.tokenId, 'blinded');
      });
   }

   test('a suppressed timed effect is listed with the suppressing immunity in the turn-start report', async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'immunityHandling', 'suppress');
      await clearEffects('timed');
      await addEffect(gm, cast.timed.id, 'E2E Listed Warded', {
         duration: DURATION_TURN_START,
         remaining: 3,
      });
      const wardId = await addEffect(gm, cast.timed.id, 'E2E Listed Ward', { duration: DURATION_PERMANENT });
      await addRulesElement(gm, `${cast.timed.uuid}.ActiveEffect.${wardId}`, {
         key: 'E2E Listed Warded',
         operation: 'immunity',
         selector: 'effect',
      });
      await startEncounter('timed');
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      const report = await reportOf(baseline, 'turnStartReport');
      expect(report.system.effects[DURATION_TURN_START]).toMatchObject([
         {
            label: 'E2E Listed Warded',
            remaining: 2,
            suppressedBy: ['E2E Listed Ward'],
         },
      ]);
   });

   test('unlinked token: expiry and reports run on the token actor, not the world actor', async () => {
      await setWorldSetting(gm, 'reportEffects', true);
      await setWorldSetting(gm, 'autoRemoveExpiredEffects', 'enabled');
      /** @type {string} The world actor's id. */
      const actorId = await createActor(gm, {
         name: 'E2E Matrix unlinked',
         type: 'player',
      });
      if (await toggleTokenLink(gm, actorId)) {
         await toggleTokenLink(gm, actorId);
      }
      /** @type {string} The unlinked token placed on the scene. */
      const tokenId = await placeToken(gm, actorId);
      expect(await gm.evaluate((tokenId) => canvas.scene.tokens.get(tokenId).actorLink, tokenId)).toBe(false);
      cast.unlinked = {
         id: actorId,
         name: 'E2E Matrix unlinked',
         uuid: `Actor.${actorId}`,
         tokenId,
      };
      await addEffect(gm, actorId, 'E2E Token Start', {
         duration: DURATION_TURN_START,
         remaining: 1,
         tokenId,
      });
      await addEffect(gm, actorId, 'E2E Token End', {
         duration: DURATION_TURN_END,
         remaining: 1,
         tokenId,
      });

      /**
       * Reads the names of the token actor's effects.
       * @returns {Promise<string[]>} The names.
       */
      const tokenEffects = () => gm.evaluate(
         (tokenId) => canvas.scene.tokens.get(tokenId).actor.effects.map((effect) => effect.name).sort(),
         tokenId,
      );
      expect(await tokenEffects()).toEqual([
         'E2E Token End',
         'E2E Token Start',
      ]);
      expect(await gm.evaluate((id) => game.actors.get(id).effects.size, actorId), 'the world actor has none')
         .toBe(0);
      await startEncounter('unlinked');
      const baseline = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      await expect.poll(tokenEffects).toEqual(['E2E Token End']);
      const startReport = await reportOf(baseline, 'turnStartReport');
      expect(startReport.system.effects.expired.map((entry) => entry.label)).toEqual(['E2E Token Start']);
      expect(startReport.system.expiredEffectsRemoved).toBe(true);
      const baselineEnd = await gm.evaluate(() => game.messages.size);
      await nextTurn(gm);
      await expect.poll(tokenEffects).toEqual([]);
      const endReport = await reportOf(baselineEnd, 'turnEndReport');
      expect(endReport.system.effects.expired.map((entry) => entry.label)).toEqual(['E2E Token End']);
      expect(await gm.evaluate((id) => game.actors.get(id).effects.size, actorId)).toBe(0);
   });

   for (const mode of [
      'disabled',
      'enabled',
   ]) {
      test(`the character sheet's effect row after expiry: autoRemoveExpiredEffects ${mode}`, async () => {
         await setWorldSetting(gm, 'reportEffects', true);
         await setWorldSetting(gm, 'autoRemoveExpiredEffects', mode);
         await clearEffects('timed');
         const id = await addEffect(gm, cast.timed.id, `E2E Sheet Expiry ${mode}`, {
            duration: DURATION_TURN_START,
            remaining: 1,
         });
         await startEncounter('timed');
         const sheet = await openSheetByUuid(gm, cast.timed.uuid);
         await clickSheetTab(sheet, 'Effects');
         const row = sheet.locator(`li.effect[data-effect-id="${id}"]`);
         await expect(row).toBeVisible();

         // The Expired tag is in the row's expandable footer.
         if (await row.locator('.expandable-content').count() === 0) {
            await row.locator('.header .label .button button').first().click();
         }
         await expect(row.locator('.expandable-content')).toBeVisible();
         await expect(row).not.toContainText(/expired/i);
         await nextTurn(gm);
         if (mode === 'disabled') {
            await expect(row).toContainText(/expired/i);
         }
         else {
            await expect(row).toHaveCount(0);
         }
      });
   }
});

test.describe('tracker controls', () => {
   test('re-roll initiative from the combatant\'s context menu', async () => {
      await startEncounter('timed');
      /** @type {number} The timed character's initiative rating. */
      const rating = await gm.evaluate((id) => game.actors.get(id).system.rating.initiative.value, cast.timed.id);
      const panel = await openSidebarTab(gm, 'combat');
      const row = panel.locator('.combatant', { hasText: cast.timed.name });

      // The forced roll of 1 and 1 on top of the rating (formula: rating plus 2d6).
      await expect(row.locator('.initiative-input')).toHaveValue(String(rating + 2));
      await forceDice(gm, [
         3,
         3,
      ]);
      await row.click({ button: 'right' });
      await chooseContextMenuEntry(
         gm,
         gm.locator('#context-menu li.context-item', { hasText: 'Re-roll Initiative' }),
      );
      await expect(row.locator('.initiative-input')).toHaveValue(String(rating + 6));
   });

   test('Cancel on the End Combat dialog keeps the combat; confirming deletes it', async () => {
      await startEncounter('timed');
      /** @type {string} The combat's id. */
      const id = await gm.evaluate(() => game.combat.id);
      const panel = await openSidebarTab(gm, 'combat');
      await panel.locator('button.combat-control[data-action="endCombat"]').click();
      await gm.locator('dialog.application.dialog [data-action="no"]').click();
      await expect(gm.locator('dialog.application.dialog')).toHaveCount(0);
      expect(await gm.evaluate((id) => game.combats.has(id) && game.combat.started, id), 'the combat stays').toBe(true);
      await endCombat(gm);
      expect(await gm.evaluate((id) => game.combats.has(id), id)).toBe(false);
   });
});
