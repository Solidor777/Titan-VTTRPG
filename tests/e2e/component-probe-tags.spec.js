import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------
test.describe('component probe — Tag', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders default-slot text and resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Tag', {
         props: {
            text: 'Ice Shard',
            // Use TextData form so processTextData emits the raw string without attempting localization.
            tooltip: { text: 'A shard of magical ice.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders icon class and label, resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IconTag', {
         props: {
            icon: 'fas fa-fire',
            label: 'Fire',
            tooltip: { text: 'Burn everything.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders icon, label, and value, resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IconStatTag', {
         props: {
            icon: 'fas fa-bolt',
            label: 'Speed',
            value: 30,
            tooltip: { text: 'Movement speed in feet.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders label and value, resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'StatTag', {
         props: {
            label: 'Strength',
            value: 4,
            tooltip: { text: 'Raw physical might.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders localized "value" label and the supplied value, resolves testId', async ({ page }) => {
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the localized rarity label and resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'RarityTag', {
         props: {
            rarity: 'rare',
            tooltip: { text: 'Exceptionally hard to find.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders type and remaining for a non-permanent duration, resolves testId', async ({ page }) => {
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

   test('does not render remaining for permanent duration', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'DurationTag', {
         props: {
            type: 'turnStart',
            remaining: 2,
            tooltip: { text: 'Expires on turn start.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders default-slot text with attribute class and resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'AttributeTag', {
         props: {
            attribute: 'mind',
            text: 'Focus',
            tooltip: { text: 'A mental discipline.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders check label with attribute class and resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'AttributeCheckTag', {
         props: {
            attribute: 'soul',
            skill: 'persuasion',
            tooltip: { text: 'A social contest.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders opposed check label and resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'OpposedCheckTag', {
         props: {
            attribute: 'mind',
            skill: 'deception',
            tooltip: { text: 'A deception contest.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders default-slot text with resistance class and resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ResistanceTag', {
         props: {
            resistance: 'willpower',
            text: 'Focus',
            tooltip: { text: 'A mental barrier.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders resisted-by label and resistance name, resolves testId', async ({ page }) => {
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

   test('tooltip content is forwarded to tippy', async ({ page }) => {
      const { selector } = await mountProbe(page, 'ResistedByTag', {
         props: {
            resistance: 'reflexes',
            tooltip: { text: 'Dodged away.', localize: false },
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders as StatTag when value is a number, resolves testId', async ({ page }) => {
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

   test('renders as plain Tag when value is undefined, resolves testId', async ({ page }) => {
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders a damage aspect label and resolves testId', async ({ page }) => {
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders a custom aspect label and resolves testId', async ({ page }) => {
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders one tag per aspect entry and resolves testId', async ({ page }) => {
      const { selector } = await mountProbe(page, 'SpellAspectTags', {
         props: {
            standardAspects: [
               {
                  label: 'damage',
                  initialValue: 2,
                  scaling: false,
                  resistanceCheck: '',
               },
            ],
            customAspects: [
               {
                  label: 'Surge',
                  isDamage: false,
                  isHealing: false,
                  initialValue: 1,
                  scaling: false,
                  resistanceCheck: '',
               },
            ],
            testId: 'probe-spell-aspect-tags',
         },
      });
      // SpellAspectTags renders its own .tag-container div; testId goes there.
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('clicking edit fires editFunction callback', async ({ page }) => {
      const { selector } = await mountProbe(page, 'EditDeleteTag', {
         props: {
            label: 'Fireball',
            testId: 'probe-edit-delete-tag',
         },
         events: ['editFunction', 'deleteFunction'],
      });
      await clearProbeEvents(page);
      await page.locator(`${selector} button[aria-label]`).first().click();
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'editFunction')).toHaveLength(1);
   });

   test('clicking delete fires deleteFunction callback', async ({ page }) => {
      const { selector } = await mountProbe(page, 'EditDeleteTag', {
         props: {
            label: 'Fireball',
            testId: 'probe-edit-delete-tag',
         },
         events: ['editFunction', 'deleteFunction'],
      });
      await clearProbeEvents(page);
      await page.locator(`${selector} button[aria-label]`).last().click();
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'deleteFunction')).toHaveLength(1);
   });

   test('edit icon <i> uses Font Awesome (regression-lock bug #5)', async ({ page }) => {
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

   test('resolves testId', async ({ page }) => {
      const { selector } = await mountProbe(page, 'EditDeleteTag', {
         props: {
            label: 'Fireball',
            testId: 'probe-edit-delete-tag',
         },
      });
      await expect(page.locator(`${selector} .tag[data-testid="probe-edit-delete-tag"]`)).toBeVisible();
   });
});
