import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, unmountAll, clearProbeEvents, probeComponent } from './componentProbe.js';
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

// ---------------------------------------------------------------------------
// Meter
// ---------------------------------------------------------------------------

test.describe('component probe — Meter', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('animates the bar width to value/max percent', async () => {
      // Formula (per Meter.svelte, JS operator precedence): ((value / max) - min) * 100.
      // For value=3, max=4, min=0 → ((3 / 4) - 0) * 100 = 75 %.
      // The bar reaches its target asynchronously via setInterval; poll until it arrives.
      const { selector } = await mountProbe(page, 'Meter', {
         props: {
            value: 3,
            max: 4,
            min: 0,
            testId: 'probe-meter',
         },
      });
      await expect.poll(
         async () => {
            return page.locator(`${selector} .meter span`).evaluate((el) => {
               return Math.round(parseFloat(el.style.width));
            });
         },
         { timeout: 5000 },
      ).toBe(75);
   });

   test('testId resolves to data-testid on the root .meter div', async () => {
      const { selector } = await mountProbe(page, 'Meter', {
         props: {
            value: 1,
            max: 2,
            testId: 'probe-meter',
         },
      });
      await expect(
         page.locator(`${selector} .meter[data-testid="probe-meter"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

test.describe('component probe — Text', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders raw text when localize is false', async () => {
      // Text renders processTextData(text) inline with no own root element.
      // Pass a TextData object with localize:false to skip i18n and assert the literal string.
      const { selector } = await mountProbe(page, 'Text', {
         props: {
            text: {
               text: 'HelloProbeText',
               localize: false,
            },
         },
      });
      // The probe container itself holds the inline text output.
      await expect(page.locator(selector)).toContainText('HelloProbeText');
   });

   test('renders a numeric value directly', async () => {
      const { selector } = await mountProbe(page, 'Text', {
         props: {
            text: 42,
         },
      });
      await expect(page.locator(selector)).toContainText('42');
   });
});

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

test.describe('component probe — Tabs', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('only the active tab content is mounted; inactive tab component is absent', async () => {
      // Tabs lazy-mounts via `{#if tab.id === activeTab}`.  The component renders with no props, so
      // LabelTag renders an empty `.tag` div.  With 2 tabs but only one active, exactly ONE `.tag`
      // appears inside `.tab-content`; the inactive tab's component is never instantiated.
      const { selector } = await mountProbe(page, 'Tabs', {
         props: {
            tabs: [
               {
                  id: 'tab-a',
                  label: 'Tab A',
                  component: probeComponent('LabelTag'),
               },
               {
                  id: 'tab-b',
                  label: 'Tab B',
                  component: probeComponent('LabelTag'),
               },
            ],
            activeTab: 'tab-a',
            testId: 'probe-tabs',
         },
      });
      // Only one LabelTag (the active tab's body) should be rendered inside .tab-content.
      await expect(page.locator(`${selector} .tab-content .tag`)).toHaveCount(1);
   });

   test('switching activeTab to the other tab still renders exactly one body component', async () => {
      // Mount with tab-b active — the inactive tab (tab-a) must not be instantiated.
      const { selector } = await mountProbe(page, 'Tabs', {
         props: {
            tabs: [
               {
                  id: 'tab-a',
                  label: 'Tab A',
                  component: probeComponent('LabelTag'),
               },
               {
                  id: 'tab-b',
                  label: 'Tab B',
                  component: probeComponent('LabelTag'),
               },
            ],
            activeTab: 'tab-b',
         },
      });
      await expect(page.locator(`${selector} .tab-content .tag`)).toHaveCount(1);
   });

   test('testId resolves to data-testid on the root .tabs div', async () => {
      const { selector } = await mountProbe(page, 'Tabs', {
         props: {
            tabs: [
               {
                  id: 'tab-a',
                  label: 'Tab A',
                  component: probeComponent('LabelTag'),
               },
            ],
            activeTab: 'tab-a',
            testId: 'probe-tabs',
         },
      });
      await expect(
         page.locator(`${selector} .tabs[data-testid="probe-tabs"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ScrollingContainer
// ---------------------------------------------------------------------------

test.describe('component probe — ScrollingContainer', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders children inside the .content wrapper', async () => {
      // ScrollingContainer wraps children in .container > .content.
      // The harness string text prop becomes a snippet that renders inside the container.
      const { selector } = await mountProbe(page, 'ScrollingContainer', {
         props: {
            text: 'ScrollProbeChild',
            testId: 'probe-scrolling-container',
         },
      });
      await expect(page.locator(`${selector} .container .content`)).toContainText('ScrollProbeChild');
   });

   test('testId resolves to data-testid on the root .container div', async () => {
      // ScrollingContainer uses height:100% so the element has zero height in the fixed-position probe
      // container; use toBeAttached() to confirm the attribute is present without requiring a paint size.
      const { selector } = await mountProbe(page, 'ScrollingContainer', {
         props: {
            text: 'child',
            testId: 'probe-scrolling-container',
         },
      });
      await expect(
         page.locator(`${selector} .container[data-testid="probe-scrolling-container"]`),
      ).toBeAttached();
   });
});

// ---------------------------------------------------------------------------
// LabeledElement
// ---------------------------------------------------------------------------

test.describe('component probe — LabeledElement', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the label text and children inside the wrapper', async () => {
      // LabeledElement renders .labeled-element > .label + .element.
      // Pass `text` as the children snippet via the harness string prop.
      const { selector } = await mountProbe(page, 'LabeledElement', {
         props: {
            label: 'MyLabel',
            text: 'ElementChild',
            testId: 'probe-labeled-element',
         },
      });
      // Use a direct-child selector: TextLabel nests its own `.label` (via Label.svelte) inside
      // LabeledElement's outer `.label` wrapper, so `.labeled-element .label` matches two elements.
      await expect(page.locator(`${selector} .labeled-element > .label`)).toContainText('MyLabel');
      await expect(page.locator(`${selector} .labeled-element > .element`)).toContainText('ElementChild');
   });

   test('testId resolves to data-testid on the root .labeled-element div', async () => {
      const { selector } = await mountProbe(page, 'LabeledElement', {
         props: {
            label: 'MyLabel',
            testId: 'probe-labeled-element',
         },
      });
      await expect(
         page.locator(`${selector} .labeled-element[data-testid="probe-labeled-element"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// BorderedColumnList
// ---------------------------------------------------------------------------

test.describe('component probe — BorderedColumnList', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders one .entry wrapper per entry and spreads props', async () => {
      // Each entry's props are spread into the entryComponent (LabelTag here).
      // LabelTag renders .tag with its label text, so ContainText verifies prop spreading.
      const { selector } = await mountProbe(page, 'BorderedColumnList', {
         props: {
            entryComponent: probeComponent('LabelTag'),
            entries: [
               { label: 'EntryOne' },
               { label: 'EntryTwo' },
            ],
            testId: 'probe-bordered-column-list',
         },
      });
      await expect(page.locator(`${selector} .entries .entry`)).toHaveCount(2);
      await expect(page.locator(`${selector} .entries`)).toContainText('EntryOne');
      await expect(page.locator(`${selector} .entries`)).toContainText('EntryTwo');
   });

   test('testId resolves to data-testid on the root .entries div', async () => {
      const { selector } = await mountProbe(page, 'BorderedColumnList', {
         props: {
            entryComponent: probeComponent('LabelTag'),
            entries: [
               { label: 'Item' },
            ],
            testId: 'probe-bordered-column-list',
         },
      });
      await expect(
         page.locator(`${selector} .entries[data-testid="probe-bordered-column-list"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// TagContainer
// ---------------------------------------------------------------------------

test.describe('component probe — TagContainer', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders one tag wrapper per supplied tag', async () => {
      // TagContainer wraps each tag in .tag-container > .tag (the outer wrapper div).
      // LabelTag itself also renders a .tag div, so use direct-child `> .tag` to count only
      // the outer wrappers, not the inner LabelTag roots.
      const { selector } = await mountProbe(page, 'TagContainer', {
         props: {
            tags: [
               {
                  id: 'a',
                  component: probeComponent('LabelTag'),
                  props: { label: 'One' },
               },
               {
                  id: 'b',
                  component: probeComponent('LabelTag'),
                  props: { label: 'Two' },
               },
            ],
         },
      });
      await expect(page.locator(`${selector} .tag-container > .tag`)).toHaveCount(2);
      await expect(page.locator(`${selector} .tag-container`)).toContainText('One');
      await expect(page.locator(`${selector} .tag-container`)).toContainText('Two');
   });

   test('testId resolves to data-testid on the root .tag-container div', async () => {
      const { selector } = await mountProbe(page, 'TagContainer', {
         props: {
            tags: [
               {
                  id: 'x',
                  component: probeComponent('LabelTag'),
                  props: { label: 'X' },
               },
            ],
            testId: 'probe-tag-container',
         },
      });
      await expect(
         page.locator(`${selector} .tag-container[data-testid="probe-tag-container"]`),
      ).toBeVisible();
   });
});
