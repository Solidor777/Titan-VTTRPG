import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { mountProbe, PAYLOAD, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';
import selectDisplayedSpellAspects from '~/document/types/item/types/spell/SelectDisplayedSpellAspects.js';

/** @type {string} The payload's image once cleaned: the same element without its handler. */
const CLEAN_IMAGE = '<img src="e2e-missing-image.png">';

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

// ---------------------------------------------------------------------------
// HudButton
// ---------------------------------------------------------------------------
test.describe('component probe — HudButton', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click, pointer move and focus fire their handlers and disabled suppresses the click', async () => {
      const live = await mountProbe(page, 'HudButton', {
         props: {
            text: 'Go',
            testId: 'probe-hud-button',
         },
         events: [
            'onclick',
            'onpointermove',
            'onfocus',
         ],
      });
      const button = page.locator(`${live.selector} button[data-testid="probe-hud-button"]`);
      await expect(button).toHaveText('Go');
      await button.click();
      await expect.poll(async () => (await readProbeEvents(page)).map((e) => e.event))
         .toEqual(expect.arrayContaining([
            'onclick',
            'onpointermove',
            'onfocus',
         ]));
      expect((await readProbeEvents(page)).filter((e) => e.event === 'onclick')).toHaveLength(1);

      await clearProbeEvents(page);
      const dead = await mountProbe(page, 'HudButton', {
         props: {
            text: 'Stop',
            disabled: true,
         },
         events: ['onclick'],
      });
      await expect(page.locator(`${dead.selector} button`)).toBeDisabled();
      await page.locator(`${dead.selector} button`).click({ force: true });
      expect((await readProbeEvents(page)).filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('variant, state and label props reach the button', async () => {
      const set = await mountProbe(page, 'HudButton', {
         props: {
            text: 'Go',
            variant: 'sub-option',
            active: true,
            accentEdge: 'left',
            align: 'end',
            pressed: true,
            ariaLabel: 'Probe hud label',
            testId: 'probe-hud-set',
         },
      });
      const button = page.locator(`${set.selector} button`);
      for (const token of [
         'hud-button',
         'sub-option',
         'active',
         'align-end',
         'pressed',
         'accent-left',
      ]) {
         await expect(button).toHaveClass(new RegExp(`(^| )${token}( |$)`));
      }
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAttribute('aria-label', 'Probe hud label');
      await expect(button).toHaveAttribute('data-testid', 'probe-hud-set');

      const plain = await mountProbe(page, 'HudButton', { props: { text: 'Plain' } });
      const plainButton = page.locator(`${plain.selector} button`);
      await expect(plainButton).toHaveClass(/(^| )hud-button( |$)/);
      await expect(plainButton).toHaveClass(/(^| )category( |$)/);
      await expect(plainButton).not.toHaveClass(/(^| )(active|pressed|align-end|accent-left)( |$)/);
      await expect(plainButton).not.toHaveAttribute('aria-pressed');
      await expect(plainButton).toHaveAttribute('type', 'button');
   });

   test('the active and pressed states change what is drawn', async () => {
      const plain = await mountProbe(page, 'HudButton', { props: { text: 'Plain' } });
      const active = await mountProbe(page, 'HudButton', {
         props: {
            text: 'Active',
            active: true,
            pressed: true,
         },
      });

      /**
       * Reads the drawn state of a probe's button.
       * @param {string} selector - The probe container selector.
       * @returns {Promise<{ background: string, shadow: string }>} The computed background color and box shadow.
       */
      const drawn = (selector) => page.locator(`${selector} button`).evaluate((element) => ({
         background: getComputedStyle(element).backgroundColor,
         shadow: getComputedStyle(element).boxShadow,
      }));
      await expect.poll(async () => (await drawn(active.selector)).shadow).not.toBe('none');
      expect((await drawn(plain.selector)).shadow).toBe('none');
      expect((await drawn(active.selector)).background).not.toBe((await drawn(plain.selector)).background);
   });
});

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------
test.describe('component probe — Tag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders default-slot text and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'Tag', {
         props: {
            text: 'Frostbite',
            testId: 'probe-tag',
         },
      });
      const tag = page.locator(`${selector} .tag[data-testid="probe-tag"]`);
      await expect(tag).toBeVisible();
      await expect(tag).toHaveText('Frostbite');
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'Tag', {
         props: {
            text: 'Ice Shard',
            // Use TextData form so processTextData emits the raw string without attempting localization.
            tooltip: {
               text: 'A shard of magical ice.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('A shard of magical ice.');
   });
});

// ---------------------------------------------------------------------------
// IconTag
// ---------------------------------------------------------------------------
test.describe('component probe — IconTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders icon class and label, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'IconTag', {
         props: {
            icon: 'fas fa-fire',
            label: 'Fire',
            testId: 'probe-icon-tag',
         },
      });
      const tag = page.locator(`${selector} .tag[data-testid="probe-icon-tag"]`);
      await expect(tag).toBeVisible();
      await expect(page.locator(`${selector} .tag i.fas.fa-fire`)).toBeVisible();
      await expect(page.locator(`${selector} .tag .label`)).toHaveText('Fire');
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'IconTag', {
         props: {
            icon: 'fas fa-fire',
            label: 'Fire',
            tooltip: {
               text: 'Burn everything.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('Burn everything.');
   });
});

// ---------------------------------------------------------------------------
// IconStatTag
// ---------------------------------------------------------------------------
test.describe('component probe — IconStatTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders icon, label, and value, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'IconStatTag', {
         props: {
            icon: 'fas fa-bolt',
            label: 'Speed',
            value: 30,
            testId: 'probe-icon-stat-tag',
         },
      });
      const tag = page.locator(`${selector} .tag[data-testid="probe-icon-stat-tag"]`);
      await expect(tag).toBeVisible();
      await expect(page.locator(`${selector} .tag i.fas.fa-bolt`)).toBeVisible();
      await expect(page.locator(`${selector} .tag .label`)).toHaveText('Speed');
      await expect(page.locator(`${selector} .tag .value`)).toHaveText('30');
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'IconStatTag', {
         props: {
            icon: 'fas fa-bolt',
            label: 'Speed',
            value: 30,
            tooltip: {
               text: 'Movement speed in feet.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('Movement speed in feet.');
   });
});

// ---------------------------------------------------------------------------
// StatTag
// ---------------------------------------------------------------------------
test.describe('component probe — StatTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders label and value, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'StatTag', {
         props: {
            label: 'Strength',
            value: 4,
            testId: 'probe-stat-tag',
         },
      });
      const tag = page.locator(`${selector} .tag[data-testid="probe-stat-tag"]`);
      await expect(tag).toBeVisible();
      await expect(page.locator(`${selector} .tag .label`)).toHaveText('Strength');
      await expect(page.locator(`${selector} .tag .value`)).toHaveText('4');
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'StatTag', {
         props: {
            label: 'Strength',
            value: 4,
            tooltip: {
               text: 'Raw physical might.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('Raw physical might.');
   });
});

// ---------------------------------------------------------------------------
// ValueTag
// ---------------------------------------------------------------------------
test.describe('component probe — ValueTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders localized "value" label and the supplied value, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'ValueTag', {
         props: {
            value: 7,
            testId: 'probe-value-tag',
         },
      });
      // ValueTag wraps StatTag; testId lands on the inner .tag div.
      const tag = page.locator(`${selector} .tag[data-testid="probe-value-tag"]`);
      await expect(tag).toBeVisible();
      await expect(page.locator(`${selector} .tag .value`)).toHaveText('7');
   });
});

// ---------------------------------------------------------------------------
// RarityTag
// ---------------------------------------------------------------------------
test.describe('component probe — RarityTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the localized rarity label and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'RarityTag', {
         props: {
            rarity: 'rare',
            testId: 'probe-rarity-tag',
         },
      });
      // RarityTag renders a .tag.rare div; localize('rare') determines the display text.
      const tag = page.locator(`${selector} .tag.rare[data-testid="probe-rarity-tag"]`);
      await expect(tag).toBeVisible();
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'RarityTag', {
         props: {
            rarity: 'rare',
            tooltip: {
               text: 'Exceptionally hard to find.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('Exceptionally hard to find.');
   });
});

// ---------------------------------------------------------------------------
// DurationTag
// ---------------------------------------------------------------------------
test.describe('component probe — DurationTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders type and remaining for a non-permanent duration, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'DurationTag', {
         props: {
            type: 'turnStart',
            remaining: 3,
            testId: 'probe-duration-tag',
         },
      });
      const tag = page.locator(`${selector} .tag[data-testid="probe-duration-tag"]`);
      await expect(tag).toBeVisible();
      // The remaining value is rendered in the second .value div.
      await expect(page.locator(`${selector} .tag .value`).last()).toHaveText('3');
   });

   test('does not render remaining for permanent duration', async () => {
      const { selector } = await mountProbe(page, 'DurationTag', {
         props: {
            type: 'permanent',
            remaining: 99,
            testId: 'probe-duration-tag-perm',
         },
      });
      // Only one .value is rendered (the type); remaining is suppressed.
      await expect(page.locator(`${selector} .tag .value`)).toHaveCount(1);
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'DurationTag', {
         props: {
            type: 'turnStart',
            remaining: 2,
            tooltip: {
               text: 'Expires on turn start.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('Expires on turn start.');
   });
});

// ---------------------------------------------------------------------------
// AttributeTag
// ---------------------------------------------------------------------------
test.describe('component probe — AttributeTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders default-slot text with attribute class and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'AttributeTag', {
         props: {
            attribute: 'body',
            text: 'Lift',
            testId: 'probe-attribute-tag',
         },
      });
      const tag = page.locator(`${selector} .tag.body[data-testid="probe-attribute-tag"]`);
      await expect(tag).toBeVisible();
      await expect(tag).toHaveText('Lift');
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'AttributeTag', {
         props: {
            attribute: 'mind',
            text: 'Focus',
            tooltip: {
               text: 'A mental discipline.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('A mental discipline.');
   });
});

// ---------------------------------------------------------------------------
// AttributeCheckTag
// ---------------------------------------------------------------------------
test.describe('component probe — AttributeCheckTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders check label with attribute class and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'AttributeCheckTag', {
         props: {
            attribute: 'body',
            skill: 'athletics',
            difficulty: 4,
            complexity: 1,
            testId: 'probe-attr-check-tag',
         },
      });
      // AttributeCheckTag wraps AttributeTag; testId lands on the .tag.body div.
      const tag = page.locator(`${selector} .tag.body[data-testid="probe-attr-check-tag"]`);
      await expect(tag).toBeVisible();
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'AttributeCheckTag', {
         props: {
            attribute: 'soul',
            skill: 'persuasion',
            tooltip: {
               text: 'A social contest.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('A social contest.');
   });
});

// ---------------------------------------------------------------------------
// OpposedCheckTag
// ---------------------------------------------------------------------------
test.describe('component probe — OpposedCheckTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders opposed check label and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'OpposedCheckTag', {
         props: {
            attribute: 'body',
            skill: 'athletics',
            testId: 'probe-opposed-check-tag',
         },
      });
      // OpposedCheckTag wraps AttributeTag; testId lands on the .tag div.
      const tag = page.locator(`${selector} .tag[data-testid="probe-opposed-check-tag"]`);
      await expect(tag).toBeVisible();
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'OpposedCheckTag', {
         props: {
            attribute: 'mind',
            skill: 'deception',
            tooltip: {
               text: 'A deception contest.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('A deception contest.');
   });
});

// ---------------------------------------------------------------------------
// ResistanceTag
// ---------------------------------------------------------------------------
test.describe('component probe — ResistanceTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders default-slot text with resistance class and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'ResistanceTag', {
         props: {
            resistance: 'reflexes',
            text: 'Dodge',
            testId: 'probe-resistance-tag',
         },
      });
      const tag = page.locator(`${selector} .tag.reflexes[data-testid="probe-resistance-tag"]`);
      await expect(tag).toBeVisible();
      await expect(tag).toHaveText('Dodge');
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'ResistanceTag', {
         props: {
            resistance: 'willpower',
            text: 'Focus',
            tooltip: {
               text: 'A mental barrier.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('A mental barrier.');
   });
});

// ---------------------------------------------------------------------------
// ResistedByTag
// ---------------------------------------------------------------------------
test.describe('component probe — ResistedByTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders resisted-by label and resistance name, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'ResistedByTag', {
         props: {
            resistance: 'resilience',
            testId: 'probe-resisted-by-tag',
         },
      });
      // ResistedByTag wraps ResistanceTag; testId lands on the .tag div.
      const tag = page.locator(`${selector} .tag[data-testid="probe-resisted-by-tag"]`);
      await expect(tag).toBeVisible();
      // The "resisted by" label is in a .label div inside the tag.
      await expect(page.locator(`${selector} .tag .label`)).toBeVisible();
   });

   test('tooltip content is forwarded to tippy', async () => {
      const { selector } = await mountProbe(page, 'ResistedByTag', {
         props: {
            resistance: 'reflexes',
            tooltip: {
               text: 'Dodged away.',
               localize: false,
            },
         },
      });
      const content = await page.locator(`${selector} .tag`).evaluate((el) => el._tippy?.props?.content);
      expect(content).toBe('Dodged away.');
   });
});

// ---------------------------------------------------------------------------
// TraitTag
// ---------------------------------------------------------------------------
test.describe('component probe — TraitTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders as StatTag when value is a number, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'TraitTag', {
         props: {
            label: 'Brutal',
            value: 2,
            testId: 'probe-trait-tag',
         },
      });
      const tag = page.locator(`${selector} .tag[data-testid="probe-trait-tag"]`);
      await expect(tag).toBeVisible();
      await expect(page.locator(`${selector} .tag .label`)).toHaveText('Brutal');
      await expect(page.locator(`${selector} .tag .value`)).toHaveText('2');
   });

   test('renders as plain Tag when value is undefined, resolves testId', async () => {
      const { selector } = await mountProbe(page, 'TraitTag', {
         props: {
            label: 'Fearless',
            testId: 'probe-trait-tag-plain',
         },
      });
      const tag = page.locator(`${selector} .tag[data-testid="probe-trait-tag-plain"]`);
      await expect(tag).toBeVisible();
      await expect(tag).toHaveText('Fearless');
   });
});

// ---------------------------------------------------------------------------
// SpellAspectTag
// ---------------------------------------------------------------------------
test.describe('component probe — SpellAspectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders a damage aspect label and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'SpellAspectTag', {
         props: {
            aspect: {
               label: 'damage',
               initialValue: 4,
               scaling: false,
               resistanceCheck: '',
            },
            testId: 'probe-spell-aspect-tag',
         },
      });
      // SpellAspectTag wraps ResistanceTag; testId lands on the .tag div.
      const tag = page.locator(`${selector} .tag[data-testid="probe-spell-aspect-tag"]`);
      await expect(tag).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// SpellCustomAspectTag
// ---------------------------------------------------------------------------
test.describe('component probe — SpellCustomAspectTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders a custom aspect label and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'SpellCustomAspectTag', {
         props: {
            aspect: {
               label: 'Gravitas',
               isDamage: false,
               isHealing: false,
               initialValue: 2,
               scaling: false,
               resistanceCheck: '',
            },
            testId: 'probe-spell-custom-aspect-tag',
         },
      });
      // SpellCustomAspectTag wraps ResistanceTag; testId lands on the .tag div.
      const tag = page.locator(`${selector} .tag[data-testid="probe-spell-custom-aspect-tag"]`);
      await expect(tag).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// SpellAspectTags
// ---------------------------------------------------------------------------
test.describe('component probe — SpellAspectTags', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders one tag per aspect entry and resolves testId', async () => {
      // The entries are what `selectDisplayedSpellAspects` returns for a spell with one enabled standard aspect and
      // one custom aspect, so the fixture follows the selector's shape.
      /** @type {import('~/document/types/item/types/spell/SelectDisplayedSpellAspects.js').DisplayedSpellAspect[]} */
      const aspects = selectDisplayedSpellAspects([
         {
            label: 'damage',
            enabled: true,
            cost: 1,
            initialValue: 2,
            scaling: false,
            resistanceCheck: '',
         },
      ], [
         {
            label: 'Surge',
            cost: 1,
            isDamage: false,
            isHealing: false,
            initialValue: 1,
            scaling: false,
            resistanceCheck: '',
            uuid: 'e2e00000-0000-4000-a000-000000000201',
         },
      ]);
      expect(aspects.map((aspect) => aspect.isCustom), 'the selector yields one standard and one custom entry')
         .toEqual([
            false,
            true,
         ]);

      /** @type {{ selector: string }} The mounted probe, addressed by its root selector. */
      const { selector } = await mountProbe(page, 'SpellAspectTags', {
         props: {
            aspects,
            testId: 'probe-spell-aspect-tags',
         },
      });
      // SpellAspectTags renders its own .tag-container div; testId goes there.
      /** @type {import('@playwright/test').Locator} The tag container carrying the testId. */
      const container = page.locator(`${selector} .tag-container[data-testid="probe-spell-aspect-tags"]`);
      await expect(container).toBeVisible();
      // Two entries — one standard, one custom — produce two direct-child .tag wrappers inside the container.
      // Using `> .tag` to avoid matching nested .tag divs from inner SpellAspectTag/ResistanceTag components.
      await expect(page.locator(`${selector} .tag-container > .tag`)).toHaveCount(2);
   });
});

// ---------------------------------------------------------------------------
// EditDeleteTag
// ---------------------------------------------------------------------------
test.describe('component probe — EditDeleteTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('clicking edit fires editFunction callback', async () => {
      const { selector } = await mountProbe(page, 'EditDeleteTag', {
         props: {
            label: 'Fireball',
            testId: 'probe-edit-delete-tag',
         },
         events: [
            'editFunction',
            'deleteFunction',
         ],
      });
      await clearProbeEvents(page);
      await page.locator(`${selector} button[aria-label]`).first().click();
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'editFunction')).toHaveLength(1);
   });

   test('clicking delete fires deleteFunction callback', async () => {
      const { selector } = await mountProbe(page, 'EditDeleteTag', {
         props: {
            label: 'Fireball',
            testId: 'probe-edit-delete-tag',
         },
         events: [
            'editFunction',
            'deleteFunction',
         ],
      });
      await clearProbeEvents(page);
      await page.locator(`${selector} button[aria-label]`).last().click();
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'deleteFunction')).toHaveLength(1);
   });

   test('edit icon <i> uses Font Awesome (regression-lock bug #5)', async () => {
      const { selector } = await mountProbe(page, 'EditDeleteTag', {
         props: {
            label: 'Fireball',
         },
      });
      // The FA glyph must sit on an inner <i>, not on the <button> itself, so Foundry's Signika
      // font-family cannot override the FA font needed for glyph rendering.
      const fontFamily = await page
         .locator(`${selector} .tag button i`)
         .first()
         .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(fontFamily).toMatch(/Font Awesome/i);
   });

   test('resolves testId', async () => {
      const { selector } = await mountProbe(page, 'EditDeleteTag', {
         props: {
            label: 'Fireball',
            testId: 'probe-edit-delete-tag',
         },
      });
      await expect(page.locator(`${selector} .tag[data-testid="probe-edit-delete-tag"]`)).toBeVisible();
   });
});

// ─── Cleaning of user HTML in tooltips ───────────────────────────────────────────────────────────────────────────────
// A real flow cannot carry an event-handler payload into these tooltips: ProseMirror drops `on*` attributes on input,
// so the components are mounted with synthetic props.

test.describe('component probe — tooltip HTML cleaning', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('an effect tag tooltip holds the cleaned HTML and renders it without the event handler', async () => {
      await page.evaluate(() => {
         delete window.__titanXss;
      });
      const { selector } = await mountProbe(page, 'EffectTag', {
         props: {
            effect: {
               label: 'E2E Sanitized Condition',
               img: 'icons/svg/blind.svg',
               description: PAYLOAD,
            },
            testId: 'probe-sanitized-effect',
         },
      });

      /** @type {string} The payload as core's cleaner returns it. */
      const expected = await page.evaluate((payload) => foundry.utils.cleanHTML(payload), PAYLOAD);
      expect(expected).toContain(CLEAN_IMAGE);
      expect(expected).not.toContain('onerror');

      /** @type {import('@playwright/test').Locator} The mounted effect tag. */
      const tag = page.locator(`${selector} [data-testid="probe-sanitized-effect"]`);
      await expect(tag).toContainText('E2E Sanitized Condition');
      await expect.poll(() => tag.evaluate((element) => element._tippy?.props?.content)).toBe(expected);

      // The one real-hover test, exempt from the 1 s ceiling: a hover shows the tooltip only after `TOOLTIP_DELAY[0]`
      // (1000 ms) and animates it for `TOOLTIP_DURATION[0]` (400 ms), both set in
      // `src/helpers/svelte-actions/TooltipAction.js` and passed to tippy as `delay` and `duration`. The wait is those
      // timers (1400 ms) plus 1100 ms of margin. The image is inserted and its failed load settles without a handler.
      await tag.hover();

      /** @type {import('@playwright/test').Locator} The rendered tooltip's image. */
      const tooltipImage = page.locator('.tippy-box img[src="e2e-missing-image.png"]');
      await expect(tooltipImage, 'the hover timers elapsed and the tooltip rendered').toHaveCount(1, { timeout: 2500 });
      await expect.poll(() => tooltipImage.evaluate((element) => element.complete)).toBe(true);
      expect(await tooltipImage.getAttribute('onerror')).toBeNull();
      expect(await page.evaluate(() => window.__titanXss)).toBeUndefined();
   });

   test('tooltip icon markup survives cleaning while an event handler does not', async () => {
      const { selector } = await mountProbe(page, 'Tag', {
         props: {
            text: 'E2E Icon Tooltip',
            tooltip: {
               localize: false,
               text: `<p><i class="fas fa-dice-d20"></i> E2E roll</p>${PAYLOAD}`,
            },
         },
      });

      /** @type {string|undefined} The tooltip tippy holds. */
      const content = await page.locator(`${selector} .tag`).evaluate((element) => element._tippy?.props?.content);
      expect(content).toContain('<i class="fas fa-dice-d20"></i>');
      expect(content).toContain(CLEAN_IMAGE);
      expect(content).not.toContain('onerror');
   });
});
