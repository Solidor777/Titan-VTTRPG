import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';
import { setWorldSetting } from './settings.js';

/**
 * Report chat cards are first-class `ChatMessage` subtypes (Phase 3). Each of the 13 TITAN report types
 * (damage, healing, spendResolve, rend, repairs, removeCombatEffects, shortRest, longRest, turnStart,
 * turnEnd, turnStartRevert, turnEndRevert, effectsExpired) is produced by a `CharacterDataModel` method
 * that calls `_whisperOwners({ type, ...system })`, creating a message whose `type` is the leaf subtype
 * key and whose `system` carries the typed payload; the message self-renders via `TitanChatMessage`,
 * mounting the subtype's report Svelte card (root `.report`) into `.message-content`.
 *
 * This spec drives each report against a controlled, GM-owned actor and asserts the newest message
 * carries the right subtype key and that its card renders non-empty content. It also proves the two
 * revert reports (turnStartRevert / turnEndRevert), which rendered BLANK before Phase 3, now render
 * content — and that the fast-healing apply-confirm flow commits healing and partial-merges
 * `system.fastHealing` (confirmed flips true while `total` survives the merge).
 *
 * NOTE: the login user is a GM, so whispered owner reports are visible to it and world-scope settings
 * are writable. `effectsExpiredReport` is produced only by the deep `onInitiativeAdvanced` initiative-
 * effect-expiry path, which needs intricate combat setup to drive reliably; per the project's
 * no-flaky-tests / no-unlogged-todos rules it is logged in docs/TODO.md and not covered here.
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

   // Force the report-gating world settings ON so each direct-method report is actually emitted,
   // regardless of the host world's current configuration. All read live via getSetting, so no reload
   // is needed for them to take effect within the running world.
   for (const key of [
      'reportTakingDamage',
      'reportHealingDamage',
      'reportSpendingResolve',
      'reportRendingArmor',
      'reportRepairingArmor',
      'reportResting',
   ]) {
      await setWorldSetting(page, key, true);
   }

   // Keep expired-effect auto-removal OFF so turn-report triggers never delete the seeded turn effects
   // mid-test, and so no incidental effectsExpired report is produced during the turn cases.
   await setWorldSetting(page, 'autoRemoveExpiredEffects', 'disabled');
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Asserts the newest chat message carries the expected subtype key and that its mounted report card
 * renders non-empty content, then asserts no uncaught page errors fired. Shared by every report case.
 * @param {{messageId: string, messageType: string}} result - The newest message's id and type.
 * @param {string} expectedType - The expected leaf subtype key (e.g. 'damageReport').
 * @returns {Promise<void>} Resolves once all card assertions pass.
 */
async function expectReportCard(result, expectedType) {
   // The trigger must have created a message of the expected subtype.
   expect(result.messageId, 'a report message was created').toBeTruthy();
   expect(result.messageType, `newest message subtype is ${expectedType}`).toBe(expectedType);

   // The subtype, read back from the world collection, must match (poll, no fixed sleep).
   await expect
      .poll(
         () => page.evaluate((id) => game.messages.get(id)?.type, result.messageId),
         { message: `world message ${result.messageId} has type ${expectedType}` },
      )
      .toBe(expectedType);

   // The mounted report card must be present and visible. Foundry renders each message in more than one
   // log (sidebar chat-log plus chat-scroll/popout), so the card is located by its root class `.report`
   // and the first visible mount is used.
   const card = page.locator(`.message[data-message-id="${result.messageId}"] .report`).first();
   await expect(card, `mounted ${expectedType} card is visible`).toBeVisible();

   // The card must have rendered non-empty text (it is not a blank mount). This is the key regression
   // proof for the two revert reports, which rendered BLANK before Phase 3.
   await expect
      .poll(
         () => card.textContent().then((text) => (text ?? '').trim().length),
         { message: `${expectedType} card content has non-empty text` },
      )
      .toBeGreaterThan(0);

   // No uncaught errors may have fired during the report lifecycle.
   expect(errors, `uncaught errors during ${expectedType} lifecycle:\n${errors.join('\n')}`).toEqual([]);
}

test.describe('report chat-message subtype cards', () => {
   /**
    * Direct-method reports: each triggers a single `CharacterDataModel` mutation with `{ report: true }`
    * (the default) against a freshly created, GM-owned actor seeded so the report has content. The actor
    * is deleted inside the page after the report is posted; the posted message persists for assertions.
    */
   test.describe('direct-method reports', () => {
      test('applyDamage posts a damageReport card', async () => {
         const result = await page.evaluate(async () => {
            // A base player has stamina max 3 and no equipped armor (so 5 damage lands in full).
            const actor = await Actor.create({ name: `E2E Damage ${Date.now()}`, type: 'player' });

            const before = game.messages.size;
            await actor.system.applyDamage(5, { report: true });
            await titanWait(() => game.messages.size > before, { message: 'damage report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'damageReport');
      });

      test('applyHealing posts a healingReport card', async () => {
         const result = await page.evaluate(async () => {
            // Seed stamina below max so a heal moves it (healing of a full resource produces no report).
            const actor = await Actor.create({ name: `E2E Healing ${Date.now()}`, type: 'player' });
            await actor.update({ system: { resource: { stamina: { value: 0 } } } });

            const before = game.messages.size;
            await actor.system.applyHealing(2, { report: true });
            await titanWait(() => game.messages.size > before, { message: 'healing report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'healingReport');
      });

      test('spendResolve posts a spendResolveReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E Resolve ${Date.now()}`, type: 'player' });

            const before = game.messages.size;
            // Spend more resolve than held so the report also exercises the shortage branch.
            await actor.system.spendResolve(2, { report: true });
            await titanWait(() => game.messages.size > before, { message: 'spend-resolve report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'spendResolveReport');
      });

      test('applyRend posts a rendReport card', async () => {
         const result = await page.evaluate(async () => {
            // Rend requires an equipped armor with a positive armor value.
            const actor = await Actor.create({ name: `E2E Rend ${Date.now()}`, type: 'player' });
            const [armor] = await actor.createEmbeddedDocuments('Item', [
               { name: 'E2E Rend Armor', type: 'armor', system: { armor: { value: 4, max: 4 } } },
            ]);
            await actor.update({ system: { equipped: { armor: armor.id } } });

            const before = game.messages.size;
            await actor.system.applyRend(2, { report: true });
            await titanWait(() => game.messages.size > before, { message: 'rend report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'rendReport');
      });

      test('applyRepairs posts a repairsReport card', async () => {
         const result = await page.evaluate(async () => {
            // Repairs requires an equipped armor whose value is below its max.
            const actor = await Actor.create({ name: `E2E Repairs ${Date.now()}`, type: 'player' });
            const [armor] = await actor.createEmbeddedDocuments('Item', [
               { name: 'E2E Repairs Armor', type: 'armor', system: { armor: { value: 1, max: 4 } } },
            ]);
            await actor.update({ system: { equipped: { armor: armor.id } } });

            const before = game.messages.size;
            await actor.system.applyRepairs(2, { report: true });
            await titanWait(() => game.messages.size > before, { message: 'repairs report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'repairsReport');
      });

      test('removeCombatEffects posts a removeCombatEffectsReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E RemoveFX ${Date.now()}`, type: 'player' });

            const before = game.messages.size;
            await actor.system.removeCombatEffects();
            await titanWait(() => game.messages.size > before, { message: 'remove-combat-effects report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'removeCombatEffectsReport');
      });

      test('shortRest posts a shortRestReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E ShortRest ${Date.now()}`, type: 'player' });

            const before = game.messages.size;
            await actor.system.shortRest();
            await titanWait(() => game.messages.size > before, { message: 'short-rest report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'shortRestReport');
      });

      test('longRest posts a longRestReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E LongRest ${Date.now()}`, type: 'player' });

            const before = game.messages.size;
            await actor.system.longRest();
            await titanWait(() => game.messages.size > before, { message: 'long-rest report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'longRestReport');
      });
   });

   /**
    * Turn reports: produced by `onTurnStart()` / `onTurnEnd()` on an actor seeded with a fast-healing
    * ability. The GM is the best owner, so the direct calls run their best-owner-gated body. With
    * autoApplyFastHealing = 'showButton' and stamina below max, the turn report carries fast-healing
    * content (and an apply button). Calling the method directly is simpler and more reliable than
    * driving a real combat turn, so it is preferred here (the socket-sync spec covers the combat path).
    */
   test.describe('turn reports', () => {
      // Auto-apply on a button so onTurnStart populates fastHealing report data without auto-applying.
      test.beforeEach(async () => {
         await setWorldSetting(page, 'autoApplyFastHealing', 'showButton');
      });

      test('onTurnStart posts a turnStartReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E TurnStart ${Date.now()}`, type: 'player' });
            // A turnStart fast-healing ability gives the start-of-turn report content.
            await actor.createEmbeddedDocuments('Item', [
               {
                  name: 'E2E FH Start',
                  type: 'ability',
                  system: {
                     rulesElement: [
                        { operation: 'fastHealing', selector: 'turnStart', value: 2, uuid: 'e2e-fh-ts' },
                     ],
                  },
               },
            ]);
            // Stamina below max so the fast-healing report branch fires.
            await actor.update({ system: { resource: { stamina: { value: 0 } } } });

            const before = game.messages.size;
            await actor.system.onTurnStart();
            await titanWait(() => game.messages.size > before, { message: 'turn-start report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'turnStartReport');
      });

      test('onTurnEnd posts a turnEndReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E TurnEnd ${Date.now()}`, type: 'player' });
            // A turnEnd fast-healing ability gives the end-of-turn report content.
            await actor.createEmbeddedDocuments('Item', [
               {
                  name: 'E2E FH End',
                  type: 'ability',
                  system: {
                     rulesElement: [
                        { operation: 'fastHealing', selector: 'turnEnd', value: 2, uuid: 'e2e-fh-te' },
                     ],
                  },
               },
            ]);
            await actor.update({ system: { resource: { stamina: { value: 0 } } } });

            const before = game.messages.size;
            await actor.system.onTurnEnd();
            await titanWait(() => game.messages.size > before, { message: 'turn-end report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'turnEndReport');
      });
   });

   /**
    * Revert reports (REGRESSION): produced by `onTurnStartReverted()` / `onTurnEndReverted()` on an
    * actor seeded with a fast-healing ability. The `autoRevertFastHealing` setting defaults to 'enabled',
    * so the revert path populates fastHealingRevert report data. These cards rendered BLANK before Phase 3
    * (the legacy hook never matched their type); the non-empty-content assertion is the regression proof.
    */
   test.describe('revert reports (regression: rendered blank pre-Phase-3)', () => {
      test('onTurnStartReverted posts a NON-EMPTY turnStartRevertReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E RevertStart ${Date.now()}`, type: 'player' });
            await actor.createEmbeddedDocuments('Item', [
               {
                  name: 'E2E FH Start',
                  type: 'ability',
                  system: {
                     rulesElement: [
                        { operation: 'fastHealing', selector: 'turnStart', value: 2, uuid: 'e2e-fh-rts' },
                     ],
                  },
               },
            ]);

            const before = game.messages.size;
            await actor.system.onTurnStartReverted();
            await titanWait(() => game.messages.size > before, { message: 'turn-start-revert report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'turnStartRevertReport');
      });

      test('onTurnEndReverted posts a NON-EMPTY turnEndRevertReport card', async () => {
         const result = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E RevertEnd ${Date.now()}`, type: 'player' });
            await actor.createEmbeddedDocuments('Item', [
               {
                  name: 'E2E FH End',
                  type: 'ability',
                  system: {
                     rulesElement: [
                        { operation: 'fastHealing', selector: 'turnEnd', value: 2, uuid: 'e2e-fh-rte' },
                     ],
                  },
               },
            ]);

            const before = game.messages.size;
            await actor.system.onTurnEndReverted();
            await titanWait(() => game.messages.size > before, { message: 'turn-end-revert report message' });

            const newest = game.messages.contents.at(-1);
            const out = { messageId: newest?.id, messageType: newest?.type };
            await actor.delete();
            return out;
         });

         await expectReportCard(result, 'turnEndRevertReport');
      });
   });

   /**
    * Apply-confirm flow: seed a fast-healing actor with autoApplyFastHealing = 'showButton', produce a
    * turnStartReport, click the fast-healing apply button on the card, then assert (a) the actor's
    * stamina increased, (b) message.system.fastHealing.confirmed === true, and (c)
    * message.system.fastHealing.total is still present. (c) verifies the Task-4 nullable-ObjectField
    * partial-merge: the apply writes { system: { fastHealing: { confirmed: true } } } and the stored
    * object must KEEP its `total` (a merge, not a replace).
    */
   test.describe('fast-healing apply-confirm flow', () => {
      test('clicking apply heals the actor and partial-merges fastHealing (total survives)', async () => {
         // Show the apply button rather than auto-applying.
         await setWorldSetting(page, 'autoApplyFastHealing', 'showButton');

         // Seed the actor + report; keep the actor alive (the button reads the live actor via the speaker).
         const setup = await page.evaluate(async () => {
            const actor = await Actor.create({ name: `E2E ApplyFH ${Date.now()}`, type: 'player' });
            await actor.createEmbeddedDocuments('Item', [
               {
                  name: 'E2E FH Apply',
                  type: 'ability',
                  system: {
                     rulesElement: [
                        { operation: 'fastHealing', selector: 'turnStart', value: 2, uuid: 'e2e-fh-apply' },
                     ],
                  },
               },
            ]);
            // Stamina below max so the heal is observable and the fast-healing report branch fires.
            await actor.update({ system: { resource: { stamina: { value: 0 } } } });

            const before = game.messages.size;
            await actor.system.onTurnStart();
            await titanWait(() => game.messages.size > before, { message: 'turn-start report message' });

            const newest = game.messages.contents.at(-1);
            return {
               actorId: actor.id,
               messageId: newest?.id,
               messageType: newest?.type,
               staminaBefore: actor.system.resource.stamina.value,
               fastHealingTotal: newest?.system?.fastHealing?.total,
               fastHealingConfirmed: newest?.system?.fastHealing?.confirmed,
            };
         });

         // Sanity: the report is a turnStartReport whose fastHealing offers an UNCONFIRMED total of 2.
         expect(setup.messageType, 'apply-flow message is a turnStartReport').toBe('turnStartReport');
         expect(setup.fastHealingTotal, 'fastHealing.total seeded on the report').toBe(2);
         expect(setup.fastHealingConfirmed, 'fast healing starts unconfirmed').not.toBe(true);
         expect(setup.staminaBefore, 'stamina seeded at 0 before apply').toBe(0);

         // The fast-healing apply button is the only <button> on this card (resource/stamina sections
         // render no buttons), so the card's first button is unambiguously the apply button. Its label
         // carries the healing-amount text ("Heal 2 Damage"); assert that before clicking.
         const card = page.locator(`.message[data-message-id="${setup.messageId}"] .report`).first();
         await expect(card, 'mounted turnStartReport card is visible').toBeVisible();
         const applyButton = card.locator('button').first();
         await expect(applyButton, 'fast-healing apply button is visible').toBeVisible();
         await expect(applyButton, 'apply button label shows the heal amount').toContainText('2');
         await applyButton.click();

         // The actor's stamina must rise to 2 (0 + the healing total) — poll the live document.
         await expect
            .poll(
               () => page.evaluate((id) => game.actors.get(id)?.system.resource.stamina.value, setup.actorId),
               { message: 'actor stamina increased to 2 after apply' },
            )
            .toBe(2);

         // The apply handler updates the ACTOR first and the MESSAGE second, so the stamina poll above
         // can resolve before the message's confirmed flag lands — poll the message state too instead of
         // single-shot reading it (the former OPEN_BUGS #4 read-race flake; history in CLOSED_BUGS #2).
         await expect
            .poll(
               () =>
                  page.evaluate(
                     (id) => game.messages.get(id)?.system?.fastHealing?.confirmed === true,
                     setup.messageId,
                  ),
               { message: 'fastHealing.confirmed flipped true after apply' },
            )
            .toBe(true);

         // With confirmation in, `total` must still be present (the partial-merge proof). If `total` were
         // ever lost to a replace-instead-of-merge update, confirmation would still succeed above, so this
         // plain read still catches that real bug.
         const afterApply = await page.evaluate((id) => {
            const message = game.messages.get(id);
            return { total: message?.system?.fastHealing?.total };
         }, setup.messageId);

         expect(afterApply.total, 'fastHealing.total survived the partial-merge update').toBe(2);

         // Clean up the persisted actor (the card snapshot keeps the message renderable).
         await page.evaluate((id) => game.actors.get(id)?.delete(), setup.actorId);

         expect(errors, `uncaught errors during apply-confirm flow:\n${errors.join('\n')}`).toEqual([]);
      });
   });
});
