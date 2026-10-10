import { expect, flushPageErrors, test } from './harness.js';
import { readNewestCheckFlags } from './checkDialog.js';
import { rollItemCheck, rollWeaponAttack } from './checkCards.js';
import { castFromSpellSheet } from './spellCasting.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addAttack,
   addCheck,
   addEffect,
   createActor,
   createOwnedItem,
   sendToChat,
   setOwnership,
   typeChatMessage,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps, reloadWorld, showChatLog } from './world.js';

/**
 * Secret (whisper) and GM (blind) chat messages. Four simultaneous clients: E2E GM 1, E2E GM 2, E2E Player 1 (the
 * sender, who owns the character) and E2E Player 2 (a third client that is neither sender nor receiver). Each message
 * kind is posted in every chat visibility mode chosen with the chat log's mode buttons, and every client's chat log
 * DOM is read for it, live, and after a reload. The expected audience of each mode is the audience core documents for
 * it (`ChatMessage.applyMode`, Foundry 14.364 `client/documents/chat-message.mjs`).
 */

/** @type {import('@playwright/test').Page} E2E GM 1. */
let gm;
/** @type {import('@playwright/test').Page} E2E GM 2. */
let gm2;
/** @type {import('@playwright/test').Page} E2E Player 1, the sender who owns the character. */
let p1;
/** @type {import('@playwright/test').Page} E2E Player 2, who is neither sender nor receiver. */
let p2;
/** @type {string[]} Uncaught page errors of GM 1's page. */
let errors;
/** @type {string} The id of the character E2E Player 1 owns. */
let actorId;
/** @type {string} The uuid of the character. */
let actorUuid;
/** @type {Record<string, string>} The uuids of the owned items by kind. */
const uuids = {};

/** @type {{id: string, audience: string[], label: string}[]} Every message the file posted, for the reload test. */
const posted = [];

/** @type {Record<string, string>} The client labels by the audience names used below. */
const CLIENT_NAMES = {
   gm1: 'E2E GM 1',
   gm2: 'E2E GM 2',
   p1: 'E2E Player 1',
   p2: 'E2E Player 2',
};

/**
 * Returns a client page by audience name.
 * @param {string} name - `gm1`, `gm2`, `p1` or `p2`.
 * @returns {import('@playwright/test').Page} The page.
 */
function clientOf(name) {
   return {
      gm1: gm,
      gm2,
      p1,
      p2,
   }[name];
}

/**
 * Chooses the chat visibility mode with the mode button of the chat log and asserts the buttons show it.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} mode - `public`, `gm`, `blind` or `self`.
 * @returns {Promise<void>} Resolves once the button is pressed and the client setting holds the mode.
 */
async function chooseMode(page, mode) {
   await showChatLog(page);
   await page.locator(`#message-modes button[data-mode="${mode}"]`).click();
   await expect(page.locator(`#message-modes button[data-mode="${mode}"]`)).toHaveAttribute('aria-pressed', 'true');
   await expect.poll(() => page.evaluate(() => game.settings.get('core', 'messageMode'))).toBe(mode);
}

/**
 * Opens an owner's sheet and clicks the Body attribute check button, then reads the posted card.
 * @param {import('@playwright/test').Page} page - The client.
 * @returns {Promise<string>} The id of the posted attribute check.
 */
async function rollBody(page) {
   /** @type {number} The message count before the click. */
   const baseline = await page.evaluate(() => game.messages.size);
   await (await openSheetByUuid(page, actorUuid)).getByRole('button', {
      name: 'Body',
      exact: true,
   }).first().click();
   return (await readNewestCheckFlags(page, baseline, 'attributeCheck')).id;
}

/**
 * The audience of each mode for a message a player sends.
 * @type {Record<string, string[]>}
 */
const PLAYER_AUDIENCE = {
   public: [
      'gm1',
      'gm2',
      'p1',
      'p2',
   ],
   gm: [
      'gm1',
      'gm2',
      'p1',
   ],
   blind: [
      'gm1',
      'gm2',
      'p1',
   ],
   self: ['p1'],
};

/**
 * Asserts every client's chat log DOM and message collection for a message.
 * @param {string} id - The message id.
 * @param {string[]} audience - The audience names that see it.
 * @param {string} label - A description for failure messages.
 * @returns {Promise<void>} Resolves once every client matches.
 */
async function expectAudience(id, audience, label) {
   for (const name of Object.keys(CLIENT_NAMES)) {
      /** @type {import('@playwright/test').Page} The client. */
      const page = clientOf(name);
      await showChatLog(page);

      /** @type {boolean} Whether the client should see it. */
      const sees = audience.includes(name);
      await expect(
         page.locator(`#chat .chat-log li[data-message-id="${id}"]`),
         `${label}: ${CLIENT_NAMES[name]} ${sees ? 'sees' : 'does not see'} it in the chat log`,
      ).toHaveCount(sees ? 1 : 0);
      if (!sees) {
         await expect(
            page.locator(`#chat-notifications .chat-log li[data-message-id="${id}"]`),
            `${label}: ${CLIENT_NAMES[name]} has no notification for it`,
         ).toHaveCount(0);
      }
   }
   posted.push({
      id,
      audience,
      label,
   });
}

/**
 * Posts a kind in each mode (public last, so its arrival on every client precedes the absence checks) and asserts
 * every client for each.
 * @param {string} kind - A name for failure messages.
 * @param {() => Promise<string>} post - Posts one message as the sender and returns its id.
 * @param {import('@playwright/test').Page} sender - The sender's client.
 * @param {Record<string, string[]>} audiences - The audience by mode.
 * @returns {Promise<Record<string, string>>} The message ids by mode.
 */
async function postInEveryMode(kind, post, sender, audiences) {
   /** @type {Record<string, string>} The ids by mode. */
   const ids = {};
   for (const mode of [
      'gm',
      'blind',
      'self',
      'public',
   ]) {
      await chooseMode(sender, mode);
      ids[mode] = await post();
   }
   await chooseMode(sender, 'public');
   for (const mode of [
      'public',
      'gm',
      'blind',
      'self',
   ]) {
      await expectAudience(ids[mode], audiences[mode], `${kind} in ${mode} mode`);
   }
   return ids;
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   gm2 = await (await browser.newContext()).newPage();
   await login(gm2, CLIENT_NAMES.gm2);
   p1 = await (await browser.newContext()).newPage();
   await login(p1, CLIENT_NAMES.p1);
   p2 = await (await browser.newContext()).newPage();
   await login(p2, CLIENT_NAMES.p2);

   actorId = await createActor(gm, {
      name: 'E2E Visibility Actor',
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   await setOwnership(gm, actorId, CLIENT_NAMES.p1, 'OWNER');
   uuids.equipment = `${actorUuid}.Item.${await createOwnedItem(gm, actorId, 'equipment', 'E2E Visibility Equipment')}`;
   await addCheck(gm, uuids.equipment, { label: 'E2E Visibility Check' });
   uuids.weapon = `${actorUuid}.Item.${await createOwnedItem(gm, actorId, 'weapon', 'E2E Visibility Weapon')}`;
   await addAttack(gm, uuids.weapon);
   uuids.spell = `${actorUuid}.Item.${await createOwnedItem(gm, actorId, 'spell', 'E2E Visibility Spell')}`;
   for (const type of [
      'ability',
      'armor',
      'commodity',
      'shield',
   ]) {
      uuids[type] = `${actorUuid}.Item.${await createOwnedItem(gm, actorId, type, `E2E Visibility ${type}`)}`;
   }
   uuids.effect = `${actorUuid}.ActiveEffect.${await addEffect(gm, actorId, 'E2E Visibility Effect')}`;
   await closeAllApps(gm);
   await setClientSetting(p1, 'getCheckOptions', 'never');
   for (const page of [
      gm,
      gm2,
      p1,
      p2,
   ]) {
      await showChatLog(page);
   }
});

test.afterEach(async () => {
   for (const page of [
      gm,
      gm2,
      p1,
      p2,
   ]) {
      await closeAllApps(page);
   }
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   for (const page of [
      gm2,
      p1,
      p2,
   ]) {
      await flushPageErrors(page);
      await page?.context().close();
   }
   await gm?.close();
});

test('the mode buttons show the four modes, press one at a time and are per client', async () => {
   await showChatLog(p1);
   await expect(p1.locator('#message-modes button')).toHaveCount(5);
   for (const mode of [
      'gm',
      'blind',
      'self',
      'public',
   ]) {
      await chooseMode(p1, mode);
      for (const other of [
         'public',
         'gm',
         'blind',
         'self',
         'ic',
      ]) {
         await expect(p1.locator(`#message-modes button[data-mode="${other}"]`))
            .toHaveAttribute('aria-pressed', String(other === mode));
      }

      // Another client keeps its own mode.
      expect(await p2.evaluate(() => game.settings.get('core', 'messageMode'))).toBe('public');
   }
});

test('plain chat typed by a player is visible per mode to the right clients only', async () => {
   await postInEveryMode('plain chat', () => typeChatMessage(p1, 'E2E secret words'), p1, PLAYER_AUDIENCE);
});

test('plain chat typed by a GM: GM and blind modes keep it from both players', async () => {
   await postInEveryMode('GM plain chat', () => typeChatMessage(gm, 'E2E GM words'), gm, {
      public: [
         'gm1',
         'gm2',
         'p1',
         'p2',
      ],
      gm: [
         'gm1',
         'gm2',
      ],
      blind: [
         'gm1',
         'gm2',
      ],
      self: ['gm1'],
   });
});

test('a /w whisper from a GM reaches only its receiver and its sender', async () => {
   await chooseMode(gm, 'public');
   /** @type {string} The whisper's id. */
   const id = await typeChatMessage(gm, '/w [E2E Player 2] E2E whisper to player 2');
   const sentinel = await typeChatMessage(gm, 'E2E whisper sentinel');
   await expectAudience(sentinel, Object.keys(CLIENT_NAMES), 'sentinel');
   await expectAudience(id, [
      'gm1',
      'p2',
   ], 'GM whisper to Player 2');
});

test('a /w whisper from a player to a GM reaches only that GM and the sender', async () => {
   /** @type {string} The whisper's id. */
   const id = await typeChatMessage(p1, '/w [E2E GM 2] E2E whisper to GM 2');
   const sentinel = await typeChatMessage(p1, 'E2E whisper sentinel 2');
   await expectAudience(sentinel, Object.keys(CLIENT_NAMES), 'sentinel 2');
   await expectAudience(id, [
      'p1',
      'gm2',
   ], 'player whisper to GM 2');
});

test('attribute checks follow the mode and a blind one shows the owner the private-roll text', async () => {
   const ids = await postInEveryMode('attribute check', () => rollBody(p1), p1, PLAYER_AUDIENCE);
   await showChatLog(p1);
   await expect(p1.locator(`#chat li[data-message-id="${ids.blind}"]`)).toContainText('Rolled a Blind Check.');
   await expect(p1.locator(`#chat li[data-message-id="${ids.blind}"] .results`)).toHaveCount(0);
   await expect(gm.locator(`#chat li[data-message-id="${ids.blind}"]`)).not.toContainText('Rolled a Blind Check.');
   await expect(gm.locator(`#chat li[data-message-id="${ids.blind}"] .results`)).toHaveCount(1);
   await expect(p1.locator(`#chat li[data-message-id="${ids.public}"] .results`)).toHaveCount(1);
   await expect(p2.locator(`#chat li[data-message-id="${ids.public}"] .results`)).toHaveCount(1);

   // The TITAN visibility badge names the audience.
   for (const [mode, text] of Object.entries({
      public: 'Public',
      gm: 'Secret',
      blind: 'GM Only',
      self: 'Secret',
   })) {
      await expect(p1.locator(`#chat li[data-message-id="${ids[mode]}"] .titan-visibility-badge`)).toHaveText(text);
   }
});

test('item checks follow the mode', async () => {
   await postInEveryMode('item check', async () => (await rollItemCheck(p1, uuids.equipment)).id, p1, PLAYER_AUDIENCE);
});

test('attack checks follow the mode', async () => {
   await postInEveryMode(
      'attack check',
      async () => (await rollWeaponAttack(p1, uuids.weapon)).id,
      p1,
      PLAYER_AUDIENCE,
   );
});

test('casting checks follow the mode', async () => {
   await postInEveryMode(
      'casting check',
      async () => (await castFromSpellSheet(p1, uuids.spell)).id,
      p1,
      PLAYER_AUDIENCE,
   );
});

for (const kind of [
   'equipment',
   'weapon',
   'spell',
   'ability',
   'armor',
   'commodity',
   'shield',
]) {
   test(`the ${kind} chat card follows the mode`, async () => {
      await postInEveryMode(`${kind} card`, () => sendToChat(p1, uuids[kind]), p1, PLAYER_AUDIENCE);
   });
}

test('the effect chat card follows the mode', async () => {
   await postInEveryMode('effect card', () => sendToChat(p1, uuids.effect), p1, PLAYER_AUDIENCE);
});

test('the initiative roll of the sheet button shows its dice only to the audience of its mode', async () => {
   /** @type {Record<string, string[]>} Who sees the dice of the roll; core shows a roll's card to everyone. */
   const content = {
      public: PLAYER_AUDIENCE.public,
      gm: PLAYER_AUDIENCE.gm,
      blind: [
         'gm1',
         'gm2',
      ],
      self: ['p1'],
   };
   /** @type {Record<string, string>} The roll message ids by mode. */
   const ids = {};
   for (const mode of [
      'gm',
      'blind',
      'self',
      'public',
   ]) {
      await chooseMode(p1, mode);

      /** @type {number} The message count before the click. */
      const baseline = await p1.evaluate(() => game.messages.size);
      await (await openSheetByUuid(p1, actorUuid)).getByRole('button', { name: /Initiative/ }).first().click();
      await expect.poll(async () => {
         ids[mode] = await p1.evaluate(
            (baseline) => game.messages.contents.slice(baseline).find((m) => m.flags.core?.initiativeRoll)?.id ?? null,
            baseline,
         );
         return ids[mode];
      }, { message: 'the initiative button posted a roll' }).not.toBeNull();
   }
   await chooseMode(p1, 'public');
   for (const mode of Object.keys(ids)) {
      for (const name of Object.keys(CLIENT_NAMES)) {
         await showChatLog(clientOf(name));

         /** @type {import('@playwright/test').Locator} The roll's chat log entry on the client. */
         const entry = clientOf(name).locator(`#chat .chat-log li[data-message-id="${ids[mode]}"]`);
         await expect(entry, `${mode}: ${CLIENT_NAMES[name]} has the roll's entry`).toHaveCount(1);
         await expect(
            entry.locator('.dice-total'),
            `${mode}: ${CLIENT_NAMES[name]} ${content[mode].includes(name) ? 'sees' : 'does not see'} the dice`,
         ).toHaveCount(content[mode].includes(name) ? 1 : 0);
      }
   }
});

test('after a reload every client shows the same messages', async () => {
   expect(posted.length, 'earlier tests posted messages').toBeGreaterThan(0);
   for (const name of Object.keys(CLIENT_NAMES)) {
      /** @type {import('@playwright/test').Page} The client. */
      const page = clientOf(name);
      await reloadWorld(page);
      await showChatLog(page);
      for (const { id, audience, label } of posted.slice(-90)) {
         await expect(
            page.locator(`#chat .chat-log li[data-message-id="${id}"]`),
            `after reload, ${CLIENT_NAMES[name]} ${audience.includes(name) ? 'sees' : 'does not see'} ${label}`,
         ).toHaveCount(audience.includes(name) ? 1 : 0);
      }
   }
});
