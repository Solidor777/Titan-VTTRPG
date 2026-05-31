# TITAN E2E Phase 3b-remaining — Full Component-Probe Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the gated component-probe harness over the remaining 77 primitives in
`src/helpers/svelte-components/**` so every TITAN base component has a behavioral isolation probe.

**Architecture:** The runtime probe (`src/test-probe/`) and page object (`tests/e2e/componentProbe.js`) already
exist. This plan (1) makes two small additive harness extensions — forward a Svelte `context` Map and expose the
registry in-page for component-valued props — then (2) adds one per-family Playwright spec file, growing the
registry and adding a `data-testid` prop to each component, family by family. Each component's probe asserts its
real behavior; any discrepancy is a real bug fixed TDD red→green.

**Tech Stack:** Svelte 5 (runes), Foundry VTT v14 (ApplicationV2), Playwright, Vite (`build:e2e` gated bundle).

**Spec:** `docs/superpowers/specs/2026-05-31-titan-e2e-3b-remaining-design.md`.

---

## Working agreements (every task)

- **Delegation:** route ALL `.svelte` / `.js` edits through the `titan-svelte-dev` subagent (it loads
  `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase`). Test-file (`.spec.js`) authoring may be
  done directly but still follows house style (120-col, typed props, multi-line objects >1 prop).
- **Build discipline (LOAD-BEARING):** after any `src/` edit, run `npm run build:e2e` (NOT `npm run build` —
  that strips the gated probe). The live Foundry on `:30000` serves this directory's built `index.js`.
- **No worktree.** Stay on `development`. Login as `E2E GM 1` (the `login(page)` default).
- **Never `git add`** `index.js` / `index.js.map` / `style.css` (gitignored) or the `packs/effects/**` churn.
- **testId pattern** (established by `LabelTag.svelte`): add `testId = void 0` to the `$props()` destructure,
  add `testId?: string` to the props typedef, and bind `data-testid={testId}` on the component's **root**
  element. For wrapper components that delegate to another primitive, forward `testId` to the wrapper's own
  root element (a `<div>` it owns), not the inner primitive.
- **Probe spec idiom** (copy from `tests/e2e/component-probe.spec.js`): each `describe` has a `beforeEach`
  `login(page)` and an `afterEach` `unmountAll(page)` + `clearProbeEvents(page)`. Locate the mount via the
  returned `selector` (`[data-titan-probe="<id>"]`). Instrument callbacks via the `events: [...]` option.

---

## File Structure

**Modify (harness):**
- `tests/e2e/componentProbe.js` — add `context` to the `mountProbe` spec; add `documentContext()` helper; add
  `probeComponent(name)` marker helper for component-valued props.
- `src/test-probe/registerProbe.js` — resolve `{ __probeComponent }` markers to component constructors in
  `mount` (for component-valued props like `TagContainer`'s `tags`).

**Modify (registry + every component, family by family):**
- `src/test-probe/componentRegistry.js` — grow from 7 to 84 entries.
- 77 component `.svelte` files under `src/helpers/svelte-components/**` — add `testId` prop where missing.

**Create (per-family spec files in `tests/e2e/`):**
- `component-probe-context.spec.js` — `RichText`, `FiltereedList`, `CondensedCheckButton`, `ProseMirrorEditor`,
  `tag/effects/**` (11).
- `component-probe-tags.spec.js` — tag/ non-effect minus `TagContainer` (17).
- `component-probe-labels.spec.js` — label/ (5).
- `component-probe-inputs.spec.js` — input/ non-select (8).
- `component-probe-selects.spec.js` — input/select/ (16).
- `component-probe-buttons.spec.js` — button/ minus `CondensedCheckButton` (13).
- `component-probe-display.spec.js` — `Meter`, `Text`, `Tabs`, `ScrollingContainer`, `LabeledElement`,
  `BorderedColumnList`, `TagContainer` (7).

The existing `component-probe.spec.js` (core 7, 14 tests) is unchanged.

---

## Task 1: Harness extension — context forwarding, document stub, registry exposure

**Files:**
- Modify: `tests/e2e/componentProbe.js`
- Modify: `src/test-probe/registerProbe.js`
- Test: `tests/e2e/component-probe-context.spec.js` (created here; the `RichText` probe drives the change)

- [ ] **Step 1: Re-verify the inventory.** Run a glob of `src/helpers/svelte-components/**/*.svelte`; confirm
  84 components, 7 already in `componentRegistry.js`. If the count differs from this plan's 77 remaining,
  note the delta in the task commit and proceed with the live set.

- [ ] **Step 2: Write the failing harness/context test.** Create `tests/e2e/component-probe-context.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, unmountAll, clearProbeEvents, documentContext } from './componentProbe.js';

test.describe('component probe — RichText (context)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('enriches its value into the rich-text div using the document context', async ({ page }) => {
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

   test('marks the div not-owner when the document context is not the owner', async ({ page }) => {
      const { selector } = await mountProbe(page, 'RichText', {
         props: {
            value: '<p>Secret</p>',
         },
         context: documentContext({ isOwner: false }),
      });
      await expect(page.locator(`${selector} .rich-text`)).toHaveClass(/not-owner/);
   });
});
```

- [ ] **Step 3: Register `RichText` in the registry.** Have `titan-svelte-dev` add to
  `src/test-probe/componentRegistry.js`:

```javascript
import RichText from '~/helpers/svelte-components/RichText.svelte';
// ...inside the componentRegistry object:
   RichText,
```

- [ ] **Step 4: Run the test to verify it fails.**

Run: `npm run build:e2e` then `npx playwright test component-probe-context --reporter=list`
Expected: FAIL — `documentContext` is not exported, and/or `RichText` throws because `getContext('document')`
is `undefined` (context not forwarded).

- [ ] **Step 5: Extend `mountProbe` to forward context + add helpers.** Edit `tests/e2e/componentProbe.js`.
  Update the `mountProbe` signature and body, and append the two helpers:

```javascript
export async function mountProbe(page, name, { props = {}, events = [], context = {} } = {}) {
   return page.evaluate(({ name, props, events, context }) => {
      globalThis.window.__titanProbeEvents = globalThis.window.__titanProbeEvents ?? [];
      const probe = globalThis.game.titan._probe;
      if (!probe) {
         throw new Error('game.titan._probe is not registered — build the e2e bundle with `npm run build:e2e`.');
      }
      const builtProps = { ...props };
      for (const ev of events) {
         builtProps[ev] = (arg) => {
            globalThis.window.__titanProbeEvents.push({ event: ev, key: arg && arg.key });
         };
      }
      const contextMap = new Map(Object.entries(context));
      return probe.mount(name, builtProps, contextMap);
   }, { name, props, events, context });
}

/**
 * Build a Svelte context object exposing a minimal non-reactive `document` store for components that read
 * `getContext('document')`. Sufficient for render/click probes; reactivity is covered by the Phase 3d sweep.
 * @param {{ isOwner?: boolean }} [options] - Owner flag the component reads via `document.data.isOwner`.
 * @returns {{ document: { data: { isOwner: boolean } } }} The context object passed to `mountProbe`.
 */
export function documentContext({ isOwner = true } = {}) {
   return {
      document: {
         data: {
            isOwner,
         },
      },
   };
}

/**
 * Build a marker the harness resolves in-page to a registered component constructor, for props that take a
 * component reference (functions cannot cross the Node<->page boundary).
 * @param {string} name - A registered component name (see game.titan._probe.components).
 * @returns {{ __probeComponent: string }} The marker object.
 */
export function probeComponent(name) {
   return {
      __probeComponent: name,
   };
}
```

- [ ] **Step 6: Resolve component markers in the runtime.** Have `titan-svelte-dev` edit
  `src/test-probe/registerProbe.js`. The registry default is already imported. Inside `mount`, resolve any
  `{ __probeComponent }` markers in props before mounting (the markers cross the Node↔page boundary as plain
  objects and are resolved here against the module-scoped `componentRegistry` — no in-page registry exposure
  is needed):

```javascript
// Inside mount(), after `const finalProps = { ...props };` and before the `text` shorthand block, add:
         // Resolve any `{ __probeComponent: name }` markers (and arrays/object values containing them) into
         // the registered component constructor so component-valued props survive the page boundary.
         for (const [key, value] of Object.entries(finalProps)) {
            finalProps[key] = resolveProbeComponents(value);
         }

// Add this module-level helper above `export default function registerProbe()`:
/**
 * Recursively replace `{ __probeComponent: name }` markers with the registered component constructor.
 * @param {*} value - Any prop value possibly containing component markers.
 * @returns {*} The value with markers resolved to component constructors.
 */
function resolveProbeComponents(value) {
   if (Array.isArray(value)) {
      return value.map(resolveProbeComponents);
   }
   if (value && typeof value === 'object') {
      if (typeof value.__probeComponent === 'string') {
         return componentRegistry[value.__probeComponent];
      }
      const out = {};
      for (const [k, v] of Object.entries(value)) {
         out[k] = resolveProbeComponents(v);
      }
      return out;
   }
   return value;
}
```

- [ ] **Step 7: Rebuild and run the test to verify it passes.**

Run: `npm run build:e2e` then `npx playwright test component-probe-context --reporter=list`
Expected: PASS (2 tests).

- [ ] **Step 8: Verify the core suite still passes (no regression from the signature change).**

Run: `npx playwright test component-probe.spec --reporter=list`
Expected: PASS (14 tests) — the added `context = {}` default is backward-compatible.

- [ ] **Step 9: Verify production tree-shake is intact.**

Run: `npm run build` then search the built root `index.js` for probe identifiers.
Run: `Select-String -Path index.js -Pattern '__probeComponent|_probe|componentRegistry' -SimpleMatch`
Expected: no matches (probe is tree-shaken from the production bundle). Re-run `npm run build:e2e` afterward
so the live Foundry keeps serving the probe.

- [ ] **Step 10: Commit.**

```bash
git add tests/e2e/componentProbe.js tests/e2e/component-probe-context.spec.js src/test-probe/registerProbe.js src/test-probe/componentRegistry.js
git commit -m "test(component-probe): forward context Map + registry exposure; RichText probe"
```

---

## Task 2: Context family remainder — FiltereedList, CondensedCheckButton, ProseMirrorEditor, effect tags

**Files:**
- Modify: `src/test-probe/componentRegistry.js` (add the 10 components)
- Modify: the 10 component `.svelte` files (add `testId` where missing)
- Test: `tests/e2e/component-probe-context.spec.js` (append describe blocks)

- [ ] **Step 1: Read each target component to confirm its props and context reads.** For each of
  `FiltereedList`, `CondensedCheckButton`, `ProseMirrorEditor`, and `tag/effects/{EffectTag, CustomEffectTag,
  ExpiredEffectTag, InitiativeEffectTag, PermanentEffectTag, TurnEndEffectTag, TurnStartEffectTag}`, read the
  `$props()` typedef and any `getContext` calls. `CondensedCheckButton` + `FiltereedList` read
  `getContext('document')`; extend `documentContext()` minimally if a component reads more than `isOwner`
  (e.g. `DocumentOwnerAttributeButton` internals) — add the needed field to the helper and note it.

- [ ] **Step 2: Write failing probes for the effect-tag family.** The `EffectTag` family takes a **plain data
  object** (`{ label, img, description, remaining, custom?, initiative? }`), not a Document. Append to
  `component-probe-context.spec.js`:

```javascript
test.describe('component probe — EffectTag (plain effect data)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders label, image, and custom remaining duration', async ({ page }) => {
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
```

- [ ] **Step 3: Add `testId` to each context-family component** (root element) via `titan-svelte-dev`, using
  the established `LabelTag` pattern, and register all 10 in `componentRegistry.js`.

- [ ] **Step 4: Run to verify failure, then pass.**

Run: `npm run build:e2e` then `npx playwright test component-probe-context --reporter=list`
Expected: first run FAIL (component unregistered / testId missing), then PASS after Step 3.

- [ ] **Step 5: Write the remaining context probes.** For each remaining component append a describe block:
  - `FiltereedList` — mount with a `documentContext()` and its required list props (read from its typedef);
    assert it renders its container and filters as documented.
  - `CondensedCheckButton` — mount with `documentContext({ isOwner: true })` and scalar props
    (`attribute`, `difficulty`, `complexity`, `totalDice`, `label`); instrument `onclick`; assert label/stat
    render and that clicking the inner button fires `onclick` (disabled when not owner if the
    `DocumentOwnerAttributeButton` gates on it — confirm by reading it).
  - `ProseMirrorEditor` — mount with `{ value: '<p>x</p>', editable: true, enrichedReady: true }`; assert the
    native `<prose-mirror>` element is built into the container, then `unmount` and assert teardown:

```javascript
test('builds the native prose-mirror element and tears it down on unmount', async ({ page }) => {
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
```

- [ ] **Step 6: Rebuild and run the full context spec.**

Run: `npm run build:e2e` then `npx playwright test component-probe-context --reporter=list`
Expected: PASS (all context-family tests).

- [ ] **Step 7: Commit.**

```bash
git add tests/e2e/component-probe-context.spec.js tests/e2e/componentProbe.js src/test-probe/componentRegistry.js "src/helpers/svelte-components/FiltereedList.svelte" "src/helpers/svelte-components/button/CondensedCheckButton.svelte" "src/helpers/svelte-components/editor/ProseMirrorEditor.svelte" "src/helpers/svelte-components/tag/effects"
git commit -m "test(component-probe): context family — FiltereedList, CondensedCheckButton, ProseMirror, effect tags"
```

---

## Task 3: Tags family (17 render-only tags)

**Files:**
- Modify: `src/test-probe/componentRegistry.js`
- Modify: 17 `.svelte` files under `src/helpers/svelte-components/tag/` (excluding `LabelTag`, `EditDeleteTag`
  if interactive — see below, and `TagContainer` which is in the display family)
- Test: `tests/e2e/component-probe-tags.spec.js` (create)

Components: `AttributeCheckTag`, `AttributeTag`, `DurationTag`, `IconStatTag`, `IconTag`, `OpposedCheckTag`,
`RarityTag`, `ResistanceTag`, `ResistedByTag`, `SpellAspectTag`, `SpellAspectTags`, `SpellCustomAspectTag`,
`StatTag`, `Tag`, `TraitTag`, `ValueTag`, `EditDeleteTag`.

- [ ] **Step 1: Read each tag's `$props()` typedef** to determine the props it renders and its root selector.
  Most render `{children}` and/or a `label`/`value`/`stat`/`icon` prop inside a `.tag` div with an optional
  `tooltip`. `EditDeleteTag` is the exception — it renders edit/delete icon buttons with `onedit`/`ondelete`
  callbacks (it is the subject of bug #5/#9); probe it for the callbacks firing + the FA icon font-family
  (regression-lock the bug-#5 fix).

- [ ] **Step 2: Write the reference probe (failing).** Create `tests/e2e/component-probe-tags.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';

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
});
```

  (`Tag` renders `{@render children?.()}`; the harness converts a string `text` prop into a children snippet —
  see the core `LabelTag` probe.)

- [ ] **Step 3: Per-component coverage.** For each remaining tag, add `testId` (root `.tag`) via
  `titan-svelte-dev`, register it, and append a describe block asserting: (a) its documented content renders
  for representative props (e.g. `ValueTag` → its `value`; `StatTag` → label + stat; `RarityTag` → rarity
  label; `IconTag` → the `icon` class on an `<i>`), (b) `data-testid` resolves, (c) tooltip content where a
  `tooltip` prop exists (read the tippy instance: `page.locator(...).evaluate(el => el._tippy.props.content)`,
  per the bug-#7 regression pattern). For `EditDeleteTag`: instrument `onedit`/`ondelete`, click each icon
  button, assert the callback fires, and assert the icon `<i>`'s computed `font-family` matches
  `/Font Awesome/` (bug-#5 lock-in).

- [ ] **Step 4: Rebuild and run.**

Run: `npm run build:e2e` then `npx playwright test component-probe-tags --reporter=list`
Expected: PASS (all tag tests). Any content mismatch is a real bug → fix via `titan-svelte-dev` TDD red→green.

- [ ] **Step 5: Commit.**

```bash
git add tests/e2e/component-probe-tags.spec.js src/test-probe/componentRegistry.js "src/helpers/svelte-components/tag"
git commit -m "test(component-probe): tags family (17)"
```

---

## Task 4: Labels family (5)

**Files:**
- Modify: `src/test-probe/componentRegistry.js`
- Modify: `src/helpers/svelte-components/label/{IconLabel,Label,ModifiableStatValueLabel,ModifiedValueLabel,TextLabel}.svelte`
- Test: `tests/e2e/component-probe-labels.spec.js` (create)

- [ ] **Step 1: Read each label's typedef.** `TextLabel` wraps `Label`→`Text` with `text={label}`; `Text`
  runs `processTextData` (may localize bare strings — pass `{ text, localize: false }` to assert raw text, per
  bug #7). `ModifiableStatValueLabel`/`ModifiedValueLabel` render a base/modified numeric value. Determine
  each root element for the `testId` placement (forward `testId` to the rendered root, e.g. the `.text` div in
  `TextLabel` or `Label`'s root).

- [ ] **Step 2: Write the reference probe (failing).** Create `tests/e2e/component-probe-labels.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { unmountAll, clearProbeEvents, mountProbe } from './componentProbe.js';

test.describe('component probe — TextLabel', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the raw label text', async ({ page }) => {
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
});
```

- [ ] **Step 3: Per-component coverage.** For each label: add `testId`, register, append a describe asserting
  the rendered value/label for representative props + `data-testid` resolves. For the value labels, assert the
  displayed number reflects the `value`/`mod` props.

- [ ] **Step 4: Rebuild and run.**

Run: `npm run build:e2e` then `npx playwright test component-probe-labels --reporter=list`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add tests/e2e/component-probe-labels.spec.js src/test-probe/componentRegistry.js "src/helpers/svelte-components/label"
git commit -m "test(component-probe): labels family (5)"
```

---

## Task 5: Inputs family (8 non-select)

**Files:**
- Modify: `src/test-probe/componentRegistry.js`
- Modify: `src/helpers/svelte-components/input/{AttributeInput,RarityInput,ResistanceInput,ImagePicker,IntegerIncrementInput,LabeledTextInput,TextAreaInput,TopFilter}.svelte`
- Test: `tests/e2e/component-probe-inputs.spec.js` (create)

- [ ] **Step 1: Read each input's typedef.** `IntegerIncrementInput` wraps `IntegerInput` between two
  `MiniIconButton`s (increment/decrement by `increment`, or `modifierIncrement` when a modifier key is held);
  `bind:value`. `TextAreaInput`/`LabeledTextInput` follow the `TextInput` keyup-commit template.
  `AttributeInput`/`RarityInput`/`ResistanceInput` are display-wrappers around a value. `ImagePicker` opens a
  Foundry FilePicker (assert it renders the image + button; do not drive the native picker). `TopFilter` is a
  filter text input.

- [ ] **Step 2: Write the reference probe (failing).** Create `tests/e2e/component-probe-inputs.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';

test.describe('component probe — IntegerIncrementInput', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
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
      // The increment control is the second MiniIconButton (.increment); click raises the bound value.
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
});
```

- [ ] **Step 3: Per-component coverage.** For each input: add `testId` (root), register, append a describe.
  Text-like inputs follow the `TextInput` template (fill + keyup commit + disabled). Display wrappers assert
  the rendered value. `ImagePicker` assert the image `src` renders. Increment input also asserts the
  `disabled` propagates to both `MiniIconButton`s.

- [ ] **Step 4: Rebuild and run.**

Run: `npm run build:e2e` then `npx playwright test component-probe-inputs --reporter=list`
Expected: PASS. Clamp/commit mismatches are real bugs → TDD fix.

- [ ] **Step 5: Commit.**

```bash
git add tests/e2e/component-probe-inputs.spec.js src/test-probe/componentRegistry.js "src/helpers/svelte-components/input"
git commit -m "test(component-probe): inputs family (8)"
```

---

## Task 6: Selects family (16 typed selects)

**Files:**
- Modify: `src/test-probe/componentRegistry.js`
- Modify: the 16 select `.svelte` files under `src/helpers/svelte-components/input/select/`
- Test: `tests/e2e/component-probe-selects.spec.js` (create)

Components: `AttributeSelect`, `SkillSelect`, `RaritySelect`, `RatingSelect`, `ResistanceSelect`,
`ResourceSelect`, `SpeedSelect`, `ModSelect`, `AttackTypeSelect`, `CheckDifficultySelect`,
`DamageReducedBySelect`, `InventoryItemTypeSelect`, `RulesElementOperationSelect`, `ArmorTraitSelect`,
`AttackTraitSelect`, `ShieldTraitSelect`.

- [ ] **Step 1: Identify each select's preset option source.** Each wraps the (done) `Select` with a derived
  `options` list from a constant (e.g. `AttributeSelect` → `ATTRIBUTES` from `~/system/Attributes.js`,
  `+ none` when `allowNone`). Read each to record its option source and whether it takes `allowNone`. These
  wrappers forward `onchange` and `bind:value`; the inner `Select` already has `testId` — add `testId` to the
  wrapper's own root element too (the wrapper `<div>` or the `AttributeInput` wrapper) for parity.

- [ ] **Step 2: Write the reference probe (failing).** Create `tests/e2e/component-probe-selects.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';

test.describe('component probe — AttributeSelect', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the attribute options and fires onchange on change', async ({ page }) => {
      const { selector } = await mountProbe(page, 'AttributeSelect', {
         props: {
            value: 'body',
            allowNone: false,
         },
         events: ['onchange'],
      });
      await clearProbeEvents(page);
      const select = page.locator(`${selector} select`);
      // The four core attributes are always present (body, mind, soul, ... per ATTRIBUTES).
      await expect(select.locator('option')).not.toHaveCount(0);
      const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toContain('body');
      await select.selectOption('mind');
      await expect(select).toHaveValue('mind');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('adds a none option when allowNone is set', async ({ page }) => {
      const { selector } = await mountProbe(page, 'AttributeSelect', {
         props: {
            value: 'none',
            allowNone: true,
         },
      });
      const optionValues = await page.locator(`${selector} select option`).evaluateAll(
         (opts) => opts.map((o) => o.value),
      );
      expect(optionValues).toContain('none');
   });
});
```

- [ ] **Step 3: Per-component coverage.** For each select: add wrapper `testId`, register, append a describe
  asserting (a) the rendered option set matches its documented preset source, (b) `onchange` fires +
  `bind:value` updates on change, (c) `disabled` blocks. Use `AttributeSelect` as the template; substitute the
  per-select option source identified in Step 1.

- [ ] **Step 4: Rebuild and run.**

Run: `npm run build:e2e` then `npx playwright test component-probe-selects --reporter=list`
Expected: PASS. A wrong/empty option set is a real bug → TDD fix.

- [ ] **Step 5: Commit.**

```bash
git add tests/e2e/component-probe-selects.spec.js src/test-probe/componentRegistry.js "src/helpers/svelte-components/input/select"
git commit -m "test(component-probe): selects family (16)"
```

---

## Task 7: Buttons family (13)

**Files:**
- Modify: `src/test-probe/componentRegistry.js`
- Modify: `src/helpers/svelte-components/button/{AttributeButton,ExpandButton,IconButton,IconLabelButton,ImageButton,ItemCheckButton,MiniButton,MiniIconButton,ResistanceButton,ResistanceCheckButton,SpendResolveButton,ToggleButton,ToggleOptionButton}.svelte`
- Test: `tests/e2e/component-probe-buttons.spec.js` (create)

- [ ] **Step 1: Read each button's typedef.** All wrap `Button` (which has `testId`) and forward
  `onclick`/`disabled`. `ToggleButton`/`ToggleOptionButton` render a `CHECKED_ICON`/`UNCHECKED_ICON` driven by
  the `active` **prop** (parent owns the state — the icon reflects the prop, it does NOT self-flip on click).
  `ExpandButton` similarly reflects an `expanded`/`active` prop. `ItemCheckButton`/`ResistanceButton`/
  `ResistanceCheckButton` take plain scalar props (`label`, `attribute`, `resolveCost`), not Documents. Add
  `testId` to each wrapper's own root `<div>`.

- [ ] **Step 2: Write the reference probes (failing).** Create `tests/e2e/component-probe-buttons.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';

test.describe('component probe — IconButton', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick and disabled suppresses it', async ({ page }) => {
      const live = await mountProbe(page, 'IconButton', {
         props: {
            icon: 'fas fa-gear',
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
            disabled: true,
         },
         events: ['onclick'],
      });
      await page.locator(`${dead.selector} button`).click({ force: true });
      events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });
});

test.describe('component probe — ToggleButton', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('icon reflects the active prop and click fires onclick', async ({ page }) => {
      const off = await mountProbe(page, 'ToggleButton', {
         props: {
            label: 'Ready',
            active: false,
         },
         events: ['onclick'],
      });
      // active=false shows the unchecked glyph (fa-square / UNCHECKED_ICON), not the check.
      await expect(page.locator(`${off.selector} i.fa-check`)).toHaveCount(0);
      await page.locator(`${off.selector} button`).click();
      expect((await readProbeEvents(page)).filter((e) => e.event === 'onclick')).toHaveLength(1);

      const on = await mountProbe(page, 'ToggleButton', {
         props: {
            label: 'Ready',
            active: true,
         },
      });
      await expect(page.locator(`${on.selector} i.fa-check`)).toHaveCount(1);
   });
});
```

  (Confirm the exact `CHECKED_ICON`/`UNCHECKED_ICON` class strings from `~/system/Icons.js` and adjust the
  `i.fa-check` selector if the check glyph differs.)

- [ ] **Step 3: Per-component coverage.** For each button: add wrapper `testId`, register, append a describe
  asserting onclick fires / disabled suppresses / label + icon render. Prop-driven toggles assert
  icon-reflects-`active` across two mounts (off/on). `ItemCheckButton` asserts `label` + `resolveCost` render.

- [ ] **Step 4: Rebuild and run.**

Run: `npm run build:e2e` then `npx playwright test component-probe-buttons --reporter=list`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add tests/e2e/component-probe-buttons.spec.js src/test-probe/componentRegistry.js "src/helpers/svelte-components/button"
git commit -m "test(component-probe): buttons family (13)"
```

---

## Task 8: Display/layout family (7)

**Files:**
- Modify: `src/test-probe/componentRegistry.js`
- Modify: `src/helpers/svelte-components/{Meter,Text,Tabs,ScrollingContainer,LabeledElement,BorderedColumnList}.svelte`,
  `src/helpers/svelte-components/tag/TagContainer.svelte`
- Test: `tests/e2e/component-probe-display.spec.js` (create)

- [ ] **Step 1: Read each component's typedef.** `Meter` animates the inner `span` width toward
  `(value/max - min) * 100`% via `setInterval` — POLL the width, never snapshot. `Tabs` lazy-mounts only the
  active tab (`{#if tab.id === activeTab}`) — assert only the active tab's content is present. `TagContainer`
  takes `tags: [{ id, component, props }]` — component constructors come from the harness `probeComponent()`
  marker (resolved in-page). `Text` renders `processTextData` output. `LabeledElement`/`BorderedColumnList`/
  `ScrollingContainer` are layout wrappers around `{children}`.

- [ ] **Step 2: Write the reference probes (failing).** Create `tests/e2e/component-probe-display.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, unmountAll, clearProbeEvents, probeComponent } from './componentProbe.js';

test.describe('component probe — Meter', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('animates the bar width to value/max percent', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Meter', {
         props: {
            value: 3,
            max: 4,
            min: 0,
            testId: 'probe-meter',
         },
      });
      // Poll the inner span width until the animation settles near 75%.
      await expect.poll(async () => {
         return page.locator(`${selector} .meter span`).evaluate((el) => {
            return Math.round(parseFloat(el.style.width));
         });
      }, { timeout: 5000 }).toBe(75);
   });
});

test.describe('component probe — TagContainer', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders one tag wrapper per supplied tag', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TagContainer', {
         props: {
            tags: [
               { id: 'a', component: probeComponent('LabelTag'), props: { label: 'One' } },
               { id: 'b', component: probeComponent('LabelTag'), props: { label: 'Two' } },
            ],
         },
      });
      await expect(page.locator(`${selector} .tag-container > .tag`)).toHaveCount(2);
      await expect(page.locator(`${selector} .tag-container`)).toContainText('One');
      await expect(page.locator(`${selector} .tag-container`)).toContainText('Two');
   });
});
```

- [ ] **Step 3: Per-component coverage.** Add `testId` where a root element can take it (`Meter` `.meter`,
  layout wrappers' root). Register all 7. Append describes: `Text` asserts rendered text; `Tabs` asserts only
  the active tab content renders (mount with 2 tabs, assert the inactive tab's content is absent);
  `LabeledElement`/`BorderedColumnList`/`ScrollingContainer` assert their `{children}` render inside the
  documented wrapper structure.

- [ ] **Step 4: Rebuild and run.**

Run: `npm run build:e2e` then `npx playwright test component-probe-display --reporter=list`
Expected: PASS. A wrong `Meter` width or eager `Tabs` mount is a real bug → TDD fix.

- [ ] **Step 5: Commit.**

```bash
git add tests/e2e/component-probe-display.spec.js src/test-probe/componentRegistry.js "src/helpers/svelte-components/Meter.svelte" "src/helpers/svelte-components/Text.svelte" "src/helpers/svelte-components/Tabs.svelte" "src/helpers/svelte-components/ScrollingContainer.svelte" "src/helpers/svelte-components/LabeledElement.svelte" "src/helpers/svelte-components/BorderedColumnList.svelte" "src/helpers/svelte-components/tag/TagContainer.svelte"
git commit -m "test(component-probe): display/layout family (7)"
```

---

## Task 9: Full verification, status doc, and skill update

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: `.claude/skills/titan-codebase/` (conventions/component-probe section)

- [ ] **Step 1: Confirm the registry is complete.** Verify `src/test-probe/componentRegistry.js` has all 84
  components (7 core + 77 added). Cross-check against the glob from Task 1 Step 1; there must be no component
  in `src/helpers/svelte-components/**` missing from the registry.

- [ ] **Step 2: Run the full unit + e2e suites.**

Run: `npx vitest run`
Expected: 35 passing (unchanged — no logic-layer change).
Run: `npm run build:e2e` then `npx playwright test --reporter=list`
Expected: the prior 75 + all new family tests, all green. Record the new total.

- [ ] **Step 3: Verify production tree-shake once more.**

Run: `npm run build` then `Select-String -Path index.js -Pattern '_probe|componentRegistry|__probeComponent' -SimpleMatch`
Expected: no matches. Re-run `npm run build:e2e` to restore the probe-bearing bundle.

- [ ] **Step 4: Update the status doc.** In `docs/superpowers/e2e-suite-status.md`: mark Phase 3b-remaining
  DONE, update the suite passing count, and move the "Next action" pointer to Phase 3c / 3d.

- [ ] **Step 5: Update the `titan-codebase` skill.** Reflect the full component-probe coverage and the harness
  additions (`context` forwarding, `documentContext`, `probeComponent` marker resolution) as CURRENT state
  (not a changelog), per the project CLAUDE.md state-management rule.

- [ ] **Step 6: Commit.**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase
git commit -m "docs(e2e): Phase 3b-remaining complete — full component-probe coverage; update status + skill"
```

---

## Self-Review notes

- **Spec coverage:** all 77 components are assigned to a family task (Tasks 2–8); harness extension (spec §
  "Harness extension") is Task 1; testId parity is a step in every family task; per-family probe contract maps
  to each task's Step 3; docs/skill update is Task 9. The `TagContainer` component-marker affordance is an
  addition discovered in planning (not in the spec) — it is the minimal way to honor "completeness" for a
  component that takes constructor props; flagged here and folded into Task 1 + Task 8.
- **Type/name consistency:** `mountProbe` option is `context` (object) → converted to a `Map` in-page;
  `documentContext()` returns `{ document: { data: { isOwner } } }`; `probeComponent(name)` returns
  `{ __probeComponent: name }`, resolved by `resolveProbeComponents` in `registerProbe.js`. These names are
  used consistently across Tasks 1, 2, and 8.
- **Order rationale:** harness first (Task 1, unblocks context); then the riskiest family (context, Task 2)
  while the harness change is fresh; then the mechanical render families; selects and buttons reuse the done
  `Select`/`Button` templates; display last (needs the component-marker affordance + `Meter` polling).
