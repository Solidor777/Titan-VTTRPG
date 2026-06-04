import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Effect check-rolling path: an effect that carries a check[] entry can be rolled through the shared
 * item-check engine via the itemRollData passthrough branch, and its roll data exposes the effect's
 * description for the resulting check card.
 *
 * Confirmed against source:
 * TitanActiveEffectDataModel.getRollData() returns { description, duration, check, customTrait, ... };
 * CharacterDataModel.requestItemCheck/getItemCheckParameters branch on options.itemRollData and never touch
 * actor.items.get(id) when roll data is supplied;
 * flags.titan.type for an item check is 'itemCheck'; the mounted card root is '.check-chat-message'.
 */

test.describe('v14 effect check rolling', () => {
   // The fixture actor name and its single seeded effect.
   const ACTOR_NAME = 'E2E Effect Roller';
   const EFFECT_NAME = 'E2E Check Effect';
   const EFFECT_DESCRIPTION = '<p>Inline effect-check description.</p>';

   // Log in and build the actor with one effect carrying a complete check[] entry.
   test.beforeEach(async ({ page }) => {
      const bootErrors = [];
      page.on('pageerror', (err) => {
         bootErrors.push(err.message);
      });

      await login(page);

      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before effect-check walk. Captured page errors:\n${bootErrors.join('\n')}`,
      ).toBe(true);

      await page.evaluate(async ({ actorName, effectName, effectDescription }) => {
         // Remove any stale fixture so each run starts clean.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // The roll-source actor.
         const actor = await Actor.create({ name: actorName, type: 'player' });

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
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME, effectDescription: EFFECT_DESCRIPTION });
   });

   test('effect roll data carries the effect description', async ({ page }) => {
      const description = await page.evaluate(({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.find((e) => e.name === effectName);
         return effect.getRollData().description;
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME });

      expect(description, 'effect roll data exposes the native description').toBe(EFFECT_DESCRIPTION);
   });

   test('effect check rolls, posts an itemCheck message, and renders its card', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      // Roll the effect's check through the shared engine using the itemRollData passthrough.
      const result = await page.evaluate(async ({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.find((e) => e.name === effectName);

         const before = game.messages.size;
         await actor.system.requestItemCheck({ itemRollData: effect.getRollData(), checkIdx: 0 });
         await titanWait(() => game.messages.size > before, { message: 'new chat message' });

         const newest = game.messages.contents[game.messages.size - 1];
         return {
            before,
            after: game.messages.size,
            newestId: newest?.id,
            newestType: newest?.type,
         };
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME });

      expect(result.after, 'message count should increase after the roll').toBeGreaterThan(result.before);
      expect(result.newestType, 'newest message flag type').toBe('itemCheck');

      const rendered = await page.evaluate((messageId) => {
         const li = globalThis.document.querySelector(`.message[data-message-id="${messageId}"]`);
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
