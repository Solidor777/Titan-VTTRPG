import { expect, test } from './harness.js';
import {
   DURATION_CUSTOM,
   DURATION_INITIATIVE,
   DURATION_PERMANENT,
   DURATION_TURN_END,
   DURATION_TURN_START,
} from '~/system/DurationTypes.js';
import { clickSheetTab } from './actions.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addCombatant,
   addEffect,
   addRulesElement,
   applyCondition,
   controlPlacedToken,
   createActor,
   createCombat,
   effectActiveToggle,
   endCombat,
   nextTurn,
   placeToken,
   readServerSystem,
   removeCondition,
   rollInitiative,
   setEffectActive,
   shared,
   startCombat,
   viewScene,
} from './flows.js';
import { getSetting, setClientSetting, setWorldSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * A condition or effect suppressed by an immunity shows a "Suppressed: <source>" tag and a dimmed row on the character
 * sheet's effect rows and in the Player HUD effects panel (list rows; the icon tray dims the icon and tags the
 * popout), and loses both when the immunity ends. Turn-start and turn-end reports tag a suppressed condition or effect
 * the same way, and a suppressed effect's duration keeps ticking.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the actor the display is read on. */
let actorId;
/** @type {string} The uuid of that actor. */
let actorUuid;
/** @type {string} The id of the actor's placed token. */
let tokenId;
/** @type {string} The id of the token that is the actor's opponent in a combat. */
let opponentTokenId;
/** @type {string} The id of the ward effect. */
let wardId;
/** @type {string} The id of the timed blade effect the ward is immune to. */
let bladeId;
/** @type {string[]} The conditions the running test turned on and has not turned off. */
let applied = [];

/** @type {string} Name of the throwaway actor. */
const ACTOR_NAME = 'E2E Immunity Display Actor';

/** @type {string} Name of the effect granting the immunities. */
const WARD_NAME = 'E2E Immunity Display Ward';

/** @type {string} Name of the turn-start effect the ward is immune to. */
const BLADE_NAME = 'E2E Display Blade';

/** @type {string} Name of the turn-end effect the ward is immune to. */
const TIMER_NAME = 'E2E Display Timer';

/** @type {string} Name of the initiative-duration effect the ward is immune to. */
const INITIATIVE_NAME = 'E2E Display Initiative';

/** @type {string} Name of the custom-duration effect the ward is immune to. */
const CUSTOM_NAME = 'E2E Display Custom';

/** @type {string} Name of the permanent effect the ward is immune to. */
const PERMANENT_NAME = 'E2E Display Charm';

/** @type {number} The most Next Turn presses that reach the actor's turn in a two-combatant encounter. */
const MAX_TURN_PRESSES = 4;

/** @type {string} The Immunity Handling value in force before this file. */
let priorImmunityHandling;

/** @type {number} The turns the blade starts with. */
const BLADE_TURNS = 3;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // The display under test is of suppression; Remove would delete what the ward covers.
   priorImmunityHandling = await getSetting(page, 'immunityHandling');
   await setWorldSetting(page, 'immunityHandling', 'suppress');
   actorId = await createActor(page, {
      name: ACTOR_NAME,
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   await viewScene(page, await shared(page, 'scene'));
   tokenId = await placeToken(page, actorId);
   opponentTokenId = await placeToken(page, await shared(page, 'npc'));

   // The ward is immune to a condition and to effects by name; it ends before the immune things are created,
   // because a ward in force refuses their creation.
   wardId = await addEffect(page, actorId, WARD_NAME, { duration: DURATION_PERMANENT });
   for (const element of [
      {
         key: 'contaminated',
         operation: 'immunity',
         selector: 'condition',
      },
      {
         key: BLADE_NAME,
         operation: 'immunity',
         selector: 'effect',
      },
      {
         key: TIMER_NAME,
         operation: 'immunity',
         selector: 'effect',
      },
      {
         key: INITIATIVE_NAME,
         operation: 'immunity',
         selector: 'effect',
      },
      {
         key: CUSTOM_NAME,
         operation: 'immunity',
         selector: 'effect',
      },
      {
         key: PERMANENT_NAME,
         operation: 'immunity',
         selector: 'effect',
      },
   ]) {
      await addRulesElement(page, `${actorUuid}.ActiveEffect.${wardId}`, element);
   }
   await setEffectActive(page, actorUuid, `${actorUuid}.ActiveEffect.${wardId}`, false);
   bladeId = await addEffect(page, actorId, BLADE_NAME, {
      duration: DURATION_TURN_START,
      remaining: BLADE_TURNS,
   });
   await closeAllApps(page);
});

test.afterEach(async () => {
   // The ward ends first: a suppressed condition is not a status, so the HUD could not turn it off.
   if (await readWardOn()) {
      await setEffectActive(page, actorUuid, `${actorUuid}.ActiveEffect.${wardId}`, false);
   }
   for (const statusId of applied.toReversed()) {
      await removeCondition(page, tokenId, statusId);
   }
   applied = [];
   if (await page.evaluate(() => game.combat?.started === true)) {
      await endCombat(page);
   }
   await setClientSetting(page, 'playerHudOptions', {});
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await setWorldSetting(page, 'immunityHandling', priorImmunityHandling);
   await page?.close();
});

/**
 * Reads whether the ward effect is switched on.
 * @returns {Promise<boolean>} True when the ward is not disabled.
 */
function readWardOn() {
   return page.evaluate(({ id, effectId }) => !game.actors.get(id).effects.get(effectId).disabled, {
      effectId: wardId,
      id: actorId,
   });
}

/**
 * Switches the ward on or off with the active toggle of its row.
 * @param {boolean} active - Whether the ward ends up on.
 * @returns {Promise<void>} Resolves once the ward is in the requested state.
 */
function setWard(active) {
   return setEffectActive(page, actorUuid, `${actorUuid}.ActiveEffect.${wardId}`, active);
}

/**
 * Turns Contaminated on through the token HUD and reads its effect's id.
 * @returns {Promise<string>} The Contaminated effect's id.
 */
async function applyContaminated() {
   await applyCondition(page, tokenId, 'contaminated');
   applied.push('contaminated');
   return page.evaluate((id) => game.actors.get(id).effects.find((effect) => effect.statuses.has('contaminated')).id,
      actorId);
}

test('a suppressed effect row on the sheet is tagged and dimmed until the immunity ends', async () => {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await clickSheetTab(sheet, 'Effects');

   /** @type {import('@playwright/test').Locator} The blade's effect row. */
   const row = sheet.locator(`li.effect[data-effect-id="${bladeId}"]`);

   /** @type {import('@playwright/test').Locator} The row's image. */
   const image = row.locator('.item > .header .image');

   /** @type {import('@playwright/test').Locator} The row's suppressed tag. */
   const tag = row.getByTestId('character-sheet-effect-suppressed-tag');
   await expect(row, 'the blade row is listed before the ward').toBeVisible();
   await expect(tag).toHaveCount(0);
   await expect(image).toHaveCSS('opacity', '1');

   await setWard(true);
   await expect(tag).toContainText(WARD_NAME);
   await expect(image).toHaveCSS('opacity', '0.5');

   // The ward's own row is listed in the same pass and carries no tag: an immunity never suppresses its own effect.
   /** @type {import('@playwright/test').Locator} The ward's effect row. */
   const wardRow = sheet.locator(`li.effect[data-effect-id="${wardId}"]`);
   await expect(wardRow).toBeVisible();
   await expect(wardRow.getByTestId('character-sheet-effect-suppressed-tag')).toHaveCount(0);

   await setWard(false);
   await expect(tag).toHaveCount(0);
   await expect(image).toHaveCSS('opacity', '1');
});

test('a suppressed condition in the HUD list is tagged and dimmed until the immunity ends', async () => {
   /** @type {string} The Contaminated effect's id. */
   const conditionId = await applyContaminated();
   await controlPlacedToken(page, tokenId);

   /** @type {import('@playwright/test').Locator} The Contaminated row. */
   const row = page.locator(`[data-testid="player-hud-effect-row"][data-effect-id="${conditionId}"]`);

   /** @type {import('@playwright/test').Locator} The row's name. */
   const name = row.locator('.name');

   /** @type {import('@playwright/test').Locator} The row's suppressed tag. */
   const tag = row.getByTestId('player-hud-effect-suppressed-tag');
   await expect(row, 'the condition row is listed before the ward').toBeVisible();
   await expect(tag).toHaveCount(0);
   await expect(name).toHaveCSS('opacity', '1');

   await setWard(true);
   await expect(tag).toContainText(WARD_NAME);
   await expect(name).toHaveCSS('opacity', '0.5');

   await setWard(false);
   await expect(tag).toHaveCount(0);
   await expect(name).toHaveCSS('opacity', '1');
});

test('a suppressed condition in the HUD tray is dimmed and its popout tagged until the immunity ends', async () => {
   /** @type {string} The Contaminated effect's id. */
   const conditionId = await applyContaminated();
   await controlPlacedToken(page, tokenId);
   await setClientSetting(page, 'playerHudOptions', { effectsPanel: { style: 'tray' } });

   /** @type {import('@playwright/test').Locator} The Contaminated icon. */
   const icon = page.locator(`[data-testid="player-hud-effect-icon"][data-effect-id="${conditionId}"]`);

   /** @type {import('@playwright/test').Locator} The icon's image. */
   const image = icon.locator('img');

   /** @type {import('@playwright/test').Locator} The detail popout of the selected tray icon. */
   const popout = page.getByTestId('player-hud-effect-popout');

   /** @type {import('@playwright/test').Locator} The popout's suppressed tag. */
   const tag = page.getByTestId('player-hud-effect-popout-suppressed-tag');
   await expect(icon, 'the condition icon is listed before the ward').toBeVisible();
   await expect(image).toHaveCSS('opacity', '1');
   await icon.click();
   await expect(popout).toBeVisible();
   await expect(tag).toHaveCount(0);

   // The ward's toggle is in the sheet; a press outside the popout dismisses it, so the ward is switched with the
   // keyboard on the toggle's button while the popout stays open.
   await setWard(true);
   await expect(image).toHaveCSS('opacity', '0.5');
   await icon.click();
   await expect(popout).toBeVisible();
   await expect(tag).toContainText(WARD_NAME);

   /** @type {import('@playwright/test').Locator} The actor's sheet, picked by the actor id its element id ends in. */
   const actorSheet = page.locator(`.application.titan-document-sheet[id$="-Actor-${actorId}"]`);

   /** @type {import('@playwright/test').Locator} The ward row's active toggle. */
   const wardToggle = effectActiveToggle(actorSheet, wardId, false).locator('xpath=ancestor::button[1]');
   await wardToggle.focus();
   await page.keyboard.press('Enter');
   await expect(tag, 'the open popout lost its tag when the immunity ended').toHaveCount(0);
   await expect(popout).toBeVisible();
   await expect(image).toHaveCSS('opacity', '1');

   // Escape dismisses the popout; an open popout would take the Escape key that releases the token's control.
   await page.keyboard.press('Escape');
   await expect(popout).toHaveCount(0);
});

/**
 * Starts a combat of the actor and the opponent, with the opponent acting first.
 * @returns {Promise<void>} Resolves once the combat is started.
 */
async function startEncounter() {
   await createCombat(page);
   await addCombatant(page, tokenId);
   await addCombatant(page, opponentTokenId);
   await forceDice(page, [
      1,
      1,
      6,
      6,
   ]);
   await rollInitiative(page);
   await resetDice(page);
   await startCombat(page);
}

/**
 * Presses Next Turn until the actor's turn starts, or once more when it already holds the turn, and reads the report
 * of the given type that the actor posts.
 * @param {'turnStartReport'|'turnEndReport'} type - The report's chat-message type.
 * @param {boolean} untilActorTurn - Whether to press until the actor's turn starts first.
 * @returns {Promise<{id: string, system: object}>} The report's id and system data.
 */
async function nextTurnReport(type, untilActorTurn) {
   /** @type {number} The chat-message count before the turns. */
   const before = await page.evaluate(() => game.messages.size);
   if (untilActorTurn) {
      /** @type {boolean} Whether the actor holds the turn. */
      let actorTurn = false;
      for (let press = 0; press < MAX_TURN_PRESSES && !actorTurn; press++) {
         await nextTurn(page);
         actorTurn = await page.evaluate((id) => game.combat.combatant.actorId === id, actorId);
      }
      expect(actorTurn, `the actor's turn started within ${MAX_TURN_PRESSES} presses`).toBe(true);
   } else {
      await nextTurn(page);
   }

   /** @type {{id: string, system: object}|undefined} The actor's report. */
   let report;
   await expect.poll(async () => {
      report = await page.evaluate(({ count, messageType, name }) => {
         /** @type {ChatMessage|undefined} The actor's report posted since the count. */
         const message = game.messages.contents.slice(count)
            .find((entry) => entry.type === messageType && entry.system.actorName === name);
         return message ? {
            id: message.id,
            system: message.system.toObject(),
         } : undefined;
      }, {
         count: before,
         messageType: type,
         name: ACTOR_NAME,
      });
      return report !== undefined;
   }, { message: `the actor's ${type} was posted` }).toBe(true);
   return report;
}

/**
 * Locates the suppressed tags on a chat message's report card.
 * @param {string} messageId - The chat message id.
 * @returns {import('@playwright/test').Locator} The suppressed-tag elements on the card.
 */
function reportSuppressedTags(messageId) {
   return page.locator(`#chat .message[data-message-id="${messageId}"] [data-testid="report-effect-suppressed-tag"]`);
}

/**
 * Reads the remaining turns the server holds for an effect of the actor.
 * @param {string} effectId - The id of the effect whose stored duration is read.
 * @returns {Promise<number>} The effect's stored remaining duration.
 */
async function readRemaining(effectId) {
   return (await readServerSystem(page, `${actorUuid}.ActiveEffect.${effectId}`)).duration.remaining;
}

test('a turn-start report tags a suppressed condition and a suppressed effect whose duration still ticks', async () => {
   await setWorldSetting(page, 'reportEffects', true);
   await setWorldSetting(page, 'autoDecreaseEffectDuration', true);
   await applyContaminated();

   /** @type {number} The blade's turns before the combat. */
   const turnsBefore = await readRemaining(bladeId);
   await setWard(true);
   await closeAllApps(page);
   await startEncounter();

   /** @type {{id: string, system: object}} The actor's turn-start report. */
   const report = await nextTurnReport('turnStartReport', true);
   await expect.poll(() => readRemaining(bladeId), { message: 'the suppressed blade ticked at the turn start' })
      .toBe(turnsBefore - 1);
   expect(report.system.conditions).toEqual([
      expect.objectContaining({ suppressedBy: [WARD_NAME] }),
   ]);
   expect(report.system.effects[DURATION_TURN_START]).toEqual([
      expect.objectContaining({
         label: BLADE_NAME,
         remaining: turnsBefore - 1,
         suppressedBy: [WARD_NAME],
      }),
   ]);

   // The ward's own permanent entry is listed and carries no suppression.
   /** @type {object|undefined} The ward's report entry, when listed. */
   const wardEntry = report.system.effects[DURATION_PERMANENT].find((entry) => entry.label === WARD_NAME);
   expect(wardEntry, 'the ward is listed in the report').toBeDefined();
   expect(wardEntry.suppressedBy).toBeUndefined();

   // The condition's and the blade's tags are drawn; the ward's entry has none.
   await expect(reportSuppressedTags(report.id)).toHaveCount(2);
   await expect(reportSuppressedTags(report.id).first()).toContainText(WARD_NAME);
});

test('a turn-end report tags a suppressed effect that expired while suppressed', async () => {
   await setWorldSetting(page, 'reportEffects', true);
   await setWorldSetting(page, 'autoDecreaseEffectDuration', true);
   await setWorldSetting(page, 'autoRemoveExpiredEffects', 'disabled');

   /** @type {string} The id of the one-turn timer the ward is immune to. */
   const timerId = await addEffect(page, actorId, TIMER_NAME, {
      duration: DURATION_TURN_END,
      remaining: 1,
   });
   await setWard(true);
   await closeAllApps(page);
   await startEncounter();

   // The actor's turn starts (the opponent acts first), then ends.
   await nextTurnReport('turnStartReport', true);

   /** @type {{id: string, system: object}} The actor's turn-end report. */
   const report = await nextTurnReport('turnEndReport', false);
   await expect.poll(() => readRemaining(timerId), { message: 'the suppressed timer ticked to expiry' }).toBe(0);
   expect(report.system.effects.expired).toEqual([
      expect.objectContaining({
         label: TIMER_NAME,
         suppressedBy: [WARD_NAME],
      }),
   ]);
   await expect(reportSuppressedTags(report.id)).toHaveCount(1);
   await expect(reportSuppressedTags(report.id)).toContainText(WARD_NAME);
});

test('a turn-start report tags suppressed initiative, custom and permanent effects in their own groups', async () => {
   await setWorldSetting(page, 'reportEffects', true);

   /** @type {string[]} The ids of the three effects, in the order of the groups. */
   const ids = [
      await addEffect(page, actorId, INITIATIVE_NAME, {
         duration: DURATION_INITIATIVE,
         initiative: 12,
         remaining: 5,
      }),
      await addEffect(page, actorId, CUSTOM_NAME, {
         duration: DURATION_CUSTOM,
         remaining: 5,
      }),
      await addEffect(page, actorId, PERMANENT_NAME, { duration: DURATION_PERMANENT }),
   ];
   expect(ids, 'the three effects were created before the ward').toHaveLength(3);
   await setWard(true);
   await closeAllApps(page);
   await startEncounter();

   /** @type {{id: string, system: object}} The actor's turn-start report. */
   const report = await nextTurnReport('turnStartReport', true);
   expect(report.system.effects[DURATION_INITIATIVE]).toEqual([
      expect.objectContaining({
         initiative: 12,
         label: INITIATIVE_NAME,
         suppressedBy: [WARD_NAME],
      }),
   ]);
   expect(report.system.effects[DURATION_CUSTOM]).toEqual([
      expect.objectContaining({
         label: CUSTOM_NAME,
         suppressedBy: [WARD_NAME],
      }),
   ]);

   // The permanent group lists the ward unmarked beside the suppressed charm.
   /** @type {object[]} The permanent group's entries by label. */
   const permanent = report.system.effects[DURATION_PERMANENT];
   expect(permanent.find((entry) => entry.label === PERMANENT_NAME).suppressedBy).toEqual([WARD_NAME]);
   expect(permanent.find((entry) => entry.label === WARD_NAME), 'the ward is listed').toBeDefined();
   expect(permanent.find((entry) => entry.label === WARD_NAME).suppressedBy).toBeUndefined();

   // Every entry of the report that names suppressing immunities is tagged, and no other entry is.
   /** @type {number} The entries of the report's conditions and effect groups that carry `suppressedBy`. */
   const suppressedEntries = [
      ...report.system.conditions,
      ...Object.values(report.system.effects).flat(),
   ].filter((entry) => entry.suppressedBy?.length > 0).length;
   expect(suppressedEntries, 'the three new effects are among the suppressed entries').toBeGreaterThanOrEqual(3);
   await expect(reportSuppressedTags(report.id)).toHaveCount(suppressedEntries);
});
