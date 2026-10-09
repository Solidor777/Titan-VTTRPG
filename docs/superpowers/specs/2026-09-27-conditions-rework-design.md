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

## As built (2026-09-29, amended through 2026-10-09)

- Immunities are `{ condition: Map, effect: Map }` of source lists (`{ id, name }`), not Sets: the refusal names the
  source and an immunity must skip the effect granting it. They are derived in `CharacterDataModel.prepareBaseData`,
  before core's `applyActiveEffects` reads `isSuppressed`, from the same source list as `_applyRulesElements`
  (`_getRulesElementSources`); every immunities object is built by `createEmptyImmunities` from `IMMUNITY_SELECTORS`
  (`src/document/types/item/rules-element/Immunity.js`).
- Suppression is the data models' `isSuppressed` (true while immune, undefined otherwise so core's expiry test
  decides).
- **Amends §5's fourth bullet (lines 88-89).** What happens to an existing matching condition or effect is a GM world
  setting, "Existing Effects on Gaining Immunity" (`immunityHandling`; user ruling 2026-09-30): **Remove** (default)
  deletes it once, on the client that made the change, with a notification naming the immunity's source; **Suppress**
  keeps §5's suppression. A suppressed effect's modifiers stop applying; immunities it grants still apply, an
  exception the bullet did not state: reading every enabled source is the only well-defined rule, because suppressing
  only what an unsuppressed effect grants has two fixed points (either member of a mutually immune pair applying) and
  the rules supply no tiebreak (a naive simultaneous iteration oscillates). So in Suppress mode two effects each immune
  to the other both have their modifiers stopped, both immunities stay, and each one's tag names the other; in Remove
  mode such a pair (or a longer ring) is never deleted and falls back to that same suppression (grounded labelling,
  Dung 1995). A suppressed effect returns untouched when the immunity ends, and its duration keeps ticking meanwhile.
  Refusing an immune creation (`_preCreate`) applies in both modes. Switching the setting to Remove removes,
  world-wide, what Suppress kept.
- The Testing section's "an immunity effect blocks Contaminated and suppresses an existing one" is, as built: blocks
  Contaminated in both modes, removes an existing one in Remove mode (the default), and suppresses it in Suppress mode.
- Turn-start and turn-end reports list a suppressed condition or effect with the same "Suppressed: <sources>" tag as
  the sheet and the Player HUD (user ruling 2026-09-30).
- Stacked `mulBase` elements round per element: each condition's resulting value is rounded in sequence (base 6 with
  Blinded and Off-Balance gives 4, base 7 gives 5; user ruling 2026-09-30).
- **Amends §6.** The condition rewrite is an idempotent sync inside the migration system, not a version-chain step, so
  Migration Mode governs it and unlinked token actors are covered: `getConditionEffectUpdate` /
  `syncStoredActorConditions` (`src/helpers/migration/SyncConditionEffects.js`) run for every stored actor by the
  stored-actor pass (`MigrateStoredActors.js`). A condition effect is matched by its single status against
  `buildConditionDefinitions()` and is stale when its `system.rulesElement` differs or it still stores
  `flags.titan.description`; one update per effect rewrites the rules elements when they differ and deletes the flag
  with `_del`. The scan reads stored data only. Migration Mode "Disabled" skips migration without scanning (bug #74), and
  a failed migration never blocks the load. There are no migration tests: the project does not test migrations while no
  migration is active (`.claude/claude.md`, "Project Scope"), so the Testing section's "the migration rewrites a stale
  condition AE" is not built as an automated test.
- Condition descriptions are not stored on effects. The Player HUD uses the effect's own non-blank description (a GM's
  edit in the condition sheet, bug #111), else looks the definition's text up by status id and localizes it at render;
  the turn-start report stores an edit as `description` and an unedited condition's localization key as
  `descriptionKey`, localized at render, and shows an older report's stored text as is. A turn-start report lists
  conditions even when the actor has no other effect (bug #78), and report tags' tooltips are localized once (bug #79).
- Condition situations store `labelKey` without a localized `label`; the canonical situation strings live in
  `src/system/CanonicalSituations.js`.
- Off-Balance's id is `offBalance`.
- The rounding select lists `down`, `up`, `nearest`, so an element without a stored `rounding` shows and keeps the
  engine's default (bug #77).
- **Amends §3.** The attack's target is `_getAttackTargetToken()`: the first Character token the user targets. Only a
  GM's fallback to controlled tokens (nothing targeted) skips the attacker's own token ids (bug #76), so an explicit
  target is never excluded. The attacker's token, for distance, is the controlled token of the attacker's Actor, else
  its first token on the viewed scene. Distance is measured between the nearest occupied spaces. When a target is
  resolved as the dialog opens, the dialog pins the target's Defense and its `targetFacts` (statuses and distance);
  every rebuild derives the Melee and Accuracy bonuses again from the pinned facts and the attacker's live base
  ratings, so untargeting under an open dialog keeps the conditions. `options.targetConditions` carries both ratings'
  modifiers and `parameters.targetConditions` the applied ones. A rating the user or caller supplies drops that
  rating's derived entries; a caller-supplied `targetConditions` list is kept as given. The Prone penalty beyond 10
  spaces applies to Accuracy only.
- **Amends §1 (the Unconscious row, line 47), §4 (lines 74-78) and the Testing E2E line (lines 109-110).** Falling
  Unconscious applies Prone and Incapacitated only, each if absent, on the creating client (user ruling 2026-10-09).
  Unequipping the equipped weapons and the shield is not built: the user tabled it, and `docs/TODO.md` ("Unconscious
  drops held gear") holds the intended behavior. The Testing E2E line therefore reads "Unconscious adds Prone and
  Incapacitated" without the unequip.
- The module's Stunned text was already correct; Prone's split `<strong>1 spac</strong>e` was fixed with Blinded's.
- Stat breakdowns list condition modifiers (bug #75).
- User rulings (2026-09-29): Off-Balance joins the Inflict Condition (cost 3) and Remove Condition (cost 2) spell
  aspects, and `tests/unit/SpellAspectConditions.test.js` pins both lists to every condition except Dead and Sleeping;
  a suppressed condition or effect shows a "Suppressed: <sources>" tag and a dimmed row on the sheet's effect rows and
  in the Player HUD effects panel; the module's Metal Attunement and Effulgent Gaze effects carry `immunity` elements
  (Contaminated, Blinded) and their spells no longer offer Remove Condition.
