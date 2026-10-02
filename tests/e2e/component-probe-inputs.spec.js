import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login } from './fixtures.js';
import {
   clearProbeEvents,
   mountProbe,
   readProbeContext,
   readProbeEvents,
   syntheticDocumentContext,
   unmountAll,
} from './componentProbe.js';
import { titanSelectOptionValues } from './select.js';
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

// ─── IntegerIncrementInput ────────────────────────────────────────────────────

test.describe('component probe — IntegerIncrementInput', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('increment button raises the value by the increment', async () => {
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

   test('decrement button lowers the value by the increment', async () => {
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

   test('disabled propagates to both increment and decrement buttons', async () => {
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

   test('testId resolves to data-testid on the root element', async () => {
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
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('filling and committing updates the value and fires onchange', async () => {
      const { selector } = await mountProbe(page, 'TextAreaInput', {
         props: {
            value: '',
            testId: 'probe-textarea',
         },
         events: ['onchange'],
      });
      const textarea = page.locator(`${selector} textarea`);
      await commitText(textarea, 'hello world');
      await expect(textarea).toHaveValue('hello world');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('disabled blocks editing', async () => {
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

   test('testId resolves to data-testid on the textarea', async () => {
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
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('typing updates the bound value', async () => {
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

   test('disabled blocks editing', async () => {
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

   test('label text is rendered', async () => {
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

   test('testId resolves to data-testid on the inner input', async () => {
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
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders with the attribute class applied', async () => {
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

   test('renders child content inside the wrapper', async () => {
      const { selector } = await mountProbe(page, 'AttributeInput', {
         props: {
            attribute: 'strength',
            text: 'inner text',
         },
      });
      await expect(page.locator(`${selector} .attribute-input`)).toContainText('inner text');
   });

   test('testId resolves to data-testid on the root element', async () => {
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
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders with the rarity class applied', async () => {
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

   test('renders child content inside the wrapper', async () => {
      const { selector } = await mountProbe(page, 'RarityInput', {
         props: {
            rarity: 'rare',
            text: 'rare item',
         },
      });
      await expect(page.locator(`${selector} .rarity-input`)).toContainText('rare item');
   });

   test('testId resolves to data-testid on the root element', async () => {
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
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders with the resistance class applied', async () => {
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

   test('renders child content inside the wrapper', async () => {
      const { selector } = await mountProbe(page, 'ResistanceInput', {
         props: {
            resistance: 'magical',
            text: 'magical resist',
         },
      });
      await expect(page.locator(`${selector} .resistance-input`)).toContainText('magical resist');
   });

   test('testId resolves to data-testid on the root element', async () => {
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
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the image with the supplied src', async () => {
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

   test('the picker button is rendered', async () => {
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

   test('testId resolves to data-testid on the root element', async () => {
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
      await expect(page.locator(`${selector} button[data-testid="probe-image-picker"]`)).toBeVisible();
   });
});

// ─── TopFilter ────────────────────────────────────────────────────────────────

test.describe('component probe — TopFilter', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('typing updates the filter value', async () => {
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

   test('testId resolves to data-testid on the inner input', async () => {
      const { selector } = await mountProbe(page, 'TopFilter', {
         props: {
            label: 'filter',
            value: '',
            testId: 'probe-filter',
         },
      });
      await expect(page.locator(`${selector} input[data-testid="probe-filter"]`)).toBeVisible();
   });

   test('label text is rendered', async () => {
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


// ─── Rules-element editors handed stored data no control can produce ─────────────────────────────────────────────────
//
// A flow never stores these shapes (the factories always set `rounding`, and the editor offers only known levels and
// check types), so the probes mount the editor on a synthetic document context (`syntheticDocumentContext`) and read
// the synthetic element back to see what the editor wrote into it.

test.describe('component probe — conditional check modifier editor with unusual stored data', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   for (const [stored, shown] of [
      [
         0,
         '1',
      ],
      [
         -3,
         '-2',
      ],
      [
         3,
         '2',
      ],
   ]) {
      test(`an Advantage value of ${stored} shows level ${shown} and is not rewritten`, async () => {
         /** @type {{id: string, selector: string}} The mounted editor. */
         const probe = await mountProbe(page, 'ItemSheetConditionalCheckModifierSettings', {
            props: { idx: 0 },
            context: syntheticDocumentContext({
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'probe-ccm-advantage',
                     value: stored,
                  },
               ],
            }),
         });
         await expect(page.locator(`${probe.selector} [data-testid="ccm-advantage-level"]`))
            .toHaveAttribute('data-value', shown);
         expect(
            await readProbeContext(page, probe.id, 'document.data.system.rulesElement.0.value'),
            `the stored ${stored} is left as it was`,
         ).toBe(stored);
      });
   }

   // 'toString' is an inherited property name, not an own key of the check-type tables.
   for (const checkType of [
      'unknownCheck',
      'toString',
   ]) {
      test(`an unknown check type "${checkType}" still renders the modifier types and the any selectors`, async () => {
         /** @type {{id: string, selector: string}} The mounted editor. */
         const probe = await mountProbe(page, 'ItemSheetConditionalCheckModifierSettings', {
            props: { idx: 0 },
            context: syntheticDocumentContext({
               rulesElement: [
                  {
                     checkType,
                     key: '',
                     modifierType: 'healing',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'probe-ccm-check-type',
                     value: 1,
                  },
               ],
            }),
         });

         /** @type {import('@playwright/test').Locator} The modifier type select's trigger. */
         const modifierType = page.locator(`${probe.selector} [data-testid="ccm-modifier-type"]`);
         await expect(modifierType).toHaveAttribute('data-value', 'healing');
         expect(await titanSelectOptionValues(page, modifierType)).toEqual([
            'damage',
            'dice',
            'expertise',
            'training',
            'healing',
            'advantage',
            'automaticFailure',
         ]);
         expect(await titanSelectOptionValues(page, page.locator(`${probe.selector} [data-testid="ccm-selector"]`)))
            .toEqual([
               'any',
               'attribute',
               'skill',
               'customTrait',
               'situation',
            ]);
      });
   }
});

test.describe('component probe — multiplier editors with no stored rounding', () => {
   /** Tear down every mounted probe so containers never leak between tests. */
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   for (const [component, testId, element] of [
      [
         'ItemSheetMulBaseSettings',
         'mulbase-rounding',
         {
            key: 'body',
            operation: 'mulBase',
            selector: 'attribute',
            uuid: 'probe-rounding-mulbase',
            value: 2,
         },
      ],
      [
         'ItemSheetMulSumSettings',
         'mulsum-rounding',
         {
            key: 'stride',
            operation: 'mulSum',
            selector: 'speed',
            uuid: 'probe-rounding-mulsum',
            value: 0.5,
         },
      ],
   ]) {
      test(`${component} shows down for an element with no rounding and stores down`, async () => {
         /** @type {{id: string, selector: string}} The mounted editor. */
         const probe = await mountProbe(page, component, {
            props: { idx: 0 },
            context: syntheticDocumentContext({ rulesElement: [element] }),
         });
         await expect(page.locator(`${probe.selector} [data-testid="${testId}"]`))
            .toHaveAttribute('data-value', 'down');
         await expect.poll(
            () => readProbeContext(page, probe.id, 'document.data.system.rulesElement.0.rounding'),
            { message: 'the editor stores the engine default, down' },
         ).toBe('down');
      });
   }
});
