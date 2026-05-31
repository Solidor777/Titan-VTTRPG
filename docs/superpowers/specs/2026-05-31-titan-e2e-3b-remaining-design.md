# TITAN E2E — Phase 3b-remaining: full component-probe coverage (design)

**Date:** 2026-05-31. **Branch:** `development`. **Status:** design, awaiting plan.
**Predecessor:** the component-probe harness + 7-component core set (Phase 3b first pass) is DONE — see
`docs/superpowers/e2e-suite-status.md` and `2026-05-31-titan-e2e-component-probe-design.md`. This spec
extends that harness over the remaining 77 primitives in `src/helpers/svelte-components/**`.

## Goal

**Completeness.** Probe every primitive in `src/helpers/svelte-components/**` — all 84 components (7 already
done, 77 remaining) — for a full behavioral regression surface, render-only tags/labels included. Each probe
asserts the component's actual behavior in isolation; any discrepancy a probe surfaces is treated as a real
bug and fixed TDD red→green (same protocol as the core set, which found no engine bugs but exercised the
event/clamp/commit paths).

**In scope:** isolated component probes via the existing gated harness; `data-testid` parity on every
component; per-family spec files; harness extension to forward a Svelte `context` Map.

**Out of scope (YAGNI):** reactivity probes (Phase 3d), live Foundry Document fabrication, sheet-level
integration (Phase 3c), and any component outside `src/helpers/svelte-components/**`.

## Authoritative inventory (84 total; 77 remaining)

Counted from `src/helpers/svelte-components/**/*.svelte` on 2026-05-31. **Done (7):** `Button`, `TextInput`,
`NumberInput`, `IntegerInput`, `CheckboxInput`, `Select`, `LabelTag`.

- **top-level (8):** `BorderedColumnList`, `FiltereedList`¹, `LabeledElement`, `Meter`, `ScrollingContainer`,
  `Tabs`, `Text`, `RichText`¹.
- **button/ (14 remaining):** `AttributeButton`, `CondensedCheckButton`¹, `ExpandButton`, `IconButton`,
  `IconLabelButton`, `ImageButton`, `ItemCheckButton`, `MiniButton`, `MiniIconButton`, `ResistanceButton`,
  `ResistanceCheckButton`, `SpendResolveButton`, `ToggleButton`, `ToggleOptionButton`.
- **input/ non-select (8 remaining):** `AttributeInput`, `RarityInput`, `ResistanceInput`, `ImagePicker`,
  `IntegerIncrementInput`, `LabeledTextInput`, `TextAreaInput`, `TopFilter`. *(input/ total 12; the core set's
  done inputs are `TextInput`/`NumberInput`/`IntegerInput`/`CheckboxInput`.)*
- **input/select/ (16 remaining):** `ArmorTraitSelect`, `AttackTraitSelect`, `AttackTypeSelect`,
  `AttributeSelect`, `CheckDifficultySelect`, `DamageReducedBySelect`, `InventoryItemTypeSelect`, `ModSelect`,
  `RaritySelect`, `RatingSelect`, `ResistanceSelect`, `ResourceSelect`, `RulesElementOperationSelect`,
  `ShieldTraitSelect`, `SkillSelect`, `SpeedSelect`.
- **label/ (5):** `IconLabel`, `Label`, `ModifiableStatValueLabel`, `ModifiedValueLabel`, `TextLabel`.
- **tag/ non-effect (18 remaining):** `AttributeCheckTag`, `AttributeTag`, `DurationTag`, `IconStatTag`,
  `IconTag`, `OpposedCheckTag`, `RarityTag`, `ResistanceTag`, `ResistedByTag`, `SpellAspectTag`,
  `SpellAspectTags`, `SpellCustomAspectTag`, `StatTag`, `Tag`, `TagContainer`, `TraitTag`, `ValueTag`,
  `EditDeleteTag`.
- **tag/effects/ (7):** `CustomEffectTag`, `EffectTag`, `ExpiredEffectTag`, `InitiativeEffectTag`,
  `PermanentEffectTag`, `TurnEndEffectTag`, `TurnStartEffectTag`.
- **editor/ (1):** `ProseMirrorEditor`.

¹ Uses `getContext('document')` — needs the context stub (see Harness extension).

**The plan's first task re-verifies this inventory against the registry**, so the live count — not this list
— is authoritative if a component is added/removed before implementation.

## Architecture

### Test-file organization (one file per family)

The core set's `tests/e2e/component-probe.spec.js` (14 tests) stays as the core/leaf reference. New per-family
spec files share the existing page object (`tests/e2e/componentProbe.js`) and registry:

- `component-probe-tags.spec.js` — tag/ non-effect, **minus `TagContainer`** (17).
- `component-probe-labels.spec.js` — label/ (5).
- `component-probe-inputs.spec.js` — input/ non-select (8).
- `component-probe-selects.spec.js` — input/select/ (16).
- `component-probe-buttons.spec.js` — button/, **minus `CondensedCheckButton`** (13).
- `component-probe-display.spec.js` — `Meter`, `Text`, `Tabs`, `ScrollingContainer`, `LabeledElement`,
  `BorderedColumnList`, `TagContainer` (7).
- `component-probe-context.spec.js` — `RichText`, `FiltereedList`, `CondensedCheckButton`, `ProseMirrorEditor`,
  `tag/effects/**` — the data/context-dependent set (11).

**Cross-cutting moves** (filed by behavior, not directory): `TagContainer` (a layout container) → display;
`CondensedCheckButton` (reads `getContext('document')`) → context; `FiltereedList` + `RichText` (top-level but
context-dependent) → context. Family counts sum to **77** (17+5+8+16+13+7+11).

Each family file is a self-contained subagent task. Rationale: bounds each spec, parallelizes Playwright
sharding, and gives the implementation plan natural one-family-per-task slices.

### Harness extension (only two additive changes; runtime untouched)

The runtime `mount` in `src/test-probe/registerProbe.js` **already accepts** a `context` Map — no runtime
change. The gaps are in the test-side page object:

1. **Forward `context` through `mountProbe`.** Extend the `componentProbe.js` `mountProbe` spec from
   `{ props, events }` to `{ props, events, context }`; inside `page.evaluate`, build
   `new Map(Object.entries(context))` and pass it as the third arg to `probe.mount(name, builtProps, ctxMap)`.
   Context is constructed in-page (same Node↔page boundary rule as props/callbacks).
2. **A context-stub helper** in `componentProbe.js`, e.g. `documentContext({ isOwner = true } = {})` →
   `{ document: { data: { isOwner } } }`, for the three `getContext('document')` consumers. Non-reactive plain
   object — sufficient for render/click probes; reactivity is Phase 3d's concern.

### Per-component recipe (unchanged from the handoff)

Per component: import + entry in `src/test-probe/componentRegistry.js` → add a `data-testid` prop on the
component's root element if missing → append a behavioral `describe` block to its family spec → `npm run
build:e2e` → run. **Build gotcha (load-bearing):** probe specs require the `build:e2e` bundle; a plain
`npm run build` strips the gated probe and breaks every component-probe spec.

### testId parity

Every remaining component gets a typed `data-testid` prop on its root element (house style: typed prop +
single-line comment, routed through `titan-svelte-dev`). Wrappers that delegate (e.g. `AttributeSelect` →
`Select`) get testId on the **wrapper's own root**, independent of the inner primitive's testId. The probe
container selector `[data-titan-probe="<id>"]` already locates each mount; per-component testId is added for
parity and to address internal elements where a probe must distinguish them.

## Per-family probe contract

- **Render-only tags & labels** (`Tag`, `IconTag`, `TextLabel`, `StatTag`, `ValueTag`, `RarityTag`, …): mount
  with props → assert rendered text/value content, `data-testid` present, and tooltip content where a
  `tooltip` prop exists (read the tippy instance `props.content`, per the bug-#7 regression pattern). No
  events.
- **Typed selects (16):** mount with the preset option source → assert the rendered `<option>` set matches the
  preset (e.g. `AttributeSelect` → `ATTRIBUTES`, plus `none` when `allowNone`), `onchange` fires +
  `bind:value` updates on change, `disabled` blocks. The done `Select` probe (mount-clamp `onchange` cleared
  after mount) is the template. Each select's required props/value source are verified per-component.
- **Buttons (14):** `onclick` fires / `disabled` suppresses / label + icon render / testId. Stateful ones
  (`ToggleButton`, `ToggleOptionButton`, `ExpandButton`) additionally assert the glyph/state flips on click.
  `ItemCheckButton`/`ResistanceButton`/`ResistanceCheckButton` take plain scalar props (label/attribute/
  resolveCost/onclick), not check Documents — pure harness probes.
- **Inputs (8):** commit semantics (keyup-forward / clamp / onchange) following the `NumberInput`/
  `IntegerInput` template; increment/decrement for `IntegerIncrementInput`; `ImagePicker`/`TopFilter` verified
  for their actual interaction surface.
- **Display/layout** (`Meter`, `Text`, `Tabs`, `ScrollingContainer`, `LabeledElement`, `BorderedColumnList`,
  `TagContainer`): structural render assertions. **`Meter`:** set `value`/`max`, then `expect.poll` the inner
  `span` width until it settles at `(value/max - min)*100%` (the `setInterval` animation means poll, never
  snapshot). **`Tabs`:** lazy-mounts only the active tab — assert only the active tab's content is present.
- **Context/editor** (`RichText`, `CondensedCheckButton`, `FiltereedList`, `ProseMirrorEditor`,
  `tag/effects/**`): mount with the context stub where needed; assert render (e.g. `RichText` enriches `value`
  into `.rich-text`, owner class toggles with `isOwner`; `EffectTag`-family render their plain data object —
  label/img/remaining). **`ProseMirrorEditor`:** assert the native `<prose-mirror>` element is built into the
  container, then `unmount` → assert teardown (the `onMount` cleanup removes it).

## Risks / watch-items

- **`Meter` animation** — poll, never snapshot width.
- **`FiltereedList` / `CondensedCheckButton`** — may read more from context than `isOwner` (e.g.
  `DocumentOwnerAttributeButton` internals). The implementing subagent verifies each one's actual `getContext`
  reads and extends the stub minimally. Flagged per-component, not pre-solved.
- **Component count drift** — the plan's first task re-inventories against the registry; the live count is
  authoritative.
- **Production tree-shake** — no new runtime surface is added (the page-object change is test-only), so the
  verified "0 probe identifiers in prod `index.js`" property holds.

## Deliverables

- Harness extension: `context` forwarding + `documentContext` helper in `tests/e2e/componentProbe.js`.
- 7 new per-family spec files (above); the core `component-probe.spec.js` stays.
- `src/test-probe/componentRegistry.js` grown to full coverage.
- `data-testid` prop on every remaining component.
- All green: `npx vitest run` (35) and `npm run build:e2e` + `npx playwright test`.
- `docs/superpowers/e2e-suite-status.md` and the `titan-codebase` skill updated to current state.

## Working agreements (carried from the suite handoff)

Route all `.js`/`.svelte` work through `titan-svelte-dev` (loads `svelte-5`/`foundry-vtt`/`foundry-svelte`/
`titan-codebase`); subagent-driven-development, fresh subagent per family task. No git worktree (live Foundry
on :30000 serves this directory). Stay on `development`. Login as `E2E GM 1`. Build output is gitignored.
Leave `packs/effects/**` LevelDB churn uncommitted.
