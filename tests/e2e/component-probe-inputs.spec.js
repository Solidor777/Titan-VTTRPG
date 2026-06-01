import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';

// ─── IntegerIncrementInput ────────────────────────────────────────────────────

test.describe('component probe — IntegerIncrementInput', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('increment button raises the value by the increment', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IntegerIncrementInput', {
         props: {
            value: 2,
            min: 0,
            max: 10,
            increment: 1,
            testId: 'probe-inc',
         },
         events: ['onchange'],
      });
      const input = page.locator(`${selector} input`);
      await expect(input).toHaveValue('2');
      await page.locator(`${selector} .increment button`).click();
      await expect(input).toHaveValue('3');
   });

   test('decrement button lowers the value by the increment', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IntegerIncrementInput', {
         props: {
            value: 2,
            min: 0,
            max: 10,
            increment: 1,
         },
      });
      await page.locator(`${selector} .decrement button`).click();
      await expect(page.locator(`${selector} input`)).toHaveValue('1');
   });

   test('disabled propagates to both increment and decrement buttons', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IntegerIncrementInput', {
         props: {
            value: 5,
            disabled: true,
         },
         events: ['onchange'],
      });
      await expect(page.locator(`${selector} .increment button`)).toBeDisabled();
      await expect(page.locator(`${selector} .decrement button`)).toBeDisabled();
   });

   test('testId resolves to data-testid on the root element', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IntegerIncrementInput', {
         props: {
            value: 1,
            testId: 'probe-inc',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-inc"]`)).toBeVisible();
   });
});

// ─── TextAreaInput ────────────────────────────────────────────────────────────

test.describe('component probe — TextAreaInput', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('filling and committing updates the value and fires onchange', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TextAreaInput', {
         props: {
            value: '',
            testId: 'probe-textarea',
         },
         events: ['onchange'],
      });
      const textarea = page.locator(`${selector} textarea`);
      await textarea.fill('hello world');
      await textarea.blur();
      await expect(textarea).toHaveValue('hello world');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('disabled blocks editing', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TextAreaInput', {
         props: {
            value: 'locked',
            disabled: true,
         },
      });
      const textarea = page.locator(`${selector} textarea`);
      await expect(textarea).toBeDisabled();
      await expect(textarea).toHaveValue('locked');
   });

   test('testId resolves to data-testid on the textarea', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TextAreaInput', {
         props: {
            value: '',
            testId: 'probe-textarea',
         },
      });
      await expect(page.locator(`${selector} textarea[data-testid="probe-textarea"]`)).toBeVisible();
   });
});

// ─── LabeledTextInput ─────────────────────────────────────────────────────────

test.describe('component probe — LabeledTextInput', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('typing updates the bound value', async ({ page }) => {
      // LabeledTextInput wraps TextInput but does not expose an onkeyup callback prop;
      // assert the two-way bind keeps the input value in sync with what the user types.
      const { selector } = await mountProbe(page, 'LabeledTextInput', {
         props: {
            value: '',
            label: 'Name',
            testId: 'probe-labeled-text',
         },
      });
      const input = page.locator(`${selector} input`);
      await input.fill('titan');
      await expect(input).toHaveValue('titan');
   });

   test('disabled blocks editing', async ({ page }) => {
      const { selector } = await mountProbe(page, 'LabeledTextInput', {
         props: {
            value: 'locked',
            label: 'Name',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} input`)).toBeDisabled();
      await expect(page.locator(`${selector} input`)).toHaveValue('locked');
   });

   test('label text is rendered', async ({ page }) => {
      // Use the outer .label div (direct child of .labeled-element) to avoid the inner Label.svelte
      // wrapper that also carries the .label class, which causes a strict-mode multi-element error.
      const { selector } = await mountProbe(page, 'LabeledTextInput', {
         props: {
            value: '',
            label: 'Strength',
         },
      });
      await expect(page.locator(`${selector} .labeled-element > .label`)).toContainText('Strength');
   });

   test('testId resolves to data-testid on the inner input', async ({ page }) => {
      const { selector } = await mountProbe(page, 'LabeledTextInput', {
         props: {
            value: '',
            label: 'Name',
            testId: 'probe-labeled-text',
         },
      });
      await expect(page.locator(`${selector} input[data-testid="probe-labeled-text"]`)).toBeVisible();
   });
});

// ─── AttributeInput ───────────────────────────────────────────────────────────

test.describe('component probe — AttributeInput', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders with the attribute class applied', async ({ page }) => {
      const { selector } = await mountProbe(page, 'AttributeInput', {
         props: {
            attribute: 'agility',
            text: 'child content',
         },
      });
      const root = page.locator(`${selector} .attribute-input`);
      await expect(root).toBeVisible();
      await expect(root).toHaveClass(/agility/);
   });

   test('renders child content inside the wrapper', async ({ page }) => {
      const { selector } = await mountProbe(page, 'AttributeInput', {
         props: {
            attribute: 'strength',
            text: 'inner text',
         },
      });
      await expect(page.locator(`${selector} .attribute-input`)).toContainText('inner text');
   });

   test('testId resolves to data-testid on the root element', async ({ page }) => {
      const { selector } = await mountProbe(page, 'AttributeInput', {
         props: {
            attribute: 'agility',
            text: 'x',
            testId: 'probe-attr',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-attr"]`)).toBeVisible();
   });
});

// ─── RarityInput ──────────────────────────────────────────────────────────────

test.describe('component probe — RarityInput', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders with the rarity class applied', async ({ page }) => {
      const { selector } = await mountProbe(page, 'RarityInput', {
         props: {
            rarity: 'uncommon',
            text: 'child content',
         },
      });
      const root = page.locator(`${selector} .rarity-input`);
      await expect(root).toBeVisible();
      await expect(root).toHaveClass(/uncommon/);
   });

   test('renders child content inside the wrapper', async ({ page }) => {
      const { selector } = await mountProbe(page, 'RarityInput', {
         props: {
            rarity: 'rare',
            text: 'rare item',
         },
      });
      await expect(page.locator(`${selector} .rarity-input`)).toContainText('rare item');
   });

   test('testId resolves to data-testid on the root element', async ({ page }) => {
      const { selector } = await mountProbe(page, 'RarityInput', {
         props: {
            rarity: 'uncommon',
            text: 'x',
            testId: 'probe-rarity',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-rarity"]`)).toBeVisible();
   });
});

// ─── ResistanceInput ──────────────────────────────────────────────────────────

test.describe('component probe — ResistanceInput', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders with the resistance class applied', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ResistanceInput', {
         props: {
            resistance: 'physical',
            text: 'child content',
         },
      });
      const root = page.locator(`${selector} .resistance-input`);
      await expect(root).toBeVisible();
      await expect(root).toHaveClass(/physical/);
   });

   test('renders child content inside the wrapper', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ResistanceInput', {
         props: {
            resistance: 'magical',
            text: 'magical resist',
         },
      });
      await expect(page.locator(`${selector} .resistance-input`)).toContainText('magical resist');
   });

   test('testId resolves to data-testid on the root element', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ResistanceInput', {
         props: {
            resistance: 'physical',
            text: 'x',
            testId: 'probe-resistance',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-resistance"]`)).toBeVisible();
   });
});

// ─── ImagePicker ──────────────────────────────────────────────────────────────

test.describe('component probe — ImagePicker', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the image with the supplied src', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ImagePicker', {
         props: {
            value: 'icons/svg/item-bag.svg',
            alt: 'bag',
         },
         context: {
            application: {
               position: {
                  top: 100,
                  left: 100,
                  width: 400,
               },
            },
         },
      });
      const img = page.locator(`${selector} img`);
      await expect(img).toBeVisible();
      await expect(img).toHaveAttribute('src', 'icons/svg/item-bag.svg');
   });

   test('the picker button is rendered', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ImagePicker', {
         props: {
            value: 'icons/svg/mystery-man.svg',
            alt: 'actor',
         },
         context: {
            application: {
               position: {
                  top: 100,
                  left: 100,
                  width: 400,
               },
            },
         },
      });
      await expect(page.locator(`${selector} button`)).toBeVisible();
   });

   test('testId resolves to data-testid on the root element', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ImagePicker', {
         props: {
            value: 'icons/svg/item-bag.svg',
            alt: 'bag',
            testId: 'probe-image-picker',
         },
         context: {
            application: {
               position: {
                  top: 100,
                  left: 100,
                  width: 400,
               },
            },
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-image-picker"]`)).toBeVisible();
   });
});

// ─── TopFilter ────────────────────────────────────────────────────────────────

test.describe('component probe — TopFilter', () => {
   /** Authenticate as E2E GM 1 before each probe. */
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('typing updates the filter value', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TopFilter', {
         props: {
            label: 'filter',
            value: '',
            testId: 'probe-filter',
         },
      });
      const input = page.locator(`${selector} input`);
      await input.fill('sword');
      await expect(input).toHaveValue('sword');
   });

   test('testId resolves to data-testid on the inner input', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TopFilter', {
         props: {
            label: 'filter',
            value: '',
            testId: 'probe-filter',
         },
      });
      await expect(page.locator(`${selector} input[data-testid="probe-filter"]`)).toBeVisible();
   });

   test('label text is rendered', async ({ page }) => {
      // Use the outer .label div (direct child of .labeled-element) to avoid the inner Label.svelte
      // wrapper that also carries the .label class, which causes a strict-mode multi-element error.
      const { selector } = await mountProbe(page, 'TopFilter', {
         props: {
            label: 'Search Items',
            value: '',
         },
      });
      await expect(page.locator(`${selector} .labeled-element > .label`)).toContainText('Search Items');
   });
});
