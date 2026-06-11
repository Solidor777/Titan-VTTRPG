import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   controlFixtureActorToken,
   deleteFixtureActor,
   deleteOrphanedTokens,
} from './world.js';

/**
 * Effect chat cards are first-class `ChatMessage` subtypes (Phase 4). `effect.sendToChat()` creates a
 * message whose `type` is 'effect' and whose `system` is the effect's prepared roll-data snapshot
 * (duration/check/customTrait/rulesElement/description plus `name`/`img`); the message self-renders
 * via `TitanChatMessage#renderHTML`. This spec asserts the posted subtype, the rendered card content
 * (name, description, custom trait), and that the card's embedded check button rolls an itemCheck
 * through the controlled character. It also locks in core-message theming: non-TITAN messages
 * receive the titan-core-themed class from TitanChatMessage#renderHTML when the themeCoreMessages
 * setting is enabled, and stay unclassed when it is disabled.
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

   // One-time sweep of orphaned fixture tokens left behind by prior runs.
   await deleteOrphanedTokens(page);
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
      // Remove any stale fixture (and its tokens) so each run starts clean, then create the actor
      // and place + control its token (throws if the placeable never draws).
      await deleteFixtureActor(page, ACTOR_NAME);
      await page.evaluate(async (actorName) => {
         await Actor.create({
            name: actorName,
            type: 'player',
         });
      }, ACTOR_NAME);
      await controlFixtureActorToken(page, {
         actorName: ACTOR_NAME,
         fallbackSceneName: 'E2E Effect Card Scene',
      });

      // One effect with a description, a custom trait, and a single COMPLETE check[] entry built by
      // the shared buildCheck factory (this card's check is unopposed, unresisted, and free).
      await page.evaluate(async ({ actorName, effectName, effectDescription, traitName, check }) => {
         const actor = game.actors.getName(actorName);
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
                  check: [check],
               },
            },
         ]);
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
         effectDescription: EFFECT_DESCRIPTION,
         traitName: TRAIT_NAME,
         check: buildCheck(CHECK_LABEL, 'e2ecafd1-e2ec-4afd-8afd-e2ecafd1e2ec', {
            opposedCheck: {
               attribute: 'body',
               enabled: false,
               skill: 'athletics',
            },
            resistanceCheck: 'none',
            resolveCost: 0,
         }),
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

   test('core-message theming classes non-TITAN messages when enabled', async () => {
      // Render a plain (non-TITAN) message under each themeCoreMessages value and report the classes
      // the chat-log element received from TitanChatMessage#renderHTML.
      const observed = await page.evaluate(async () => {
         /** @type {boolean} The original setting value, restored after the probe. */
         const original = game.settings.get('titan', 'themeCoreMessages');

         /**
          * Posts a plain chat message under the given core-theming setting and reads back the
          * rendered chat-log element's relevant classes.
          * @param {boolean} settingValue - The themeCoreMessages value to probe under.
          * @returns {Promise<object>} The observed { coreThemed, titan } class flags.
          */
         async function probe(settingValue) {
            await game.settings.set('titan', 'themeCoreMessages', settingValue);
            const message = await ChatMessage.create({ content: `Core-theming probe ${settingValue}` });
            await titanWait(
               () => !!globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`),
               { message: 'plain message rendered' },
            );
            const li = globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`);
            return {
               coreThemed: !!li?.classList.contains('titan-core-themed'),
               titan: !!li?.classList.contains('titan'),
            };
         }

         const enabled = await probe(true);
         const disabled = await probe(false);

         // Restore the original setting so later tests see the user default.
         await game.settings.set('titan', 'themeCoreMessages', original);

         return { enabled, disabled };
      });

      // Enabled must class plain messages with titan-core-themed (without the titan system class).
      expect(observed.enabled.coreThemed, 'core theming classes a plain message').toBe(true);
      expect(observed.enabled.titan, 'plain message never gets the titan class').toBe(false);

      // Disabled must leave plain messages unclassed.
      expect(observed.disabled.coreThemed, 'disabled leaves a plain message unclassed').toBe(false);

      expect(errors, `uncaught errors during core-theming probe:\n${errors.join('\n')}`).toEqual([]);
   });
});
