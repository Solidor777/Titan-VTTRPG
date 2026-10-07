import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   closeAllApps,
   controlFixtureActorToken,
   deleteFixtureActor,
   deleteOrphanedTokens,
   reloadWorld,
   showChatLog,
} from './world.js';

/**
 * A condition's description comes from its definition, localized on the reading client, never from text stored on the
 * effect: a turn-start report stores the description's localization key and its condition tag's tooltip shows that text
 * alone, localized once (also for an actor with conditions and no other effect), and a turn-start effect is tagged with
 * the Turn Start tag, whose tooltip leads with its duration. A report posted before conditions stored keys shows its
 * stored text. The Player HUD's condition text is tested in `logic/conditions.spec.js`.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Condition Description Actor';

/** @type {string} The localized description text an older turn-start report stored for its condition. */
const LEGACY_REPORT_TEXT = '<p>E2E legacy report description</p>';

/**
 * The world settings this spec pins while it runs: turn-start reports list effects and conditions, and nothing expires
 * away mid-test.
 * @type {Record<string, *>}
 */
const PINNED_SETTINGS = {
   autoRemoveExpiredEffects: 'disabled',
   reportEffects: true,
};

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {Record<string, *>} The pinned settings' values before this spec. */
let originalSettings;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await showChatLog(page);
   await deleteOrphanedTokens(page);
   await deleteFixtureActor(page, ACTOR_NAME);
   originalSettings = await page.evaluate(async ({ name, pinned }) => {
      /** @type {Record<string, *>} The values the pinned settings held. */
      const original = {};
      for (const [key, value] of Object.entries(pinned)) {
         original[key] = game.settings.get('titan', key);
         await game.settings.set('titan', key, value);
      }
      await game.settings.set('titan', 'playerHudOptions', {});
      await Actor.create({
         name,
         type: 'player',
      });
      return original;
   }, {
      name: ACTOR_NAME,
      pinned: PINNED_SETTINGS,
   });
   await controlFixtureActorToken(page, {
      actorName: ACTOR_NAME,
      fallbackSceneName: 'E2E Player HUD Scene',
   });
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async (original) => {
      await game.settings.set('titan', 'playerHudOptions', {});
      for (const [key, value] of Object.entries(original)) {
         await game.settings.set('titan', key, value);
      }
   }, originalSettings);
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Reads the tooltip content of the first tag on a chat message's report card.
 * @param {string} messageId - The chat message id.
 * @returns {Promise<string|undefined>} The tooltip content tippy holds.
 */
function readReportTagTooltip(messageId) {
   return page.locator(`#chat .message[data-message-id="${messageId}"] .report .effects .tag`).first()
      .evaluate((element) => element._tippy?.props?.content);
}

test('a turn-start report stores the description key and its tooltip shows the text, with no effect', async () => {
   /** @type {{id: string, conditions: object[], expected: string, label: string}} The report and the text it shows. */
   const report = await page.evaluate(async (name) => {
      /** @type {TitanActor} The fixture actor, reset to Blinded alone (no effect-subtype Active Effect). */
      const actor = game.actors.getName(name);
      await actor.deleteEmbeddedDocuments('ActiveEffect', actor.effects.map((effect) => effect.id));
      await actor.toggleStatusEffect('blinded', { active: true });

      /** @type {number} The chat-message count before the turn start. */
      const before = game.messages.size;
      await actor.system.onTurnStart();
      await titanWait(() => game.messages.size > before, { message: 'turn-start report posted' });

      /** @type {ChatMessage} The report. */
      const message = game.messages.contents.at(-1);
      return {
         conditions: message.system.toObject().conditions,
         expected: foundry.utils.cleanHTML(game.i18n.localize('LOCAL.blinded.desc.text')),
         id: message.id,
         label: game.i18n.localize('LOCAL.blinded.text'),
      };
   }, ACTOR_NAME);

   expect(report.conditions).toEqual([
      {
         descriptionKey: 'blinded.desc',
         img: expect.any(String),
         label: report.label,
      },
   ]);

   /** @type {import('@playwright/test').Locator} The report card's Blinded tag. */
   const tag = page.locator(`#chat .message[data-message-id="${report.id}"] .report .effects .tag`).first();
   await expect(tag).toContainText(report.label);
   await expect.poll(() => readReportTagTooltip(report.id), { message: 'the tag\'s tooltip is the localized text' })
      .toBe(report.expected);
   expect(await readReportTagTooltip(report.id)).not.toContain('LOCAL.');
});

test('a turn-start report posted before conditions stored keys shows its stored description', async () => {
   /** @type {{id: string, label: string}} The older report and its condition's label. */
   const report = await page.evaluate(async ({ name, legacyText }) => {
      /** @type {TitanActor} The fixture actor. */
      const actor = game.actors.getName(name);

      /** @type {string} Blinded's localized name. */
      const label = game.i18n.localize('LOCAL.blinded.text');

      /** @type {ChatMessage} A turn-start report in the older shape: localized description text, no key. */
      const message = await ChatMessage.create({
         speaker: { alias: actor.name },
         system: {
            actorImg: actor.img,
            actorName: actor.name,
            conditions: [
               {
                  description: legacyText,
                  img: 'icons/svg/blind.svg',
                  label,
               },
            ],
         },
         type: 'turnStartReport',
      });
      return {
         id: message.id,
         label,
      };
   }, {
      legacyText: LEGACY_REPORT_TEXT,
      name: ACTOR_NAME,
   });

   /** @type {import('@playwright/test').Locator} The older report card's condition tag. */
   const tag = page.locator(`#chat .message[data-message-id="${report.id}"] .report .effects .tag`).first();
   await expect(tag).toContainText(report.label);
   await expect.poll(() => readReportTagTooltip(report.id), { message: 'the tag\'s tooltip is the stored text' })
      .toBe(await page.evaluate((text) => foundry.utils.cleanHTML(text), LEGACY_REPORT_TEXT));
   expect(await readReportTagTooltip(report.id)).not.toContain('LOCAL.');
});

test('a turn-start report tags a turn-start effect with the Turn Start tag and its duration lead', async () => {
   /** @type {{expected: string, id: string, labels: string[]}} The report, and its turn-start tag's expected lead. */
   const report = await page.evaluate(async (name) => {
      /** @type {TitanActor} The fixture actor, reset to one turn-start effect. */
      const actor = game.actors.getName(name);
      await actor.deleteEmbeddedDocuments('ActiveEffect', actor.effects.map((effect) => effect.id));
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Turn Start Effect',
            system: {
               duration: {
                  remaining: 3,
                  type: 'turnStart',
               },
            },
            type: 'effect',
         },
      ]);

      /** @type {number} The chat-message count before the turn start. */
      const before = game.messages.size;
      await actor.system.onTurnStart();
      await titanWait(() => game.messages.size > before, { message: 'turn-start report posted' });

      /** @type {ChatMessage} The report. */
      const message = game.messages.contents.at(-1);
      return {
         expected: foundry.utils.cleanHTML(game.i18n.localize('LOCAL.effect.turnStart.desc.text')),
         id: message.id,
         labels: (message.system.toObject().effects?.turnStart ?? []).map((entry) => entry.label),
      };
   }, ACTOR_NAME);
   expect(report.labels).toEqual(['E2E Turn Start Effect']);

   /** @type {import('@playwright/test').Locator} The report's turn-start effect entry. */
   const entry = page.locator(`#chat .message[data-message-id="${report.id}"] .report .effects .effect`, {
      hasText: 'E2E Turn Start Effect',
   });
   await expect(entry.locator('i.fa-hourglass-start')).toHaveCount(1);

   // The Turn Start icon rendered above (the positive edge); the Turn End icon had to be absent from the same entry.
   await expect(entry.locator('i.fa-hourglass-end')).toHaveCount(0);
   await expect.poll(() => entry.locator('.tag .tag').evaluate((element) => element._tippy?.props?.content))
      .toBe(report.expected);
});

// The last test of the file: it reloads the page and leaves its new fallback scene active.
test('with no scene active, the fixture token is placed on a fully drawn fallback scene', async () => {
   // A world boot inside the test exceeds the 60 s default under the throttled runner.
   test.setTimeout(120_000);

   // Precondition, established here: no scene is active and the client boots with a blank canvas. Only a test scene
   // may be deactivated, and Foundry has no control that deactivates a scene, so the flag is cleared directly. The
   // earlier tests add effects, whose scrolling text core animates for 2 s on the interface group, so the page reloads
   // first, which ends those animations, and then the scene is deactivated and the page reloads again to boot with a
   // blank canvas.
   /** @type {string|null} The name of the scene active at the start, if any. */
   const activeName = await page.evaluate(() => game.scenes.active?.name ?? null);
   expect(activeName === null || activeName.startsWith('E2E '), `the active scene is a test scene: ${activeName}`)
      .toBe(true);

   // Deactivating the viewed scene while core's scrolling text animates throws (OPEN_BUGS #114). The reload leaves none
   // running.
   await reloadWorld(page);
   expect(await page.evaluate(() => Reflect.ownKeys(foundry.canvas.animation.CanvasAnimation.animations)
      .some((key) => foundry.canvas.animation.CanvasAnimation.animations[key].context === canvas.interface)),
   'no scrolling text animates on the interface group').toBe(false);
   await page.evaluate(async () => {
      await game.scenes.active?.update({ active: false });
   });
   await reloadWorld(page);
   expect(await page.evaluate(() => ({
      active: game.scenes.active?.id ?? null,
      viewed: canvas.scene?.id ?? null,
   })), 'no scene is active or drawn').toEqual({
      active: null,
      viewed: null,
   });

   /** @type {string} A fallback scene name no earlier run used, so the helper creates and activates the scene. */
   const sceneName = `E2E Fallback Scene ${Date.now()}`;
   await controlFixtureActorToken(page, {
      actorName: ACTOR_NAME,
      fallbackSceneName: sceneName,
   });

   // The token sits on the new scene's token layer, and the canvas has finished drawing that scene.
   /** @type {{viewed: string, ready: boolean, parented: boolean, client: {x: number, y: number}}} The placement. */
   const placed = await page.evaluate(async (name) => {
      /** @type {Token} The actor's token on the viewed scene. */
      const token = canvas.tokens.placeables.find((placeable) => placeable.actor?.name === name);
      canvas.pan({
         x: token.center.x,
         y: token.center.y,
      });

      // Pointer hit-testing reads the transforms of the last rendered frame, so a click is aimed only after the panned
      // stage has rendered.
      await new Promise((resolve) => {
         requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
         });
      });
      return {
         viewed: canvas.scene?.name,
         ready: canvas.ready,
         parented: token.parent === canvas.tokens.objects,
         client: canvas.clientCoordinatesFromCanvas(token.center),
      };
   }, ACTOR_NAME);
   expect({
      viewed: placed.viewed,
      ready: placed.ready,
      parented: placed.parented,
   }).toEqual({
      viewed: sceneName,
      ready: true,
      parented: true,
   });

   // Change the actor through the token HUD: the actor update re-renders the token through its render flags, which
   // read the token layer of a fully drawn scene. The afterEach hook asserts no page error.
   await expect.poll(() => page.evaluate((name) => game.actors.getName(name).statuses.has('deafened'), ACTOR_NAME))
      .toBe(false);
   await page.mouse.click(placed.client.x, placed.client.y, { button: 'right' });
   await expect(page.locator('#token-hud')).toBeVisible();
   await page.locator('#token-hud [data-action="togglePalette"][data-palette="effects"]').click();
   await page.locator('#token-hud .effect-control[data-status-id="deafened"]').click();
   await expect.poll(() => page.evaluate((name) => game.actors.getName(name).statuses.has('deafened'), ACTOR_NAME))
      .toBe(true);
});
