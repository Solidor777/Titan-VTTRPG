# Conditions Rework to the 2026-09-26 Rules — Design

Sub-project B of the 2026-09-27 backlog close-out. Depends on sub-project A
(`2026-09-27-advantage-disadvantage-design.md`) for the `advantage` and `automaticFailure` modifier types and the
`situation` selector.

## Goal

The system's conditions match the 09_26 rules text, including a new Off-Balance condition, attack checks that account
for the target's conditions, and condition/effect immunity.

Closes the `docs/TODO.md` item "Conditions rework to the 2026-09-26 rules".

## Rules source

`docs/TITAN Rules Compendium - Source - 09_26_2026.md`, lines 2126–2198 (Conditions).

## User rulings (2026-09-27)

- `mulBase` keeps its additive semantics: every element adds `base × (value − 1)`, so multipliers never modify each
  other (two ×2 on base 1 → 3; ×0.5 plus ×2 → 1.5). The new conditions are `mulBase` elements.
- Rounding applies to the resulting value, the way the rules phrase it. `mulBase` gains a third rounding option,
  `nearest`, alongside `up` and `down`.
- Frightened, Incapacitated and Unconscious may carry mechanics (superseding the 2026-06-01 inert ruling for those
  three). Deafened and Blinded auto-fail Awareness/Perception checks as a situational modifier. Dead stays inert.
- Condition/effect immunity by condition id or effect name is in scope; trait-based immunity is logged in
  `docs/TODO.md`.

## Design

### 1. Condition definitions (`src/system/Conditions.js`)

"−¼ of base, rounded up" is `mulBase` 0.75 with `rounding: 'up'` (result rounded up: base 5 → 4, base 4 → 3).

| Condition | Rules elements |
|---|---|
| Blinded | `mulBase` 0.75 up on ratings melee, accuracy, defense; `conditionalCheckModifier` `automaticFailure`, checkType `any`, selector `situation`, key "Relies on Sight", narrowed to skill `perception` (Awareness is a passive rating with no check of its own; Perception checks are the Awareness checks) |
| Contaminated | `mulBase` 0.75 up on attribute `all` and resistance `all` (replaces flat −1) |
| Deafened | `conditionalCheckModifier` `automaticFailure`, checkType `any`, selector `situation`, key "Relies on Hearing", narrowed to skill `perception` (user ruling 2026-09-27) |
| Frightened | `conditionalCheckModifier` `advantage` −1, checkType `any`, selector `any` |
| Incapacitated | `conditionalCheckModifier` `automaticFailure`, checkType `resistance`, selector `resistance`, key `reflexes`; target-side: attacks against it have Difficulty 2 (§3) |
| Off-Balance (new) | `mulBase` 0.75 up on ratings accuracy, awareness, melee, defense; icon `icons/svg/daze.svg` |
| Prone | `mulSum` 0.5 up on speed `all` (unchanged); `mulBase` 0.75 up on ratings melee, accuracy; target-side attacker modifiers (§3) |
| Restrained | `setSum` speed `all` to 0 (unchanged); `mulBase` 0.75 up on ratings melee, accuracy, defense; `automaticFailure` on Resistance `reflexes` |
| Sleeping | `mulSum` 0.5 up on rating awareness (unchanged) |
| Stunned | `mulBase` 0.75 up on rating defense |
| Unconscious | no elements of its own; applying it also applies Prone and Incapacitated and unequips held gear (§4) |
| Dead | none |

Localization adds `offBalance.text` / `offBalance.desc`; every changed condition's `.desc` string is updated to the
09_26 text (Blinded uses "base value", correcting the source's "of their total" typo). Rules-element uuids follow the
existing `condition-<id>-<stat>` pattern.

### 2. `mulBase` rounding

`roundDirectional` gains `'nearest'` (`Math.round`); the mulBase and mulSum editors offer `up`, `down`, `nearest`.
Missing `rounding` keeps defaulting to `down`.

### 3. Target-aware attack checks

`initializeAttackCheckOptions` already reads `targets[0]`'s Defense. It additionally reads the first target's
condition statuses and the grid distance between the attacker's token and the target's token (Foundry grid
measurement; no canvas token → no distance-based modifier):

- Target Prone, distance ≤ 1: the attacker's Melee or Accuracy (whichever the attack uses) gains
  `ceil(base × 0.25)` of the attacker's base rating.
- Target Prone, distance > 10: the attacker's Accuracy loses `base × 0.25 × floor(distance / 10)`, result rounded
  up, and never below 0.
- Target Incapacitated: the attack's Difficulty is 2, after rating math and after Advantage.

The applied target modifiers are recorded on the parameters (`targetConditions`) and listed on the chat card. The
dialog shows them and they stay editable through the existing rating/defense fields.

### 4. Unconscious

When an Unconscious condition is created on an actor (initiating client only, `_onCreate` of `TitanActiveEffect` or
the status toggle path), the actor also gains Prone and Incapacitated if absent, and unequips its equipped weapons and
shield ("drops anything it is holding"). Removing Unconscious removes neither (standing up is a separate Move/Action).

### 5. Condition and effect immunity

- New rules-element operation `immunity` with selector `condition` (key: a condition id, picked from the condition
  list) or `effect` (key: an effect name, matched in camel case).
- The actor derives `immunities` (`{ condition: Set, effect: Set }`) in a pre-pass over its active items/effects
  before any other rules element is applied.
- Creating a condition or effect the actor is immune to is refused in `TitanActiveEffect._preCreate` with a UI
  notification naming the immunity's source.
- Existing matching conditions/effects are suppressed while the immunity lasts (`isSuppressed`), so their rules
  elements stop applying and they return untouched when it ends. An immunity never suppresses the effect granting it.
- Editor: `ItemSheetImmunitySettings.svelte` (selector select + condition select or text input).

### 6. Migration

Condition Active Effects already on actors keep the rules elements copied at creation. A migration step rewrites
every existing condition AE's `system.rulesElement` (world actors and unlinked token actors) from the current
definition matched by its status id.

### 7. Rules journal typos (module)

The module's Rules journal (`titan-vttrpg-compendium` `src/packs`) fixes Blinded's "--¼ of their total" to "-¼ of their
base value" and Stunned's duplicated "Defense decrease by".

## Testing

- Unit: `buildConditionDefinitions` snapshot per condition; `mulBase` 0.75 up on bases 1–8; stacked Blinded +
  Off-Balance on Defense (additive: base 8 → 4); `nearest` rounding; immunity pre-pass and suppression; Prone
  distance modifiers table.
- E2E: toggling each changed condition changes the sheet's ratings as the table says; Frightened raises a rolled
  check's Difficulty; Incapacitated target makes an attack's Difficulty 2; Unconscious adds Prone and Incapacitated
  and unequips the weapon; an immunity effect blocks Contaminated and suppresses an existing one; the migration
  rewrites a stale condition AE.

## Documentation

`docs/TODO.md` (delete the conditions item), the `titan-codebase` skill (conditions, immunity, target-aware attacks,
rounding), and the `five-conditions-inert` auto-memory.
