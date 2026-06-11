import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

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

/**
 * Drives the per-kind `insertX` copy mutators the cross-sheet drop calls into, asserting copy
 * semantics: the source keeps its element, the target gains an independent copy, and the copy carries
 * a fresh uuid (so list keying stays unique). The pointer drag and type-gating are covered by the
 * action's `kind` check and live smoke-tests.
 */

const SRC_WEAPON = 'E2E Copy Source Weapon';
const DST_WEAPON = 'E2E Copy Target Weapon';
const SRC_SPELL = 'E2E Copy Source Spell';
const DST_SPELL = 'E2E Copy Target Spell';

test.describe('cross-sheet element copy', () => {
   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, 'TITAN system failed to initialize').toBe(true);
   });

   test('insertRulesElement copies with a fresh uuid and leaves the source intact', async () => {
      const result = await page.evaluate(async (names) => {
         for (const name of [names.src, names.dst]) {
            const stale = game.items.getName(name);
            if (stale) {
               await stale.delete();
            }
         }
         const source = await Item.create({ name: names.src, type: 'weapon' });
         const target = await Item.create({ name: names.dst, type: 'weapon' });
         await source.update({ system: { rulesElement: [] } });
         await target.update({ system: { rulesElement: [] } });
         await source.system.addRulesElement();
         const element = source.system.rulesElement[0];
         await target.system.insertRulesElement(element, 0);
         return {
            targetCount: target.system.rulesElement.length,
            sourceCount: source.system.rulesElement.length,
            freshUuid: target.system.rulesElement[0].uuid !== element.uuid,
            sameOperation: target.system.rulesElement[0].operation === element.operation,
         };
      }, { src: SRC_WEAPON, dst: DST_WEAPON });

      expect(result.targetCount).toBe(1);
      expect(result.sourceCount).toBe(1);
      expect(result.freshUuid).toBe(true);
      expect(result.sameOperation).toBe(true);
   });

   test('insertAttack copies with a fresh uuid and leaves the source intact', async () => {
      const result = await page.evaluate(async (names) => {
         const source = game.items.getName(names.src);
         const target = game.items.getName(names.dst);
         await source.update({ system: { attack: [] } });
         await target.update({ system: { attack: [] } });
         await source.system.addAttack();
         const element = source.system.attack[0];
         await target.system.insertAttack(element, 0);
         return {
            targetCount: target.system.attack.length,
            sourceCount: source.system.attack.length,
            freshUuid: target.system.attack[0].uuid !== element.uuid,
         };
      }, { src: SRC_WEAPON, dst: DST_WEAPON });

      expect(result.targetCount).toBe(1);
      expect(result.sourceCount).toBe(1);
      expect(result.freshUuid).toBe(true);
   });

   test('insertCheck copies with a fresh uuid and leaves the source intact', async () => {
      const result = await page.evaluate(async (names) => {
         const source = game.items.getName(names.src);
         const target = game.items.getName(names.dst);
         await source.update({ system: { check: [] } });
         await target.update({ system: { check: [] } });
         await source.addCheck();
         const element = source.system.check[0];
         await target.insertCheck(element, 0);
         return {
            targetCount: target.system.check.length,
            sourceCount: source.system.check.length,
            freshUuid: target.system.check[0].uuid !== element.uuid,
         };
      }, { src: SRC_WEAPON, dst: DST_WEAPON });

      expect(result.targetCount).toBe(1);
      expect(result.sourceCount).toBe(1);
      expect(result.freshUuid).toBe(true);
   });

   test('insertCustomAspect copies with a fresh uuid and leaves the source intact', async () => {
      const result = await page.evaluate(async (names) => {
         for (const name of [names.src, names.dst]) {
            const stale = game.items.getName(name);
            if (stale) {
               await stale.delete();
            }
         }
         const source = await Item.create({ name: names.src, type: 'spell' });
         const target = await Item.create({ name: names.dst, type: 'spell' });
         await source.system.addCustomAspect();
         const element = source.system.customAspect[0];
         await target.system.insertCustomAspect(element, 0);
         return {
            targetCount: target.system.customAspect.length,
            sourceCount: source.system.customAspect.length,
            freshUuid: target.system.customAspect[0].uuid !== element.uuid,
         };
      }, { src: SRC_SPELL, dst: DST_SPELL });

      expect(result.targetCount).toBe(1);
      expect(result.sourceCount).toBe(1);
      expect(result.freshUuid).toBe(true);
   });
});
