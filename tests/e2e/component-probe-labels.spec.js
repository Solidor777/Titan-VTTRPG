import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { unmountAll, clearProbeEvents, mountProbe } from './componentProbe.js';

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

test.describe('component probe — Label', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders children text and resolves testId on root .label div', async ({ page }) => {
      // The harness converts a string `text` prop into a `children` snippet rendered by Label.
      const { selector } = await mountProbe(page, 'Label', {
         props: {
            text: 'Strength',
            testId: 'probe-label',
         },
      });
      const root = page.locator(`${selector} .label[data-testid="probe-label"]`);
      await expect(root).toBeVisible();
      await expect(root).toContainText('Strength');
   });

   test('tooltip is attached via Tippy when a tooltip prop is provided', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Label', {
         props: {
            text: 'Hover me',
            tooltip: {
               text: 'Label tip',
               localize: false,
            },
            testId: 'probe-label-tip',
         },
      });
      const root = page.locator(`${selector} .label[data-testid="probe-label-tip"]`);
      await expect(root).toBeVisible();
      const tipContent = await root.evaluate((el) => el._tippy?.props?.content);
      expect(tipContent).toBe('Label tip');
   });
});

// ---------------------------------------------------------------------------
// TextLabel
// ---------------------------------------------------------------------------

test.describe('component probe — TextLabel', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the raw label text', async ({ page }) => {
      // Pass label as a TextData object with localize:false so processTextData returns the raw string.
      const { selector } = await mountProbe(page, 'TextLabel', {
         props: {
            label: {
               text: 'Strength',
               localize: false,
            },
            testId: 'probe-text-label',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-text-label"]`)).toContainText('Strength');
   });

   test('testId resolves on the .label root div', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TextLabel', {
         props: {
            label: {
               text: 'Tagged',
               localize: false,
            },
            testId: 'probe-text-label',
         },
      });
      await expect(page.locator(`${selector} .label[data-testid="probe-text-label"]`)).toBeVisible();
   });

   test('tooltip is attached via Tippy when a tooltip prop is provided', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TextLabel', {
         props: {
            label: {
               text: 'Hover me',
               localize: false,
            },
            tooltip: {
               text: 'TextLabel tip',
               localize: false,
            },
            testId: 'probe-text-label-tip',
         },
      });
      const root = page.locator(`${selector} .label[data-testid="probe-text-label-tip"]`);
      const tipContent = await root.evaluate((el) => el._tippy?.props?.content);
      expect(tipContent).toBe('TextLabel tip');
   });
});

// ---------------------------------------------------------------------------
// IconLabel
// ---------------------------------------------------------------------------

test.describe('component probe — IconLabel', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the icon element and the label text', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IconLabel', {
         props: {
            label: {
               text: 'Agility',
               localize: false,
            },
            icon: 'fas fa-bolt',
            testId: 'probe-icon-label',
         },
      });
      const root = page.locator(`${selector} .label[data-testid="probe-icon-label"]`);
      await expect(root).toBeVisible();
      // Icon element must be present inside the label root.
      await expect(root.locator('i.fas.fa-bolt')).toBeVisible();
      // Text content must reflect the label.
      await expect(root).toContainText('Agility');
   });

   test('testId resolves on the .label root div', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IconLabel', {
         props: {
            label: {
               text: 'Tagged',
               localize: false,
            },
            icon: 'fas fa-star',
            testId: 'probe-icon-label',
         },
      });
      await expect(page.locator(`${selector} .label[data-testid="probe-icon-label"]`)).toBeVisible();
   });

   test('tooltip is attached via Tippy when a tooltip prop is provided', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IconLabel', {
         props: {
            label: {
               text: 'Hover icon',
               localize: false,
            },
            icon: 'fas fa-info-circle',
            tooltip: {
               text: 'IconLabel tip',
               localize: false,
            },
            testId: 'probe-icon-label-tip',
         },
      });
      const root = page.locator(`${selector} .label[data-testid="probe-icon-label-tip"]`);
      const tipContent = await root.evaluate((el) => el._tippy?.props?.content);
      expect(tipContent).toBe('IconLabel tip');
   });
});

// ---------------------------------------------------------------------------
// ModifiedValueLabel
// ---------------------------------------------------------------------------

test.describe('component probe — ModifiedValueLabel', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the currentValue and applies no modifier class when base equals current', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ModifiedValueLabel', {
         props: {
            baseValue: 5,
            currentValue: 5,
            testId: 'probe-mod-value',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-mod-value"]`);
      await expect(root).toBeVisible();
      await expect(root).toContainText('5');
      // No bonus or penalty class when values are equal.
      await expect(root).toHaveClass(/\blabel\b/);
      await expect(root).not.toHaveClass(/bonus/);
      await expect(root).not.toHaveClass(/penalty/);
   });

   test('applies bonus class when currentValue exceeds baseValue', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ModifiedValueLabel', {
         props: {
            baseValue: 3,
            currentValue: 6,
            testId: 'probe-mod-value-bonus',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-mod-value-bonus"]`);
      await expect(root).toContainText('6');
      await expect(root).toHaveClass(/bonus/);
   });

   test('applies penalty class when currentValue is below baseValue', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ModifiedValueLabel', {
         props: {
            baseValue: 6,
            currentValue: 3,
            testId: 'probe-mod-value-penalty',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-mod-value-penalty"]`);
      await expect(root).toContainText('3');
      await expect(root).toHaveClass(/penalty/);
   });

   test('tooltip is attached via Tippy when a tooltip prop is provided', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ModifiedValueLabel', {
         props: {
            baseValue: 5,
            currentValue: 5,
            tooltip: {
               text: 'ModifiedValue tip',
               localize: false,
            },
            testId: 'probe-mod-value-tip',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-mod-value-tip"]`);
      const tipContent = await root.evaluate((el) => el._tippy?.props?.content);
      expect(tipContent).toBe('ModifiedValue tip');
   });
});

// ---------------------------------------------------------------------------
// ModifiableStatValueLabel
// ---------------------------------------------------------------------------

test.describe('component probe — ModifiableStatValueLabel', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the value and applies no modifier class when base equals value', async ({ page }) => {
      // normalValue = baseValue (no abilityMod/equipmentMod); realValue = value = 5 — equal, so .label only.
      const { selector } = await mountProbe(page, 'ModifiableStatValueLabel', {
         props: {
            baseValue: 5,
            value: 5,
            testId: 'probe-stat-value',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-stat-value"]`);
      await expect(root).toBeVisible();
      await expect(root).toContainText('5');
      await expect(root).not.toHaveClass(/bonus/);
      await expect(root).not.toHaveClass(/penalty/);
   });

   test('applies bonus class when value exceeds normalValue', async ({ page }) => {
      // normalValue = baseValue (3); realValue = value (6) — bonus.
      const { selector } = await mountProbe(page, 'ModifiableStatValueLabel', {
         props: {
            baseValue: 3,
            value: 6,
            testId: 'probe-stat-value-bonus',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-stat-value-bonus"]`);
      await expect(root).toContainText('6');
      await expect(root).toHaveClass(/bonus/);
   });

   test('applies penalty class when value is below normalValue', async ({ page }) => {
      // normalValue = baseValue (6); realValue = value (3) — penalty.
      const { selector } = await mountProbe(page, 'ModifiableStatValueLabel', {
         props: {
            baseValue: 6,
            value: 3,
            testId: 'probe-stat-value-penalty',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-stat-value-penalty"]`);
      await expect(root).toContainText('3');
      await expect(root).toHaveClass(/penalty/);
   });

   test('valueOverride takes precedence over value for class calculation and display is still value', async ({
      page,
   }) => {
      // normalValue = baseValue (5); realValue = valueOverride (8 > 5) → bonus.
      // The DOM renders {value} (not valueOverride), so text shows value (5).
      const { selector } = await mountProbe(page, 'ModifiableStatValueLabel', {
         props: {
            baseValue: 5,
            value: 5,
            valueOverride: 8,
            testId: 'probe-stat-value-override',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-stat-value-override"]`);
      // The template renders {value} (not valueOverride): text should be '5'.
      await expect(root).toContainText('5');
      // But styleClass is computed from valueOverride vs normalValue: 8 > 5 → bonus.
      await expect(root).toHaveClass(/bonus/);
   });

   test('abilityMod and equipmentMod shift normalValue and affect the class', async ({ page }) => {
      // normalValue = baseValue (5) + abilityMod (2) + equipmentMod (1) = 8; realValue = value (5).
      // 8 > 5 → penalty class.
      const { selector } = await mountProbe(page, 'ModifiableStatValueLabel', {
         props: {
            baseValue: 5,
            value: 5,
            abilityMod: 2,
            equipmentMod: 1,
            testId: 'probe-stat-value-mods',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-stat-value-mods"]`);
      await expect(root).toContainText('5');
      await expect(root).toHaveClass(/penalty/);
   });
});
