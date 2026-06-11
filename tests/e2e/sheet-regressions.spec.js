import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Regression walk for sheet interaction bugs: the add-item buttons (createItemFromType read
 * this.parent on a world actor), item drops (ApplicationV2 binds no drag-drop handlers itself),
 * the weapon attacks tab (state path read $appState.attacks instead of tabs.attacks), and adding a
 * check while the sheet is open (the fresh row bound an undefined expansion entry).
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
   // Remove the per-test fixture documents so world state does not accumulate.
   await page.evaluate(async () => {
      await game.scenes.getName('E2E Regression Scene')?.delete();
      for (const name of ['E2E Regression Actor', 'E2E Regression Weapon', 'E2E Regression Source']) {
         await game.actors.getName(name)?.delete();
         await game.items.getName(name)?.delete();
      }
   });
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('v14 sheet regressions', () => {
   test('createItemFromType adds an owned item to a world actor', async () => {
      const result = await page.evaluate(async () => {
         // A fresh world actor exercises the non-embedded document path.
         const actor = await Actor.create({ name: 'E2E Regression Actor', type: 'player' });
         const created = await actor.createItemFromType('ability');
         return {
            createdCount: created?.length ?? 0,
            ownedCount: actor.items.size,
            ownedType: actor.items.contents[0]?.type,
         };
      });

      expect(result.createdCount, 'createItemFromType returns the created item').toBe(1);
      expect(result.ownedCount, 'the actor owns the new item').toBe(1);
      expect(result.ownedType, 'the new item carries the requested type').toBe('ability');
      expect(errors, `uncaught errors during add-item:\n${errors.join('\n')}`).toEqual([]);
   });

   test('dropping a world item onto an open actor sheet creates an owned copy', async () => {
      const result = await page.evaluate(async () => {
         // The drop source item and the receiving actor with an open sheet.
         const source = await Item.create({ name: 'E2E Regression Source', type: 'equipment' });
         const actor = await Actor.create({ name: 'E2E Regression Actor', type: 'player' });
         await actor.sheet.render(true);
         await titanWait(() => !!actor.sheet.element, { message: 'actor sheet rendered' });

         // A synthetic drop event carrying Foundry's standard drag payload.
         const dataTransfer = new DataTransfer();
         dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid: source.uuid }));
         const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
         /** @type {boolean} Whether the drop controller bound a handler to the sheet element. */
         const handlerBound = typeof actor.sheet.element.ondrop === 'function';
         actor.sheet.element.dispatchEvent(dropEvent);

         /** @type {string} Diagnostic detail when the drop produces no item. */
         let detail = '';
         try {
            await titanWait(() => actor.items.size > 0, { message: 'dropped item created' });
         }
         catch (waitError) {
            // Probe the handler directly to separate binding failures from handler failures.
            try {
               await actor.sheet._onDrop(dropEvent);
               await titanWait(() => actor.items.size > 0, { message: 'direct _onDrop created item' });
               detail = 'direct _onDrop works; event dispatch did not reach it';
            }
            catch (directError) {
               detail = `direct _onDrop failed: ${directError.message}`;
            }
         }
         return {
            handlerBound,
            detail,
            ownedCount: actor.items.size,
            ownedName: actor.items.contents[0]?.name,
         };
      });

      expect(result.handlerBound, 'the drop handler is bound to the sheet element').toBe(true);
      expect(result.ownedCount, `the drop created an owned item (${result.detail})`).toBe(1);
      expect(result.ownedName, 'the owned copy keeps the source name').toBe('E2E Regression Source');
      expect(errors, `uncaught errors during sheet drop:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the weapon attacks tab renders its seeded attack without errors', async () => {
      const opened = await page.evaluate(async () => {
         // A fresh weapon seeds attack[0]; the attacks tab must render it on first open.
         const weapon = await Item.create({ name: 'E2E Regression Weapon', type: 'weapon' });
         await weapon.sheet.render(true);
         await titanWait(() => !!weapon.sheet.element, { message: 'weapon sheet rendered' });
         return { attackCount: weapon.system.attack.length };
      });
      expect(opened.attackCount, 'the weapon seeds a default attack').toBe(1);

      // Open the Attacks tab through the real tab strip and assert the attack settings mount.
      const sheet = page.locator('.titan-document-sheet:has-text("E2E Regression Weapon")');
      await sheet.getByRole('button', { name: 'Attacks', exact: true }).first().click();
      await expect(sheet.locator('.attack').first(), 'attack settings render').toBeVisible();
      expect(errors, `uncaught errors on the attacks tab:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the sheet unlink control unlinks the placed token, not the prototype', async () => {
      const result = await page.evaluate(async () => {
         // A linked actor placed on a fresh scene; linked tokens open the WORLD actor's sheet.
         const actor = await Actor.create({
            name: 'E2E Regression Actor',
            type: 'player',
            prototypeToken: { actorLink: true },
         });
         const scene = await Scene.create({ name: 'E2E Regression Scene', width: 1000, height: 1000 });
         const tokenData = (await actor.getTokenDocument({ x: 100, y: 100 })).toObject();
         const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [tokenData]);

         // Open the sheet the way the canvas double-click does: passing the originating token.
         const sheet = actor.sheet;
         await sheet.render(true, { token: tokenDoc });
         await titanWait(() => !!sheet.element, { message: 'linked actor sheet rendered' });

         // The unlink control's handler must unlink the PLACED token and leave the prototype alone.
         await sheet._onUnlinkToken();
         await titanWait(() => tokenDoc.actorLink === false, { message: 'token unlinked' });
         return {
            tokenLinked: tokenDoc.actorLink,
            prototypeLinked: actor.prototypeToken.actorLink,
            syntheticActor: tokenDoc.actor !== actor && tokenDoc.actor?.isToken === true,
         };
      });

      expect(result.tokenLinked, 'the placed token is unlinked').toBe(false);
      expect(result.prototypeLinked, 'the prototype link is untouched').toBe(true);
      expect(result.syntheticActor, 'the token now resolves a synthetic actor').toBe(true);
      expect(errors, `uncaught errors during unlink:\n${errors.join('\n')}`).toEqual([]);
   });

   test('adding a check while the sheet is open renders the new check row', async () => {
      await page.evaluate(async () => {
         // A weapon sheet shows the checks sidebar; addCheck must not crash the fresh row bind.
         const weapon = await Item.create({ name: 'E2E Regression Weapon', type: 'weapon' });
         await weapon.sheet.render(true);
         await titanWait(() => !!weapon.sheet.element, { message: 'weapon sheet rendered' });
         await weapon.addCheck();
         await titanWait(() => weapon.system.check.length === 1, { message: 'check stored' });
      });

      // The sidebar check row renders with its header and no uncaught errors.
      const sheet = page.locator('.titan-document-sheet:has-text("E2E Regression Weapon")');
      await expect(sheet.locator('.sidebar-check').first(), 'check row renders').toBeVisible();
      expect(errors, `uncaught errors during add-check:\n${errors.join('\n')}`).toEqual([]);
   });
});
