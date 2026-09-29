import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Effect check-rolling path, as the product rolls it (character-sheet effect rows, the Effect HUD, and the Player HUD
 * action menu): `requestItemCheck({ effectId, checkIdx })`, which the shared item-check engine resolves through the
 * Actor's applicable effects and reads live. The posted check is the `itemCheck` chat-message subtype, whose
 * parameters (in `message.system.parameters`) carry the effect's check label and description, and whose mounted card
 * root is `.check-chat-message`. The item chat card's roll-data snapshot path is covered by effect-chat-card.spec.js.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // The chat log must be on screen: cards in a collapsed sidebar sit outside the viewport.
   await showChatLog(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('v14 effect check rolling', () => {
   // The fixture actor name and its single seeded effect.
   const ACTOR_NAME = 'E2E Effect Roller';
   const EFFECT_NAME = 'E2E Check Effect';
   const EFFECT_DESCRIPTION = '<p>Inline effect-check description.</p>';

   // Build the actor with one effect carrying a complete check[] entry.
   test.beforeEach(async () => {
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before effect-check walk. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);

      await page.evaluate(async ({ actorName, effectName, effectDescription }) => {
         // Remove any stale fixture so each run starts clean.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // The roll-source actor.
         const actor = await Actor.create({
            name: actorName,
            type: 'player',
         });

         // One effect with a description and a single COMPLETE check[] entry. The check object mirrors
         // createItemCheckTemplate() (src/check/types/item-check/ItemCheckTemplate.js) — the template
         // module is not importable in the browser context, so the full default object is inlined;
         // omitting fields like opposedCheck makes getItemCheckParameters throw.
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               description: effectDescription,
               system: {
                  check: [
                     {
                        attribute: 'body',
                        complexity: 1,
                        damageReducedBy: 'none',
                        difficulty: 4,
                        initialValue: 1,
                        isDamage: false,
                        isHealing: false,
                        label: 'E2E Effect Check',
                        opposedCheck: {
                           attribute: 'body',
                           enabled: false,
                           skill: 'athletics',
                        },
                        resistanceCheck: 'none',
                        resolveCost: 0,
                        scaling: true,
                        skill: 'arcana',
                        uuid: 'e2effec7-e2ef-4fec-8fec-e2effec7e2ef',
                     },
                  ],
               },
            },
         ]);
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
         effectDescription: EFFECT_DESCRIPTION,
      });
   });

   test('effect roll data carries the effect description', async () => {
      const description = await page.evaluate(({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.find((e) => e.name === effectName);
         return effect.getRollData().description;
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
      });

      expect(description, 'effect roll data exposes the native description').toBe(EFFECT_DESCRIPTION);
   });

   test('effect check requested by effect ID rolls the live effect, posts an itemCheck message, and renders its ' +
      'card', async () => {
      // Roll the effect's check the way the product does: by effect ID, resolved live by the engine.
      const result = await page.evaluate(async ({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.find((e) => e.name === effectName);

         const before = game.messages.size;
         await actor.system.requestItemCheck({
            checkIdx: 0,
            effectId: effect.id,
         });
         await titanWait(() => game.messages.size > before, { message: 'new chat message' });

         const newest = game.messages.contents[game.messages.size - 1];
         return {
            before,
            after: game.messages.size,
            checkLabel: newest?.system.parameters?.checkLabel,
            itemDescription: newest?.system.parameters?.itemDescription,
            newestId: newest?.id,
            newestType: newest?.type,
         };
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
      });

      expect(result.after, 'message count should increase after the roll').toBeGreaterThan(result.before);
      expect(result.newestType, 'newest message subtype').toBe('itemCheck');
      expect(result.checkLabel, 'the rolled check is the effect\'s check').toBe('E2E Effect Check');
      expect(result.itemDescription, 'the rolled check carries the effect\'s description').toBe(EFFECT_DESCRIPTION);

      // Creating the ChatMessage document does not render it: the log entry mounts asynchronously, so
      // the one-shot DOM read below is gated on the mounted card rather than racing the mount.
      await expect(page.locator(`#chat .message[data-message-id="${result.newestId}"] .check-chat-message`).first())
         .toBeAttached();

      const rendered = await page.evaluate((messageId) => {
         const li = globalThis.document.querySelector(`#chat .message[data-message-id="${messageId}"]`);
         return {
            hasElement: !!li,
            hasTitanClass: !!li?.classList.contains('titan'),
            hasCard: !!li?.querySelector('.check-chat-message'),
         };
      }, result.newestId);

      expect(rendered.hasElement, 'rendered chat-log element exists').toBe(true);
      expect(rendered.hasTitanClass, 'rendered element carries the titan class').toBe(true);
      expect(rendered.hasCard, 'mounted check-chat-message card is present').toBe(true);

      expect(errors, `uncaught errors during effect roll/render:\n${errors.join('\n')}`).toEqual([]);
   });
});
