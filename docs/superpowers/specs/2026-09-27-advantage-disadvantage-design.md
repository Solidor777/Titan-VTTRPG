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
- Every check dialog shows the effective (post-Advantage) Difficulty as a summary labeled "Effective Difficulty"
  (`check-summary-difficulty`), so a change to the Advantage select or a ticked situation is visible before rolling;
  Attack dialogs show no other Difficulty.
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
- An automatically failed card offers no action that could change its outcome: the chat log's Re-roll Failures,
  Double Training, and Double Expertise entries, the reset-Expertise button, and per-die Expertise are withheld, and
  no die is styled as a success.

### 4. Situational modifiers (the `situation` selector)

Rules often scope a modifier to a circumstance no check type or skill expresses ("checks to Swim, Fly, or Climb",
"checks to track a creature"). These become opt-in modifiers.

- Every check type's selector list gains `situation`, with a free-typed key (the circumstance's label). The key is
  user-typed and joins the `conditionalCheckModifier` entry of `TYPED_KEY_SELECTORS`
  (`src/system/ConditionalCheckModifierTypes.js`), so it is matched in camel case. As built, that frozen map is keyed
  by rules-element operation (`conditionalCheckModifier`, `conditionalRatingModifier`, `rollMessage`); the check
  modifier, rating modifier, and roll message builders each read their own entry, and
  `tests/unit/TypedKeySelectorEditors.test.js` asserts every editor's text-input selectors equal its entry. A typed
  key of exactly `all` stays literal: `_expandAllKeyElements` expands `all` only for a selector that
  `_getSelectorKeys` resolves to keys.
- A situational element may optionally narrow itself to checks using one skill (`skill` field; `''` = any skill).
  The editor shows a skill select (with "Any") when the selector is `situation`.
- Skill narrowing applies only to non-Resistance situations: a Resistance check has no Skill, so the editor hides the
  skill select for check type `resistance` and clears the stored `skill` when the check type becomes `resistance` or
  the selector changes.
- Situational elements never apply automatically. The actor exposes
  `getSituationalCheckModifiers(checkType, { skill })` → a list of
  `{ key, label, [labelKey], modifierType, value, sources }` entries that apply to the check type (its own type plus
  `any`) and, when narrowed, to the check's skill. Entries sharing a key and a modifier type sum across owners (Heavy
  and Encumbering on one armor, or armor and an effect), so `sources` is a `string[]` of the owning items' and
  effects' names.
- Check options gain `situations` (string[] of ticked keys, default `[]`). The dialog lists the applicable situational
  entries as checkboxes (label, source, and the modifier it applies), unticked by default.
- Parameters add the ticked situations' contributions on top of the options: `diceMod`, `trainingMod`,
  `expertiseMod`, `damageMod`, `healingMod`, `advantage`, and `automaticFailure` each include the sum (or, for
  `automaticFailure`, any) of the ticked entries of their type. Options keep only the always-on values, so ticking and
  unticking never double-counts.
- Situational modifiers never apply automatically: a check applies only the situations its `options.situations`
  names. The check dialog is the only UI that ticks them; a caller (a macro or module) that passes `situations`
  directly has them applied like any other option it passes.
- Parameters record the applied situations as `situations: { key, label, [labelKey] }[]`: `buildSchemaFromShape` maps
  an empty array to an `ArrayField(ObjectField)`, which rejects strings, and the label lets the card render without
  an actor lookup. The chat card lists them by label.

### 4b. The check dialog as built

- `CheckDialogShell` keeps the Check Options store private and gives its children a read-only view (`'checkOptions'`:
  `{ subscribe }` over deep-frozen snapshots, so a write from a component throws) plus a tracked setter
  (`'setCheckOption'`); it also sets `'checkParameters'`, `'checkActor'` (a `ReactiveDocument` over the rolling
  Actor), and `'checkType'`. Every field writes through the setter, which records the write as a user edit.
- On every Actor change or edit, the shell rebuilds the options (`src/check/dialog/RebuildCheckOptions.js`) from the
  caller's options plus the user's edits through `validate<Type>CheckOptions(options, false)` (quiet mode: it reports
  nothing) and `initialize<Type>CheckOptions`, so every actor-derived field follows the live Actor and every field
  the caller or user set is kept. A field left at the `'default'` sentinel by the input (the Attribute after the user
  picks Skill "None") is pinned to its displayed value first. A source that vanished (a deleted weapon, item, or
  effect) makes the rebuild write nothing, and the type shell's validation closes the dialog.
- An Item Check resolves its source live: `itemId` names an owned item and `effectId` an effect among
  `actor.allApplicableEffects()`; `itemRollData` is used only when neither is given (the item chat card's snapshot,
  built by `createItemCheckRollData` in `src/check/types/item-check/ItemCheckRollData.js`).
- Casting and Item `complexity` and `difficulty` are derived from the spell or item only when `undefined`; an
  explicit 0 is kept.
- An Attack dialog decides `targetDefense` provenance in `_createAttackCheckDialog`: a targeted token's Defense
  counts as caller-supplied; with no target, the no-target fallback re-derives as the rating changes.
- `CheckDialogBase` lists the check's situational modifiers below the field rows (`CheckDialogSituationsField`, one
  unticked checkbox per key). It reads them through the Actor bridge, so the list follows the Actor and drops ticks
  that are no longer offered.

### 4a. When the check dialog opens (user ruling 2026-09-27)

The client setting `getCheckOptions` changes from a Boolean to a choice:

| Value | Label | Behavior |
|---|---|---|
| `never` | Never | Roll without the dialog |
| `situational` (default) | When Situational Modifiers Apply | Open the dialog only when `getSituationalCheckModifiers` returns at least one entry for the check |
| `always` | Always | Always open the dialog |

- `shouldGetCheckOptions(hasSituationalModifiers)` resolves the choice. The modifier key treats `situational` as
  "no dialog" and inverts from there, but a check with situational modifiers always hedges toward showing the dialog
  (user ruling 2026-09-27):

  | Setting | No modifier key | Modifier key held |
  |---|---|---|
  | `never` | no dialog | dialog |
  | `situational` | dialog only if situational modifiers apply | dialog |
  | `always` | dialog | dialog only if situational modifiers apply |
- Every `request*Check` computes whether the check has situational entries (from the initialized options' check
  type and skill) before deciding.
- A stored legacy Boolean reads as `true` → `always` and `false` → `situational` (the old default was `false`, and
  the new default is `situational`); `resolveCheckOptionsMode` maps any other value outside the three choices to
  `situational`, and `registerSystemSettings` rewrites such a stored value to its resolved choice.

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
| Heavy | `advantage` −2, key "Swim, Fly, or Climb"; `automaticFailure`, key "Jump"; both narrowed to skill `athletics` |
| Encumbering | `advantage` −1, key "Swim, Fly, or Climb", narrowed to `athletics` |
| Loud | `advantage` −1, key "Remain Undetected by Hearing", narrowed to `stealth` |

The system has no Jump action and no Acrobatics skill; a Jump is a Body (Athletics) check (the "Jumping" section) and so
is a Climb (the Athlete ability and the fissure check), so the armor situations are narrowed to Athletics, and Loud's to Stealth. Unnarrowed, armor would
make every check situational and open the dialog on every roll under the default setting.

As built: each system situation has a fixed canonical English source string defined in code ("Swim, Fly, or Climb",
"Jump", "Remain Undetected by Hearing"), and its camel-cased form is the situation key on every client, so keys never
depend on the client's language (the macro API's `options.situations` is stable) and a user-typed situation with the
same English text merges with it. The label is localized separately: the synthetic element carries `label` (the
localized text) and `labelKey` (its LOCAL key, `situationJump` etc.). The situational cache uses
`label: element.label ?? element.key` and keeps `labelKey`; `parameters.situations[]` on a chat card stores `labelKey`
(optional) and the card renders `localize(labelKey)` when present, else the stored `label`, so every client reads a
system situation in its own language. User-typed situations have no `labelKey`.

Traits sharing a situation share its key: Heavy and Encumbering on one armor tick together as one "Swim, Fly, or
Climb" entry whose value is their sum (−3, clamped to Greater Disadvantage).

## Error handling

- Unknown `modifierType` lookups keep failing loudly through `_getConditionalCheckModsForType`'s assert.
- Chat messages created before this change lack `advantage`, `baseDifficulty`, `automaticFailure` and `situations`;
  their schemas default them (0 / the stored `difficulty` / false / []), so old cards render unchanged.

## Testing

- Unit: `applyAdvantage` table (every net level, both clamps, out-of-range base Difficulty); cache summing of mixed
  levels; situational contributions never double-count across tick/untick; Resistance-check modifier resolution
  (`any`/`any`, `resistance`/`any`, `resistance`/named, and that `any`/`attribute` does not apply); automatic-failure
  results; armor-trait synthetic elements.
- Unit: `shouldGetCheckOptions` for each setting value × situational presence × modifier key; legacy Boolean reads.
- E2E: with the default setting, a check with no situational entries rolls straight to chat and a check with one
  opens the dialog; Heavy armor's Jump entry appears on an Athletics check and not on a Dexterity check.
- E2E: an effect with Disadvantage raises a rolled check's Difficulty in chat; the dialog's Advantage select and
  situational checkbox change the displayed and rolled Difficulty; a Resistance check picks up an `any` dice penalty;
  Heavy armor's "Swim, Fly, or Climb" entry appears unticked and applies Greater Disadvantage when ticked; an
  automatic-failure check shows the tag and 0 successes; the rules-element editor's level select writes ±1/±2.

## Documentation

`docs/TODO.md` (delete the two closed items), `docs/CLOSED_BUGS.md` if any bug is fixed on the way, and the
`titan-codebase` skill (check flow, modifier types, situational modifiers, Resistance-check modifiers).
