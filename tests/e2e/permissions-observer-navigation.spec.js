import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';

/**
 * An observer can read every part of a sheet: tab buttons and row expand toggles change no document state, so they
 * stay usable on a sheet the viewer cannot edit, while editing controls stay disabled.
 */

/** @type {string} Name of the fixture actor the player observes. */
const ACTOR_NAME = 'E2E Observer Navigation Actor';

/**
 * Seeds the fixture actor, owned by the GM and observed by the named player, with one ability.
 * @param {import('@playwright/test').Page} gm - The GM client.
 * @param {string} playerName - The observing player's display name.
 * @returns {Promise<string>} The actor id.
 */
function seedObservedActor(gm, playerName) {
   return gm.evaluate(async ({ actorName, player }) => {
      await game.actors.getName(actorName)?.delete();
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
         ownership: {
            default: 0,
            [game.users.getName(player).id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
         },
      });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Observed Ability',
            type: 'ability',
            system: { description: '<p>Observed description.</p>' },
         },
      ]);
      return actor.id;
   }, {
      actorName: ACTOR_NAME,
      player: playerName,
   });
}

/**
 * Renders a document's sheet on a client and returns a locator for the sheet element.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} locateSrc - Stringified function body returning the document.
 * @returns {Promise<import('@playwright/test').Locator>} The sheet element.
 */
async function renderSheet(page, locateSrc) {
   const appId = await page.evaluate(async (src) => {
      const doc = new Function(`return (${src})()`)();
      const app = await doc.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
      return app.id;
   }, locateSrc);
   return page.locator(`[id="${appId}"]`);
}

test('an observer can switch character and item sheet tabs and expand rows, but not edit', async ({ browser }) => {
   await withClients(browser, {
      gm: 'E2E GM 1',
      player: 'E2E Player 1',
   }, async ({ gm, player }) => {
      const actorId = await seedObservedActor(gm, 'E2E Player 1');
      try {
         await player.waitForFunction((id) => !!game.actors.get(id), actorId, { timeout: 2000 });
         expect(await player.evaluate((id) => game.actors.get(id).isOwner, actorId), 'player is not an owner')
            .toBe(false);

         // Character sheet: switch to Abilities and expand the ability row.
         const sheet = await renderSheet(player, `() => game.actors.get('${actorId}')`);
         const abilitiesTab = sheet.locator('.tab-list').getByText('Abilities', { exact: true });
         await expect(abilitiesTab, 'the tab button is enabled for an observer').toBeEnabled();
         await abilitiesTab.click();
         const row = sheet.locator('[data-item-id]').first();
         await expect(row, 'the Abilities tab opened').toBeVisible();

         const expand = row.locator('.header .label .button button').first();
         await expect(expand, 'the expand toggle is enabled for an observer').toBeEnabled();
         await expect(row.locator('.expandable-content')).toHaveCount(0);
         await expand.click();
         await expect(row.locator('.expandable-content'), 'the row expanded').toBeVisible();

         // Editing stays disabled: the ability row's delete button is owner-gated.
         await expect(row.locator('button[aria-label="Delete"], button:has(i.fa-trash)').first(),
            'editing controls stay disabled').toBeDisabled();

         // Item sheet: switch to the Checks tab.
         const itemSheet = await renderSheet(player,
            `() => game.actors.get('${actorId}').items.getName('E2E Observed Ability')`);
         const checksTab = itemSheet.locator('.tab-list').getByText('Checks', { exact: true });
         await expect(checksTab, 'the item tab button is enabled for an observer').toBeEnabled();
         await checksTab.click();
         await expect(checksTab.locator('xpath=ancestor::div[contains(@class, "button")][1]'),
            'the Checks tab is active').toHaveClass(/(?:^|\s)active(?:\s|$)/);
      }
      finally {
         await gm.evaluate((name) => game.actors.getName(name)?.delete(), ACTOR_NAME);
      }
   });
});
