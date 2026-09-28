# Advantage, Disadvantage, Situational Modifiers, and Resistance-Check Modifiers — Design

Sub-project A of the 2026-09-27 backlog close-out. Sub-projects B (conditions rework to the 09_26 rules) and C
(rules-element expressiveness and compendium rulings) build on it.

## Goal

Checks gain the rules' Advantage/Disadvantage mechanic, automatic failure, and opt-in situational modifiers; Resistance
checks gain conditional modifiers; the Heavy, Encumbering and Loud armor traits apply their check rules.

Closes these `docs/TODO.md` items: "Conditional check modifiers on Resistance checks" and "Heavy armor's remaining
rules". Supplies the mechanics sub-project B needs (Frightened's Disadvantage, Incapacitated/Restrained auto-failing
Reflexes, Blinded/Deafened auto-failing sight/hearing checks).

## Rules source

`docs/TITAN Rules Compendium - Source - 09_26_2026.md`:

- 1737–1759: Advantage lowers the check's Difficulty by 1 (minimum 2); Disadvantage raises it by 1 (maximum 6);
  two or more sources are Greater (±2); Advantage and Disadvantage cancel.
- 2765 (Encumbering): Disadvantage on checks to Swim, Fly, or Climb.
- 2770 (Loud): Disadvantage on checks to remain undetected by creatures with hearing.
- 2775 (Heavy): Greater Disadvantage on checks to Swim, Fly, or Climb; cannot Jump. The -1 to all speeds already ships.

## User rulings (2026-09-27)

- One modifier type carries Advantage and Disadvantage, with four options: Advantage, Greater Advantage, Disadvantage,
  Greater Disadvantage. The check's result is the sum of every source added together.
- Rounding elsewhere in the rules ("rounded up") applies to the resulting value. Not used by this sub-project.

## Design

### 1. The `advantage` modifier type

- `CONDITIONAL_CHECK_MODIFIER_TYPES` gains `advantage`. An element of this type stores its level in the existing
  numeric `value` field: Advantage `1`, Greater Advantage `2`, Disadvantage `-1`, Greater Disadvantage `-2`.
- The rules-element editor (`ItemSheetConditionalCheckModifierSettings.svelte`) shows a four-option level select in
  place of the integer input when `modifierType === 'advantage'`, writing the signed value. Switching an element to
  `advantage` resets `value` to `1`.
- The actor's conditional-modifier cache already sums `value` per check type, selector and key, so stacking needs no
  new cache logic.

### 2. Applying Advantage to a check

- A pure helper `applyAdvantage(difficulty, advantage)` (new file `src/check/ApplyAdvantage.js`):
  - `net = clamp(advantage, -2, 2)`; the sum of all sources, capped at Greater.
  - `net > 0`: `difficulty = max(2, difficulty - net)`. A Difficulty already below 2 is left unchanged.
  - `net < 0`: `difficulty = min(6, difficulty - net)`. A Difficulty already above 6 is left unchanged.
  - `net === 0`: unchanged.
- Every check type's options gain `advantage` (integer, default `0`), initialized from conditional modifiers when not
  provided, exactly like `diceMod`: `getAttributeCheckMod('advantage', …)` and the attack/casting/item/resistance
  equivalents.
- Every check type's parameters gain `advantage` (the effective sum, including situational contributions — see §4) and
  `baseDifficulty` (the Difficulty before Advantage). `difficulty` becomes the post-Advantage value. Attack checks apply
  Advantage after their rating-derived Difficulty (`clamp(targetDefense - attackerRating + 4, 2, 6)`).
- Check dialogs gain an Advantage field: a select with the five levels Greater Disadvantage … Greater Advantage
  (`-2`…`2`), bound to `options.advantage`, for GM-granted circumstances. A conditional sum outside ±2 displays as the
  clamped level; the stored option keeps the raw sum.
- Chat cards show a tag for a non-zero effective level ("Advantage", "Greater Advantage", "Disadvantage",
  "Greater Disadvantage"), next to the Difficulty display.
- The check chat data models gain `advantage` and `baseDifficulty` in their parameter shapes (built from the shared
  shape templates, so the schema follows the shape).

### 3. The `automaticFailure` modifier type

- `CONDITIONAL_CHECK_MODIFIER_TYPES` gains `automaticFailure`. Its `value` is unused; the editor hides the value input
  for this type and stores `1`.
- Check options and parameters gain `automaticFailure` (boolean), initialized from conditional modifiers (any matching
  element makes it `true`), and editable in the dialog as a checkbox.
- An automatically failed check still rolls (the dice appear in chat), but its results report 0 successes and the
  check as failed; for Resistance checks, no damage is reduced. The chat card shows an "Automatic Failure" tag.
  Re-roll/expertise recalculation keeps the result forced (the flag is read from the stored parameters).

### 4. Situational modifiers (the `situation` selector)

Rules often scope a modifier to a circumstance no check type or skill expresses ("checks to Swim, Fly, or Climb",
"checks to track a creature"). These become opt-in modifiers.

- Every check type's selector list gains `situation`, with a free-typed key (the circumstance's label). The key is
  user-typed and joins `USER_KEYED_CHECK_MODIFIER_SELECTORS`, so it is matched in camel case.
- Situational elements never apply automatically. The actor exposes
  `getSituationalCheckModifiers(checkType)` → a list of `{ key, label, modifierType, value, source }` entries that apply
  to the check type (its own type plus `any`), where `source` is the owning item/effect name.
- Check options gain `situations` (string[] of ticked keys, default `[]`). The dialog lists the applicable situational
  entries as checkboxes (label, source, and the modifier it applies), unticked by default.
- Parameters add the ticked situations' contributions on top of the options: `diceMod`, `trainingMod`,
  `expertiseMod`, `damageMod`, `healingMod`, `advantage`, and `automaticFailure` each include the sum (or, for
  `automaticFailure`, any) of the ticked entries of their type. Options keep only the always-on values, so ticking and
  unticking never double-counts.
- Situational modifiers apply only through the dialog; a check rolled without the dialog applies none.
- The chat card lists the ticked situations by label.

### 5. Resistance checks take conditional modifiers

- The editor's check-type options gain `resistance` with selectors `any`, `resistance` (key: a resistance —
  `reflexes`, `resilience`, `willpower`), and `situation`.
- `initializeResistanceCheckOptions` initializes `diceMod`, `expertiseMod`, `advantage` and `automaticFailure` from
  conditional modifiers through a new `getResistanceCheckMod(modifierType, resistance)`: checkType `any` + selector
  `any`, plus checkType `resistance` + selector `any`, plus checkType `resistance` + selector `resistance` for the
  rolled resistance. (checkType `any` with an `attribute`/`skill` selector does not apply — a Resistance check has no
  attribute or skill.) Training does not apply to Resistance checks; the editor hides `training`, `damage`, and
  `healing` for `resistance`.
- This makes "all checks" penalties such as Abjuration of the Arbiter's dice penalty land on Resistance checks.

### 6. Armor traits

`_applyArmorAndShields` (or the rules-element collection step that runs before the conditional-check cache is built)
adds synthetic `conditionalCheckModifier` elements for the equipped armor's traits, sourced as the armor item:

| Trait | Synthetic elements (checkType `any`, selector `situation`) |
|---|---|
| Heavy | `advantage` −2, key "Swim, Fly, or Climb"; `automaticFailure`, key "Jump" |
| Encumbering | `advantage` −1, key "Swim, Fly, or Climb" |
| Loud | `advantage` −1, key "Remain Undetected by Hearing" |

Situation keys are localized labels, so their camel-cased keys match across traits: Heavy and Encumbering on one armor
tick together as one "Swim, Fly, or Climb" entry whose value is their sum (−3, clamped to Greater Disadvantage).

## Error handling

- Unknown `modifierType` lookups keep failing loudly through `_getConditionalCheckModsForType`'s assert.
- Chat messages created before this change lack `advantage`, `baseDifficulty`, `automaticFailure` and `situations`;
  their schemas default them (0 / the stored `difficulty` / false / []), so old cards render unchanged.

## Testing

- Unit: `applyAdvantage` table (every net level, both clamps, out-of-range base Difficulty); cache summing of mixed
  levels; situational contributions never double-count across tick/untick; Resistance-check modifier resolution
  (`any`/`any`, `resistance`/`any`, `resistance`/named, and that `any`/`attribute` does not apply); automatic-failure
  results; armor-trait synthetic elements.
- E2E: an effect with Disadvantage raises a rolled check's Difficulty in chat; the dialog's Advantage select and
  situational checkbox change the displayed and rolled Difficulty; a Resistance check picks up an `any` dice penalty;
  Heavy armor's "Swim, Fly, or Climb" entry appears unticked and applies Greater Disadvantage when ticked; an
  automatic-failure check shows the tag and 0 successes; the rules-element editor's level select writes ±1/±2.

## Documentation

`docs/TODO.md` (delete the two closed items), `docs/CLOSED_BUGS.md` if any bug is fixed on the way, and the
`titan-codebase` skill (check flow, modifier types, situational modifiers, Resistance-check modifiers).
