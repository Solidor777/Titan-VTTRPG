import { expect, test } from './harness.js';
import { DURATION_PERMANENT } from '~/system/DurationTypes.js';
import { login } from './fixtures.js';
import {
   activateScene,
   addEffect,
   addRulesElement,
   applyCondition,
   createActor,
   placeToken,
   removeCondition,
   restOnToken,
   setOwnership,
   shared,
   viewScene,
} from './flows.js';
import { withClients } from './multiClient.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Falling Unconscious on real Characters with placed tokens, through the Token HUD: the Unconscious condition also
 * applies Prone and Incapacitated, each once and only if absent, and removing Unconscious leaves both. A Character
 * immune to Prone gains Incapacitated, and the refusal is notified as for any other application. When a Player applies
 * Unconscious while a GM is logged in, only the Player's client applies Prone and Incapacitated.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

/**
 * What a test works on: a Character with a token.
 * @typedef {object} Subject
 * @property {string} actorId - The world actor's id.
 * @property {string} actorUuid - The world actor's uuid.
 * @property {string} tokenId - The id of the actor's placed token.
 */

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await viewScene(page, await shared(page, 'scene'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Creates a Character and places its token.
 * @param {string} name - The actor's name.
 * @param {{column: number, row: number}} [square] - The grid square to drop the token on; by default the next free
 * spot.
 * @returns {Promise<Subject>} Resolves with the created Character and its token.
 */
async function createSubject(name, square = undefined) {
   /** @type {string} The id of the new actor. */
   const actorId = await createActor(page, {
      name,
      type: 'player',
   });
   return {
      actorId,
      actorUuid: `Actor.${actorId}`,
      tokenId: await placeToken(page, actorId, { square }),
   };
}

/**
 * Counts the effects of a token's actor that carry each of the three conditions.
 * @param {Subject} subject - The Character whose token is read.
 * @returns {Promise<{incapacitated: number, prone: number, unconscious: number}>} The effect counts.
 */
function readConditions(subject) {
   return page.evaluate((tokenId) => {
      /** @type {TitanActor} The token's actor. */
      const actor = canvas.scene.tokens.get(tokenId).actor;

      /**
       * Counts the effects carrying a status.
       * @param {string} id - The status id.
       * @returns {number} How many of the actor's effects carry the status.
       */
      const count = (id) => actor.effects.filter((effect) => effect.statuses.has(id)).length;
      return {
         incapacitated: count('incapacitated'),
         prone: count('prone'),
         unconscious: count('unconscious'),
      };
   }, subject.tokenId);
}

test('falling Unconscious adds Prone and Incapacitated once, and removing Unconscious leaves them', async () => {
   /** @type {Subject} The Character. */
   const subject = await createSubject('E2E Unconscious Sleeper');
   expect(await readConditions(subject), 'the Character holds none of the conditions').toEqual({
      incapacitated: 0,
      prone: 0,
      unconscious: 0,
   });

   await applyCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'Unconscious brought its companions' }).toEqual({
      incapacitated: 1,
      prone: 1,
      unconscious: 1,
   });

   await removeCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'removing Unconscious left its companions' }).toEqual({
      incapacitated: 1,
      prone: 1,
      unconscious: 0,
   });
});

test('a Character that is already Prone gains no second Prone', async () => {
   /** @type {Subject} The Character. */
   const subject = await createSubject('E2E Unconscious Prone Sleeper');
   await applyCondition(page, subject.tokenId, 'prone');
   expect((await readConditions(subject)).prone, 'the Character is Prone before it falls Unconscious').toBe(1);

   await applyCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'Unconscious brought Incapacitated alone' }).toEqual({
      incapacitated: 1,
      prone: 1,
      unconscious: 1,
   });
});

test('a Character immune to Prone falls Unconscious and Incapacitated, and the refusal is notified', async () => {
   /** @type {Subject} The Character. */
   const subject = await createSubject('E2E Unconscious Immune Sleeper');

   /** @type {string} The id of the effect that grants the immunity. */
   const wardId = await addEffect(page, subject.actorId, 'E2E Unconscious Prone Ward', {
      duration: DURATION_PERMANENT,
   });
   await addRulesElement(page, `${subject.actorUuid}.ActiveEffect.${wardId}`, {
      key: 'prone',
      operation: 'immunity',
      selector: 'condition',
   });
   await closeAllApps(page);

   await applyCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'Unconscious brought Incapacitated alone' }).toEqual({
      incapacitated: 1,
      prone: 0,
      unconscious: 1,
   });

   // The refusal of Prone is a warning notification; dismissing it with a click, as a user does, ends it.
   /** @type {import('@playwright/test').Locator} The refusal notification. */
   const notice = page.locator('#notifications .notification.warning', { hasText: /is immune to/i });
   await expect(notice).toHaveCount(1);
   await notice.click();
   await expect(notice).toHaveCount(0);
});

test('only the client that creates Unconscious applies its companions', async ({ browser }) => {
   /** @type {Subject} The Character, owned by E2E Player 1. */
   // The token stands in the upper middle of the view, clear of the sidebar and the Player HUD that cover the
   // Player's canvas at the edges.
   /** @type {{column: number, row: number}} The square at the middle of the viewed scene, shifted up and left. */
   const square = await page.evaluate(() => ({
      column: Math.round(canvas.stage.pivot.x / canvas.grid.size) - 3,
      row: Math.round(canvas.stage.pivot.y / canvas.grid.size) - 3,
   }));
   const subject = await createSubject('E2E Unconscious Seats Sleeper', square);
   await setOwnership(page, subject.actorId, 'E2E Player 1', 'OWNER');

   // Players view the active scene; the scene is restored after the test.
   /** @type {string} The id of the scene the tokens stand on. */
   const sceneId = await shared(page, 'scene');

   /** @type {string|undefined} The id of the scene that was active before. */
   const previousActiveId = await page.evaluate(() => game.scenes.active?.id);
   if (previousActiveId !== sceneId) {
      await activateScene(page, sceneId);
   }
   try {
      await withClients(browser, { player: 'E2E Player 1' }, async ({ player }) => {
         /**
          * Counts, on a client, the calls its Actor class receives to toggle Prone on.
          * @param {import('@playwright/test').Page} client - The client's page.
          * @returns {Promise<void>} Resolves once the counter wraps the toggle method.
          */
         const countProneToggles = (client) => client.evaluate(() => {
            /** @type {Function} The Actor class's toggle method. */
            const original = CONFIG.Actor.documentClass.prototype.toggleStatusEffect;
            window.proneToggles = 0;
            CONFIG.Actor.documentClass.prototype.toggleStatusEffect = function toggleStatusEffect(statusId, ...rest) {
               if (statusId === 'prone') {
                  window.proneToggles++;
               }
               return original.call(this, statusId, ...rest);
            };
         });
         await countProneToggles(page);
         await countProneToggles(player);

         // The Player's only token is controlled on joining and the Escape key does not release it, so the Player
         // opens the Token HUD on it directly instead of through the GM-seat flow.
         // A window Foundry opens for the joined Player (the User Configuration) can cover the token.
         await closeAllApps(player);
         /** @type {{x: number, y: number}} The token's centre in the Player's client coordinates. */
         const centre = await player.evaluate((tokenId) => canvas.clientCoordinatesFromCanvas(
            canvas.scene.tokens.get(tokenId).object.center,
         ), subject.tokenId);
         await restOnToken(player, subject.tokenId, centre);
         await player.mouse.click(centre.x, centre.y, { button: 'right' });

         /** @type {import('@playwright/test').Locator} The Player's Token HUD. */
         const hud = player.locator('#token-hud');
         await expect(hud).toBeVisible();
         await hud.locator('[data-action="togglePalette"][data-palette="effects"]').click();
         await hud.locator('.effect-control[data-status-id="unconscious"]').click();
         await expect.poll(() => readConditions(subject), { message: 'Unconscious brought its companions' }).toEqual({
            incapacitated: 1,
            prone: 1,
            unconscious: 1,
         });
         expect(
            await Promise.all([
               player.evaluate(() => window.proneToggles),
               page.evaluate(() => window.proneToggles),
            ]),
            'the creating client toggled Prone once and the other client did not',
         ).toEqual([
            1,
            0,
         ]);
      });
   }
   finally {
      if (previousActiveId !== sceneId) {
         await page.evaluate(async ({ previousActiveId, sceneId }) => {
            await game.scenes.get(previousActiveId ?? sceneId).update({ active: previousActiveId !== undefined });
         }, {
            previousActiveId,
            sceneId,
         });
      }
   }
});
