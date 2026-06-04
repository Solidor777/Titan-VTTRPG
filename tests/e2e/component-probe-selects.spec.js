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
// AttributeSelect — ATTRIBUTES constant: body, mind, soul; optional allowNone.
// Wraps AttributeInput (div root) + Select. testId lands on the wrapper div.
// ---------------------------------------------------------------------------
test.describe('component probe — AttributeSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the attribute options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'AttributeSelect', {
         props: {
            value: 'body',
            allowNone: false,
            testId: 'probe-attribute-select',
         },
         events: ['onchange'],
      });

      // Drop the mount-time clamp onchange (if any) before asserting user-driven change.
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('body');
      expect(optionValues).toContain('mind');
      expect(optionValues).toContain('soul');
      expect(optionValues).toHaveLength(3);

      await select.selectOption('mind');
      await expect(select).toHaveValue('mind');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'AttributeSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(4);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'AttributeSelect', {
         props: {
            value: 'body',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the wrapper root', async () => {
      const { selector } = await mountProbe(page, 'AttributeSelect', {
         props: {
            value: 'body',
            testId: 'probe-attribute-select',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-attribute-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// SkillSelect — SKILLS constant (18 entries); optional allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — SkillSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all skill options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'SkillSelect', {
         props: {
            value: 'arcana',
            allowNone: false,
            testId: 'probe-skill-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('arcana');
      expect(optionValues).toContain('athletics');
      expect(optionValues).toContain('stealth');
      expect(optionValues).toHaveLength(18);

      await select.selectOption('athletics');
      await expect(select).toHaveValue('athletics');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'SkillSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(19);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'SkillSelect', {
         props: {
            value: 'arcana',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'SkillSelect', {
         props: {
            value: 'arcana',
            testId: 'probe-skill-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-skill-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// RaritySelect — RARITIES constant: common, uncommon, rare, unique; no allowNone.
// Wraps RarityInput (div root) + Select. testId lands on the wrapper div.
// ---------------------------------------------------------------------------
test.describe('component probe — RaritySelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all rarity options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'RaritySelect', {
         props: {
            value: 'common',
            testId: 'probe-rarity-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('common');
      expect(optionValues).toContain('uncommon');
      expect(optionValues).toContain('rare');
      expect(optionValues).toContain('unique');
      expect(optionValues).toHaveLength(4);

      await select.selectOption('rare');
      await expect(select).toHaveValue('rare');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'RaritySelect', {
         props: {
            value: 'common',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the wrapper root', async () => {
      const { selector } = await mountProbe(page, 'RaritySelect', {
         props: {
            value: 'common',
            testId: 'probe-rarity-select',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-rarity-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// RatingSelect — RATINGS constant: awareness, defense, melee, accuracy, initiative; optional allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — RatingSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all rating options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'RatingSelect', {
         props: {
            value: 'awareness',
            allowNone: false,
            testId: 'probe-rating-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('awareness');
      expect(optionValues).toContain('defense');
      expect(optionValues).toContain('initiative');
      expect(optionValues).toHaveLength(5);

      await select.selectOption('defense');
      await expect(select).toHaveValue('defense');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'RatingSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(6);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'RatingSelect', {
         props: {
            value: 'awareness',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'RatingSelect', {
         props: {
            value: 'awareness',
            testId: 'probe-rating-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-rating-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ResistanceSelect — RESISTANCES constant: reflexes, resilience, willpower; optional allowNone.
// Wraps ResistanceInput (div root) + Select. testId lands on the wrapper div.
// ---------------------------------------------------------------------------
test.describe('component probe — ResistanceSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all resistance options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'ResistanceSelect', {
         props: {
            value: 'reflexes',
            allowNone: false,
            testId: 'probe-resistance-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('reflexes');
      expect(optionValues).toContain('resilience');
      expect(optionValues).toContain('willpower');
      expect(optionValues).toHaveLength(3);

      await select.selectOption('resilience');
      await expect(select).toHaveValue('resilience');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'ResistanceSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(4);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'ResistanceSelect', {
         props: {
            value: 'reflexes',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the wrapper root', async () => {
      const { selector } = await mountProbe(page, 'ResistanceSelect', {
         props: {
            value: 'reflexes',
            testId: 'probe-resistance-select',
         },
      });
      await expect(page.locator(`${selector} [data-testid="probe-resistance-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ResourceSelect — RESOURCES constant: stamina, resolve, wounds; optional allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — ResourceSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all resource options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'ResourceSelect', {
         props: {
            value: 'stamina',
            allowNone: false,
            testId: 'probe-resource-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('stamina');
      expect(optionValues).toContain('resolve');
      expect(optionValues).toContain('wounds');
      expect(optionValues).toHaveLength(3);

      await select.selectOption('resolve');
      await expect(select).toHaveValue('resolve');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'ResourceSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(4);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'ResourceSelect', {
         props: {
            value: 'stamina',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'ResourceSelect', {
         props: {
            value: 'stamina',
            testId: 'probe-resource-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-resource-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// SpeedSelect — SPEEDS constant: burrow, climb, fly, stride, swim; optional allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — SpeedSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all speed options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'SpeedSelect', {
         props: {
            value: 'burrow',
            allowNone: false,
            testId: 'probe-speed-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('burrow');
      expect(optionValues).toContain('climb');
      expect(optionValues).toContain('fly');
      expect(optionValues).toContain('stride');
      expect(optionValues).toContain('swim');
      expect(optionValues).toHaveLength(5);

      await select.selectOption('stride');
      await expect(select).toHaveValue('stride');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'SpeedSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(6);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'SpeedSelect', {
         props: {
            value: 'burrow',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'SpeedSelect', {
         props: {
            value: 'burrow',
            testId: 'probe-speed-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-speed-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ModSelect — MODS constant: armor, damage, healing, resolveRegain, woundRegain; optional allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — ModSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all mod options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'ModSelect', {
         props: {
            value: 'armor',
            allowNone: false,
            testId: 'probe-mod-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('armor');
      expect(optionValues).toContain('damage');
      expect(optionValues).toContain('healing');
      expect(optionValues).toContain('resolveRegain');
      expect(optionValues).toContain('woundRegain');
      expect(optionValues).toHaveLength(5);

      await select.selectOption('damage');
      await expect(select).toHaveValue('damage');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'ModSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(6);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'ModSelect', {
         props: {
            value: 'armor',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'ModSelect', {
         props: {
            value: 'armor',
            testId: 'probe-mod-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-mod-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// AttackTypeSelect — ATTACK_TYPES constant: melee, ranged; no allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — AttackTypeSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all attack type options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'AttackTypeSelect', {
         props: {
            value: 'melee',
            testId: 'probe-attack-type-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('melee');
      expect(optionValues).toContain('ranged');
      expect(optionValues).toHaveLength(2);

      await select.selectOption('ranged');
      await expect(select).toHaveValue('ranged');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'AttackTypeSelect', {
         props: {
            value: 'melee',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'AttackTypeSelect', {
         props: {
            value: 'melee',
            testId: 'probe-attack-type-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-attack-type-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// CheckDifficultySelect — inline numeric options: 1, 2, 3, 4, 5, 6; no allowNone.
// Note: disabled prop defaults to void 0, not false. Bare Select.
// testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — CheckDifficultySelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders difficulty levels 1-6 and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'CheckDifficultySelect', {
         props: {
            value: 1,
            testId: 'probe-difficulty-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));

      // Numeric options serialize to strings in the DOM.
      expect(optionValues).toContain('1');
      expect(optionValues).toContain('6');
      expect(optionValues).toHaveLength(6);

      await select.selectOption('3');
      await expect(select).toHaveValue('3');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'CheckDifficultySelect', {
         props: {
            value: 1,
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'CheckDifficultySelect', {
         props: {
            value: 1,
            testId: 'probe-difficulty-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-difficulty-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// DamageReducedBySelect — baseline option: none; conditionally adds resistanceCheck and/or opposedCheck.
// No allowNone prop. Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — DamageReducedBySelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the base none option by default', async () => {
      const { selector } = await mountProbe(page, 'DamageReducedBySelect', {
         props: {
            value: 'none',
            testId: 'probe-damage-reduced-by',
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(1);
   });

   test('adds resistanceCheck when allowResistanceCheck is set', async () => {
      const { selector } = await mountProbe(page, 'DamageReducedBySelect', {
         props: {
            value: 'none',
            allowResistanceCheck: true,
            testId: 'probe-damage-reduced-by',
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('resistanceCheck');
      expect(optionValues).toHaveLength(2);
   });

   test('adds all options when both flags are set and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'DamageReducedBySelect', {
         props: {
            value: 'none',
            allowResistanceCheck: true,
            allowOpposedCheck: true,
            testId: 'probe-damage-reduced-by',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('none');
      expect(optionValues).toContain('resistanceCheck');
      expect(optionValues).toContain('opposedCheck');
      expect(optionValues).toHaveLength(3);

      await select.selectOption('resistanceCheck');
      await expect(select).toHaveValue('resistanceCheck');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'DamageReducedBySelect', {
         props: {
            value: 'none',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'DamageReducedBySelect', {
         props: {
            value: 'none',
            testId: 'probe-damage-reduced-by',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-damage-reduced-by"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// InventoryItemTypeSelect — INVENTORY_ITEM_TYPES constant: armor, commodity, equipment, shield, weapon;
// optional allowNone. Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — InventoryItemTypeSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all inventory item type options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'InventoryItemTypeSelect', {
         props: {
            value: 'armor',
            allowNone: false,
            testId: 'probe-inventory-item-type-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('armor');
      expect(optionValues).toContain('commodity');
      expect(optionValues).toContain('equipment');
      expect(optionValues).toContain('shield');
      expect(optionValues).toContain('weapon');
      expect(optionValues).toHaveLength(5);

      await select.selectOption('weapon');
      await expect(select).toHaveValue('weapon');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'InventoryItemTypeSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(6);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'InventoryItemTypeSelect', {
         props: {
            value: 'armor',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'InventoryItemTypeSelect', {
         props: {
            value: 'armor',
            testId: 'probe-inventory-item-type-select',
         },
      });
      await expect(
         page.locator(`${selector} select[data-testid="probe-inventory-item-type-select"]`),
      ).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// RulesElementOperationSelect — RULES_ELEMENT_OPERATIONS constant (8 entries); no allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — RulesElementOperationSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all rules element operation options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'RulesElementOperationSelect', {
         props: {
            value: 'flatModifier',
            testId: 'probe-re-operation-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('flatModifier');
      expect(optionValues).toContain('mulBase');
      expect(optionValues).toContain('mulSum');
      expect(optionValues).toContain('setSum');
      expect(optionValues).toContain('fastHealing');
      expect(optionValues).toContain('persistentDamage');
      expect(optionValues).toContain('turnMessage');
      expect(optionValues).toContain('rollMessage');
      expect(optionValues).toContain('conditionalRatingModifier');
      expect(optionValues).toContain('conditionalCheckModifier');
      expect(optionValues).toHaveLength(10);

      await select.selectOption('mulBase');
      await expect(select).toHaveValue('mulBase');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'RulesElementOperationSelect', {
         props: {
            value: 'flatModifier',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'RulesElementOperationSelect', {
         props: {
            value: 'flatModifier',
            testId: 'probe-re-operation-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-re-operation-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ArmorTraitSelect — ARMOR_TRAITS.map(t => t.name): magical, loud, encumbering, heavy; optional allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — ArmorTraitSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all armor trait options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'ArmorTraitSelect', {
         props: {
            value: 'magical',
            allowNone: false,
            testId: 'probe-armor-trait-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('magical');
      expect(optionValues).toContain('loud');
      expect(optionValues).toContain('encumbering');
      expect(optionValues).toContain('heavy');
      expect(optionValues).toHaveLength(4);

      await select.selectOption('loud');
      await expect(select).toHaveValue('loud');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'ArmorTraitSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(5);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'ArmorTraitSelect', {
         props: {
            value: 'magical',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'ArmorTraitSelect', {
         props: {
            value: 'magical',
            testId: 'probe-armor-trait-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-armor-trait-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// AttackTraitSelect — ATTACK_TRAITS.map(t => t.name): 18 traits; optional allowNone.
// Bare Select. testId lands on the <select> element.
// ---------------------------------------------------------------------------
test.describe('component probe — AttackTraitSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders all attack trait options and fires onchange on change', async () => {
      const { selector } = await mountProbe(page, 'AttackTraitSelect', {
         props: {
            value: 'blast',
            allowNone: false,
            testId: 'probe-attack-trait-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('blast');
      expect(optionValues).toContain('cleave');
      expect(optionValues).toContain('magical');
      expect(optionValues).toContain('vicious');
      expect(optionValues).toHaveLength(18);

      await select.selectOption('cleave');
      await expect(select).toHaveValue('cleave');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('adds a none option when allowNone is set', async () => {
      const { selector } = await mountProbe(page, 'AttackTraitSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(19);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'AttackTraitSelect', {
         props: {
            value: 'blast',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'AttackTraitSelect', {
         props: {
            value: 'blast',
            testId: 'probe-attack-trait-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-attack-trait-select"]`)).toBeVisible();
   });
});

// ---------------------------------------------------------------------------
// ShieldTraitSelect — SHIELD_TRAITS.map(t => t.name): magical (1 entry); optional allowNone.
// Bare Select. testId lands on the <select> element. allowNone used for the onchange test since
// the default list has only one entry and the clamp would immediately reset any selection.
// ---------------------------------------------------------------------------
test.describe('component probe — ShieldTraitSelect', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the shield trait option set and fires onchange when switching to none', async () => {
      const { selector } = await mountProbe(page, 'ShieldTraitSelect', {
         props: {
            value: 'magical',
            allowNone: true,
            testId: 'probe-shield-trait-select',
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);

      const select = page.locator(`${selector} select`);
      await expect(select.locator('option')).not.toHaveCount(0);

      /** @type {string[]} */
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('magical');
      expect(optionValues).toContain('none');
      expect(optionValues).toHaveLength(2);

      await select.selectOption('none');
      await expect(select).toHaveValue('none');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
   });

   test('base option set without allowNone contains only magical', async () => {
      const { selector } = await mountProbe(page, 'ShieldTraitSelect', {
         props: {
            value: 'magical',
            allowNone: false,
         },
      });

      /** @type {string[]} */
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('magical');
      expect(optionValues).toHaveLength(1);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'ShieldTraitSelect', {
         props: {
            value: 'magical',
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });

   test('testId resolves on the select element', async () => {
      const { selector } = await mountProbe(page, 'ShieldTraitSelect', {
         props: {
            value: 'magical',
            testId: 'probe-shield-trait-select',
         },
      });
      await expect(page.locator(`${selector} select[data-testid="probe-shield-trait-select"]`)).toBeVisible();
   });
});
