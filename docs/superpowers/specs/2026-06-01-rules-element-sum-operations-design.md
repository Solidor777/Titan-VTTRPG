# Spec A — Rules-Element Sum Operations (`mulSum`, `setSum`, `all` selector)

- **Date:** 2026-06-01
- **Status:** Design approved; ready for implementation plan.
- **Author:** brainstorming session (TITAN backlog item #1, first of two specs).

## Background

Backlog item #1 ("Convert Conditions to rules elements", `docs/TODO.md`) aims to
retire the hardcoded `CharacterDataModel._applyConditions` logic and express every
condition's mechanical effect as `rulesElement[]` entries, unifying the mechanical
engine so conditions and effects derive their stats the same way.

That effort is split into two specs:

- **Spec A (this document):** add the new rules-element *operations* the conditions
  will need, with sheet UI, factories, localization, and tests. Usable immediately by
  effect Active Effects and rules-bearing items. **No conditions are touched here.**
- **Spec B (next cycle):** convert status effects into proper `TitanActiveEffect`s of a
  `condition` subtype that carry `system.rulesElement`, route them through the shared
  pipeline, and retire `_applyConditions`.

Doing the operations first lets the risky math (the post-additive phase) land and be
proven against the live derived-data pipeline before conditions depend on it. This
matches the TODO's note that "new operations are required first."

## Why new operations are required

Every existing operation contributes an **independent additive delta** into a mod
bucket (`mod.effect`, `mod.equipment`, `mod.ability`), and `_applyMods` sums
`baseValue + Σ buckets` at the very end. That model works for `flatModifier` and
`mulBase` because their contribution does not depend on any other modifier.

Several condition mechanics are different — they depend on the **running total**:

- **prone** halves speed (rounded up); **sleeping** halves awareness (rounded up) —
  a multiply-of-total, not a multiply-of-base (`mulBase` only scales `baseValue`).
- **restrained** sets speed to 0 — a set-of-total.
- **contaminated** applies −1 to *all* attributes and *all* resistances — today this
  needs ~7 hand-authored `flatModifier`s.

`_applyConditions` already implements these by reading the accumulated total and
writing a corrective delta into `mod.effect` (e.g. `mod.effect -= ceil(total / 2)`).
Spec A generalizes that trick into first-class, user-authorable operations.

## Naming

Mirrors the existing `mulBase` convention:

| Operation     | Meaning                                              |
| ------------- | ---------------------------------------------------- |
| `mulBase`     | multiply the base value (exists; **gains rounding**) |
| `flatModifier`| add a flat delta (exists)                            |
| **`mulSum`**  | multiply the running total (sum)                     |
| **`setSum`**  | force the running total to a value                   |

All multiplicative operations (`mulBase`, `mulSum`) accept a fractional `value` and
carry a `rounding` field of `'up' | 'down'` (`ceil` / `floor`). `nearest` is
intentionally omitted — TITAN rounding is always explicit up or down.

## Operation semantics

Both `mulSum` and `setSum` are **grand-total** operations: they read the total across
*all* mod buckets (`T = baseValue + Σ buckets` accumulated so far) and write a single
corrective delta. The element's `type` tag (`ability` / `equipment` / `effect`, and
`condition` in Spec B) only decides **which bucket the delta lands in** for
breakdown/tooltip display — it does not change the computed value.

### `mulSum` — multiply the running total

Fields:

- `selector` — stat family (`attribute`, `rating`, `resistance`, `resource`, `speed`,
  `training`, `expertise`, `mod`).
- `key` — the specific stat, or `'all'` (see below).
- `value` — fractional multiplier (e.g. `0.5` to halve).
- `rounding` — `'up' | 'down'`.

Computation per target stat:

1. `T = baseValue + Σ existing mod buckets`.
2. Guard: if `T <= 0`, no-op (preserves current `_applyConditions` behavior and avoids
   sign weirdness on already-zero/negative totals).
3. `newTotal = round(T * value, rounding)` where `round` is `ceil` / `floor` for
   `up` / `down`.
4. Write `delta = newTotal - T` into the source's `mod[type]` bucket.

Worked example — "halve, round up" on a speed total of 5: `value 0.5, rounding 'up'`
→ `newTotal = ceil(2.5) = 3`, `delta = -2`. Final speed = 3.

> Rounding operates on the **scaled result** (`T * value`), not on the reduction. This
> makes "halve rounded up" unambiguous: the resulting total is `ceil(T/2)`. The choice
> of which rounding mode prone/sleeping use is a Spec B authoring decision, not a
> Spec A behavior.

### `setSum` — force the running total

Fields:

- `selector`, `key` (`'all'` ok) — as above.
- `value` — the target total.
- `mode` — `'set' | 'min' | 'max'`.

Computation per target stat:

1. `T = baseValue + Σ existing mod buckets`.
2. `newTotal` =
   - `'set'`: `value`
   - `'min'` (floor): `Math.max(T, value)`
   - `'max'` (cap): `Math.min(T, value)`
3. Write `delta = newTotal - T` into the source's `mod[type]` bucket.

Restrained's "speed → 0" = `mode 'set', value 0`. `min`/`max` cover future floor/cap
needs and are trivial to support; the TODO named the operation "set/**floor**", so both
are included.

### `mulBase` — rounding (amended)

`mulBase` is an existing operation; this spec extends it so its `value` may be
fractional and its per-base contribution is rounded explicitly.

- New field: `rounding` — `'up' | 'down'`.
- Existing applier computes each element's contribution as
  `baseValue * (value - 1)` written into `mod[type]`. With a fractional `value` this can
  be non-integer, so the contribution becomes
  `round(baseValue * (value - 1), rounding)` per element (rounding applied per element,
  not to the aggregate, to keep behavior predictable when multiple `mulBase` elements
  stack).
- Backward compatibility: existing `mulBase` elements default `rounding` to `'down'` (or
  `'up'` — finalized in the plan), which is a no-op for the integer multipliers in use
  today, so no migration is required.

### `'all'` selector key

When `key === 'all'`, the operation iterates **every** key under the chosen selector
(every attribute, every speed, every resistance, …) and applies the same computation
per key. Required because prone/restrained affect all speeds and contaminated affects
all attributes and resistances.

Supported on: `flatModifier`, `mulSum`, `setSum`. **Not** added to `mulBase` — no
consumer needs it (YAGNI).

## Ordering — the post-additive phase

`prepareDerivedData` order is unchanged except for inserting one phase:

```
_calculateBase*            (base values)
_resetDynamicMods          (clear equipment/effect/ability buckets)
_applyRulesElements        (additive phase: mulBase, flatModifier, …)
  └─ NEW: post-additive sub-phase (mulSum, setSum) runs LAST within rules elements
_applyConditions           (unchanged in Spec A; retired in Spec B)
_applyArmorAndShields
_applyMods                 (value = base + Σ buckets, floored at 0)
```

`mulSum` / `setSum` run **after** `mulBase` / `flatModifier` so the running total they
read already includes all additive contributions. They run **before**
`_applyArmorAndShields`, matching exactly where `_applyConditions` sits today
(`CharacterDataModel.js` line ~451, before `_applyArmorAndShields` at ~452). This
ordering is preserved deliberately rather than changed.

Within the post-additive sub-phase, multiple sum-ops on the same stat **compound in
processing order**: each reads the then-current running total, which already includes
deltas written by earlier sum-ops.

### Implementation shape in `_applyRulesElements`

- The operation-bucketing switch (`CharacterDataModel.js` ~798–836) gains `mulSum` and
  `setSum` cases, sorting them into their own arrays.
- Two new appliers, `_applyMulSumElements` / `_applySetSumElements`, are invoked **after**
  `_applyMulBaseElements` and `_applyFlatModifierElements` (and after the other additive
  appliers), so the total they read is complete.
- Each applier writes its computed deltas into `mod[type]` and records a
  `rulesElementsCache.mulSum` / `.setSum` entry mirroring the existing per-op cache
  convention (`false` when no elements of that op exist).

## Data / factory shape

New factory modules under `src/document/types/item/rules-element/`, modeled on
`FlatModifier.js`:

- `MulSum.js` → `createMulSumElement(options)` returning
  `{ operation: 'mulSum', selector: 'speed', key: 'burrow', value: 0.5, rounding: 'up', uuid }`.
- `SetSum.js` → `createSetSumElement(options)` returning
  `{ operation: 'setSum', selector: 'speed', key: 'burrow', value: 0, mode: 'set', uuid }`.

(Default selector/key chosen to be valid out of the box; exact defaults finalized in the
plan.)

Amended factory:

- `MulBase.js` → `createMulBaseElement` gains a `rounding` field (default `'down'` or
  `'up'`, finalized in the plan). A no-op for current integer multipliers.

Registration points:

- `src/system/RulesElementOperations.js` — add `'mulSum'`, `'setSum'` to
  `RULES_ELEMENT_OPERATIONS` (`mulBase` already present).
- `ItemSheetRulesElementOperationSelect.svelte` — add cases to the operation-change
  switch that swap in the new factory output.
- `ItemSheetRulesElementSettings.svelte` — add cases to the settings-component dispatcher.

## Sheet UI (Svelte — routed to `titan-svelte-dev` during build)

- `ItemSheetMulSumSettings.svelte` and `ItemSheetSetSumSettings.svelte`, modeled on
  `ItemSheetFlatModifierSettings.svelte` (selector select → per-selector key-select
  dispatch, with default-key reset on selector change).
- `'all'` added as a selectable key option in the relevant `Document*Select`
  components (attribute, rating, resistance, resource, speed, skill).
- `mulSum` needs a **fractional** value input (existing settings use
  `DocumentIntegerInput`) plus a `rounding` select; `setSum` needs a `mode` select.
- `ItemSheetMulBaseSettings.svelte` gains the same fractional value input + `rounding`
  select (the existing `mulBase` UI assumes an integer multiplier).
- Localization strings in `lang/en.json` for the new operation labels, the rounding
  options, the set modes, and the `'all'` key option.

`:global` selectors remain forbidden; new `.svelte` settings components follow the
existing SCSS-mixin patterns in `ItemSheetFlatModifierSettings.svelte`.

## Testing

### Unit (`tests/unit/`)

- Factory defaults for `createMulSumElement` / `createSetSumElement`, and the new
  `rounding` default on `createMulBaseElement`.
- `mulSum` delta math: each rounding mode (`up`/`down`); the `T <= 0` guard; fractional
  multipliers.
- `mulBase` rounding: fractional multiplier with `up`/`down` rounds the per-base
  contribution; integer multipliers remain unaffected (regression guard).
- `setSum` delta math: each of `set` / `min` / `max`.
- `'all'` expansion produces one delta per key under the selector.
- Compounding: two sum-ops on one stat apply in processing order.

### E2E logic (`tests/e2e/logic/rules-elements.spec.js`)

Extend `tests/shared/builders.js` with `buildMulSumAbilityData`,
`buildSetSumAbilityData`, and an `'all'`-selector builder, then assert derived values
through the live pipeline (the existing pattern: create actor, attach ability, let
derive settle, read `actor.system.*`). Representative cases:

- Ability granting a speed of 5, `mulSum 0.5 'up'` → speed `3`.
- `setSum set 0` on speed → speed `0`.
- `flatModifier` `selector attribute key 'all' value -1` → every attribute drops by 1.
- A `flatModifier +2` plus `mulSum 0.5 'up'` on the same stat → additive applies first,
  then halving reads the post-additive total.

## Non-goals (Spec A)

- No changes to `_applyConditions` or any condition.
- No `condition` AE subtype, no status-effect instantiation changes, no migration —
  all of that is Spec B.
- No `'all'` support on `mulBase` (no consumer).

## Spec B preview (next brainstorm, not this cycle)

Convert `CONFIG.statusEffects` entries into proper `TitanActiveEffect`s of a `condition`
subtype carrying `system.rulesElement` (via `RulesElementMixin`), seed each
mechanically-active condition's rules elements (using the operations from Spec A),
extend `_applyRulesElements` to process `effect.type === 'condition'`, and retire
`_applyConditions`. Mechanically-inert conditions (dead, deafened, frightened,
incapacitated, unconscious) intentionally carry no rules elements.

**Rulebook-accurate targets** (from `lang/en.json` condition descriptions), which differ
from current buggy code and must be the Spec B parity targets:

| Condition    | Rules-element expression (Spec B)                                  |
| ------------ | ------------------------------------------------------------------ |
| blinded      | `flatModifier` −1 to melee, accuracy, defense                      |
| contaminated | `flatModifier` −1 to attribute `all` and resistance `all`          |
| stunned      | `flatModifier` −1 to defense                                       |
| prone        | `mulSum` 0.5 ↑ on speed `all` **and** `flatModifier` −1 melee/accuracy (current code omits the −1) |
| restrained   | `flatModifier` −1 melee/accuracy/defense **and** `setSum` set 0 on speed `all` |
| sleeping     | `mulSum` 0.5 ↑ on awareness (current code never fires — `'sleep'` vs `'sleeping'` id mismatch — and double-counts) |

**Feasibility hinge for Spec B:** verify how Foundry v14 instantiates a
`CONFIG.statusEffects` entry into an `ActiveEffect` — whether `ActiveEffect.fromStatusEffect`
honors a `type` + `system` on the status template, or whether a `preCreateActiveEffect`
hook is required to stamp the `condition` subtype and rules elements when a status is
toggled.
