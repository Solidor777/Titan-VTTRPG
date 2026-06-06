import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/**
 * Effect chat cards are first-class `ChatMessage` subtypes (Phase 4). `effect.sendToChat()` creates a
 * message whose `type` is 'effect' and whose `system` is the effect's prepared roll-data snapshot
 * (duration/check/customTrait/rulesElement/description plus `name`/`img`); the message self-renders
 * via `TitanChatMessage#renderHTML`. This spec asserts the posted subtype, the rendered card content
 * (name, description, custom trait), and that the card's embedded check button rolls an itemCheck
 * through the controlled character. It also locks in the dark-mode-'all' relocation: with the
 * legacy hook deleted, non-TITAN messages must still receive the titan-dark-mode class from
 * TitanChatMessage#renderHTML when the setting is 'all'.
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
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

// The fixture actor (with a controlled token) and its single seeded effect.
const ACTOR_NAME = 'E2E Effect Card Actor';
const EFFECT_NAME = 'E2E Card Effect';
const EFFECT_DESCRIPTION = '<p>Effect card description body.</p>';
const TRAIT_NAME = 'E2E Card Trait';
const CHECK_LABEL = 'E2E Effect Card Check';

test.describe('effect chat-message subtype card', () => {
   // Build the actor with a controlled token (the card's check button rolls for controlled character
   // tokens) and one effect carrying a description, a custom trait, and a complete check[] entry.
   test.beforeEach(async () => {
      await page.evaluate(async ({ actorName, effectName, effectDescription, traitName, checkLabel }) => {
         // Remove any stale fixture so each run starts clean.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // Create the actor and place a token for it on the active scene.
         const actor = await Actor.create({ name: actorName, type: 'player' });
         const scene = game.scenes.active ?? (await Scene.create({ name: 'E2E Effect Card Scene', active: true }));
         const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
            await actor.getTokenDocument({ x: 100, y: 100 }),
         ]);

         // Poll until the placeable is drawn on the canvas, then control it. A fixed delay races canvas
         // readiness and can no-op when the placeable is not yet drawn.
         await new Promise((resolve) => {
            /** @type {number} The remaining poll attempts before giving up. */
            let attempts = 50;

            /** @type {number} The interval handle used to poll for the placeable. */
            const handle = setInterval(() => {
               attempts -= 1;
               if (tokenDoc.object || attempts <= 0) {
                  clearInterval(handle);
                  resolve();
               }
            }, 50);
         });
         tokenDoc.object?.control({ releaseOthers: true });

         // One effect with a description, a custom trait, and a single COMPLETE check[] entry. The
         // check object mirrors createItemCheckTemplate() (src/check/types/item-check/
         // ItemCheckTemplate.js) — the template module is not importable in the browser context, so
         // the full default object is inlined; omitting fields like opposedCheck makes
         // getItemCheckParameters throw.
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               description: effectDescription,
               system: {
                  customTrait: [
                     {
                        name: traitName,
                        description: 'Trait for the effect card e2e.',
                        uuid: 'e2ecafd0-e2ec-4afd-8afd-e2ecafd0e2ec',
                     },
                  ],
                  check: [
                     {
                        attribute: 'body',
                        complexity: 1,
                        damageReducedBy: 'none',
                        difficulty: 4,
                        initialValue: 1,
                        isDamage: false,
                        isHealing: false,
                        label: checkLabel,
                        opposedCheck: {
                           attribute: 'body',
                           enabled: false,
                           skill: 'athletics',
                        },
                        resistanceCheck: 'none',
                        resolveCost: 0,
                        scaling: true,
                        skill: 'arcana',
                        uuid: 'e2ecafd1-e2ec-4afd-8afd-e2ecafd1e2ec',
                     },
                  ],
               },
            },
         ]);
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
         effectDescription: EFFECT_DESCRIPTION,
         traitName: TRAIT_NAME,
         checkLabel: CHECK_LABEL,
      });
   });

   test('sendToChat posts an effect subtype whose card renders and whose check button rolls', async () => {
      // Post the effect's chat card and report the new message's id and subtype.
      const result = await page.evaluate(async ({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.find((e) => e.name === effectName);

         // Snapshot the message count so the post can be awaited deterministically.
         const before = game.messages.size;
         const message = await effect.sendToChat();
         await titanWait(() => game.messages.size > before, { message: 'new chat message' });

         return {
            before,
            after: game.messages.size,
            messageId: message?.id,
            messageType: message?.type,
         };
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME });

      // A new message must have been created with the effect subtype.
      expect(result.after, 'message count should increase after sendToChat').toBeGreaterThan(result.before);
      expect(result.messageId, 'posted message id').toBeTruthy();
      expect(result.messageType, 'message subtype is effect').toBe('effect');

      // The mounted effect card must be present and visible in the rendered chat log.
      const card = page.locator(`.message[data-message-id="${result.messageId}"] .item-chat-message`).first();
      await expect(card, 'mounted effect card is visible').toBeVisible();

      // The snapshot name, description, and custom trait must render on the card.
      await expect(card.getByText(EFFECT_NAME, { exact: false }), 'card displays the effect name').toBeVisible();
      await expect(
         card.getByText('Effect card description body.', { exact: false }),
         'card displays the effect description',
      ).toBeVisible();
      await expect(card.getByText(TRAIT_NAME, { exact: false }), 'card displays the custom trait').toBeVisible();

      // Click the embedded check button and await the resulting itemCheck message (the button rolls
      // through the controlled character token).
      const beforeRoll = await page.evaluate(() => game.messages.size);
      await card.getByRole('button').filter({ hasText: CHECK_LABEL }).first().click();
      await expect
         .poll(
            () => page.evaluate((count) => {
               const newest = game.messages.contents[game.messages.size - 1];
               return game.messages.size > count ? newest?.type : undefined;
            }, beforeRoll),
            { message: 'check click posts an itemCheck message' },
         )
         .toBe('itemCheck');

      // No uncaught errors may have fired during the card lifecycle.
      expect(errors, `uncaught errors during effect card lifecycle:\n${errors.join('\n')}`).toEqual([]);
   });

   test('dark mode "all" classes non-TITAN messages; "systemOnly" does not', async () => {
      // Render a plain (non-TITAN) message under each dark-mode setting and report the classes the
      // chat-log element received from TitanChatMessage#renderHTML (the relocated legacy-hook branch).
      const observed = await page.evaluate(async () => {
         /** @type {string} The original setting value, restored after the probe. */
         const original = game.settings.get('titan', 'darkModeChatMessages');

         /**
          * Posts a plain chat message under the given dark-mode setting and reads back the rendered
          * chat-log element's relevant classes.
          * @param {string} settingValue - The darkModeChatMessages value to probe under.
          * @returns {Promise<object>} The observed { darkMode, titan } class flags.
          */
         async function probe(settingValue) {
            await game.settings.set('titan', 'darkModeChatMessages', settingValue);
            const message = await ChatMessage.create({ content: `Dark-mode probe ${settingValue}` });
            await titanWait(
               () => !!globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`),
               { message: 'plain message rendered' },
            );
            const li = globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`);
            return {
               darkMode: !!li?.classList.contains('titan-dark-mode'),
               titan: !!li?.classList.contains('titan'),
            };
         }

         const all = await probe('all');
         const systemOnly = await probe('systemOnly');

         // Restore the original setting so later tests see the world default.
         await game.settings.set('titan', 'darkModeChatMessages', original);

         return { all, systemOnly };
      });

      // 'all' must class plain messages with titan-dark-mode (without the titan system class).
      expect(observed.all.darkMode, 'dark mode all classes a plain message').toBe(true);
      expect(observed.all.titan, 'plain message never gets the titan class').toBe(false);

      // 'systemOnly' must leave plain messages unclassed.
      expect(observed.systemOnly.darkMode, 'systemOnly leaves a plain message unclassed').toBe(false);

      expect(errors, `uncaught errors during dark-mode probe:\n${errors.join('\n')}`).toEqual([]);
   });
});
