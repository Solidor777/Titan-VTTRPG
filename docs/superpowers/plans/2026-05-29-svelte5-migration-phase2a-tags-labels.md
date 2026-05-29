# Svelte 5 Migration — Phase 2a: Tags & Labels Runes Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. **Every implementer/reviewer subagent MUST first invoke the `foundry-vtt`, `foundry-svelte`, and `svelte-5` skills** (the pure-Svelte-5 + ApplicationV2 stack — NOT `foundry-svelte-typhonjs` or `svelte-4`). Steps use checkbox (`- [ ]`) syntax.

**⚠️ Execution gate:** Do NOT start this plan until **Phase 1's live v14 behavioral smoke test has passed** (sheets render, edits persist, checks roll, prosemirror saves). Phase 1 deliberately left leaf components in legacy mode behind the bridge's store shim specifically so the conventions could be validated before this mass conversion. If the smoke test surfaces convention changes, revise this plan first.

**Goal:** Convert the 29 pure-display **tag** and **label** shared primitives from Svelte 4 legacy syntax to Svelte 5 runes, with no behavior change.

**Architecture:** These components are leaf, display-only (props in; no events out; no `createEventDispatcher`; no `bind:`). They are consumed by still-legacy parents — which is safe: a Svelte 5 runes child interoperates with a legacy parent for plain props and default-slot content. The conversion is mechanical: `export let` → `$props()`, `<slot/>` → a `children` snippet rendered with `{@render}`, and any once-computed reactive value → `$derived`.

**Tech Stack:** Foundry v14, Svelte 5 runes, Vite 5, SCSS.

**Working tree:** `C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan` on `feature/svelte5-migration`.

**Spec:** `docs/superpowers/specs/2026-05-29-svelte5-migration-design.md` (§6 transform catalog, §9 staging).

---

## Verification model

No unit-test runner. Per task: `npm run build` must stay GREEN (warnings OK, errors not) and `npm run eslint` must report **no new errors** in the converted files. After the batch, a brief live v14 check that tag/label-heavy sheets still render correctly. Launch: `cd C:\FoundryVTT\V14\dev` then `node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata`.

---

## Conversion recipe (apply to every file in this plan)

1. **Props:** replace every `export let x = <default>;` with a single destructured `$props()` call:
   ```js
   let { a, b = false, c = void 0 } = $props();
   ```
   Preserve each prop's existing default. Keep the JSDoc — move each `/** @type ... */` onto the destructured prop via a single typedef block above the `$props()` line (project style: strict typing, 120-char wrap).
2. **Default slot:** replace `<slot/>` with `{@render children?.()}` and add `children` to `$props()`:
   ```js
   let { tooltip = void 0, children } = $props();
   ```
   ```svelte
   {@render children?.()}
   ```
   (Named slots: none exist in this batch.)
3. **Once-computed values that depend on props** (e.g. an `if/else` building a class string at init): convert to `$derived` / `$derived.by` so they react to prop changes and avoid the `state_referenced_locally` compiler error.
4. **`$:` reactive blocks:** none in this batch per survey; if you find one, convert to `$derived`/`$effect`.
5. **`$document` reads:** none expected in this batch (these are prop-fed). If any file reads `$document`, convert that read to the bridge runes form `getContext('document').data.<path>` inside a `$derived` — and report it (it means the survey missed an event/state path).
6. **Do NOT** change SCSS, markup structure, child-component usage, imports of other components, or behavior. Self-closing child tags and existing class names stay as-is.
7. **Interop:** do NOT touch consumer/parent components — legacy parents pass props and default-slot content to these runes children unchanged.

---

## Worked examples (the four patterns in this batch)

### Pattern A — trivial single prop (`tag/effects/PermanentEffectTag.svelte`)
Before:
```svelte
<script>
   import { PERMANENT_ICON } from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type {PermanentEffectData} Data for this tag's Effect. */
   export let effect = void 0;
</script>

<div class="tag">
   <EffectTag {effect} icon={PERMANENT_ICON}/>
</div>
```
After (script only; markup + `<style>` unchanged):
```svelte
<script>
   import { PERMANENT_ICON } from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type {{ effect: PermanentEffectData }} Data for this tag's Effect. */
   let { effect = void 0 } = $props();
</script>
```

### Pattern B — default slot (`tag/Tag.svelte`)
Before:
```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>
<div class="tag" use:tooltipAction={tooltip}>
   <slot/>
</div>
```
After:
```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @type {{
    *   tooltip?: (string | TooltipAction),
    *   children?: import('svelte').Snippet
    * }}
    */
   let { tooltip = void 0, children } = $props();
</script>
<div class="tag" use:tooltipAction={tooltip}>
   {@render children?.()}
</div>
```
(Consumers like `<Tag {tooltip}>{label}</Tag>` keep working — the content becomes the `children` snippet automatically, including from legacy parents.)

### Pattern C — slot-content passer (`tag/TraitTag.svelte`)
Only the props change; `<Tag {tooltip}>{label}</Tag>` is unchanged (it passes `label` as Tag's `children`):
```svelte
<script>
   import StatTag from './StatTag.svelte';
   import Tag from './Tag.svelte';

   /**
    * @type {{
    *   label?: string,
    *   value?: number,
    *   tooltip?: string
    * }}
    */
   let { label = void 0, value = void 0, tooltip = void 0 } = $props();
</script>

{#if typeof value === 'number'}
   <StatTag {label} {value} {tooltip} />
{:else}
   <Tag {tooltip}>{label}</Tag>
{/if}
```

### Pattern D — once-computed value → `$derived` (`label/ModifiedValueLabel.svelte`)
Before (the `if/else` building `styleClass` at init):
```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   export let baseValue = void 0;
   export let currentValue = void 0;
   export let tooltip = void 0;
   let styleClass = 'label';
   if (baseValue < currentValue) { styleClass += ' bonus'; }
   else if (baseValue > currentValue) { styleClass += ' penalty'; }
</script>
<div class={styleClass} use:tooltipAction={tooltip}>{currentValue}</div>
```
After (script only; markup + `<style>` unchanged):
```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @type {{
    *   baseValue?: number,
    *   currentValue?: number,
    *   tooltip?: (string | TooltipAction)
    * }}
    */
   let { baseValue = void 0, currentValue = void 0, tooltip = void 0 } = $props();

   // Style class reflects whether the stat is buffed or debuffed; derived so it tracks prop changes.
   let styleClass = $derived.by(() => {
      if (baseValue < currentValue) { return 'label bonus'; }
      if (baseValue > currentValue) { return 'label penalty'; }
      return 'label';
   });
</script>
```

---

### Task 1: Effect tags (7 trivial files)

**Files (Pattern A — each has a single `export let`):**
- `src/helpers/svelte-components/tag/effects/CustomEffectTag.svelte`
- `src/helpers/svelte-components/tag/effects/EffectTag.svelte` (2 props)
- `src/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte`
- `src/helpers/svelte-components/tag/effects/InitiativeEffectTag.svelte`
- `src/helpers/svelte-components/tag/effects/PermanentEffectTag.svelte`
- `src/helpers/svelte-components/tag/effects/TurnEndEffectTag.svelte`
- `src/helpers/svelte-components/tag/effects/TurnStartEffectTag.svelte`

- [ ] **Step 1:** Apply recipe rules 1 (and 2 if any has `<slot>` — none expected) to each file. Read each before editing; preserve each prop name + default + JSDoc.
- [ ] **Step 2:** `npm run build` → green.
- [ ] **Step 3:** `npm run eslint` → no new errors in these 7 files.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "refactor(svelte5): convert effect tags to runes"`

### Task 2: Display tags without slots (~13 files)

**Files (Pattern A):**
`tag/AttributeCheckTag.svelte`, `tag/DurationTag.svelte`, `tag/IconStatTag.svelte`, `tag/IconTag.svelte`, `tag/LabelTag.svelte`, `tag/OpposedCheckTag.svelte`, `tag/RarityTag.svelte`, `tag/ResistedByTag.svelte`, `tag/SpellAspectTag.svelte`, `tag/SpellAspectTags.svelte`, `tag/SpellCustomAspectTag.svelte`, `tag/StatTag.svelte`, `tag/ValueTag.svelte` (all under `src/helpers/svelte-components/`).

- [ ] **Step 1:** Apply recipe rule 1 to each. Verify none contains `on:`/`createEventDispatcher`/`bind:`/`<slot>` (per survey they don't); if any does, STOP and report — it belongs in a later batch.
- [ ] **Step 2:** `npm run build` → green.
- [ ] **Step 3:** `npm run eslint` → no new errors in these files.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "refactor(svelte5): convert display tags to runes"`

### Task 3: Tags with default slots + their content-passers (4 files)

**Files:**
- `tag/Tag.svelte` (Pattern B — `<slot/>` → `children`)
- `tag/AttributeTag.svelte` (Pattern B — has a slot)
- `tag/ResistanceTag.svelte` (Pattern B — has a slot)
- `tag/TraitTag.svelte` (Pattern C — props only; passes content into `Tag`)

- [ ] **Step 1:** Convert `Tag.svelte`, `AttributeTag.svelte`, `ResistanceTag.svelte` per Pattern B (props → `$props()`, add `children`, `<slot/>` → `{@render children?.()}`). Read each first to confirm it uses only a default slot.
- [ ] **Step 2:** Convert `TraitTag.svelte` per Pattern C (props only; leave `<Tag {tooltip}>{label}</Tag>` markup unchanged).
- [ ] **Step 3:** `npm run build` → green.
- [ ] **Step 4:** `npm run eslint` → no new errors.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "refactor(svelte5): convert slotted tags to children snippets"`

### Task 4: Labels (5 files)

**Files (`src/helpers/svelte-components/label/`):**
- `IconLabel.svelte` (Pattern A)
- `Label.svelte` (Pattern B — has a slot)
- `ModifiableStatValueLabel.svelte` (Pattern A — 8 props; check for any once-computed value → Pattern D)
- `ModifiedValueLabel.svelte` (Pattern D — `if/else` → `$derived.by`)
- `TextLabel.svelte` (Pattern A — passes content into `Label`)

- [ ] **Step 1:** Convert each per the indicated pattern. For `Label.svelte`, add `children` + `{@render children?.()}`. For `ModifiableStatValueLabel.svelte`, read it fully — if it computes a class/value from props at init, convert that to `$derived` (Pattern D); otherwise plain Pattern A.
- [ ] **Step 2:** `npm run build` → green.
- [ ] **Step 3:** `npm run eslint` → no new errors.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "refactor(svelte5): convert labels to runes"`

### Task 5: Batch verification

- [ ] **Step 1:** Confirm zero new ESLint errors across all files touched in Tasks 1–4: `npm run eslint` (note pre-existing legacy-component counts only).
- [ ] **Step 2:** `npm run build` → green; warnings should DECREASE versus Phase 1 (fewer legacy-mode components).
- [ ] **Step 3 (behavioral, live v14):** open a player sheet (trait/resistance/effect tags, modified-value labels) and an item sheet with rarity/aspect tags. Confirm tags and labels render identically to before (text, tooltips, bonus/penalty colors). No console errors.
- [ ] **Step 4:** Final commit if any fixups: `git add -A && git commit -m "test(svelte5): tags & labels runes batch verified"`

---

## Out of scope (later Phase 2 plans)
- **Interactive tags:** `tag/EditDeleteTag.svelte` (events), `tag/TagContainer.svelte` (`on:` + `<svelte:component>`).
- **Buttons** (event forwarding → callback props; requires coordinated consumer updates).
- **Inputs / selects** (`bind:value`, `createEventDispatcher` → callbacks, value persistence).
- **Layout primitives** (`Tabs`, `FilteredList`, `BorderedColumnList`, `ScrollingContainer`, `LabeledElement`, `Meter`, `RichText`, `Text`) — slots + `<svelte:component>`.
- **Sheet/dialog/chat component trees** and the final `$document` → `doc.data` read migration + shim removal.

Each gets its own plan, sequenced after this batch validates the leaf-conversion conventions.
