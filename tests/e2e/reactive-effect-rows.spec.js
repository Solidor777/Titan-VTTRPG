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
});
