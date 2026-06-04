import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Interaction-path walk: check-roll -> chat. For each TITAN check type this suite drives the
 * dialog-bypassing `roll<Type>Check` API on a purpose-built actor, then asserts the resulting chat
 * message exists, carries the expected `flags.titan.type`, and renders its chat card into the live
 * chat-log DOM without throwing.
 *
 * Confirmed against source:
 * CharacterDataModel exposes `rollAttributeCheck`, `rollResistanceCheck`, `rollAttackCheck`,
 * `rollCastingCheck`, `rollItemCheck`; all post to chat via `_rollCheck` -> `check.sendToChat`
 * and skip the option dialog.
 * Option keys: attribute `{ attribute }`; resistance `{ resistance }`; attack `{ itemId, attackIdx }`;
 * casting `{ itemId }`; item `{ itemId, checkIdx }`.
 * `flags.titan.type` strings (ChatMessageShell dispatch map): attributeCheck, resistanceCheck,
 * attackCheck, castingCheck, itemCheck.
 * `OnRenderChatMessageHTML` adds the `titan` class to the `.message[data-message-id]` element and
 * mounts the check card (root `.check-chat-message`) into `.message-content`.
 */

// The per-check definitions: the type key, the in-page roll invocation, and the expected flag type.
const CHECK_CASES = [
   {
      // A plain Attribute Check on Body.
      name: 'attribute',
      expectedType: 'attributeCheck',
      // The roll-options source, evaluated inside the world with `actor` and `fixtures` in scope.
      invoke: 'await actor.system.rollAttributeCheck({ attribute: "body" });',
   },
   {
      // A Resistance Check on Resilience.
      name: 'resistance',
      expectedType: 'resistanceCheck',
      invoke: 'await actor.system.rollResistanceCheck({ resistance: "resilience" });',
   },
   {
      // An Attack Check using the seeded weapon's default attack (index 0).
      name: 'attack',
      expectedType: 'attackCheck',
      invoke: 'await actor.system.rollAttackCheck({ itemId: fixtures.weaponId, attackIdx: 0 });',
   },
   {
      // A Casting Check using the seeded spell.
      name: 'casting',
      expectedType: 'castingCheck',
      invoke: 'await actor.system.rollCastingCheck({ itemId: fixtures.spellId });',
   },
   {
      // An Item Check using the seeded ability's check (index 0).
      name: 'item',
      expectedType: 'itemCheck',
      invoke: 'await actor.system.rollItemCheck({ itemId: fixtures.abilityId, checkIdx: 0 });',
   },
];

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

test.describe('v14 interaction rolls', () => {
   // The stringified locator that resolves the purpose-built roller actor inside the world.
   const ACTOR_LOCATE = '() => game.actors.getName("E2E Roller")';

   // Build the roller actor with all owned items needed to roll every check type.
   test.beforeEach(async () => {
      // Precondition: the TITAN system must have initialized. If `game.titan` is absent, the system
      // bundle threw during load (CONFIG.Actor.documentClass/dataModels never registered) and no
      // interaction path can be exercised. Surface the captured load error as the deliverable.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before interaction walk. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);

      // Build (or rebuild) the E2E Roller actor and its owned items inside the Foundry runtime.
      await page.evaluate(async () => {
         // Remove any stale roller so each run starts from a clean, known fixture.
         const stale = game.actors.getName('E2E Roller');
         if (stale) {
            await stale.delete();
         }

         // The purpose-built, Gamemaster-owned player actor used as the roll source.
         const actor = await Actor.create({ name: 'E2E Roller', type: 'player' });

         // Owned items: a weapon (attack check), a spell (casting check), and an ability carrying a
         // single check[] entry (item check). The weapon seeds a default attack[0]; the spell seeds
         // its castingCheck schema; the ability needs an explicit check[] entry.
         await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Weapon', type: 'weapon' },
            { name: 'E2E Spell', type: 'spell' },
            {
               name: 'E2E Ability',
               type: 'ability',
               system: {
                  // A COMPLETE item check entry mirroring createItemCheckTemplate()
                  // (src/check/types/item-check/ItemCheckTemplate.js). The template module is not
                  // importable in the browser context, so the full default object is inlined here;
                  // omitting fields like opposedCheck causes getItemCheckParameters to throw when it
                  // reads checkData.opposedCheck.enabled. attribute/skill/label are overridden for
                  // the test, the remaining fields hold the template defaults.
                  check: [
                     {
                        attribute: 'body',
                        complexity: 1,
                        damageReducedBy: 'none',
                        difficulty: 4,
                        initialValue: 1,
                        isDamage: false,
                        isHealing: false,
                        label: 'E2E Check',
                        opposedCheck: {
                           attribute: 'body',
                           enabled: false,
                           skill: 'athletics',
                        },
                        resistanceCheck: 'none',
                        resolveCost: 0,
                        scaling: true,
                        skill: 'arcana',
                        uuid: 'e2e0e2e0-e2e0-4e2e-8e2e-e2e0e2e0e2e0',
                     },
                  ],
               },
            },
         ]);
      });
   });

   // One test per check type: roll, then assert message creation, flag type, and card render.
   for (const checkCase of CHECK_CASES) {
      test(`${checkCase.name} check rolls, posts, and renders its card`, async () => {
         // Roll the check inside the world and report the new message's id and flag type.
         const result = await page.evaluate(async ({ actorLocate, invokeSrc }) => {
            // Resolve the roller actor and gather the owned item ids for the roll options.
            const actor = new Function(`return (${actorLocate})()`)();
            const fixtures = {
               weaponId: actor.items.find((i) => i.type === 'weapon')?.id,
               spellId: actor.items.find((i) => i.type === 'spell')?.id,
               abilityId: actor.items.find((i) => i.type === 'ability')?.id,
            };

            // Snapshot the message count, perform the roll, and let the chat render settle.
            const before = game.messages.size;
            await new Function('actor', 'fixtures', `return (async () => { ${invokeSrc} })();`)(actor, fixtures);
            await titanWait(() => game.messages.size > before, { message: 'new chat message' });

            // Report the post-roll state for assertions in the Node process.
            const newest = game.messages.contents[game.messages.size - 1];
            return {
               before,
               after: game.messages.size,
               newestId: newest?.id,
               newestType: newest?.type,
            };
         }, { actorLocate: ACTOR_LOCATE, invokeSrc: checkCase.invoke });

         // Assert: a new message was created with the expected titan flag type, error-free.
         expect(result.after, 'message count should increase after the roll').toBeGreaterThan(result.before);
         expect(result.newestType, 'newest message flag type').toBe(checkCase.expectedType);

         // Assert: the chat card rendered into the live DOM (titan class + mounted check card).
         const rendered = await page.evaluate(async (messageId) => {
            // Locate the rendered chat-log entry for the new message.
            const li = globalThis.document.querySelector(`.message[data-message-id="${messageId}"]`);
            return {
               hasElement: !!li,
               hasTitanClass: !!li?.classList.contains('titan'),
               hasCard: !!li?.querySelector('.check-chat-message'),
            };
         }, result.newestId);

         // The rendered element must exist, be tagged titan, and carry the mounted check card.
         expect(rendered.hasElement, 'rendered chat-log element exists').toBe(true);
         expect(rendered.hasTitanClass, 'rendered element carries the titan class').toBe(true);
         expect(rendered.hasCard, 'mounted check-chat-message card is present').toBe(true);

         // No uncaught errors may have fired during the roll or the card render.
         expect(errors, `uncaught errors during ${checkCase.name} roll/render:\n${errors.join('\n')}`)
            .toEqual([]);
      });
   }
});
