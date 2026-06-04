import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import {
   mountProbe,
   unmountAll,
   clearProbeEvents,
   documentContext,
   readProbeEvents,
   probeFn,
} from './componentProbe.js';
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

test.describe('component probe — RichText (context)', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('enriches its value into the rich-text div using the document context', async () => {
      const { selector } = await mountProbe(page, 'RichText', {
         props: {
            value: '<p>Hello <strong>world</strong></p>',
         },
         context: documentContext({ isOwner: true }),
      });
      const div = page.locator(`${selector} .rich-text`);
      await expect(div).toContainText('Hello world');
      await expect(div).not.toHaveClass(/not-owner/);
   });

   test('marks the div not-owner when the document context is not the owner', async () => {
      const { selector } = await mountProbe(page, 'RichText', {
         props: {
            value: '<p>Secret</p>',
         },
         context: documentContext({ isOwner: false }),
      });
      await expect(page.locator(`${selector} .rich-text`)).toHaveClass(/not-owner/);
   });
});

test.describe('component probe — EffectTag (plain effect data)', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders label, image, and custom remaining duration', async () => {
      const { selector } = await mountProbe(page, 'EffectTag', {
         props: {
            effect: {
               label: 'Burning',
               img: 'icons/svg/fire.svg',
               description: '<p>On fire.</p>',
               custom: 'rounds',
               remaining: 3,
            },
            testId: 'probe-effect',
         },
      });
      const tag = page.locator(`${selector} [data-testid="probe-effect"]`);
      await expect(tag).toContainText('Burning');
      await expect(tag.locator('.time')).toContainText('3 (rounds)');
      await expect(tag.locator('img')).toHaveAttribute('src', 'icons/svg/fire.svg');
   });
});

test.describe('component probe — CustomEffectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its label and custom-unit remaining duration', async () => {
      const { selector } = await mountProbe(page, 'CustomEffectTag', {
         props: {
            effect: {
               label: 'Inspired',
               img: 'icons/svg/aura.svg',
               description: '<p>Custom.</p>',
               custom: 'scenes',
               remaining: 2,
            },
            testId: 'probe-custom',
         },
      });
      const tag = page.locator(`${selector} [data-testid="probe-custom"]`);
      await expect(tag).toContainText('Inspired');
      await expect(tag.locator('.time')).toContainText('2 (scenes)');
      await expect(tag.locator('i.fa-star')).toHaveCount(1);
   });
});

test.describe('component probe — ExpiredEffectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its label and no time element (expired effects have no remaining)', async () => {
      const { selector } = await mountProbe(page, 'ExpiredEffectTag', {
         props: {
            effect: {
               label: 'Faded',
               img: 'icons/svg/daze.svg',
               description: '<p>Expired.</p>',
            },
            testId: 'probe-expired',
         },
      });
      const tag = page.locator(`${selector} [data-testid="probe-expired"]`);
      await expect(tag).toContainText('Faded');
      await expect(tag.locator('.time')).toHaveCount(0);
      await expect(tag.locator('i.fa-trash-clock')).toHaveCount(1);
   });
});

test.describe('component probe — InitiativeEffectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its label and initiative-based remaining duration', async () => {
      const { selector } = await mountProbe(page, 'InitiativeEffectTag', {
         props: {
            effect: {
               label: 'Bleeding',
               img: 'icons/svg/blood.svg',
               description: '<p>Initiative.</p>',
               initiative: 12,
               remaining: 4,
            },
            testId: 'probe-initiative',
         },
      });
      const tag = page.locator(`${selector} [data-testid="probe-initiative"]`);
      await expect(tag).toContainText('Bleeding');
      await expect(tag.locator('.time')).toContainText('4 (12)');
      await expect(tag.locator('i.fa-clock')).toHaveCount(1);
   });
});

test.describe('component probe — PermanentEffectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its label and no time element (permanent effects have no remaining)', async () => {
      const { selector } = await mountProbe(page, 'PermanentEffectTag', {
         props: {
            effect: {
               label: 'Blessed',
               img: 'icons/svg/angel.svg',
               description: '<p>Permanent.</p>',
            },
            testId: 'probe-permanent',
         },
      });
      const tag = page.locator(`${selector} [data-testid="probe-permanent"]`);
      await expect(tag).toContainText('Blessed');
      await expect(tag.locator('.time')).toHaveCount(0);
      await expect(tag.locator('i.fa-infinity')).toHaveCount(1);
   });
});

test.describe('component probe — TurnEndEffectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its label and bare turn-based remaining duration', async () => {
      const { selector } = await mountProbe(page, 'TurnEndEffectTag', {
         props: {
            effect: {
               label: 'Regenerating',
               img: 'icons/svg/regen.svg',
               description: '<p>Turn end.</p>',
               remaining: 5,
            },
            testId: 'probe-turn-end',
         },
      });
      const tag = page.locator(`${selector} [data-testid="probe-turn-end"]`);
      await expect(tag).toContainText('Regenerating');
      await expect(tag.locator('.time')).toHaveText('5');
      await expect(tag.locator('i.fa-hourglass-end')).toHaveCount(1);
   });
});

test.describe('component probe — TurnStartEffectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its label and bare turn-based remaining duration', async () => {
      const { selector } = await mountProbe(page, 'TurnStartEffectTag', {
         props: {
            effect: {
               label: 'Burning Aura',
               img: 'icons/svg/fire.svg',
               description: '<p>Turn start.</p>',
               remaining: 6,
            },
            testId: 'probe-turn-start',
         },
      });
      const tag = page.locator(`${selector} [data-testid="probe-turn-start"]`);
      await expect(tag).toContainText('Burning Aura');
      await expect(tag.locator('.time')).toHaveText('6');
      await expect(tag.locator('i.fa-hourglass-start')).toHaveCount(1);
   });
});

test.describe('component probe — FiltereedList (context)', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders only filtered entries while preserving each entry original index', async () => {
      const { selector } = await mountProbe(page, 'FiltereedList', {
         props: {
            entries: [
               {
                  keep: true,
               },
               {
                  keep: false,
               },
               {
                  keep: true,
               },
            ],
            filterFunction: probeFn('entryKeep'),
            componentFunction: probeFn('returnComponent', { component: 'LabelTag' }),
            propsFunction: probeFn('labelFromIdx'),
            testId: 'probe-list',
         },
      });

      // The middle entry is filtered out, so exactly two list items render.
      const list = page.locator(`${selector} [data-testid="probe-list"]`);
      await expect(list).toHaveCount(1);
      await expect(list.locator('li')).toHaveCount(2);

      // Each rendered tag is labelled with its ORIGINAL index — "0" and "2", not "0" and "1".
      const tags = list.locator('li .tag');
      await expect(tags).toHaveCount(2);
      await expect(tags.nth(0)).toHaveText('0');
      await expect(tags.nth(1)).toHaveText('2');
   });
});

test.describe('component probe — CondensedCheckButton (context)', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its label and stats and fires onclick when owned', async () => {
      const { selector } = await mountProbe(page, 'CondensedCheckButton', {
         props: {
            attribute: 'body',
            difficulty: 4,
            complexity: 2,
            totalDice: 5,
            label: 'Athletics',
            testId: 'probe-check',
         },
         events: ['onclick'],
         context: documentContext({ isOwner: true }),
      });
      const root = page.locator(`${selector} [data-testid="probe-check"]`);
      await expect(root).toContainText('Athletics');
      await expect(root.locator('.stat').first()).toContainText('4:2');

      const button = root.locator('button');
      await expect(button).not.toBeDisabled();
      await button.click();
      const events = await readProbeEvents(page);
      expect(events.filter((entry) => entry.event === 'onclick').length).toBe(1);
   });

   test('disables the button when the document context is not the owner', async () => {
      const { selector } = await mountProbe(page, 'CondensedCheckButton', {
         props: {
            attribute: 'body',
            difficulty: 4,
            complexity: 2,
            totalDice: 5,
            label: 'Athletics',
            testId: 'probe-check-disabled',
         },
         context: documentContext({ isOwner: false }),
      });
      await expect(page.locator(`${selector} [data-testid="probe-check-disabled"] button`)).toBeDisabled();
   });
});

test.describe('component probe — ProseMirrorEditor', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('builds the native prose-mirror element and tears it down on unmount', async () => {
      const { id, selector } = await mountProbe(page, 'ProseMirrorEditor', {
         props: {
            value: '<p>Editor body</p>',
            editable: true,
            enrichedReady: true,
         },
      });
      await expect(page.locator(`${selector} prose-mirror`)).toHaveCount(1);
      await page.evaluate((id) => globalThis.game.titan._probe.unmount(id), id);
      await expect(page.locator(`${selector}`)).toHaveCount(0);
   });
});
