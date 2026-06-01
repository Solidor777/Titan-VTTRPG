# Spec B — Conditions as `condition`-subtype Active Effects

- **Date:** 2026-06-01
- **Status:** Design approved; ready for implementation plan.
- **Author:** brainstorming session (TITAN backlog item #1, second of two specs).
- **Depends on:** Spec A — Rules-Element Sum Operations
  (`docs/superpowers/specs/2026-06-01-rules-element-sum-operations-design.md`, shipped).

## Background

Backlog item #1 ("Convert Conditions to rules elements", `docs/TODO.md`) retires the
hardcoded `CharacterDataModel._applyConditions` switch and expresses every condition's
mechanical effect as `rulesElement[]` entries, unifying the mechanical engine so
conditions and effects derive their stats through the same pipeline.

Spec A added the operations conditions need (`mulSum`, `setSum`, the `'all'` key
selector, `up`/`down` rounding). Spec B (this document) converts the conditions
themselves and retires `_applyConditions`.

## Current state

- Conditions are registered as `CONFIG.statusEffects` entries in `src/system/Conditions.js`,
  each carrying `flags.titan.type = 'condition'`, `flags.titan.description`, and a
  `visual-active-effects` content flag. Toggling a status (token HUD) creates a **base**
  `ActiveEffect` (no system subtype, no `rulesElement`).
- `CharacterDataModel._applyConditions` hardcodes each condition's stat math in a
  `switch (condition.name)` and runs after `_applyRulesElements` (so it can read the
  accumulated total for halving operations).
- `getConditions()` returns `this.parent.effects.filter(e => e.flags.titan?.type === 'condition')`
  and feeds both `_applyConditions` and a conditions **report list** in the chat-report
  builder (uses each condition's `name`, `img`, and `flags.titan.description`).

## Feasibility (resolved)

Foundry v14 `ActiveEffect.fromStatusEffect` (`client/documents/active-effect.mjs:127`)
spreads the entire `CONFIG.statusEffects` entry (minus `id`/`hud`) into the constructed
effect data and calls `new this(effectData, options)`. Therefore adding `type: 'condition'`
and `system: { rulesElement: [...] }` directly to a status entry causes the toggled AE to
be constructed as that subtype with those rules elements — **no `preCreate` hook
required**. The `effect` subtype is already registered the same way it will be for
`condition`: `system.json` `documentTypes.ActiveEffect` + `CONFIG.ActiveEffect.dataModels`
(`src/hooks/OnceInit.js:82`).

## Architecture

### 1. The `condition` Active Effect subtype

- **Manifest:** add `"condition": {}` to `documentTypes.ActiveEffect` in `system.json`
  (alongside the existing `"effect": {}`).
- **Data model:** new `src/document/types/active-effect/ConditionDataModel.js` —
  `ConditionDataModel extends RulesElementMixin(TitanDataModel)`. The mixin supplies the
  `rulesElement` array; the model additionally defines the Foundry-required `changes`
  field (Foundry v14's `Game##verifyActiveEffectModels` requires every AE type data model
  to define `changes` as an `ArrayField` of a `SchemaField` with `key`/`value`/`mode`/
  `priority`/`type`/`phase` — mirror the shape already used in `TitanActiveEffectDataModel`).
  It does **not** define `duration`, `check`, or `customTrait` — conditions have no use for
  them (YAGNI).
- **Registration:** `CONFIG.ActiveEffect.dataModels.condition = ConditionDataModel`
  (`OnceInit.js`).

### 2. Condition seeds (`src/system/Conditions.js`)

Every condition entry gains `type: 'condition'`. The six mechanically-active conditions
also gain `system: { rulesElement: [...] }` (stable string `uuid`s per element). The
existing `flags.titan` (`type`/`description`) and `visual-active-effects` content flag are
retained (the report list and VAE module still read them). Mechanically-inert conditions
become the `condition` subtype with **no** `rulesElement`, so they still appear in the
conditions report but contribute nothing to derived stats.

Rules-element mapping (rulebook-accurate per the `*.desc.text` localization strings):

| Condition | Rules elements |
| --------- | -------------- |
| blinded | `flatModifier` rating −1 to melee, accuracy, defense (3 elements) |
| contaminated | `flatModifier` attribute `all` −1; `flatModifier` resistance `all` −1 |
| stunned | `flatModifier` rating defense −1 |
| prone | `mulSum` speed `all` 0.5 `up`; `flatModifier` rating melee −1, accuracy −1 |
| restrained | `flatModifier` rating melee −1, accuracy −1, defense −1; `setSum` speed `all` `set` 0 |
| sleeping | `mulSum` rating awareness 0.5 `up` |
| dead, deafened, frightened, incapacitated, unconscious | `type: 'condition'`, no `rulesElement` |

Notes on the two corrections relative to the old `_applyConditions`:

- **prone** gains the −1 melee/accuracy the old code omitted (it only halved speed).
- **sleeping** now fires at all (the old `switch` matched `'sleep'` but the status id is
  `'sleeping'`) and halves awareness without the old double-count bug.

"Reduced by half, rounded up" maps to `mulSum value 0.5 rounding 'up'`, whose result is
`ceil(total / 2)`.

### 3. Engine (`CharacterDataModel`)

- **`_applyRulesElements`:** in addition to owned items and `effect`-subtype AEs, gather
  rules elements from condition AEs — `this.parent.effects` where `effect.type === 'condition'`,
  not `disabled`, and `rulesElement.length > 0` — via `processElements(effect.system.rulesElement, 'condition')`.
  They flow through the existing `'all'` expansion, additive appliers, and the Spec A
  post-additive (`mulSum`/`setSum`) sub-phase exactly like effect rules elements.
- **`_resetDynamicMods`:** add a `condition` bucket (`mods.condition = 0`) so
  `condition`-tagged deltas land in their own bucket and are summed by `_applyMods`
  (which sums all `Object.values(stat.mod)`).
- **`getConditions()`:** filter `effect.type === 'condition'` (returns all condition
  subtypes — including inert — keeping the report list intact).
- **Delete `_applyConditions`** and its call site in `prepareDerivedData`.

### 4. Sheet registration

Gate the existing `TitanActiveEffectSheet` registration to `types: ['effect']`
(`OnceInit.js:160`), so opening a `condition` AE uses Foundry's default
`ActiveEffectConfig` rather than the effect sheet (which assumes `duration`/`check`/
`customTrait`). This also fixes a pre-existing latent gap (the sheet was registered for
all ActiveEffects despite its "for the 'effect' subtype" comment).

## Data flow

1. User toggles a status (token HUD) → `actor.toggleStatusEffect(id)` →
   `ActiveEffect.fromStatusEffect(id)` → constructs a `condition`-subtype AE with the
   seeded `system.rulesElement` → added to `actor.effects`.
2. `prepareDerivedData` → `_applyRulesElements` gathers item + `effect` + `condition`
   rules elements → `_expandAllKeyElements` → additive appliers → post-additive sum
   sub-phase → derived stats reflect the condition's mechanics.
3. `_applyConditions` no longer exists; condition math is fully data-driven.

## Testing

### E2E (logic) — `tests/e2e/logic/` (new spec file or extend `rules-elements.spec.js`)

For each mechanically-active condition, apply it via `actor.toggleStatusEffect(id)` and
assert derived stats **relative to a captured baseline** (robust to whatever the actor's
base values are):

- blinded → `rating.melee/accuracy/defense.value` each baseline − 1.
- contaminated → every `attribute.*.value` and `resistance.*.value` baseline − 1.
- stunned → `rating.defense.value` baseline − 1.
- prone → every `speed.*.value` equals `ceil(baselineSpeed / 2)`; `rating.melee/accuracy.value` baseline − 1.
- restrained → every `speed.*.value` is 0; `rating.melee/accuracy/defense.value` baseline − 1.
- sleeping → `rating.awareness.value` equals `ceil(baselineAwareness / 2)`.
- An inert condition (e.g. dead) → no derived-stat change.

Use a player actor with attributes/ratings/speeds high enough that the deltas are
observable (boost via a flatModifier ability fixture if a base value is 0/1). Capture
baseline (no condition), toggle the condition, re-read, assert, then toggle off / delete
the actor in cleanup.

### Unit — `tests/unit/`

A seed-mapping test that imports the condition list builder from `Conditions.js` (or a
small exported helper) and asserts each mechanically-active condition id produces the
expected `rulesElement` array (operations, selectors, keys, values, rounding/mode), and
that inert conditions produce none. This guards the seed table against regressions
without needing the Foundry runtime.

> If `setupConditions()` only pushes into `CONFIG.statusEffects` (not unit-testable in
> isolation), extract the condition definition list into a pure exported function
> (e.g. `buildConditionDefinitions()`) that `setupConditions` consumes, and unit-test that.

### Regression

- Grep-confirm no lingering `_applyConditions` references after deletion.
- Full e2e + unit suites green.

## Non-goals

- **No migration.** Conditions are ephemeral; legacy base-type condition AEs already
  applied in a world contribute nothing under the new engine until re-toggled (at which
  point they are recreated as the `condition` subtype). Documented as a re-apply note.
- Auto-fail-Reflexes (restrained/incapacitated) and sight/hearing auto-fail
  (blinded/deafened) are check-time/narrative rules, not stat modifiers — out of scope.
- The other deferred condition-adjacent backlog items (custom sidebar effect directory,
  native visual-active-effects panel) are separate efforts.

## File-touch summary

- `system.json` — add `condition` to `documentTypes.ActiveEffect`.
- `src/document/types/active-effect/ConditionDataModel.js` — new.
- `src/hooks/OnceInit.js` — register `condition` data model; gate AE sheet to `types: ['effect']`.
- `src/system/Conditions.js` — add `type` + seed `rulesElement` (possibly extract a pure
  `buildConditionDefinitions()` for unit testing).
- `src/document/types/actor/types/character/CharacterDataModel.js` — gather condition
  rules elements in `_applyRulesElements`; add `condition` bucket in `_resetDynamicMods`;
  switch `getConditions()` filter; delete `_applyConditions` + call site.
- `tests/unit/` + `tests/e2e/logic/` — seed-mapping unit test; per-condition e2e.
