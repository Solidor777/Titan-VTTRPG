import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Reactivity anchor: a character-sheet effect row reads its display values (duration remaining,
 * isExpired, etc.) directly off the `effect` Active Effect Document prop rather than through the
 * reactive `document.data` bridge. Svelte 5 fine-grained reactivity only tracks reads routed through
 * `document.data`, so a plain prop read of `effect.system.x` has no reactive dependency. When the
 * underlying effect is mutated in place (no tab switch, no re-expand) the rendered footer must update;
 * if it stays stale the bug class is confirmed for effect rows. This spec seeds one effect (default
 * 'turnStart' duration, remaining 1), expands it, then mutates duration.remaining in place and asserts
 * the footer DurationTag reflects the new value, and finally drives remaining to 0 and asserts the
 * 'Expired' tag appears — all without switching tabs or re-expanding.
 */

/** @type {string} - Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Reactive Effect Row Actor';

test.describe('character sheet effect row reactivity', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);

      // Seed a fresh player actor with one non-permanent effect. The 'effect' data model defaults the
      // duration to type 'turnStart' with remaining 1, so a DurationTag with a numeric remaining renders.
      await page.evaluate(async (actorName) => {
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Reactive Effect Row',
               type: 'effect',
               disabled: false,
               system: {
                  duration: {
                     type: 'turnStart',
                     remaining: 1,
                  },
               },
            },
         ]);
         await actor.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 600);
         });
      }, ACTOR_NAME);

      // Activate the Effects tab so the effect row renders.
      await page.getByText('Effects', { exact: true }).first().click();
      await page.waitForTimeout(400);
   });

   test('effect footer duration + expired tags update in place after an in-place effect update', async ({
      page,
   }) => {
      // The effect row.
      const row = page.locator('[data-effect-id]').first();

      // Expand the row in place (the expand button is the first button in the header label area).
      await row.locator('.header .label .button button').first().click();
      await page.waitForTimeout(400);

      // The DurationTag renders its own `.tag` root nested inside the footer's wrapper `.tag`. Disambiguate
      // it from other tags by the bold `.label` reading the localized 'Duration' string. Its remaining count
      // is the LAST `.value` inside that root.
      const tags = row.locator('.section.tags');
      const durationTag = tags.locator('.tag', { has: page.locator('.label', { hasText: 'Duration' }) });
      const durationRemaining = durationTag.locator('.value').last();

      // The Expired tag is a wrapper `.tag` whose nested `Tag` root also carries class `.tag`, so matching
      // on text alone resolves to 2 elements once present. Scope to the wrapper via the direct-child
      // combinator so the count reflects the single footer tag.
      const expiredTag = tags.locator('> .tag', { hasText: 'Expired' });

      // INITIAL rendered state: duration remaining is 1, and the Expired tag is absent.
      await expect(durationRemaining, 'initial duration remaining is 1').toHaveText('1');
      await expect(expiredTag, 'initial Expired tag absent').toHaveCount(0);

      // Mutate the underlying effect IN PLACE: do not switch tabs or collapse the row.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({
            system: {
               duration: {
                  remaining: 7,
               },
            },
         });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);

      // The rendered footer must reflect the NEW remaining value in place.
      await expect(durationRemaining, 'duration remaining updated to 7 in place').toHaveText('7');
      await expect(expiredTag, 'Expired tag still absent (remaining > 0)').toHaveCount(0);

      // Drive the effect expired by setting remaining to 0; the Expired tag must appear in place.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({
            system: {
               duration: {
                  remaining: 0,
               },
            },
         });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);

      // The footer must reflect the new remaining and the Expired tag in place.
      await expect(durationRemaining, 'duration remaining updated to 0 in place').toHaveText('0');
      await expect(expiredTag, 'Expired tag appears in place when expired').toHaveCount(1);
   });

   test('duration remaining input reflects an external in-place update and persists edits', async ({
      page,
   }) => {
      // The effect row, and its remaining duration input (a turnStart effect renders only the remaining
      // field, so the first number input is `remaining`).
      const row = page.locator('[data-effect-id]').first();
      const remainingInput = row.locator('input[type="number"]').first();

      // INITIAL rendered state: remaining is 1.
      await expect(remainingInput, 'initial remaining input value is 1').toHaveValue('1');

      // REACTIVITY: mutate the effect's remaining externally; the input must update in place (no remount).
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({ system: { duration: { remaining: 5 } } });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);
      await expect(remainingInput, 'remaining input updated to 5 in place').toHaveValue('5');

      // TYPING COMMIT (regression lock): type a new value; it must persist to the document.
      await remainingInput.fill('8');
      await remainingInput.dispatchEvent('keyup', { key: 'End' });
      await page.waitForTimeout(400);
      const typed = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).effects.contents[0].system.duration.remaining;
      }, ACTOR_NAME);
      expect(typed, 'typed remaining persisted to the document').toBe(8);

      // INCREMENT COMMIT (latent-bug regression): clicking + must persist the incremented value.
      await row.locator('.increment button').first().click();
      await page.waitForTimeout(400);
      const incremented = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).effects.contents[0].system.duration.remaining;
      }, ACTOR_NAME);
      expect(incremented, 'increment button persisted to the document').toBe(9);
   });

   test('duration initiative input reflects an external in-place update and persists edits', async ({
      page,
   }) => {
      // Reconfigure the seeded effect to an 'initiative' duration so the initiative IntegerInput renders.
      // durationType is a reactive derived, so the initiative field appears in place (no remount).
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({
            system: { duration: { type: 'initiative', initiative: 3 } },
         });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);

      // With an 'initiative' duration the initiative input renders FIRST (remaining is second).
      const row = page.locator('[data-effect-id]').first();
      const initiativeInput = row.locator('input[type="number"]').first();

      // INITIAL rendered state: initiative is 3.
      await expect(initiativeInput, 'initial initiative input value is 3').toHaveValue('3');

      // REACTIVITY: external update must reflect in place.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({ system: { duration: { initiative: 6 } } });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);
      await expect(initiativeInput, 'initiative input updated to 6 in place').toHaveValue('6');

      // TYPING COMMIT: type a new value; it must persist.
      await initiativeInput.fill('2');
      await initiativeInput.dispatchEvent('keyup', { key: 'End' });
      await page.waitForTimeout(400);
      const typed = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).effects.contents[0].system.duration.initiative;
      }, ACTOR_NAME);
      expect(typed, 'typed initiative persisted to the document').toBe(2);
   });
});
