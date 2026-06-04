import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';
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
// AttributeButton
// ---------------------------------------------------------------------------

test.describe('component probe — AttributeButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      // Mount with a valid attribute name; onclick is instrumented.
      const live = await mountProbe(page, 'AttributeButton', {
         props: {
            attribute: 'body',
            testId: 'probe-attribute-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'AttributeButton', {
         props: {
            attribute: 'body',
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid on the button', async () => {
      const { selector } = await mountProbe(page, 'AttributeButton', {
         props: {
            attribute: 'body',
            testId: 'probe-attribute-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-attribute-button"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ExpandButton
// ---------------------------------------------------------------------------

test.describe('component probe — ExpandButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click self-flips the glyph between collapsed and expanded', async () => {
      // ExpandButton is self-managing: expanded=$bindable(false). No external onclick prop.
      // Initial state: collapsed → fa-angle-double-right; after click: expanded → fa-angle-double-down.
      const { selector } = await mountProbe(page, 'ExpandButton', {
         props: { testId: 'probe-expand-button' },
      });
      const collapsed = page.locator(`${selector} i.fa-angle-double-right`);
      const expanded = page.locator(`${selector} i.fa-angle-double-down`);
      await expect(collapsed).toHaveCount(1);
      await expect(expanded).toHaveCount(0);

      await page.locator(`${selector} button`).click();
      await expect(collapsed).toHaveCount(0);
      await expect(expanded).toHaveCount(1);

      // Second click collapses again.
      await page.locator(`${selector} button`).click();
      await expect(collapsed).toHaveCount(1);
      await expect(expanded).toHaveCount(0);
   });

   test('testId resolves to data-testid on the button', async () => {
      const { selector } = await mountProbe(page, 'ExpandButton', {
         props: { testId: 'probe-expand-button' },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-expand-button"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------

test.describe('component probe — IconButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      const live = await mountProbe(page, 'IconButton', {
         props: {
            icon: 'fas fa-gear',
            label: 'Settings',
            testId: 'probe-icon-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'IconButton', {
         props: {
            icon: 'fas fa-gear',
            label: 'Settings',
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('icon class is rendered inside the button', async () => {
      const { selector } = await mountProbe(page, 'IconButton', {
         props: {
            icon: 'fas fa-gear',
            label: 'Settings',
         },
      });
      await expect(page.locator(`${selector} button i.fa-gear`)).toBeVisible();
   });

   test('testId resolves to data-testid on the button', async () => {
      const { selector } = await mountProbe(page, 'IconButton', {
         props: {
            icon: 'fas fa-gear',
            label: 'Settings',
            testId: 'probe-icon-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-icon-button"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// IconLabelButton
// ---------------------------------------------------------------------------

test.describe('component probe — IconLabelButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      const live = await mountProbe(page, 'IconLabelButton', {
         props: {
            icon: 'fas fa-star',
            label: 'Save',
            testId: 'probe-icon-label-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'IconLabelButton', {
         props: {
            icon: 'fas fa-star',
            label: 'Save',
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('label text and icon class are rendered', async () => {
      const { selector } = await mountProbe(page, 'IconLabelButton', {
         props: {
            icon: 'fas fa-star',
            label: 'Save',
         },
      });
      await expect(page.locator(`${selector} button`)).toContainText('Save');
      await expect(page.locator(`${selector} button i.fa-star`)).toBeVisible();
   });

   test('testId resolves to data-testid on the inner button', async () => {
      const { selector } = await mountProbe(page, 'IconLabelButton', {
         props: {
            icon: 'fas fa-star',
            label: 'Save',
            testId: 'probe-icon-label-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-icon-label-button"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ImageButton
// ---------------------------------------------------------------------------

test.describe('component probe — ImageButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      const live = await mountProbe(page, 'ImageButton', {
         props: {
            src: 'icons/svg/mystery-man.svg',
            alt: 'Actor',
            testId: 'probe-image-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'ImageButton', {
         props: {
            src: 'icons/svg/mystery-man.svg',
            alt: 'Actor',
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid on the button', async () => {
      const { selector } = await mountProbe(page, 'ImageButton', {
         props: {
            src: 'icons/svg/mystery-man.svg',
            alt: 'Actor',
            testId: 'probe-image-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-image-button"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ItemCheckButton
// ---------------------------------------------------------------------------

test.describe('component probe — ItemCheckButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      const live = await mountProbe(page, 'ItemCheckButton', {
         props: {
            label: 'Strike',
            attribute: 'body',
            testId: 'probe-item-check-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'ItemCheckButton', {
         props: {
            label: 'Strike',
            attribute: 'body',
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('label text and resolve cost render', async () => {
      const { selector } = await mountProbe(page, 'ItemCheckButton', {
         props: {
            label: 'Strike',
            attribute: 'body',
            resolveCost: 2,
         },
      });
      await expect(page.locator(`${selector} button`)).toContainText('Strike');
      // Resolve cost section is shown when resolveCost is truthy.
      await expect(page.locator(`${selector} .resolve`)).toBeVisible();
      await expect(page.locator(`${selector} .resolve`)).toContainText('2');
   });

   test('testId resolves to data-testid on the wrapper div', async () => {
      const { selector } = await mountProbe(page, 'ItemCheckButton', {
         props: {
            label: 'Strike',
            attribute: 'body',
            testId: 'probe-item-check-button',
         },
      });
      await expect(
         page.locator(`${selector} [data-testid="probe-item-check-button"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// MiniButton
// ---------------------------------------------------------------------------

test.describe('component probe — MiniButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      const live = await mountProbe(page, 'MiniButton', {
         props: { testId: 'probe-mini-button' },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'MiniButton', {
         props: { disabled: true },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid on the button', async () => {
      const { selector } = await mountProbe(page, 'MiniButton', {
         props: { testId: 'probe-mini-button' },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-mini-button"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// MiniIconButton
// ---------------------------------------------------------------------------

test.describe('component probe — MiniIconButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      const live = await mountProbe(page, 'MiniIconButton', {
         props: {
            icon: 'fas fa-trash',
            label: 'Delete',
            testId: 'probe-mini-icon-button',
         },
         events: ['onclick'],
      });
      // MiniIconButton wraps IconButton in a div; the clickable element is the inner <button>.
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'MiniIconButton', {
         props: {
            icon: 'fas fa-trash',
            label: 'Delete',
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('icon class is rendered inside the button', async () => {
      const { selector } = await mountProbe(page, 'MiniIconButton', {
         props: {
            icon: 'fas fa-trash',
            label: 'Delete',
         },
      });
      await expect(page.locator(`${selector} button i.fa-trash`)).toBeVisible();
   });

   test('testId resolves to data-testid on the wrapper div', async () => {
      const { selector } = await mountProbe(page, 'MiniIconButton', {
         props: {
            icon: 'fas fa-trash',
            label: 'Delete',
            testId: 'probe-mini-icon-button',
         },
      });
      await expect(
         page.locator(`${selector} [data-testid="probe-mini-icon-button"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ResistanceButton
// ---------------------------------------------------------------------------

test.describe('component probe — ResistanceButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      const live = await mountProbe(page, 'ResistanceButton', {
         props: {
            resistance: 'resilience',
            testId: 'probe-resistance-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'ResistanceButton', {
         props: {
            resistance: 'resilience',
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid on the button', async () => {
      const { selector } = await mountProbe(page, 'ResistanceButton', {
         props: {
            resistance: 'resilience',
            testId: 'probe-resistance-button',
         },
      });
      await expect(
         page.locator(`${selector} button[data-testid="probe-resistance-button"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ResistanceCheckButton
// ---------------------------------------------------------------------------

test.describe('component probe — ResistanceCheckButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the resistance label with difficulty and complexity', async () => {
      // ResistanceCheckButton has no external onclick prop; its internal handler calls
      // getBestCharactersToUpdate() which is safe when no targets are selected (empty loop).
      const { selector } = await mountProbe(page, 'ResistanceCheckButton', {
         props: {
            resistance: 'resilience',
            difficulty: 4,
            complexity: 2,
            testId: 'probe-resistance-check-button',
         },
      });
      await expect(page.locator(`${selector} button`)).toContainText('4:2');
   });

   test('disabled prevents the button from being clickable', async () => {
      const { selector } = await mountProbe(page, 'ResistanceCheckButton', {
         props: {
            resistance: 'resilience',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} button`)).toBeDisabled();
   });

   test('testId resolves to data-testid on the wrapper div', async () => {
      const { selector } = await mountProbe(page, 'ResistanceCheckButton', {
         props: {
            resistance: 'resilience',
            testId: 'probe-resistance-check-button',
         },
      });
      await expect(
         page.locator(`${selector} [data-testid="probe-resistance-check-button"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// SpendResolveButton
// ---------------------------------------------------------------------------

test.describe('component probe — SpendResolveButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async () => {
      // resolveCost is required; calling .toString() on undefined would throw.
      const live = await mountProbe(page, 'SpendResolveButton', {
         props: {
            resolveCost: 3,
            testId: 'probe-spend-resolve-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${live.selector} button`).click();
      let events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'SpendResolveButton', {
         props: {
            resolveCost: 3,
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('resolve cost value is rendered in the button label', async () => {
      const { selector } = await mountProbe(page, 'SpendResolveButton', {
         props: { resolveCost: 5 },
      });
      // The label uses localize('spendX%Resolve').replace('X%', resolveCost.toString()); assert the
      // cost number appears in the rendered text regardless of locale string shape.
      await expect(page.locator(`${selector} button`)).toContainText('5');
   });

   test('testId resolves to data-testid on the wrapper div', async () => {
      const { selector } = await mountProbe(page, 'SpendResolveButton', {
         props: {
            resolveCost: 1,
            testId: 'probe-spend-resolve-button',
         },
      });
      await expect(
         page.locator(`${selector} [data-testid="probe-spend-resolve-button"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ToggleButton — prop-driven toggle (active prop, not self-managed)
// ---------------------------------------------------------------------------

test.describe('component probe — ToggleButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('icon reflects the active prop and click fires onclick', async () => {
      // Prop-driven: CHECKED_ICON='fas fa-square-check', UNCHECKED_ICON='fas fa-square'.
      // Parent owns state; the button does NOT self-flip; assert glyph via two separate mounts.
      const off = await mountProbe(page, 'ToggleButton', {
         props: {
            label: 'Ready',
            active: false,
            testId: 'probe-toggle-button-off',
         },
         events: ['onclick'],
      });
      // active=false → UNCHECKED_ICON (fa-square), no fa-square-check.
      await expect(page.locator(`${off.selector} i.fa-square-check`)).toHaveCount(0);
      await expect(page.locator(`${off.selector} i.fa-square`)).toHaveCount(1);
      await page.locator(`${off.selector} button`).click();
      expect((await readProbeEvents(page)).filter((e) => e.event === 'onclick')).toHaveLength(1);

      const on = await mountProbe(page, 'ToggleButton', {
         props: {
            label: 'Ready',
            active: true,
            testId: 'probe-toggle-button-on',
         },
      });
      // active=true → CHECKED_ICON (fa-square-check).
      await expect(page.locator(`${on.selector} i.fa-square-check`)).toHaveCount(1);
   });

   test('disabled suppresses onclick', async () => {
      const { selector } = await mountProbe(page, 'ToggleButton', {
         props: {
            label: 'Ready',
            active: false,
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid on the inner button', async () => {
      const { selector } = await mountProbe(page, 'ToggleButton', {
         props: {
            label: 'Ready',
            active: false,
            testId: 'probe-toggle-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-toggle-button"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ToggleOptionButton — prop-driven toggle (enabled prop, CSS-class-based)
// ---------------------------------------------------------------------------

test.describe('component probe — ToggleOptionButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('enabled prop drives the wrapper class and an off-state option stays clickable', async () => {
      // Prop-driven: enabled=false → wrapper has class 'not-enabled'; enabled=true → class 'enabled'.
      // Parent owns state; no self-flip. Assert via two separate mounts. The off-state class is
      // deliberately NOT 'disabled' — that would collide with Foundry's global
      // `.disabled { pointer-events: none; }`, making an off filter option permanently un-clickable.
      const off = await mountProbe(page, 'ToggleOptionButton', {
         props: {
            label: 'Flanking',
            enabled: false,
            testId: 'probe-toggle-option-off',
         },
         events: ['onclick'],
      });
      await expect(page.locator(`${off.selector} .toggle.not-enabled`)).toHaveCount(1);
      await expect(page.locator(`${off.selector} .toggle.disabled`)).toHaveCount(0);
      await expect(page.locator(`${off.selector} .toggle.enabled`)).toHaveCount(0);
      // An off-state option must remain interactive so the user can turn the filter back on; a plain
      // (non-forced) click verifies pointer events actually reach the inner button.
      await page.locator(`${off.selector} button`).click();
      expect((await readProbeEvents(page)).filter((e) => e.event === 'onclick')).toHaveLength(1);

      const on = await mountProbe(page, 'ToggleOptionButton', {
         props: {
            label: 'Flanking',
            enabled: true,
            testId: 'probe-toggle-option-on',
         },
      });
      await expect(page.locator(`${on.selector} .toggle.enabled`)).toHaveCount(1);
      await expect(page.locator(`${on.selector} .toggle.not-enabled`)).toHaveCount(0);
   });

   test('disabled suppresses onclick', async () => {
      const { selector } = await mountProbe(page, 'ToggleOptionButton', {
         props: {
            label: 'Flanking',
            enabled: false,
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('label text is rendered in the button', async () => {
      const { selector } = await mountProbe(page, 'ToggleOptionButton', {
         props: {
            label: 'Flanking',
            enabled: false,
         },
      });
      await expect(page.locator(`${selector} button`)).toContainText('Flanking');
   });

   test('testId resolves to data-testid on the wrapper div', async () => {
      const { selector } = await mountProbe(page, 'ToggleOptionButton', {
         props: {
            label: 'Flanking',
            enabled: false,
            testId: 'probe-toggle-option-button',
         },
      });
      await expect(
         page.locator(`${selector} [data-testid="probe-toggle-option-button"]`),
      ).toBeVisible();
   });
});
