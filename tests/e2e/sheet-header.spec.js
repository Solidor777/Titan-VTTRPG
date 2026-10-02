import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import { createActor, placeToken, shared, sharedUuid, unlinkPlacedToken, viewScene } from './flows.js';
import { attachPageErrors, closeAllApps, newestMessageType } from './world.js';

/**
 * The sheet header: the window-header controls dropdown, the always-visible Svelte header buttons (token link,
 * send to chat), unlinking a placed token from the sheet its double-click opened, and the identity of the actor a sheet
 * reacts to. Documents come from the shared fixtures or from flows.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Opens a sheet's window-header controls dropdown (the ellipsis button) and returns the labels of its entries.
 * @param {import('@playwright/test').Locator} sheet - The open sheet's window element.
 * @returns {Promise<string[]>} The trimmed labels of the dropdown's control entries.
 */
async function readHeaderControls(sheet) {
   await sheet.locator('button[data-action="toggleControls"]').click();

   /** @type {import('@playwright/test').Locator} The entries of the opened controls menu. */
   const menu = page.locator('#context-menu li.context-item');
   await expect(menu.first()).toBeVisible();
   return (await menu.allInnerTexts()).map((label) => label.trim());
}

/**
 * Places a token of a new unlinked-from-the-sheet actor: a linked player actor made through the Actors tab, a token
 * dropped on the shared scene, and the Unlink button of the sheet the token's double-click opens. Leaves the new
 * synthetic actor's sheet open.
 * @returns {Promise<{actorId: string, tokenId: string, tokenUuid: string}>} The actor, its token and the token's uuid.
 */
async function placeUnlinkedToken() {
   /** @type {string} The shared scene's id. */
   const sceneId = await shared(page, 'scene');
   await viewScene(page, sceneId);

   /** @type {string} The new actor's id. */
   const actorId = await createActor(page, {
      name: `E2E Header Token Actor ${Date.now()}`,
      type: 'player',
   });

   /** @type {string} The placed token's id. */
   const tokenId = await placeToken(page, actorId);
   await unlinkPlacedToken(page, tokenId);
   return {
      actorId,
      tokenId,
      tokenUuid: `Scene.${sceneId}.Token.${tokenId}`,
   };
}

test.describe('window header controls', () => {
   test('the player actor sheet offers Edit Token and Toggle Token Link', async () => {
      const sheet = await openSheetByUuid(page, await sharedUuid(page, 'player'));
      const labels = await readHeaderControls(sheet);
      expect(labels, `actor header controls:\n${labels.join('\n')}`).toContain('Edit Token');
      expect(labels, `actor header controls:\n${labels.join('\n')}`).toContain('Toggle Token Link');
   });

   test('the weapon item sheet offers Send to Chat', async () => {
      const sheet = await openSheetByUuid(page, await sharedUuid(page, 'weapon'));
      const labels = await readHeaderControls(sheet);
      expect(labels, `item header controls:\n${labels.join('\n')}`).toContain('Send to Chat');
   });
});

test.describe('always-visible header buttons', () => {
   test('the actor sheet shows the Edit Token and Toggle Link buttons inline', async () => {
      const sheet = await openSheetByUuid(page, await sharedUuid(page, 'player'));
      await expect(sheet.locator('.window-header .edit-token-button')).toBeVisible();
      await expect(sheet.locator('.window-header .toggle-token-linked-button')).toBeVisible();
   });

   test('the Toggle Link button flips the prototype link and its icon follows', async () => {
      // A per-test actor: the test flips the prototype link and flips it back.
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: `E2E Header Link Actor ${Date.now()}`,
         type: 'player',
      });
      const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
      const button = sheet.locator('.window-header .toggle-token-linked-button');
      const icon = button.locator('i');

      /**
       * Reads whether the actor's prototype token is linked.
       * @returns {Promise<boolean>} True when linked.
       */
      const linked = () => page.evaluate((id) => game.actors.get(id).prototypeToken.actorLink, actorId);
      const startedLinked = await linked();
      await expect(icon).toHaveClass(startedLinked ? /(?:^|\s)linked(?:\s|$)/ : /(?:^|\s)unlinked(?:\s|$)/);

      await button.click();
      await expect.poll(linked, { message: 'the button flipped the prototype link' }).toBe(!startedLinked);
      await expect(icon).toHaveClass(startedLinked ? /(?:^|\s)unlinked(?:\s|$)/ : /(?:^|\s)linked(?:\s|$)/);

      await button.click();
      await expect.poll(linked, { message: 'the second click restored the prototype link' }).toBe(startedLinked);
      await expect(icon).toHaveClass(startedLinked ? /(?:^|\s)linked(?:\s|$)/ : /(?:^|\s)unlinked(?:\s|$)/);
   });

   test('the item sheet Send to Chat button posts the item card', async () => {
      const sheet = await openSheetByUuid(page, await sharedUuid(page, 'weapon'));
      const sendToChat = sheet.locator('.window-header .send-to-chat-button');
      await expect(sendToChat).toBeVisible();

      /** @type {number} The message count before the click. */
      const before = await page.evaluate(() => game.messages.size);
      await sendToChat.click();
      await expect.poll(() => newestMessageType(page, before), { message: 'the button posted a message' })
         .toBe('weapon');
   });

   test('the effect sheet Send to Chat button posts the effect card', async () => {
      const sheet = await openSheetByUuid(page, await sharedUuid(page, 'effect'));
      const sendToChat = sheet.locator('.window-header .send-to-chat-button');
      await expect(sendToChat).toBeVisible();

      /** @type {number} The message count before the click. */
      const before = await page.evaluate(() => game.messages.size);
      await sendToChat.click();
      await expect.poll(() => newestMessageType(page, before), { message: 'the button posted a message' })
         .toBe('effect');
   });
});

test.describe('a placed token', () => {
   test('the Unlink button of the sheet a token double-click opens unlinks the token, not the prototype', async () => {
      const { actorId, tokenId, tokenUuid } = await placeUnlinkedToken();

      /** @type {{tokenLinked: boolean, prototypeLinked: boolean, synthetic: boolean}} The link state afterwards. */
      const state = await page.evaluate(async ({ actorId, tokenUuid }) => {
         /** @type {TokenDocument} The placed token. */
         const token = await fromUuid(tokenUuid);
         return {
            tokenLinked: token.actorLink,
            prototypeLinked: game.actors.get(actorId).prototypeToken.actorLink,
            synthetic: token.actor !== game.actors.get(actorId) && token.actor?.isToken === true,
         };
      }, {
         actorId,
         tokenUuid,
      });
      expect(state.tokenLinked, 'the placed token is unlinked').toBe(false);
      expect(state.prototypeLinked, 'the prototype link is untouched').toBe(true);
      expect(state.synthetic, 'the token now resolves a synthetic actor').toBe(true);
      await expect(page.locator(`.application.titan-document-sheet[id*="Token-${tokenId}"]`)).toBeVisible();
   });

   test('an edit on an unlinked token sheet leaves the open base actor sheet unchanged', async () => {
      const { actorId, tokenId, tokenUuid } = await placeUnlinkedToken();
      const tokenSheet = page.locator(`.application.titan-document-sheet[id*="Token-${tokenId}"]`);
      const baseSheet = await openSheetByUuid(page, `Actor.${actorId}`);

      // A counter on each actor's `system` getter measures what the open sheet of that actor reads: a sheet's reactive
      // readers re-run, and read `document.data.system`, only when its bridge is invalidated.
      await page.evaluate(async ({ actorId, tokenUuid }) => {
         globalThis.titanSystemReads = {
            base: 0,
            token: 0,
         };
         for (const [which, actor] of [
            [
               'base',
               game.actors.get(actorId),
            ],
            [
               'token',
               (await fromUuid(tokenUuid)).actor,
            ],
         ]) {
            /** @type {object} The actor's data model, returned by the counting getter. */
            const system = actor.system;
            Object.defineProperty(actor, 'system', {
               configurable: true,
               get() {
                  globalThis.titanSystemReads[which]++;
                  return system;
               },
            });
         }
      }, {
         actorId,
         tokenUuid,
      });

      /**
       * Reads how many times each actor's `system` was read since the counters were installed.
       * @returns {Promise<{base: number, token: number}>} The read counts of the base actor and the synthetic actor.
       */
      const reads = () => page.evaluate(() => ({ ...globalThis.titanSystemReads }));

      /**
       * Reads the actor's name as the base actor and the token's synthetic actor report it.
       * @returns {Promise<{base: string, token: string}>} The two names.
       */
      const names = () => page.evaluate(async ({ actorId, tokenUuid }) => ({
         base: game.actors.get(actorId).name,
         token: (await fromUuid(tokenUuid)).actor.name,
      }), {
         actorId,
         tokenUuid,
      });
      const baseName = (await names()).base;

      // Presence: an edit made on the base sheet itself re-runs the base sheet's readers.
      await commitText(baseSheet.locator('.document-name input'), `${baseName} Edited`);
      await expect.poll(async () => (await names()).base, { message: 'the base sheet stored the name' })
         .toBe(`${baseName} Edited`);
      await expect.poll(async () => (await reads()).base, { message: 'a base sheet edit re-ran its readers' })
         .toBeGreaterThan(0);

      // The base edit's own re-renders (meters animate after a value read) end before the read count is taken.
      /** @type {number} The base read count at the previous poll. */
      let previous = -1;
      await expect.poll(async () => {
         const current = (await reads()).base;
         const stable = current === previous;
         previous = current;
         return stable;
      }, { message: 'the base sheet readers settled' }).toBe(true);

      // Absence: the same kind of edit on the unlinked token's sheet leaves the base sheet's readers alone.
      /** @type {{base: number, token: number}} The reads before the token sheet edit. */
      const readsBefore = await reads();
      await commitText(tokenSheet.locator('.document-name input'), 'E2E Header Token Edited');
      await expect.poll(async () => (await names()).token, { message: 'the token sheet stored the name' })
         .toBe('E2E Header Token Edited');
      await expect(tokenSheet.locator('.document-name input')).toHaveValue('E2E Header Token Edited');
      expect((await names()).base, 'the base actor keeps its name').toBe(`${baseName} Edited`);
      await expect(baseSheet.locator('.document-name input')).toHaveValue(`${baseName} Edited`);

      // Presence on the token side: the same edit re-ran the token sheet's own readers.
      await expect.poll(async () => (await reads()).token, { message: 'the token sheet edit re-ran its readers' })
         .toBeGreaterThan(readsBefore.token);
      expect((await reads()).base, 'the base sheet readers did not re-run').toBe(readsBefore.base);
   });
});
