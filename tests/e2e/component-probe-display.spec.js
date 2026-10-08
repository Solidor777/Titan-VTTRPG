import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import {
   mountProbe,
   unmountAll,
   clearProbeEvents,
   documentContext,
   PAYLOAD,
   probeComponent,
   readProbeEvents,
} from './componentProbe.js';
import { selectTitanOption, readTitanSelectValue } from './select.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';
import { DRAG_HANDLE_ICON } from '~/system/Icons.js';

/**
 * Reads a duration tag's tooltip and the text it should hold: the duration lead text, then the entry's description.
 * @param {import('@playwright/test').Locator} tag - The duration tag's root (the wrapper around its EffectTag).
 * @param {string} leadKey - The lead text's localization key.
 * @param {string} description - The entry's stored description.
 * @returns {Promise<{content: string|undefined, expected: string}>} The tooltip tippy holds, and the expected text.
 */
function readLeadTooltip(tag, leadKey, description) {
   return tag.locator(':scope > .tag').evaluate((element, { key, text }) => ({
      content: element._tippy?.props?.content,
      expected: foundry.utils.cleanHTML(game.i18n.localize(`LOCAL.${key}.text`) + text),
   }), {
      key: leadKey,
      text: description,
   });
}

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

test.describe('component probe — Button', () => {
   // Tear down every mounted probe so containers never leak between tests.
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick', async () => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Click me',
            testId: 'probe-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${selector} button`).click();
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);
   });

   test('disabled suppresses onclick', async () => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Nope',
            disabled: true,
         },
         events: ['onclick'],
      });
      // force:true bypasses Playwright actionability; the disabled DOM button still dispatches nothing.
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid', async () => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Tagged',
            testId: 'probe-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-button"]`)).toBeVisible();
   });

   test('secondary renders a transparent fill', async () => {
      const secondaryProbe = await mountProbe(page, 'Button', {
         props: {
            text: 'Cancel',
            secondary: true,
            testId: 'probe-secondary',
         },
      });
      const defaultProbe = await mountProbe(page, 'Button', {
         props: {
            text: 'Confirm',
            testId: 'probe-default',
         },
      });

      const secondaryBackground = await page
         .locator(`${secondaryProbe.selector} button`)
         .evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
      const defaultBackground = await page
         .locator(`${defaultProbe.selector} button`)
         .evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);

      expect(secondaryBackground, 'secondary button fill is transparent').toBe('rgba(0, 0, 0, 0)');
      expect(defaultBackground, 'default button fill is not transparent').not.toBe('rgba(0, 0, 0, 0)');
   });
});

test.describe('component probe — TextInput', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('typing commits the value and forwards keyup', async () => {
      const { selector } = await mountProbe(page, 'TextInput', {
         props: {
            value: '',
            testId: 'probe-text',
         },
         events: [
            'onkeyup',
            'onchange',
         ],
      });
      const input = page.locator(`${selector} input`);
      await input.fill('hello');
      // TextInput binds the value directly to the DOM input; the bound value is the input's value.
      await expect(input).toHaveValue('hello');
      // A keyup commits through the same seam the sheets rely on.
      await input.press('!');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onkeyup')).toBe(true);
   });

   test('disabled blocks editing', async () => {
      const { selector } = await mountProbe(page, 'TextInput', {
         props: {
            value: 'locked',
            disabled: true,
         },
      });
      const input = page.locator(`${selector} input`);
      await expect(input).toBeDisabled();
      await expect(input).toHaveValue('locked');
   });
});

test.describe('component probe — NumberInput / IntegerInput', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('NumberInput clamps to max on commit and fires onchange', async () => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 1,
            max: 5,
            isInteger: true,
            testId: 'probe-number',
         },
         events: ['onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.focus();
      await input.fill('9');
      // keyup drives parseInput (commit); blur deactivates editing so the display resets to the clamp.
      await input.press('9');
      await input.blur();
      await expect(input).toHaveValue('5');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('IntegerInput commits an integer value', async () => {
      const { selector } = await mountProbe(page, 'IntegerInput', {
         props: {
            value: 0,
            min: 0,
            max: 10,
            testId: 'probe-integer',
         },
         events: ['onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.focus();
      await input.fill('7');
      // Enter is filtered from the value but still fires keyup, driving the commit without doubling the digit.
      await input.press('Enter');
      await input.blur();
      await expect(input).toHaveValue('7');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('disabled blocks editing', async () => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 3,
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} input`)).toBeDisabled();
   });

   test('testId resolves on NumberInput', async () => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 1,
            testId: 'probe-number',
         },
      });
      await expect(page.locator(`${selector} input[data-testid="probe-number"]`)).toBeVisible();
   });
});

test.describe('component probe — CheckboxInput', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('toggling flips the checked glyph and fires onchange', async () => {
      const { selector } = await mountProbe(page, 'CheckboxInput', {
         props: {
            value: false,
            testId: 'probe-checkbox',
         },
         events: ['onchange'],
      });
      const button = page.locator(`${selector} button`);
      const check = page.locator(`${selector} button i.fa-check`);
      await expect(check).toHaveCount(0);
      await button.click();
      await expect(check).toHaveCount(1);
      await button.click();
      await expect(check).toHaveCount(0);
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(2);
   });

   test('disabled blocks toggling', async () => {
      const { selector } = await mountProbe(page, 'CheckboxInput', {
         props: {
            value: false,
            disabled: true,
         },
         events: ['onchange'],
      });
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(0);
   });
});

test.describe('component probe — Select', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('changing the selection fires onchange and updates the value', async () => {
      const { selector } = await mountProbe(page, 'Select', {
         props: {
            value: 'a',
            options: [
               {
                  value: 'a',
                  label: 'Alpha',
               },
               {
                  value: 'b',
                  label: 'Beta',
               },
            ],
            testId: 'probe-select',
         },
         events: ['onchange'],
      });
      // Drop the mount-time clamp onchange (if any) so we assert only the user-driven change.
      await clearProbeEvents(page);
      const trigger = page.locator(`${selector} [role="combobox"]`);
      await selectTitanOption(page, trigger, 'b');
      expect(await readTitanSelectValue(trigger)).toBe('b');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'Select', {
         props: {
            value: 'a',
            disabled: true,
            options: [
               {
                  value: 'a',
                  label: 'Alpha',
               },
               {
                  value: 'b',
                  label: 'Beta',
               },
            ],
         },
      });
      await expect(page.locator(`${selector} [role="combobox"]`)).toBeDisabled();
   });
});

test.describe('component probe — LabelTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the supplied label and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'LabelTag', {
         props: {
            label: 'Frostbite',
            testId: 'probe-label',
         },
      });
      const tag = page.locator(`${selector} .tag`);
      await expect(tag).toHaveText('Frostbite');
      await expect(page.locator(`${selector} .tag[data-testid="probe-label"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

test.describe('component probe — Label', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders children text and resolves testId on root .label div', async () => {
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

   test('tooltip is attached via Tippy when a tooltip prop is provided', async () => {
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
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the raw label text', async () => {
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

   test('testId resolves on the .label root div', async () => {
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

   test('tooltip is attached via Tippy when a tooltip prop is provided', async () => {
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
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the icon element and the label text', async () => {
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

   test('testId resolves on the .label root div', async () => {
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

   test('tooltip is attached via Tippy when a tooltip prop is provided', async () => {
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
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the currentValue and applies no modifier class when base equals current', async () => {
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

   test('applies bonus class when currentValue exceeds baseValue', async () => {
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

   test('applies penalty class when currentValue is below baseValue', async () => {
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

   test('tooltip is attached via Tippy when a tooltip prop is provided', async () => {
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
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the value and applies no modifier class when base equals value', async () => {
      // normalValue = baseValue (no mod); realValue = value = 5 — equal, so .label only.
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

   test('applies bonus class when value exceeds normalValue', async () => {
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

   test('applies penalty class when value is below normalValue', async () => {
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

   test('valueOverride takes precedence over value for class calculation and display is still value', async () => {
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

   test('the mod object\'s ability and equipment buckets shift normalValue and affect the class', async () => {
      // normalValue = baseValue (5) + mod.ability (2) + mod.equipment (1) = 8; realValue = value (5).
      // 8 > 5 → penalty class.
      const { selector } = await mountProbe(page, 'ModifiableStatValueLabel', {
         props: {
            baseValue: 5,
            value: 5,
            mod: {
               ability: 2,
               equipment: 1,
            },
            testId: 'probe-stat-value-mods',
         },
      });
      const root = page.locator(`${selector} [data-testid="probe-stat-value-mods"]`);
      await expect(root).toContainText('5');
      await expect(root).toHaveClass(/penalty/);
   });
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

      // A tag given no lead key (a condition entry) shows only the entry's description, cleaned.
      /** @type {{content: string|undefined, expected: string}} The tag's tooltip and the text it should hold. */
      const tooltip = await tag.evaluate((element) => ({
         content: element._tippy?.props?.content,
         expected: foundry.utils.cleanHTML('<p>On fire.</p>'),
      }));
      expect(tooltip.content).toBe(tooltip.expected);
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

      /** @type {{content: string|undefined, expected: string}} The tag's tooltip and the text it should hold. */
      const tooltip = await readLeadTooltip(tag, 'effect.custom.desc', '<p>Custom.</p>');
      expect(tooltip.content).toBe(tooltip.expected);
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

      /** @type {{content: string|undefined, expected: string}} The tag's tooltip and the text it should hold. */
      const tooltip = await readLeadTooltip(tag, 'effect.expired.desc', '<p>Expired.</p>');
      expect(tooltip.content).toBe(tooltip.expected);
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

      /** @type {{content: string|undefined, expected: string}} The tag's tooltip and the text it should hold. */
      const tooltip = await readLeadTooltip(tag, 'effect.initiative.desc', '<p>Initiative.</p>');
      expect(tooltip.content).toBe(tooltip.expected);
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

      /** @type {{content: string|undefined, expected: string}} The tag's tooltip and the text it should hold. */
      const tooltip = await readLeadTooltip(tag, 'effect.permanent.desc', '<p>Permanent.</p>');
      expect(tooltip.content).toBe(tooltip.expected);
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

      /** @type {{content: string|undefined, expected: string}} The tag's tooltip and the text it should hold. */
      const tooltip = await readLeadTooltip(tag, 'effect.turnEnd.desc', '<p>Turn end.</p>');
      expect(tooltip.content).toBe(tooltip.expected);
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

      /** @type {{content: string|undefined, expected: string}} The tag's tooltip and the text it should hold. */
      const tooltip = await readLeadTooltip(tag, 'effect.turnStart.desc', '<p>Turn start.</p>');
      expect(tooltip.content).toBe(tooltip.expected);
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
         { timeout: 1000 },
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

// ─── Drag-reorder primitives ─────────────────────────────────────────────────────────────────────────────────────────

test.describe('component probe — DragHandle', () => {
   test.afterEach(async () => {
      await unmountAll(page);
   });

   test('the handle carries the drag marker, the default label and the grip icon', async () => {
      const { selector } = await mountProbe(page, 'DragHandle');
      const handle = page.locator(`${selector} [data-drag-handle]`);
      await expect(handle).toBeVisible();
      await expect(handle).toHaveAttribute('title', 'Drag to reorder');
      await expect(handle).toHaveAttribute('aria-label', 'Drag to reorder');
      for (const token of DRAG_HANDLE_ICON.split(' ')) {
         await expect(handle.locator('i')).toHaveClass(new RegExp(`(^| )${token}( |$)`));
      }
      await expect(handle).toHaveCSS('cursor', 'grab');
   });

   test('the label prop replaces the default title and accessible label', async () => {
      const { selector } = await mountProbe(page, 'DragHandle', { props: { label: 'Move this row' } });
      const handle = page.locator(`${selector} [data-drag-handle]`);
      await expect(handle).toHaveAttribute('title', 'Move this row');
      await expect(handle).toHaveAttribute('aria-label', 'Move this row');
   });
});

test.describe('component probe — InsertionLine', () => {
   test.afterEach(async () => {
      await unmountAll(page);
   });

   test('the line is hidden from assistive technology and draws a three pixel glowing bar', async () => {
      const { selector } = await mountProbe(page, 'InsertionLine');
      const line = page.locator(`${selector} .insertion-line`);
      await expect(line).toBeAttached();
      await expect(line).toHaveAttribute('aria-hidden', 'true');
      await expect(line).toHaveCSS('height', '0px');

      /** @type {{ height: string, boxShadow: string }} The drawn bar, the line's ::before box. */
      const bar = await line.evaluate((element) => {
         const style = getComputedStyle(element, '::before');
         return {
            height: style.height,
            boxShadow: style.boxShadow,
         };
      });
      expect(bar.height).toBe('3px');
      expect(bar.boxShadow).not.toBe('none');
   });
});

// ─── Cleaning of user HTML in rich text ──────────────────────────────────────────────────────────────────────────────
// A real flow cannot carry an event-handler payload into rich text: ProseMirror drops `on*` attributes on input, so the
// component is mounted with synthetic props.

test.describe('component probe — RichText HTML cleaning', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders its text and markup without the event handler', async () => {
      await page.evaluate(() => {
         delete window.__titanXss;
      });
      const { selector } = await mountProbe(page, 'RichText', {
         props: { value: PAYLOAD },
         context: documentContext({ isOwner: true }),
      });

      /** @type {import('@playwright/test').Locator} The rendered rich text. */
      const richText = page.locator(`${selector} .rich-text`);
      await expect(richText).toContainText('E2E sanitized text');

      /** @type {import('@playwright/test').Locator} The rich text's image, whose load fails. */
      const image = richText.locator('img');
      await expect(image).toHaveCount(1);
      await expect.poll(() => image.evaluate((element) => element.complete), { message: 'the image load settled' })
         .toBe(true);

      // The image was inserted and its failed load settled (the positive edge); a kept handler would have fired by now.
      expect(await image.getAttribute('onerror')).toBeNull();
      expect(await page.evaluate(() => window.__titanXss)).toBeUndefined();
   });
});
