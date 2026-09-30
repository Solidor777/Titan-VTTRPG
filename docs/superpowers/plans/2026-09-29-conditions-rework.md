# Conditions Rework to the 2026-09-26 Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TITAN's conditions match the 2026-09-26 rules text: quarter-of-base penalties through `mulBase`, a new
Off-Balance condition, Frightened/Incapacitated/Restrained/Blinded/Deafened check rules, attack checks that read the
target's Prone and Incapacitated conditions, Unconscious's companion conditions and dropped gear, condition and effect
immunity, and existing condition effects rewritten to the new definitions.

**Architecture:** Conditions stay native `condition`-subtype Active Effects whose seeded `system.rulesElement` arrays
(`buildConditionDefinitions`) drive every mechanic through the existing rules-element pipeline; the check rules use
spec A's `advantage`/`automaticFailure` modifier types and `situation` selector. A new `immunity` rules element is read
in a `prepareBaseData` pre-pass (`_getImmunities`) that core's Active Effect application and every rules-element pass
consult through the data models' `isSuppressed`; `TitanActiveEffect._preCreate` refuses an immune creation. Attack
checks derive `targetConditions` from the first target token (conditions + grid distance) through pure helpers and fold
them into the derived ratings and the final Difficulty. A condition-effect sync joins the migration system so every
GM world load (per Migration Mode) rewrites stale condition effects.

**Tech Stack:** Foundry VTT v14 (ApplicationV2), JavaScript, Svelte 5 (runes), SCSS, Vitest (happy-dom), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-conditions-rework-design.md` (spec B, user-approved 2026-09-27). It builds
on spec A as built and released in v2.1.0 (`docs/superpowers/specs/2026-09-27-advantage-disadvantage-design.md`).
Executors read spec B alongside this plan.

**Branch:** `conditions-and-rulings` (system repo, based on `main` @ `f3d7e66a`). Do not switch branches. The working
tree carries unrelated user changes (`.claude/*`, deleted `CLAUDE.md` and `TITAN Rules Compendium.md`, two
`Gemini_Generated_Image_*` images, untracked `docs/TITAN Rules Compendium*.md`): never stage them. Stage only the files
each task lists. Task 13 works in the compendium module repo on its own branch.

**Iron rule — every implementer, reviewer, and fix dispatch prompt the executor writes MUST contain this paragraph
verbatim:**

> Invoke the core skill immediately. The iron rule is no deferrals of existing work, or new work as it comes up - we fix this now unless I give my EXPRESS authorization. The only exception is if a bug or to-do has a genuine blocker that is already logged in a milestone in PLAN.md that has not been started yet. Another iron clad is rule is that when faced with a design fork, determine the best long term shape in keeping with our plans and goals, and implement accordingly. You only need to ask me if the question "what is the best long term shape in keeping with our plans and goals?" is not able to answer the question. Churn is not a concern. This paragraph must be copied verbatim to any agents dispatched in this campaign.

"The core skill" is the `titan-codebase` skill (`.claude/skills/titan-codebase/SKILL.md` + `references/*.md`).
Every dispatch also loads `foundry-vtt`; Tasks 1, 3, 8, and 11 (Svelte) also load `svelte-5` and `foundry-svelte`.

---

## Open questions for the user

These are genuine gaps the "best long-term shape" question cannot settle. The plan does not guess; the controller asks
the user before Task 14 and adds any resulting work as new tasks (or logs a user-authorized deferral).

1. **Off-Balance in the spell-aspect condition lists.** `SPELL_ASPECTS.inflictCondition` and `removeCondition`
   (`src/document/types/item/types/spell/SpellAspects.js:436-509`) list the conditions a custom spell can inflict or
   remove, with a per-condition Inflict cost (Blinded 4, Prone 2, ...). The 09_26 rules have no spell-aspect table, so
   no rule gives Off-Balance a cost. Should Off-Balance be offered, and at what Inflict cost? Recommendation: add it to
   Remove Condition (uniform cost 2) and to Inflict Condition at cost 3 (between Prone 2 and Blinded/Stunned 4, as a
   Prone-like physical penalty without the speed loss).
2. **How a suppressed effect or condition is shown.** Spec B §5 suppresses an immune actor's existing
   conditions/effects (they stop applying) but says nothing about display. Core already drops a suppressed condition
   from `actor.statuses` (the token HUD shows it off), but the character sheet's effect rows and the Player HUD
   effects panel still list it as active. Should they mark it (e.g. a "Suppressed: <immunity source>" tag and a muted
   row)? Recommendation: yes — a tag on the effect row and HUD panel entry naming the immunity's source, reusing
   `getImmunitySources`.
3. **Module items that grant condition immunity.** The `docs/TODO.md` compendium audit lists "Metal Attunement and
   Effulgent Gaze: `removeCondition` where the rules grant immunity" as awaiting a rules decision. Task 8 creates the
   `immunity` element those items need. Should this campaign convert them (module `src/packs`), or does the item
   stay with the rest of the audit? Recommendation: convert them in this campaign as a module task after Task 13,
   since the missing mechanic was the blocker; the rest of the audit is unrelated.

---

## Global Constraints

- Project style (`.claude/claude.md`, ESLint-enforced): 120-character lines; braces on every conditional (`case x: {`
  blocks too); objects with more than one property and arrays with more than one entry are multi-line (tests
  included); trailing commas on multi-line literals; 3-space indent; every variable typed and given a one-line
  comment; every function has full JSDoc with typed params and returns; Svelte components with more than one prop are
  multi-line with `/>` on its own line; present-tense comments with no history or process meta; clean stale comments
  in any scope you touch.
- No `:global` CSS, no dynamic `import()` in `src/`, no `console.log`, no test code in shipping builds.
- Rules source (`docs/TITAN Rules Compendium - Source - 09_26_2026.md`, lines 2126-2198). Spec B user rulings
  (2026-09-27), verbatim: "`mulBase` keeps its additive semantics: every element adds `base × (value − 1)`, so
  multipliers never modify each other (two ×2 on base 1 → 3; ×0.5 plus ×2 → 1.5). The new conditions are `mulBase`
  elements." "Rounding applies to the resulting value, the way the rules phrase it. `mulBase` gains a third rounding
  option, `nearest`, alongside `up` and `down`." "Frightened, Incapacitated and Unconscious may carry mechanics
  (superseding the 2026-06-01 inert ruling for those three). Deafened and Blinded auto-fail Awareness/Perception checks
  as a situational modifier. Dead stays inert." "Condition/effect immunity by condition id or effect name is in scope;
  trait-based immunity is logged in `docs/TODO.md`."
- "−¼ of base, rounded up" is `mulBase` 0.75 with `rounding: 'up'` (base 5 → 4, base 4 → 3). Missing `rounding` keeps
  defaulting to `down`. Rules-element uuids follow `condition-<id>-<stat>`.
- Target modifiers (spec B §3): Prone target at distance ≤ 1 → the attacker's Melee or Accuracy (whichever the attack
  uses) gains `ceil(base × 0.25)`; Prone target at distance > 10 → Accuracy loses `base × 0.25 × floor(distance / 10)`,
  result rounded up, never below 0; Incapacitated target → Difficulty 2 after rating math and after Advantage (after
  `_applyCheckAdvantage` in `getAttackCheckParameters`). No canvas token → no distance-based modifier.
- Every "every X" list is structurally derived or pinned by a guard test that fails when the list drifts (no hand
  list stands in for "every X"). Behaviour-preserving refactors get a test pinning the old behaviour, committed green
  before the refactor.
- Localization: TITAN strings are flat `"<key>.text"` entries inside `lang/en.json` → `LOCAL`, inserted in
  alphabetical key order. Every new visible label gets an entry in the task that first renders it.
- Every task ends, in this order: `npm run eslint` (0 errors), `npm run stylelint` when a `.svelte`/`.scss` file
  changed, `npm test` (all green), `npm run build`, then the task's e2e specs with
  `npm run test:e2e -- <spec paths>` from a foreground shell (the live Foundry at http://localhost:30000 serves this
  directory's build, so build first). Read Playwright's own pass/fail counts; never trust an exit code through a
  pipe. Commit as soon as the task's focused tests are green and those checks pass.
- E2E rules: log in only as `E2E GM 1`/`E2E GM 2`/`E2E Player 1`/`E2E Player 2` (never `Gamemaster`; one live session
  per user); every absence assertion is a presence→absence transition on the same resolved subject with a sync point
  (or follows a happens-after positive edge); context-menu entry clicks go through `chooseContextMenuEntry`
  (`tests/e2e/contextMenu.js`; `tests/unit/E2eContextMenuClicks.test.js` enforces it); no fixed sleeps
  (`expect.poll`, web-first assertions, `titanWait`); chat locators are scoped to
  `#chat .message[data-message-id="…"]`; sheet locators to `.application.titan-document-sheet`.
- A GM login runs migrations (`onceReady`). From Task 5 on, the first E2E GM login rewrites the test world's stale
  condition effects (per its Migration Mode); that is expected on the test world. Never run a scripted GM login
  against a real (non-test) world.
- Serial execution: tasks share one working tree, one git index, one build output, one live Foundry. Never
  parallelize implementers.
- Commits: before each commit run `git branch --show-current` (must print `conditions-and-rulings`, or the module
  branch in Task 13) and `git status --short` (stage only the task's listed files; never `packs/**`). Every commit
  message ends with exactly:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
  ```

## Spec-versus-code resolutions (decided under the iron rule's best-long-term-shape clause)

1. **Immunities are `{ condition: Map, effect: Map }` of source lists, not Sets** (spec §5 says `Set`). The refusal
   notification must name the immunity's source, and "an immunity never suppresses the effect granting it" needs the
   source's id, so each key maps to `ImmunitySource[]` (`{ id, name }`).
2. **The immunity pre-pass runs in `CharacterDataModel.prepareBaseData`.** Core reads `effect.active` (→
   `isSuppressed`) in `Actor#applyActiveEffects`, which runs in `prepareEmbeddedDocuments` before
   `prepareDerivedData`; deriving immunities in `prepareDerivedData` would be one preparation late.
3. **Suppression goes through the data models' `isSuppressed`.** Core's `ActiveEffect#isSuppressed` returns
   `!!(this.system.isSuppressed ?? this.duration.expired)` (`client/documents/active-effect.mjs:191`), so
   `ConditionDataModel` and `TitanActiveEffectDataModel` return `true` while immune and `undefined` otherwise (leaving
   core's expiry test in charge). `_applyRulesElements` skips a suppressed Active Effect.
4. **The immunity pre-pass and `_applyRulesElements` read one source list** (`_getRulesElementSources`, Task 7), so
   they can never disagree about which items and effects apply. Immunities are gathered from enabled sources whether
   suppressed or not (suppression depends on them).
5. **The condition migration is an idempotent sync inside the migration system, not a version-chain step.** The
   version chain compares `system.documentVersion`, which an unlinked token Actor inherits from its base Actor, so a
   version step cannot reach token-only conditions (spec §6 names unlinked token actors). `worldNeedsMigration()`
   reports stale condition effects and `migrateWorld()` runs `syncConditionEffects()`, so Migration Mode (prompt /
   automatic / disabled) governs it like any migration. The sync also rewrites `flags.titan.description`, which the
   Player HUD (`EffectsDetailBody.svelte:30`) and turn reports (`CharacterDataModel.js:5283`) read from the effect, so
   the new condition text reaches existing conditions.
6. **Migration Mode "Disabled" now skips migration** (bug, fixed in Task 5): `onceReady` ran `migrateWorld()` in its
   `else` branch for `disabled`, contradicting the setting's hint ("Disabled: skips migration entirely").
7. **Stat tooltips list condition modifiers** (bug, fixed in Task 3): `ModifiableStatValueLabel` and
   `createModifiableStatTooltip` take per-bucket props without a `condition` bucket, so condition penalties never
   appear in any sheet or HUD stat breakdown (and Speed/Mod rows omit Abilities). The label now takes the stat's `mod`
   object and the tooltip iterates one bucket list (`src/system/ModBuckets.js`), also used by `_resetDynamicMods`.
8. **Target distance is measured between the nearest spaces the two tokens occupy**, using the scene grid's own
   measurement (its diagonal rule), in spaces (`distance / grid.distance`); a gridless scene or a token occupying no
   space measures center to center. Center-to-center would put an adjacent Large token at 2 spaces.
9. **The attack's target excludes the attacker's own token.** `getTargetedCharacters` falls back to a GM's controlled
   tokens; a GM rolling from a controlled attacker would otherwise target itself and read its own conditions.
10. **`options.targetConditions` holds the modifiers for both ratings; `parameters.targetConditions` keeps only the
    attack's rating and the Difficulty.** The dialog's attack-type field can switch Melee/Ranged after open, so the
    options keep both; the card lists only what applied. A target's conditions resolved at open are pinned as caller
    values (like `targetDefense`), so untargeting while the dialog is open changes neither.
11. **The Prone >10 penalty applies only to Accuracy** ("decreases their Accuracy"); a Melee attack at that range gets
    no entry.
12. **Condition situations store `labelKey`, not a localized `label`.** A condition's rules elements persist on its
    Active Effect, so a stored label would freeze one client's language. The situational cache localizes `labelKey`
    when an element carries no `label`. The canonical situation strings move from the armor module to
    `src/system/CanonicalSituations.js`, shared by armor and conditions.
13. **Off-Balance's id is `offBalance`** (camel case, like every other LOCAL key), its name `LOCAL.offBalance.text`.
14. **The module's Stunned typo is already fixed** in `src/packs/rules/Rules_Reference_mczts3I29Q5vaopp.json`; Task 13
    fixes Blinded's and the same page's split `<strong>1 spac</strong>e` in Prone.
15. **The spec's "sheet's ratings" e2e** asserts both the derived values (every changed condition) and the rendered
    sheet (Task 3: the Defense label and its tooltip).
16. **The rounding select lists `down`, `up`, `nearest` (spec §2 lists `up`, `down`, `nearest`).** `Select`'s clamp
    effect writes its first option into an unlisted bound value and fires `onchange`, which `DocumentSelect` persists
    (`Select.svelte:114-121`). With `up` first, opening the editor of a `mulBase` element that has no stored
    `rounding` (engine default `down`) silently persists `up`. Listing `down` first keeps the editor and the engine in
    agreement.
17. **Condition sync matches a condition effect to its definition by `effect.statuses`**, the first
    `CONFIG.statusEffects` entry whose id the effect's statuses hold; an effect whose statuses name no system
    condition (a custom status) is left alone.

## Review Focus

1. A Prone target exactly 10 spaces away gives no Accuracy penalty and one 11 spaces away gives one step; an attacker
   whose Accuracy is already 0 (or whose quarter-base rounds to 0) gets no entry and never goes negative (table in
   Task 10; e2e at 1 and 21 spaces in Task 11).
2. A GM who targets nothing but controls the attacker's own token must not read the attacker's conditions or Defense
   as the target's (unit test in Task 11).
3. Toggling a condition the actor is immune to from the token HUD refuses it with a notification naming the source,
   and removing the immunity restores a suppressed condition's penalties without re-creating it (unit tests in Task 9;
   e2e in Task 9).
4. The condition sync is idempotent and key-order-insensitive (a second load writes nothing), leaves a condition whose
   statuses name no system condition untouched, and reaches token-only conditions on unlinked tokens (unit tests and
   e2e in Task 5).
5. Applying Unconscious to an actor already Prone creates no second Prone, and removing Unconscious leaves Prone and
   Incapacitated (unit test and e2e in Task 12).
6. An attack chat message created before this change (no `targetConditions`) renders, and an Incapacitated target
   shows Difficulty 2 even with Disadvantage (schema golden in Task 11; unit test in Task 11).
7. Two quarter-base penalties on one stat subtract two quarters of the base, not a quarter of a quarter (base 8 → 4),
   and `nearest` rounds a half up the same way for the element's contribution and the resulting value (Tasks 1, 2).

## Model/Effort directives

- Plan writer: `sdd-plan-writer-opus` (dispatched; this document).
- Execution: subagent-driven development (user's choice), with the mainline session running the dispatch loop.
  Tasks run strictly serially.
- Implementer default: `sdd-implementer` (Sonnet, medium). Escalation ladder when an implementer reports BLOCKED or
  DONE_WITH_CONCERNS citing complexity: `sdd-implementer-highthink` → `sdd-implementer-opus` → the human. Never skip a
  rung. A fix dispatch reuses the tier that produced the task.
- Per-task implementer suggestions: Tasks 1, 6, 10, 13 → `sdd-implementer` (Task 13 may use `sdd-implementer-haiku`:
  two string replacements plus validation). Tasks 2, 3, 4, 7, 8, 12, 14 → `sdd-implementer`. Tasks 5, 9, 11 (migration,
  suppression timing, attack option provenance) → start at `sdd-implementer-highthink`.
- Per-task reviewer: `sdd-reviewer`. Escalate to `sdd-reviewer-opus` for Tasks 5, 7, 9, and 11 (migration, the
  behaviour-preserving pipeline refactor, suppression, and attack provenance), and for any task whose `sdd-reviewer`
  findings read shallow or uncertain.
- Final whole-branch review: `sdd-final-reviewer`, once, after Task 14.
- Dispatch without `name:` (the subagent's final plain-text message is the report). Each prompt names the task, this
  plan's path, the spec's path, the iron-rule paragraph verbatim, and the skills to load.

## Buddy-check directives

To be filled in by the controller after asking the user.

---

## File Structure

Create:

- `src/system/ModBuckets.js` — the stat modifier buckets, their breakdown labels, and the innate-bucket sum (Task 3).
- `src/system/CanonicalSituations.js` — canonical system situation strings by label key (Task 4).
- `src/helpers/migration/SyncConditionEffects.js` — condition-effect sync (Task 5).
- `src/document/types/item/rules-element/RulesElementFactories.js` — operation → factory registry (Task 6).
- `src/document/types/item/rules-element/Immunity.js` — immunity element factory and selectors (Task 8).
- `src/helpers/svelte-components/input/select/ConditionSelect.svelte`,
  `src/document/svelte-components/select/DocumentConditionSelect.svelte`,
  `src/document/types/item/sheet/rules-element/ItemSheetImmunitySettings.svelte` — immunity editor (Task 8).
- `src/document/types/active-effect/IsSuppressedByImmunity.js` — shared `isSuppressed` logic (Task 9).
- `src/helpers/utility-functions/GetTargetedCharacterTokens.js`, `src/helpers/utility-functions/MeasureTokenDistance.js`,
  `src/check/types/attack-check/TargetConditionModifiers.js` — targeting helpers (Task 10).
- `src/check/types/attack-check/dialog/AttackCheckDialogTargetConditionsField.svelte`,
  `src/check/types/attack-check/chat-message/AttackCheckChatTargetConditions.svelte` — dialog row and card (Task 11).
- Tests: `tests/unit/RoundingDirections.test.js`, `tests/unit/ConditionMechanics.test.js`,
  `tests/unit/ModBuckets.test.js`, `tests/unit/SyncConditionEffects.test.js`, `tests/unit/MigrationAction.test.js`,
  `tests/unit/RulesElementOperationRegistry.test.js`, `tests/unit/RulesElementSources.test.js`,
  `tests/unit/Immunity.test.js`, `tests/unit/ApplyEffectToTargets.test.js`, `tests/unit/GetTargetedCharacters.test.js`,
  `tests/unit/MeasureTokenDistance.test.js`, `tests/unit/TargetConditionModifiers.test.js`,
  `tests/unit/Unconscious.test.js`, `tests/unit/ConditionDefinitions.test.js` (rewritten),
  `tests/e2e/rules-element-rounding-editor.spec.js`, `tests/e2e/stat-breakdown-conditions.spec.js`,
  `tests/e2e/condition-checks.spec.js`, `tests/e2e/condition-migration.spec.js`,
  `tests/e2e/rules-element-immunity-editor.spec.js`, `tests/e2e/immunity.spec.js`,
  `tests/e2e/target-conditions.spec.js`, `tests/e2e/unconscious.spec.js`.

Modify:

- `src/system/Conditions.js`, `src/system/ConditionalCheckModifierTypes.js`, `src/system/RulesElementOperations.js`.
- `src/helpers/utility-functions/RoundDirectional.js`, `ComputeMulSumDelta.js`, `CreateModifiableStatTooltip.js`,
  `GetTargetedCharacters.js`, `ApplyEffectToTargets.js`; `src/helpers/TransientDefinitions.js`.
- `src/helpers/svelte-components/label/ModifiableStatValueLabel.svelte` and its seven call sites
  (`CharacterSheetAttribute`, `CharacterSheetResistance`, `CharacterSheetMod`, `CharacterSheetRating`,
  `CharacterSheetResource`, `CharacterSheetSpeed`, `PortraitBars`); `CharacterSheetSkill.svelte`.
- `src/document/types/actor/types/character/CharacterDataModel.js`.
- `src/document/types/active-effect/TitanActiveEffect.js`, `ConditionDataModel.js`, `TitanActiveEffectDataModel.js`.
- `src/document/types/item/rules-element/MulBase.js`, `MulSum.js`;
  `src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`.
- `src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte`, `ItemSheetMulSumSettings.svelte`,
  `ItemSheetRulesElementOperationSelect.svelte`, `ItemSheetRulesElementSettings.svelte`;
  `src/document/svelte-components/input/DocumentTextInput.svelte`.
- `src/check/types/attack-check/AttackCheckOptions.js`, `AttackCheckParameters.js`,
  `dialog/AttackCheckDialogShell.svelte`, `chat-message/AttackCheckChatMessage.svelte`.
- `src/helpers/migration/MigrateWorld.js`, `src/hooks/OnceReady.js`.
- `lang/en.json`, `CHANGELOG.md`; existing tests named per task; `docs/TODO.md`, `docs/CLOSED_BUGS.md`,
  `docs/POST_WORK_FINDINGS.md`, spec B, `.claude/skills/titan-codebase/references/*.md`.
- Module repo (`Data/modules/titan-vttrpg-compendium`): `src/packs/rules/Rules_Reference_mczts3I29Q5vaopp.json`.

---
### Task 1: `nearest` rounding and one rounding-direction list

**Files:**
- Modify: `src/helpers/utility-functions/RoundDirectional.js`, `src/helpers/utility-functions/ComputeMulSumDelta.js`
  (JSDoc only)
- Modify: `src/document/types/item/rules-element/MulBase.js`, `src/document/types/item/rules-element/MulSum.js`
  (typedef JSDoc only)
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte`,
  `src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte`
- Modify: `lang/en.json`, `CHANGELOG.md`
- Test: `tests/unit/RoundDirectional.test.js` (extend), `tests/unit/RoundingDirections.test.js` (create),
  `tests/e2e/rules-element-rounding-editor.spec.js` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `ROUNDING_DIRECTIONS: readonly ['down', 'up', 'nearest']` (named export of `RoundDirectional.js`);
  `roundDirectional(value, rounding)` handles `'nearest'` (`Math.round`). Rules-element editor test ids
  `mulbase-rounding`, `mulsum-rounding`.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/RoundDirectional.test.js`, add inside the `describe('roundDirectional', ...)` block, after the
`'rounds down with floor when rounding is "down"'` test:

```js
   it('rounds to the nearest integer, a half toward positive infinity, when rounding is "nearest"', () => {
      expect(roundDirectional(2.4, 'nearest')).toBe(2);
      expect(roundDirectional(2.5, 'nearest')).toBe(3);
      expect(roundDirectional(-1.5, 'nearest')).toBe(-1);
      expect(roundDirectional(-1.6, 'nearest')).toBe(-2);
   });
```

Create `tests/unit/RoundingDirections.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import roundDirectional, { ROUNDING_DIRECTIONS } from '~/helpers/utility-functions/RoundDirectional.js';

/** @type {string} This test file's directory. */
const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.resolve(TEST_DIRECTORY, '../../lang/en.json'), 'utf-8'));

/** @type {string} The rules-element editor components' directory. */
const EDITOR_DIRECTORY = path.resolve(TEST_DIRECTORY, '../../src/document/types/item/sheet/rules-element');

/**
 * Every rules-element editor that binds an element's `rounding` field, found by scanning the editors, so an editor
 * added later for another rounding operation is checked too.
 * @type {string[]}
 */
const ROUNDING_EDITORS = readdirSync(EDITOR_DIRECTORY)
   .filter((fileName) => fileName.endsWith('.svelte'))
   .filter((fileName) => readFileSync(path.join(EDITOR_DIRECTORY, fileName), 'utf-8')
      .includes('rulesElement[idx].rounding'));

describe('rounding directions', () => {
   it('offers down (the default for a missing rounding), up, and nearest', () => {
      expect(ROUNDING_DIRECTIONS).toEqual([
         'down',
         'up',
         'nearest',
      ]);
   });

   it.each(ROUNDING_DIRECTIONS)('LOCAL labels the %s direction', (direction) => {
      expect(lang.LOCAL[`${direction}.text`]).toBeTypeOf('string');
      expect(lang.LOCAL[`${direction}.text`].length).toBeGreaterThan(0);
   });

   it.each(ROUNDING_DIRECTIONS)('rounding a mulBase contribution %s rounds the resulting value %s', (direction) => {
      for (let base = 1; base <= 8; base++) {
         expect(base + roundDirectional(base * (0.75 - 1), direction), `base ${base}`)
            .toBe(roundDirectional(base * 0.75, direction));
      }
   });

   it('finds the mulBase and mulSum editors', () => {
      expect(ROUNDING_EDITORS).toEqual(expect.arrayContaining([
         'ItemSheetMulBaseSettings.svelte',
         'ItemSheetMulSumSettings.svelte',
      ]));
   });

   it.each(ROUNDING_EDITORS)('%s offers exactly ROUNDING_DIRECTIONS', (fileName) => {
      /** @type {string} The editor source. */
      const source = readFileSync(path.join(EDITOR_DIRECTORY, fileName), 'utf-8');
      expect(source).toContain('options={ROUNDING_DIRECTIONS}');
      expect(source).not.toMatch(/roundingOptions/);
   });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/RoundDirectional.test.js tests/unit/RoundingDirections.test.js`
Expected: FAIL — `roundDirectional(2.5, 'nearest')` is 2, and `ROUNDING_DIRECTIONS` is not exported.

- [ ] **Step 3: Implement `nearest` and the shared list**

Replace the whole of `src/helpers/utility-functions/RoundDirectional.js` with:

```js
/**
 * The rounding directions a multiplicative rules element (`mulBase`, `mulSum`) offers, in editor display order. The
 * single source for both editors' rounding select; `roundDirectional` implements each. `down` is first because an
 * element with no stored `rounding` rounds down, and the Select writes (and its Document wrapper persists) its first
 * option when the bound value is not listed, so opening an editor never changes what the engine applies.
 * @type {readonly string[]}
 */
export const ROUNDING_DIRECTIONS = Object.freeze([
   'down',
   'up',
   'nearest',
]);

/**
 * Rounds a number in an explicit direction for the multiplicative rules elements. `nearest` rounds a half toward
 * positive infinity (`Math.round`). Every direction commutes with adding an integer, so rounding a `mulBase` element's
 * contribution rounds the stat's resulting value the same way, as the rules phrase it ("rounded up").
 * @param {number} value - The number to round.
 * @param {string} [rounding] - The direction: 'up' (ceil), 'down' (floor), or 'nearest' (round). Any other value,
 * including undefined, rounds down.
 * @returns {number} The rounded number.
 */
export default function roundDirectional(value, rounding) {
   switch (rounding) {
      case 'up': {
         return Math.ceil(value);
      }
      case 'nearest': {
         return Math.round(value);
      }
      default: {
         return Math.floor(value);
      }
   }
}
```

In `src/helpers/utility-functions/ComputeMulSumDelta.js`, replace the `@param {string} [rounding]` line with:

```js
 * @param {string} [rounding] - The rounding direction applied to the scaled total (one of ROUNDING_DIRECTIONS).
```

In `src/document/types/item/rules-element/MulBase.js`, replace the `@property {string} [rounding]` line with:

```js
 * @property {string} [rounding] - The rounding direction applied to the scaled base: 'down' (the default when
 * missing), 'up', or 'nearest' (ROUNDING_DIRECTIONS).
```

In `src/document/types/item/rules-element/MulSum.js`, replace the `@property {string} rounding` line with:

```js
 * @property {string} rounding - The rounding direction applied to the scaled total: 'down', 'up', or 'nearest'
 * (ROUNDING_DIRECTIONS).
```

- [ ] **Step 4: Point both editors at the shared list**

In `src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte`:
(a) add after the `DocumentNumberInput` import line:

```js
   import { ROUNDING_DIRECTIONS } from '~/helpers/utility-functions/RoundDirectional.js';
```

(b) delete the whole block

```js
   /** @type {string[]} Options for the rounding direction. */
   const roundingOptions = [
      'up',
      'down',
   ];
```

(c) replace the `<!--Rounding-->` field with:

```svelte
   <!--Rounding-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].rounding}
         options={ROUNDING_DIRECTIONS}
         testId={'mulbase-rounding'}
      />
   </div>
```

Make the same three edits in `ItemSheetMulSumSettings.svelte` (its import block also ends with the
`DocumentSpeedSelect` import; add the `ROUNDING_DIRECTIONS` import after it), with `testId={'mulsum-rounding'}`.

- [ ] **Step 5: Localize the new direction and start the changelog**

In `lang/en.json`, inside `LOCAL`, insert in alphabetical key order:

```json
      "nearest.text": "Nearest",
```

At the top of `CHANGELOG.md`, above `## Version 2.1.0:`, insert:

```markdown
## Unreleased:
Conditions follow the 2026-09-26 rules.
- Multiply Base and Multiply Sum rules elements can round to the nearest whole number.

```

- [ ] **Step 6: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/RoundDirectional.test.js tests/unit/RoundingDirections.test.js`
Expected: PASS.

- [ ] **Step 7: Write the editor e2e**

Create `tests/e2e/rules-element-rounding-editor.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { readTitanSelectValue, selectTitanOption, titanSelectOptionValues } from './select.js';

/**
 * The mulBase and mulSum editors' rounding select offers every rounding direction and stores the chosen one.
 */

/** @type {string} Name of the world ability item this spec edits. */
const ITEM_NAME = 'E2E Rounding Editor';

/**
 * The rounding directions, read from their single source (`ROUNDING_DIRECTIONS`) so the expectation follows the code.
 * @type {string[]}
 */
const ROUNDING_DIRECTIONS = [
   ...readFileSync(fileURLToPath(new URL('../../src/helpers/utility-functions/RoundDirectional.js', import.meta.url)),
      'utf-8')
      .match(/ROUNDING_DIRECTIONS = Object\.freeze\(\[([\s\S]*?)\]\)/)[1]
      .matchAll(/'(\w+)'/g),
].map((match) => match[1]);

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.beforeEach(async () => {
   // Rebuild the item with one mulBase and one mulSum element and open its Rules Elements tab.
   await page.evaluate(async (name) => {
      await game.items.getName(name)?.delete();

      /** @type {TitanItem} The rebuilt ability. */
      const item = await Item.create({
         name,
         type: 'ability',
         system: {
            rulesElement: [
               {
                  key: 'body',
                  operation: 'mulBase',
                  rounding: 'down',
                  selector: 'attribute',
                  uuid: 'e2e-rounding-mulbase',
                  value: 2,
               },
               {
                  key: 'stride',
                  operation: 'mulSum',
                  rounding: 'up',
                  selector: 'speed',
                  uuid: 'e2e-rounding-mulsum',
                  value: 0.5,
               },
            ],
         },
      });
      /** @type {TitanItemSheet} The rendered item sheet. */
      const app = await item.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
   }, ITEM_NAME);

   /** @type {string} The localized Rules Elements tab label. */
   const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
   await openSheetTab(page, label);
   await expect(sheet().getByTestId('mulbase-rounding')).toBeVisible();
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((name) => game.items.getName(name)?.delete(), ITEM_NAME);
   await page?.close();
});

/**
 * Locates the open item sheet.
 * @returns {import('@playwright/test').Locator} The sheet window.
 */
function sheet() {
   return page.locator('.application.titan-document-sheet');
}

/**
 * Reads the stored rounding of one of the item's rules elements.
 * @param {number} index - The element's index.
 * @returns {Promise<string>} The element's `rounding`.
 */
function readRounding(index) {
   return page.evaluate(
      ({ name, elementIndex }) => game.items.getName(name).system.rulesElement[elementIndex].rounding,
      {
         elementIndex: index,
         name: ITEM_NAME,
      },
   );
}

for (const [testId, index] of [
   [
      'mulbase-rounding',
      0,
   ],
   [
      'mulsum-rounding',
      1,
   ],
]) {
   test(`the ${testId} select offers every rounding direction and stores nearest`, async () => {
      /** @type {import('@playwright/test').Locator} The rounding select's trigger. */
      const trigger = sheet().getByTestId(testId);
      expect(await titanSelectOptionValues(page, trigger)).toEqual(ROUNDING_DIRECTIONS);

      await selectTitanOption(page, trigger, 'nearest');
      await expect.poll(() => readRounding(index), { message: 'nearest is stored' }).toBe('nearest');
      expect(await readTitanSelectValue(trigger)).toBe('nearest');
   });
}
```

- [ ] **Step 8: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm run stylelint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/rules-element-rounding-editor.spec.js tests/e2e/rules-element-crud.spec.js` → all pass.

- [ ] **Step 9: Commit**

```bash
git branch --show-current
git status --short
git add src/helpers/utility-functions/RoundDirectional.js src/helpers/utility-functions/ComputeMulSumDelta.js \
   src/document/types/item/rules-element/MulBase.js src/document/types/item/rules-element/MulSum.js \
   src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte \
   src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte lang/en.json CHANGELOG.md \
   tests/unit/RoundDirectional.test.js tests/unit/RoundingDirections.test.js \
   tests/e2e/rules-element-rounding-editor.spec.js
git commit -F - <<'EOF'
feat(rules-elements): nearest rounding for mulBase and mulSum

Both editors read one ROUNDING_DIRECTIONS list, led by down (the engine
default for a missing rounding), and a guard test keeps every editor that
binds rounding on it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 2: Quarter-of-base condition penalties and Off-Balance

**Files:**
- Modify: `src/system/Conditions.js`, `lang/en.json`, `CHANGELOG.md`
- Test: `tests/unit/ConditionDefinitions.test.js` (rewrite), `tests/unit/ConditionMechanics.test.js` (create),
  `tests/e2e/logic/conditions.spec.js` (rewrite), `tests/e2e/integration-manifest.spec.js`

**Interfaces:**
- Consumes: `mulBase` with `rounding: 'up'` (existing `_applyMulBaseElements`).
- Produces: condition definitions (`buildConditionDefinitions()`) for Blinded, Contaminated, Off-Balance (`offBalance`),
  Prone, Restrained, Stunned per the table below; the module-private `createQuarterBasePenalty(conditionId, selector,
  key, uuidSuffix = key)`.

| Condition | Rules elements after this task |
|---|---|
| Blinded | `mulBase` 0.75 up on ratings melee, accuracy, defense |
| Contaminated | `mulBase` 0.75 up on attribute `all` (`-attributes`), resistance `all` (`-resistances`) |
| Off-Balance | `mulBase` 0.75 up on ratings accuracy, awareness, melee, defense; icon `icons/svg/daze.svg` |
| Prone | `mulSum` 0.5 up on speed `all` (unchanged); `mulBase` 0.75 up on ratings melee, accuracy |
| Restrained | `mulBase` 0.75 up on ratings melee, accuracy, defense; `setSum` speed `all` 0 (unchanged) |
| Stunned | `mulBase` 0.75 up on rating defense |

- [ ] **Step 1: Write the failing definition tests**

Replace the whole of `tests/unit/ConditionDefinitions.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildConditionDefinitions } from '~/system/Conditions.js';

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(
   path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../lang/en.json'),
   'utf-8',
));

/**
 * Returns the condition definition with the given id from buildConditionDefinitions().
 * @param {string} id - The condition id.
 * @returns {object} The matching definition.
 */
function def(id) {
   return buildConditionDefinitions().find((condition) => condition.id === id);
}

/**
 * Builds the expected "-¼ of base value, rounded up" element: `mulBase` 0.75, rounded up.
 * @param {string} id - The condition id.
 * @param {string} selector - The stat type.
 * @param {string} key - The stat key.
 * @param {string} [uuidSuffix] - The uuid's last segment; defaults to the key.
 * @returns {object} The expected element.
 */
function quarterPenalty(id, selector, key, uuidSuffix = key) {
   return {
      operation: 'mulBase',
      selector,
      key,
      value: 0.75,
      rounding: 'up',
      uuid: `condition-${id}-${uuidSuffix}`,
   };
}

describe('buildConditionDefinitions', () => {
   it('marks every condition as the condition subtype named by its LOCAL key', () => {
      for (const condition of buildConditionDefinitions()) {
         expect(condition.type, `${condition.id} should be the condition subtype`).toBe('condition');
         expect(condition.name).toBe(`LOCAL.${condition.id}.text`);
      }
   });

   it('localizes every condition name and description', () => {
      for (const condition of buildConditionDefinitions()) {
         expect(lang.LOCAL[`${condition.id}.text`], `${condition.id}.text`).toBeTypeOf('string');
         expect(lang.LOCAL[`${condition.id}.desc.text`], `${condition.id}.desc.text`).toBeTypeOf('string');
      }
   });

   it('gives every rules element a unique condition-<id>- uuid', () => {
      /** @type {string[]} Every rules element uuid across the definitions. */
      const uuids = [];
      for (const condition of buildConditionDefinitions()) {
         for (const element of condition.system?.rulesElement ?? []) {
            expect(element.uuid.startsWith(`condition-${condition.id}-`), element.uuid).toBe(true);
            uuids.push(element.uuid);
         }
      }
      expect(new Set(uuids).size).toBe(uuids.length);
   });

   it('seeds blinded with -¼ of base melee, accuracy, and defense', () => {
      expect(def('blinded').system.rulesElement).toEqual([
         quarterPenalty('blinded', 'rating', 'melee'),
         quarterPenalty('blinded', 'rating', 'accuracy'),
         quarterPenalty('blinded', 'rating', 'defense'),
      ]);
   });

   it('seeds contaminated with -¼ of every base attribute and resistance', () => {
      expect(def('contaminated').system.rulesElement).toEqual([
         quarterPenalty('contaminated', 'attribute', 'all', 'attributes'),
         quarterPenalty('contaminated', 'resistance', 'all', 'resistances'),
      ]);
   });

   it('defines off-balance with the daze icon and -¼ of base accuracy, awareness, melee, and defense', () => {
      expect(def('offBalance')).toMatchObject({
         img: 'icons/svg/daze.svg',
         name: 'LOCAL.offBalance.text',
         type: 'condition',
      });
      expect(def('offBalance').system.rulesElement).toEqual([
         quarterPenalty('offBalance', 'rating', 'accuracy'),
         quarterPenalty('offBalance', 'rating', 'awareness'),
         quarterPenalty('offBalance', 'rating', 'melee'),
         quarterPenalty('offBalance', 'rating', 'defense'),
      ]);
   });

   it('seeds prone with halved speed (round up) and -¼ of base melee and accuracy', () => {
      expect(def('prone').system.rulesElement).toEqual([
         {
            operation: 'mulSum',
            selector: 'speed',
            key: 'all',
            value: 0.5,
            rounding: 'up',
            uuid: 'condition-prone-speed',
         },
         quarterPenalty('prone', 'rating', 'melee'),
         quarterPenalty('prone', 'rating', 'accuracy'),
      ]);
   });

   it('seeds restrained with -¼ of base melee, accuracy, and defense and speed set to 0', () => {
      expect(def('restrained').system.rulesElement).toEqual([
         quarterPenalty('restrained', 'rating', 'melee'),
         quarterPenalty('restrained', 'rating', 'accuracy'),
         quarterPenalty('restrained', 'rating', 'defense'),
         {
            operation: 'setSum',
            selector: 'speed',
            key: 'all',
            value: 0,
            mode: 'set',
            uuid: 'condition-restrained-speed',
         },
      ]);
   });

   it('seeds stunned with -¼ of base defense', () => {
      expect(def('stunned').system.rulesElement).toEqual([
         quarterPenalty('stunned', 'rating', 'defense'),
      ]);
   });

   it('seeds sleeping with halved awareness (round up)', () => {
      expect(def('sleeping').system.rulesElement).toEqual([
         {
            operation: 'mulSum',
            selector: 'rating',
            key: 'awareness',
            value: 0.5,
            rounding: 'up',
            uuid: 'condition-sleeping-awareness',
         },
      ]);
   });

   it('leaves the conditions without stat mechanics without rules elements', () => {
      for (const id of [
         'dead',
         'deafened',
         'frightened',
         'incapacitated',
         'unconscious',
      ]) {
         expect(def(id).system, `${id} should have no system.rulesElement`).toBeUndefined();
      }
   });
});
```

- [ ] **Step 2: Write the failing mechanics tests**

Create `tests/unit/ConditionMechanics.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import { buildConditionDefinitions } from '~/system/Conditions.js';

// Condition mechanics through the real rules-element pipeline: a bare CharacterDataModel (Object.create over the
// prototype) whose parent carries the conditions as `condition`-subtype Active Effects runs `_applyRulesElements`, and
// each stat's total is read the way `_applyMods` sums it. The model is imported after the Foundry stand-ins are
// installed; dynamic import in beforeAll is permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * Returns the condition definition with the given id.
 * @param {string} id - The condition id.
 * @returns {object} The definition.
 */
function definition(id) {
   return buildConditionDefinitions().find((condition) => condition.id === id);
}

/**
 * Builds a stat at the given base with every mod bucket at 0.
 * @param {number} base - The stat's base value.
 * @returns {{baseValue: number, mod: Record<string, number>}} The stat.
 */
function stat(base) {
   return {
      baseValue: base,
      mod: {
         static: 0,
         equipment: 0,
         effect: 0,
         ability: 0,
         condition: 0,
      },
   };
}

/**
 * Builds a bare Character carrying the given conditions as enabled `condition` Active Effects, with every attribute,
 * resistance, rating, and speed at the given base.
 * @param {string[]} conditionIds - The condition ids to carry.
 * @param {number} [base] - The base of every stat.
 * @returns {object} The model, after `_applyRulesElements`.
 */
function createConditionedCharacter(conditionIds, base = 8) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      effects: new Map(conditionIds.map((id, index) => [
         `condition${index}`,
         {
            disabled: false,
            id: `condition${index}`,
            name: id,
            statuses: new Set([id]),
            system: {
               rulesElement: structuredClone(definition(id).system?.rulesElement ?? []),
            },
            type: 'condition',
         },
      ])),
      items: new Map(),
      rulesElementsCache: {},
   };
   model.equipped = {
      armor: null,
      shield: null,
   };
   model.attribute = {
      body: stat(base),
      mind: stat(base),
      soul: stat(base),
   };
   model.resistance = {
      reflexes: stat(base),
      resilience: stat(base),
      willpower: stat(base),
   };
   model.rating = {
      accuracy: stat(base),
      awareness: stat(base),
      defense: stat(base),
      initiative: stat(base),
      melee: stat(base),
   };
   model.speed = {
      burrow: stat(base),
      climb: stat(base),
      fly: stat(base),
      stride: stat(base),
      swim: stat(base),
   };
   model._applyRulesElements();
   return model;
}

/**
 * Totals a stat the way `_applyMods` does: its base plus each mod bucket in order, floored at 0 after each.
 * @param {{baseValue: number, mod: Record<string, number>}} statData - The stat.
 * @returns {number} The stat's value.
 */
function total(statData) {
   /** @type {number} The running value. */
   let value = statData.baseValue;
   for (const mod of Object.values(statData.mod)) {
      value = Math.max(value + mod, 0);
   }
   return value;
}

describe('quarter-of-base condition penalties', () => {
   it.each([
      [
         1,
         1,
      ],
      [
         2,
         2,
      ],
      [
         3,
         3,
      ],
      [
         4,
         3,
      ],
      [
         5,
         4,
      ],
      [
         6,
         5,
      ],
      [
         7,
         6,
      ],
      [
         8,
         6,
      ],
   ])('Stunned leaves a base-%i Defense at %i (¾ of the base, rounded up)', (base, expected) => {
      expect(total(createConditionedCharacter(['stunned'], base).rating.defense)).toBe(expected);
   });

   it('stacks Blinded and Off-Balance additively: each subtracts a quarter of base 8 Defense, leaving 4', () => {
      expect(total(createConditionedCharacter([
         'blinded',
         'offBalance',
      ]).rating.defense)).toBe(4);
   });

   it('Blinded lowers base-8 Melee, Accuracy, and Defense to 6 and leaves Awareness', () => {
      /** @type {object} The Blinded character. */
      const model = createConditionedCharacter(['blinded']);
      expect(total(model.rating.melee)).toBe(6);
      expect(total(model.rating.accuracy)).toBe(6);
      expect(total(model.rating.defense)).toBe(6);
      expect(total(model.rating.awareness)).toBe(8);
   });

   it('Contaminated lowers every base-8 attribute and resistance to 6', () => {
      /** @type {object} The Contaminated character. */
      const model = createConditionedCharacter(['contaminated']);
      for (const stats of [
         model.attribute,
         model.resistance,
      ]) {
         for (const [key, statData] of Object.entries(stats)) {
            expect(total(statData), key).toBe(6);
         }
      }
   });

   it('Off-Balance lowers base-8 Accuracy, Awareness, Melee, and Defense to 6', () => {
      /** @type {object} The Off-Balance character. */
      const model = createConditionedCharacter(['offBalance']);
      for (const key of [
         'accuracy',
         'awareness',
         'melee',
         'defense',
      ]) {
         expect(total(model.rating[key]), key).toBe(6);
      }
      expect(total(model.rating.initiative)).toBe(8);
   });

   it('Prone halves base-8 speeds and lowers Melee and Accuracy to 6', () => {
      /** @type {object} The Prone character. */
      const model = createConditionedCharacter(['prone']);
      expect(total(model.speed.stride)).toBe(4);
      expect(total(model.rating.melee)).toBe(6);
      expect(total(model.rating.accuracy)).toBe(6);
      expect(total(model.rating.defense)).toBe(8);
   });

   it('Restrained zeroes speed and lowers Melee, Accuracy, and Defense to 6', () => {
      /** @type {object} The Restrained character. */
      const model = createConditionedCharacter(['restrained']);
      expect(total(model.speed.stride)).toBe(0);
      expect(total(model.rating.melee)).toBe(6);
      expect(total(model.rating.accuracy)).toBe(6);
      expect(total(model.rating.defense)).toBe(6);
   });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ConditionDefinitions.test.js tests/unit/ConditionMechanics.test.js`
Expected: FAIL — the definitions still carry flat -1 elements and `offBalance` is undefined.

- [ ] **Step 4: Rewrite the stat conditions**

In `src/system/Conditions.js`, insert after the two import lines:

```js

/**
 * Builds a condition's "-¼ of their base value, rounded up" penalty: a `mulBase` element scaling the stat's base by ¾
 * and rounding the resulting value up (base 4 → 3, base 5 → 4; bases 1-3 keep their value). `mulBase` adds
 * `base × (value − 1)` per element, so two such conditions on one stat each subtract a quarter of the base
 * (base 8 → 4).
 * Source: TITAN Rules Compendium (09_26_2026), "Conditions".
 * @param {string} conditionId - The condition id, which names the element's uuid (`condition-<id>-<uuidSuffix>`).
 * @param {string} selector - The stat type (`rating`, `attribute`, or `resistance`).
 * @param {string} key - The stat key, or `all` for every stat under the selector.
 * @param {string} [uuidSuffix] - The uuid's last segment; defaults to the key.
 * @returns {MulBaseElement} The element.
 */
function createQuarterBasePenalty(conditionId, selector, key, uuidSuffix = key) {
   return {
      operation: 'mulBase',
      selector,
      key,
      value: 0.75,
      rounding: 'up',
      uuid: `condition-${conditionId}-${uuidSuffix}`,
   };
}
```

Then, in `buildConditionDefinitions()`:

(a) Replace the `blinded` entry's `rulesElement` array with:

```js
            rulesElement: [
               createQuarterBasePenalty('blinded', 'rating', 'melee'),
               createQuarterBasePenalty('blinded', 'rating', 'accuracy'),
               createQuarterBasePenalty('blinded', 'rating', 'defense'),
            ],
```

(b) Replace the `contaminated` entry's `rulesElement` array with:

```js
            rulesElement: [
               createQuarterBasePenalty('contaminated', 'attribute', 'all', 'attributes'),
               createQuarterBasePenalty('contaminated', 'resistance', 'all', 'resistances'),
            ],
```

(c) Insert a new entry between the `incapacitated` entry and the `prone` entry:

```js
      {
         id: 'offBalance',
         name: 'LOCAL.offBalance.text',
         img: 'icons/svg/daze.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createQuarterBasePenalty('offBalance', 'rating', 'accuracy'),
               createQuarterBasePenalty('offBalance', 'rating', 'awareness'),
               createQuarterBasePenalty('offBalance', 'rating', 'melee'),
               createQuarterBasePenalty('offBalance', 'rating', 'defense'),
            ],
         },
      },
```

(d) In the `prone` entry, keep the `mulSum` element and replace the two `flatModifier` elements after it with:

```js
               createQuarterBasePenalty('prone', 'rating', 'melee'),
               createQuarterBasePenalty('prone', 'rating', 'accuracy'),
```

(e) In the `restrained` entry, replace the three `flatModifier` elements (keep the `setSum` element after them) with:

```js
               createQuarterBasePenalty('restrained', 'rating', 'melee'),
               createQuarterBasePenalty('restrained', 'rating', 'accuracy'),
               createQuarterBasePenalty('restrained', 'rating', 'defense'),
```

(f) Replace the `stunned` entry's `rulesElement` array with:

```js
            rulesElement: [
               createQuarterBasePenalty('stunned', 'rating', 'defense'),
            ],
```

- [ ] **Step 5: Localize Off-Balance and the 09_26 condition text**

In `lang/en.json` (`LOCAL`), insert in alphabetical key order:

```json
      "offBalance.desc.text": "<p>An <strong>Off-Balance</strong> creature is physically disorientated by a sudden shock.</p><p><strong>Off-Balance</strong> creatures decrease their <strong>Accuracy</strong>, <strong>Awareness</strong>, <strong>Melee</strong>, and <strong>Defense</strong> by <strong>-¼</strong> of their base value, rounded up.</p>",
      "offBalance.text": "Off-Balance",
```

Replace these existing values (keys unchanged):

```json
      "blinded.desc.text": "<p>A <strong>Blinded</strong> creature cannot see.</p><p>A <strong>Blinded</strong> creature automatically fails any <strong>Awareness</strong> and <strong>Perception</strong> checks that rely on sight.</p><p>A <strong>Blinded</strong> creature's <strong>Melee</strong>, <strong>Accuracy</strong>, and <strong>Defense</strong> decrease by <strong>-¼</strong> of their base value, rounded up.</p>",
      "contaminated.desc.text": "<p>A <strong>Contaminated</strong> creature has been sickened by a disease, poison, or other contaminant.</p><p><strong>Contaminated</strong> creatures decrease their <strong>Attributes</strong> and <strong>Resistances</strong> by <strong>-¼</strong> of their base value, rounded up.</p>",
      "prone.desc.text": "<p>A <strong>Prone</strong> creature has their <strong>Speed</strong> reduced by <strong>½</strong>, rounded up.</p><p>The creature's <strong>Melee</strong> and <strong>Accuracy</strong> are decreased by <strong>-¼</strong> of their base value, rounded up.</p><p>A creature attacking a <strong>Prone</strong> creature within <strong>1 space</strong> increases their <strong>Melee</strong> or <strong>Accuracy</strong> by <strong>+¼</strong> of their base value, rounded up.</p><p>A creature attacking a <strong>Prone</strong> target at a distance greater than <strong>10 spaces</strong> decreases their <strong>Accuracy</strong> by <strong>-¼</strong> of their base value per <strong>10 spaces</strong>, rounded up.</p><p>Standing up from <strong>Prone</strong> may be done with a <strong>Move</strong> or an <strong>Action</strong>.</p>",
      "restrained.desc.text": "<p>A <strong>Restrained</strong> creature cannot move.</p><p>Additionally, their <strong>Melee</strong>, <strong>Accuracy</strong>, and <strong>Defense</strong> decrease by <strong>-¼</strong> of their base value, rounded up, and they automatically fail <strong>Reflexes</strong> checks.</p>",
      "stunned.desc.text": "<p>A <strong>Stunned</strong> creature can take an <strong>Action</strong>, or a <strong>Move</strong>, but not both.</p><p>A <strong>Stunned</strong> creature cannot spend Resolve to take an additional Action.</p><p>A <strong>Stunned</strong> creature's <strong>Defense</strong> decreases by <strong>-¼</strong> of their base value, rounded up.</p>",
```

In `CHANGELOG.md`, append to the `## Unreleased:` list:

```markdown
- Blinded, Contaminated, Prone, Restrained, and Stunned lower their stats by a quarter of the base value, rounded up,
  instead of by 1. The new Off-Balance condition lowers Accuracy, Awareness, Melee, and Defense the same way.
```

- [ ] **Step 6: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/ConditionDefinitions.test.js tests/unit/ConditionMechanics.test.js`
Expected: PASS.

- [ ] **Step 7: Rewrite the condition e2e for base-scaled penalties**

Replace the whole of `tests/e2e/logic/conditions.spec.js` with:

```js
import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from '../world.js';
import { buildRulesElementAbilityData } from '../../shared/builders.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Behavioral coverage of condition mechanics against the live derived-data pipeline. Each test builds a player actor
 * whose attributes and rating skills are raised so every rating base is 8 (a quarter of the base is a whole 2), adds a
 * flat "boost" ability so each stat sits well above 0, captures a baseline, applies the conditions, and asserts each
 * stat's change from that baseline.
 */
const ACTOR_NAME = 'E2E Condition Actor';

// A boost ability covering every stat the condition tests read: ratings +5, all attributes +4, all resistances +4,
// stride speed +6.
const BOOST_ELEMENTS = [
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'melee',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'accuracy',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'defense',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'awareness',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'all',
      value: 4,
   },
   {
      operation: 'flatModifier',
      selector: 'resistance',
      key: 'all',
      value: 4,
   },
   {
      operation: 'flatModifier',
      selector: 'speed',
      key: 'stride',
      value: 6,
   },
];

/**
 * The base values the fixture actor is raised to: Body, Mind, and Soul 8, and 8 Training in the skills the ratings
 * read, so Melee, Accuracy, Defense, and Awareness have base 8 and every Resistance base 12.
 * @type {object}
 */
const BASE_DATA = {
   attribute: {
      body: { baseValue: 8 },
      mind: { baseValue: 8 },
      soul: { baseValue: 8 },
   },
   skill: {
      dexterity: { training: { baseValue: 8 } },
      meleeWeapons: { training: { baseValue: 8 } },
      perception: { training: { baseValue: 8 } },
      rangedWeapons: { training: { baseValue: 8 } },
   },
};

/**
 * The change one "-¼ of base value, rounded up" penalty makes: ¾ of the base, rounded up, minus the base.
 * @param {number} base - The stat's base value.
 * @returns {number} The (non-positive) change.
 */
function quarterPenalty(base) {
   return Math.ceil(base * 0.75) - base;
}

test.describe('conditions — derived-stat mechanics', () => {
   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });

   test.afterEach(async () => {
      await page.evaluate(async (name) => {
         await game.actors.getName(name)?.delete();
      }, ACTOR_NAME);
   });

   /**
    * Creates the boosted actor, captures a baseline snapshot, applies the conditions, and returns
    * `{ baseline, after }` snapshots (`{ base, value }` per attribute, resistance, and rating, plus the stride value).
    * @param {string[]} statusIds - The status effect ids to apply.
    * @returns {Promise<{baseline: object, after: object}>} Before and after derived-stat snapshots.
    */
   async function applyConditions(statusIds) {
      return page.evaluate(async ({ name, abilityData, baseData, ids }) => {
         await game.actors.getName(name)?.delete();
         const actor = await Actor.create({
            name,
            type: 'player',
            system: baseData,
         });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await titanWait(() => actor.system.rating.melee.baseValue === 8 && actor.system.attribute.body.value > 8, {
            message: 'raised bases and the boost ability applied',
         });

         const read = (stats) => Object.fromEntries(Object.entries(stats).map(([key, stat]) => [
            key,
            {
               base: stat.baseValue,
               value: stat.value,
            },
         ]));
         const snapshot = () => ({
            attribute: read(actor.system.attribute),
            rating: read(actor.system.rating),
            resistance: read(actor.system.resistance),
            stride: actor.system.speed.stride.value,
         });

         const baseline = snapshot();
         for (const id of ids) {
            await actor.toggleStatusEffect(id, { active: true });
         }
         // The conditions are in the actor's statuses once the toggles reached the recomputed derived data.
         await titanWait(() => ids.every((id) => actor.statuses?.has(id)), {
            message: `conditions ${ids.join(', ')} applied to actor`,
         });

         return {
            baseline,
            after: snapshot(),
         };
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E Condition Boost', BOOST_ELEMENTS),
         baseData: BASE_DATA,
         ids: statusIds,
      });
   }

   /**
    * Asserts that each named rating dropped by one quarter-of-base penalty (times `count`).
    * @param {{baseline: object, after: object}} snapshots - The before and after snapshots.
    * @param {string[]} keys - The rating keys.
    * @param {number} [count] - How many quarter penalties apply.
    */
   function expectRatingPenalty({ baseline, after }, keys, count = 1) {
      for (const key of keys) {
         expect(after.rating[key].value, key)
            .toBe(baseline.rating[key].value + (count * quarterPenalty(baseline.rating[key].base)));
      }
   }

   test('blinded lowers melee, accuracy, and defense by a quarter of their base', async () => {
      expectRatingPenalty(await applyConditions(['blinded']), [
         'melee',
         'accuracy',
         'defense',
      ]);
   });

   test('contaminated lowers every attribute and resistance by a quarter of its base', async () => {
      const { baseline, after } = await applyConditions(['contaminated']);
      for (const group of [
         'attribute',
         'resistance',
      ]) {
         for (const [key, stat] of Object.entries(baseline[group])) {
            expect(after[group][key].value, `${group} ${key}`).toBe(stat.value + quarterPenalty(stat.base));
         }
      }
   });

   test('off-balance lowers accuracy, awareness, melee, and defense by a quarter of their base', async () => {
      expectRatingPenalty(await applyConditions(['offBalance']), [
         'accuracy',
         'awareness',
         'melee',
         'defense',
      ]);
   });

   test('stunned lowers defense by a quarter of its base', async () => {
      expectRatingPenalty(await applyConditions(['stunned']), ['defense']);
   });

   test('prone halves speed (round up) and lowers melee and accuracy by a quarter of their base', async () => {
      const snapshots = await applyConditions(['prone']);
      expect(snapshots.after.stride).toBe(Math.ceil(snapshots.baseline.stride / 2));
      expectRatingPenalty(snapshots, [
         'melee',
         'accuracy',
      ]);
   });

   test('restrained sets speed to 0 and lowers melee, accuracy, and defense by a quarter of their base', async () => {
      const snapshots = await applyConditions(['restrained']);
      expect(snapshots.after.stride).toBe(0);
      expectRatingPenalty(snapshots, [
         'melee',
         'accuracy',
         'defense',
      ]);
   });

   test('blinded and off-balance each take a quarter of base defense', async () => {
      expectRatingPenalty(await applyConditions([
         'blinded',
         'offBalance',
      ]), ['defense'], 2);
   });

   test('sleeping halves awareness (round up)', async () => {
      const { baseline, after } = await applyConditions(['sleeping']);
      expect(after.rating.awareness.value).toBe(Math.ceil(baseline.rating.awareness.value / 2));
   });

   test('an inert condition (dead) changes no derived stats', async () => {
      const { baseline, after } = await applyConditions(['dead']);
      expect(after).toEqual(baseline);
   });
});
```

- [ ] **Step 8: Derive the manifest's condition list from its source**

In `tests/e2e/integration-manifest.spec.js`, replace

```js
      // The condition ids the system pushes onto CONFIG.statusEffects.
      const expectedConditions = [
```

and the eleven-entry array literal that follows (through its closing `];`) with:

```js
      // The condition ids the system pushes onto CONFIG.statusEffects, read from their single source so a condition
      // added to buildConditionDefinitions is expected here too.
      /** @type {string[]} The `id:` values of src/system/Conditions.js. */
      const expectedConditions = [
         ...fs.readFileSync(fileURLToPath(new URL('../../src/system/Conditions.js', import.meta.url)), 'utf-8')
            .matchAll(/^\s+id: '(\w+)',$/gm),
      ].map((match) => match[1]);
      expect(expectedConditions).toContain('offBalance');
```

(`fs` and `fileURLToPath` are already imported at the top of that file.)

- [ ] **Step 9: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/logic/conditions.spec.js tests/e2e/integration-manifest.spec.js
tests/e2e/player-hud-effects-panel.spec.js` → all pass.

- [ ] **Step 10: Commit**

```bash
git branch --show-current
git status --short
git add src/system/Conditions.js lang/en.json CHANGELOG.md tests/unit/ConditionDefinitions.test.js \
   tests/unit/ConditionMechanics.test.js tests/e2e/logic/conditions.spec.js tests/e2e/integration-manifest.spec.js
git commit -F - <<'EOF'
feat(conditions): quarter-of-base penalties and the Off-Balance condition

Blinded, Contaminated, Prone, Restrained, and Stunned apply mulBase 0.75
rounded up (the 09_26 "-1/4 of base value, rounded up"); Off-Balance joins
with the daze icon. The integration manifest reads the condition ids from
Conditions.js instead of a hand list.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 3: Stat breakdowns list every modifier bucket, conditions included

Bug fix (logged as `docs/CLOSED_BUGS.md` #75 in Task 14): no stat breakdown tooltip (sheet attributes, resistances,
ratings, resources, speeds, mods, skill Training/Expertise, Player HUD bars) lists condition modifiers, and the Speed
and Mod rows omit Abilities, because each call site hand-passes per-bucket props.

**Files:**
- Create: `src/system/ModBuckets.js`
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (`_resetDynamicMods`)
- Modify: `src/helpers/utility-functions/CreateModifiableStatTooltip.js`,
  `src/helpers/svelte-components/label/ModifiableStatValueLabel.svelte`, `src/helpers/TransientDefinitions.js`
- Modify: `src/document/types/actor/types/character/sheet/header/CharacterSheetAttribute.svelte`,
  `.../header/CharacterSheetResistance.svelte`, `.../sidebar/CharacterSheetMod.svelte`,
  `.../sidebar/CharacterSheetRating.svelte`, `.../sidebar/CharacterSheetResource.svelte`,
  `.../sidebar/CharacterSheetSpeed.svelte`, `src/ui/player-hud/elements/portrait/PortraitBars.svelte`,
  `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte`
- Modify: `CHANGELOG.md`
- Test: `tests/unit/ModBuckets.test.js` (create), `tests/e2e/component-probe-labels.spec.js`,
  `tests/e2e/stat-breakdown-conditions.spec.js` (create)

**Interfaces:**
- Produces: `DYNAMIC_MOD_BUCKETS: readonly ['equipment', 'effect', 'ability', 'condition']`;
  `MOD_BUCKET_LABELS: Readonly<Record<string, string>>` (bucket → LOCAL label key, keys in
  `[...DYNAMIC_MOD_BUCKETS, 'static']` order); `INNATE_MOD_BUCKETS: readonly ['ability', 'equipment']`;
  `getInnateModTotal(mod?: Record<string, number>): number`. `createModifiableStatTooltip(baseValue, mod, extraMod,
  baseTooltip)` (new signature). `ModifiableStatValueLabel` props: `baseValue`, `value`, `valueOverride`, `mod`,
  `baseTooltip`, `testId`. Sheet rating label test id `sheet-rating-<rating>`.

- [ ] **Step 1: Pin the bucket order `_applyMods` depends on**

`_applyMods` floors a stat at 0 after each bucket in the `mod` object's key order, so the order `_resetDynamicMods`
first adds the buckets in is behaviour. Create `tests/unit/ModBuckets.test.js` with only this test first:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * Builds a stored stat with only its persisted static bucket.
 * @returns {{mod: Record<string, number>}} The stat.
 */
function storedStat() {
   return {
      mod: {
         static: 0,
      },
   };
}

describe('_resetDynamicMods', () => {
   it('adds the dynamic buckets after static in equipment, effect, ability, condition order', () => {
      /** @type {object} A bare Character with one stat of every kind. */
      const model = Object.create(CharacterDataModel.prototype);
      model.attribute = { body: storedStat() };
      model.skill = {
         arcana: {
            expertise: storedStat(),
            training: storedStat(),
         },
      };
      model.resource = { stamina: storedStat() };
      model.resistance = { reflexes: storedStat() };
      model.rating = { defense: storedStat() };
      model.speed = { stride: storedStat() };
      model.mod = { armor: storedStat() };
      model._resetDynamicMods();
      for (const statData of [
         model.attribute.body,
         model.skill.arcana.training,
         model.skill.arcana.expertise,
         model.resource.stamina,
         model.resistance.reflexes,
         model.rating.defense,
         model.speed.stride,
         model.mod.armor,
      ]) {
         expect(Object.keys(statData.mod)).toEqual([
            'static',
            'equipment',
            'effect',
            'ability',
            'condition',
         ]);
      }
   });
});
```

Run: `npx vitest run tests/unit/ModBuckets.test.js`
Expected: PASS on the current code (it pins existing behaviour). Commit it alone:

```bash
git add tests/unit/ModBuckets.test.js
git commit -F - <<'EOF'
test(stats): pin the mod bucket order _applyMods sums in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

- [ ] **Step 2: Write the failing bucket and tooltip tests**

Append to `tests/unit/ModBuckets.test.js` (add the two imports to the top import block):

```js
import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';
import {
   DYNAMIC_MOD_BUCKETS,
   getInnateModTotal,
   MOD_BUCKET_LABELS,
} from '~/system/ModBuckets.js';
```

```js
/** @type {string} This test file's directory. */
const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.resolve(TEST_DIRECTORY, '../../lang/en.json'), 'utf-8'));

describe('mod buckets', () => {
   it('labels every dynamic bucket and static, in application order', () => {
      expect(Object.keys(MOD_BUCKET_LABELS)).toEqual([
         ...DYNAMIC_MOD_BUCKETS,
         'static',
      ]);
      for (const label of Object.values(MOD_BUCKET_LABELS)) {
         expect(lang.LOCAL[`${label}.text`], label).toBeTypeOf('string');
      }
   });

   it('sums only the innate buckets (abilities and equipment)', () => {
      expect(getInnateModTotal({
         ability: 2,
         condition: -3,
         effect: 4,
         equipment: 1,
         static: 5,
      })).toBe(3);
      expect(getInnateModTotal(undefined)).toBe(0);
   });

   it('lists every non-zero bucket in the tooltip, condition included, and leaves zero buckets out', () => {
      /** @type {string} The tooltip HTML. */
      const tooltip = createModifiableStatTooltip(8, {
         ability: 0,
         condition: -2,
         effect: 1,
         equipment: 0,
         static: 3,
      }, 0, 'Defense base');
      expect(tooltip).toBe('<p>Defense base</p><p>LOCAL.base.text: 8</p><p>LOCAL.effects.text: 1</p>' +
         '<p>LOCAL.conditions.text: -2</p><p>LOCAL.temp.text: 3</p>');
   });

   it('adds other modifiers last', () => {
      expect(createModifiableStatTooltip(2, { static: 0 }, -1, undefined))
         .toBe('<p>LOCAL.base.text: 2</p><p>LOCAL.otherModifiers.text: -1</p>');
   });
});

describe('no UI source hand-lists the modifier buckets', () => {
   /**
    * Every Svelte source under src.
    * @type {string[]}
    */
   const SVELTE_SOURCES = readdirSync(path.resolve(TEST_DIRECTORY, '../../src'), { recursive: true })
      .filter((fileName) => String(fileName).endsWith('.svelte'))
      .map((fileName) => path.resolve(TEST_DIRECTORY, '../../src', String(fileName)));

   it('finds the Svelte sources', () => {
      expect(SVELTE_SOURCES.length).toBeGreaterThan(100);
   });

   it('reads no dynamic bucket by name and passes no per-bucket label props', () => {
      /** @type {string[]} The offending files. */
      const offenders = SVELTE_SOURCES.filter((file) => {
         /** @type {string} The component source. */
         const source = readFileSync(file, 'utf-8');
         return /\.mod\.(ability|condition|effect|equipment)\b/.test(source) ||
            /\b(ability|effect|equipment|static)Mod=/.test(source);
      });
      expect(offenders).toEqual([]);
   });
});
```

`localize(key)` calls `game.i18n.localize(\`LOCAL.${key}.text\`)`, and the `installSchemaMocks` stand-in returns its
argument, so the expected tooltips carry the `LOCAL.<key>.text` form.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ModBuckets.test.js`
Expected: FAIL — `~/system/ModBuckets.js` does not exist; the scan lists the seven label call sites and
`CharacterSheetSkill.svelte`.

- [ ] **Step 4: Create the bucket module and use it in `_resetDynamicMods`**

Create `src/system/ModBuckets.js`:

```js
/**
 * The modifier buckets every modifiable stat's `mod` object carries besides its persisted `static` bucket, in the order
 * `CharacterDataModel._resetDynamicMods` first adds them. `_applyMods` floors a stat at 0 after each bucket in the
 * object's key order, so this order is part of every stat's value. Each is a rules-element source type the appliers
 * refill on every data preparation.
 * @type {readonly string[]}
 */
export const DYNAMIC_MOD_BUCKETS = Object.freeze([
   'equipment',
   'effect',
   'ability',
   'condition',
]);

/**
 * The localization key labeling each modifier bucket in a stat's breakdown tooltip, in breakdown order (the dynamic
 * buckets, then `static`, the manual modifier).
 * @type {Readonly<Record<string, string>>}
 */
export const MOD_BUCKET_LABELS = Object.freeze({
   equipment: 'equipment',
   effect: 'effects',
   ability: 'abilities',
   condition: 'conditions',
   static: 'temp',
});

/**
 * The buckets a stat's normal value includes: its innate sources, abilities and equipment. A value above or below the
 * base plus these reads as a bonus or penalty (from effects, conditions, or the manual modifier).
 * @type {readonly string[]}
 */
export const INNATE_MOD_BUCKETS = Object.freeze([
   'ability',
   'equipment',
]);

/**
 * Sums a stat's innate modifier buckets.
 * @param {Record<string, number>} [mod] - The stat's `mod` object; a display component may render before it has one.
 * @returns {number} The sum of the stat's INNATE_MOD_BUCKETS (a missing bucket counts 0).
 */
export function getInnateModTotal(mod) {
   return INNATE_MOD_BUCKETS.reduce((sum, bucket) => sum + (mod?.[bucket] ?? 0), 0);
}
```

In `CharacterDataModel.js`, add the import (after the `sortObjectsIntoContainerByKeyValue` import):

```js
import { DYNAMIC_MOD_BUCKETS } from '~/system/ModBuckets.js';
```

and replace the inner `resetMods` function of `_resetDynamicMods` (its JSDoc and body) with:

```js
      /**
       * Zeroes a mod object's dynamic buckets, adding any it lacks in DYNAMIC_MOD_BUCKETS order.
       * @param {object} mods - Mod object to reset.
       */
      function resetMods(mods) {
         for (const bucket of DYNAMIC_MOD_BUCKETS) {
            mods[bucket] = 0;
         }
      }
```

- [ ] **Step 5: Rebuild the tooltip helper and the label on the `mod` object**

Replace the whole of `src/helpers/utility-functions/CreateModifiableStatTooltip.js` with:

```js
import localize from '~/helpers/utility-functions/Localize.js';
import { MOD_BUCKET_LABELS } from '~/system/ModBuckets.js';

/**
 * Generates a stat's breakdown tooltip: its base value, then each non-zero modifier bucket (MOD_BUCKET_LABELS order,
 * conditions included), then any extra modifier.
 * @param {number} baseValue - The base value of the stat before any modifiers are applied.
 * @param {Record<string, number>} [mod] - The stat's modifier buckets.
 * @param {number} extraMod - Sum of bonuses and penalties from sources outside the stat (a check's conditional
 * modifiers, a value override).
 * @param {string} [baseTooltip] - Label for the base value of the stat in the tooltip.
 * @returns {string} The tooltip HTML.
 */
export default function createModifiableStatTooltip(baseValue, mod, extraMod, baseTooltip) {
   /** @type {string} The tooltip HTML. */
   let retVal = baseTooltip ? `<p>${baseTooltip}</p>` : '';

   // Base value.
   if (baseValue !== undefined) {
      retVal += `<p>${localize('base')}: ${baseValue}</p>`;
   }

   // Every non-zero modifier bucket.
   for (const [bucket, label] of Object.entries(MOD_BUCKET_LABELS)) {
      if (mod?.[bucket]) {
         retVal += `<p>${localize(label)}: ${mod[bucket]}</p>`;
      }
   }

   // Extra mod.
   if (extraMod) {
      retVal += `<p>${localize('otherModifiers')}: ${extraMod}</p>`;
   }

   return retVal;
}
```

In `src/helpers/svelte-components/label/ModifiableStatValueLabel.svelte`, replace everything from the opening
`<script>` through `</script>` with:

```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';
   import { getInnateModTotal } from '~/system/ModBuckets.js';

   /**
    * @typedef {object} ModifiableStatValueLabelProps
    * @property {number} [baseValue] - The base value of the stat before any modifiers are applied.
    * @property {number} [value] - The value of the stat after any modifiers are applied.
    * @property {number} [valueOverride] - Override for the value of the stat after any modifiers are applied.
    * @property {Record<string, number>} [mod] - The stat's modifier buckets (see MOD_BUCKET_LABELS).
    * @property {string} [baseTooltip] - Label for the base value of the stat in the tooltip.
    * @property {string | undefined} [testId] - Optional data-testid for automated probing.
    */

   /** @type {ModifiableStatValueLabelProps} */
   let {
      baseValue = void 0,
      value = void 0,
      valueOverride = void 0,
      mod = void 0,
      baseTooltip = void 0,
      testId = void 0,
   } = $props();

   /**
    * The class to use for styling the label: a bonus or penalty when the value differs from the base plus the stat's
    * innate (ability and equipment) modifiers.
    * @type {string}
    */
   let styleClass = $derived.by(() => {
      /** @type {number} The stat's normal value. */
      const normalValue = baseValue + getInnateModTotal(mod);

      /** @type {number} The value compared against it. */
      const realValue = valueOverride ?? value;

      // Add a bonus class if normal value < current value.
      if (normalValue < realValue) {
         return 'label bonus';
      }

      // Add a penalty class if normal value > current value.
      if (normalValue > realValue) {
         return 'label penalty';
      }

      return 'label';
   });

   /**
    * The calculated tooltip for the stat, derived reactively from prop values.
    * @type {string}
    */
   let tooltip = $derived.by(() => createModifiableStatTooltip(
      baseValue,
      mod,
      valueOverride ? valueOverride - value : 0,
      baseTooltip,
   ));
</script>
```

In `src/helpers/TransientDefinitions.js`, replace the four `@property {number} mod.<bucket>` lines of `ModifiableStat`
with:

```js
 * @property {number} mod.ability - Bonuses or penalties from Abilities.
 * @property {number} mod.condition - Bonuses or penalties from Conditions.
 * @property {number} mod.effect - Bonuses or penalties from Effects.
 * @property {number} mod.equipment - Bonuses or penalties from Equipment.
 * @property {number} mod.static - Bonuses or penalties from Static modifiers.
```

- [ ] **Step 6: Pass each stat's `mod` object at the seven call sites**

In each file below, inside its `<ModifiableStatValueLabel ... />`, delete every `abilityMod=`, `effectMod=`,
`equipmentMod=`, and `staticMod=` line and add one `mod=` line in alphabetical prop position (after `baseValue=`):

| File | Line to add |
|---|---|
| `.../header/CharacterSheetAttribute.svelte` | `mod={document.data.system.attribute[attribute].mod}` |
| `.../header/CharacterSheetResistance.svelte` | `mod={document.data.system.resistance[resistance].mod}` |
| `.../sidebar/CharacterSheetMod.svelte` | `mod={document.data.system.mod[mod].mod}` |
| `.../sidebar/CharacterSheetRating.svelte` | `mod={document.data.system.rating[rating].mod}` |
| `.../sidebar/CharacterSheetResource.svelte` | `mod={document.data.system.resource[resource].mod}` |
| `.../sidebar/CharacterSheetSpeed.svelte` | `mod={document.data.system.speed[speed].mod}` |
| `src/ui/player-hud/elements/portrait/PortraitBars.svelte` | `mod={document.data.system.resource[resource].mod}` |

In `CharacterSheetRating.svelte` also add, after the `mod=` line, `testId={\`sheet-rating-${rating}\`}`. The rating
label then reads:

```svelte
         <ModifiableStatValueLabel
            baseTooltip={localize(`${rating}.baseValue`)}
            baseValue={document.data.system.rating[rating].baseValue}
            mod={document.data.system.rating[rating].mod}
            testId={`sheet-rating-${rating}`}
            value={document.data.system.rating[rating].value}
         />
```

- [ ] **Step 7: Use the shared breakdown for skill Training and Expertise**

In `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte`:
(a) add after the `ModifiedValueLabel` import:

```js
   import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';
   import { getInnateModTotal } from '~/system/ModBuckets.js';
```

(b) replace the whole `getTotalValueTooltip` function (JSDoc and body) with:

```js
   /**
    * Calculates the breakdown tooltip for the total Training or Expertise value.
    * @param {object} valueObject - The Training or Expertise object.
    * @param {number} mod - The check's conditional modifier to the total Training or Expertise.
    * @returns {string} The breakdown tooltip.
    */
   function getTotalValueTooltip(valueObject, mod) {
      return createModifiableStatTooltip(valueObject.baseValue, valueObject.mod, mod);
   }
```

(c) replace the Training label's `baseValue={ ... }` expression with:

```svelte
               baseValue={
                  document.data.system.skill[key].training.baseValue +
                     getInnateModTotal(document.data.system.skill[key].training.mod) +
                     checkParameters.trainingMod
               }
```

and the Expertise label's with:

```svelte
               baseValue={
                  document.data.system.skill[key].expertise.baseValue +
                     getInnateModTotal(document.data.system.skill[key].expertise.mod) +
                     checkParameters.expertiseMod
               }
```

In `CHANGELOG.md`, append to the `## Unreleased:` list:

```markdown
- Stat tooltips on the character sheet and Player HUD list condition modifiers, and speed and mod tooltips list
  abilities; skill Training and Expertise tooltips use the same breakdown.
```

- [ ] **Step 8: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/ModBuckets.test.js`
Expected: PASS.

- [ ] **Step 9: Update the label probe and add the sheet e2e**

In `tests/e2e/component-probe-labels.spec.js`, in the test `'abilityMod and equipmentMod shift normalValue and affect
the class'`, rename it to `'the mod object\'s ability and equipment buckets shift normalValue and affect the class'`,
change its comment's `abilityMod (2) + equipmentMod (1)` to `mod.ability (2) + mod.equipment (1)`, and replace

```js
            abilityMod: 2,
            equipmentMod: 1,
```

with

```js
            mod: {
               ability: 2,
               equipment: 1,
            },
```

In the first test's comment, change `(no abilityMod/equipmentMod)` to `(no mod)`.

Create `tests/e2e/stat-breakdown-conditions.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * A condition's penalty reaches the rendered character sheet: the Defense rating label drops and its breakdown
 * tooltip lists the Conditions line while the condition applies, and loses it when the condition is removed.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Stat Breakdown Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Locates the sheet's Defense rating label.
 * @returns {import('@playwright/test').Locator} The label.
 */
function defenseLabel() {
   return page.locator('.application.titan-document-sheet [data-testid="sheet-rating-defense"]');
}

/**
 * Reads the Defense label's tooltip content (tippy keeps it on the reference element).
 * @returns {Promise<string>} The tooltip HTML.
 */
function readDefenseTooltip() {
   return page.evaluate(() => document
      .querySelector('.application.titan-document-sheet [data-testid="sheet-rating-defense"]')
      ?._tippy?.props.content ?? '');
}

test('Blinded lowers the sheet\'s Defense by a quarter of its base and the breakdown lists Conditions', async () => {
   /** @type {string} The localized Conditions label. */
   const conditionsLabel = await page.evaluate(async (name) => {
      await game.actors.getName(name)?.delete();

      /** @type {TitanActor} The actor, Body 8 and Dexterity 8 so its Defense base is 8. */
      const actor = await Actor.create({
         name,
         type: 'player',
         system: {
            attribute: { body: { baseValue: 8 } },
            skill: { dexterity: { training: { baseValue: 8 } } },
         },
      });
      await actor.sheet.render(true);
      return game.i18n.localize('LOCAL.conditions.text');
   }, ACTOR_NAME);
   await expect(defenseLabel()).toHaveText('8');

   await page.evaluate((name) => game.actors.getName(name).toggleStatusEffect('blinded', { active: true }),
      ACTOR_NAME);
   await expect(defenseLabel()).toHaveText('6');
   await expect.poll(readDefenseTooltip, { message: 'the breakdown lists the condition penalty' })
      .toContain(`${conditionsLabel}: -2`);

   await page.evaluate((name) => game.actors.getName(name).toggleStatusEffect('blinded', { active: false }),
      ACTOR_NAME);
   await expect(defenseLabel()).toHaveText('8');
   await expect.poll(readDefenseTooltip, { message: 'the Conditions line leaves with the condition' })
      .not.toContain(`${conditionsLabel}:`);
});
```

- [ ] **Step 10: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm run stylelint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/stat-breakdown-conditions.spec.js tests/e2e/component-probe-labels.spec.js
tests/e2e/character-sheet-layout.spec.js tests/e2e/player-hud-portrait.spec.js` → all pass.

- [ ] **Step 11: Commit**

```bash
git branch --show-current
git status --short
git add src/system/ModBuckets.js src/document/types/actor/types/character/CharacterDataModel.js \
   src/helpers/utility-functions/CreateModifiableStatTooltip.js \
   src/helpers/svelte-components/label/ModifiableStatValueLabel.svelte src/helpers/TransientDefinitions.js \
   src/document/types/actor/types/character/sheet/header/CharacterSheetAttribute.svelte \
   src/document/types/actor/types/character/sheet/header/CharacterSheetResistance.svelte \
   src/document/types/actor/types/character/sheet/sidebar/CharacterSheetMod.svelte \
   src/document/types/actor/types/character/sheet/sidebar/CharacterSheetRating.svelte \
   src/document/types/actor/types/character/sheet/sidebar/CharacterSheetResource.svelte \
   src/document/types/actor/types/character/sheet/sidebar/CharacterSheetSpeed.svelte \
   src/ui/player-hud/elements/portrait/PortraitBars.svelte \
   src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte CHANGELOG.md \
   tests/unit/ModBuckets.test.js tests/e2e/component-probe-labels.spec.js tests/e2e/stat-breakdown-conditions.spec.js
git commit -F - <<'EOF'
fix(sheet): stat breakdowns list condition modifiers

ModifiableStatValueLabel takes the stat's mod object and the tooltip walks
one MOD_BUCKET_LABELS list (src/system/ModBuckets.js), which
_resetDynamicMods also reads, so a bucket can no longer be left out of a
breakdown. A scan test rejects any Svelte source that names a bucket.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---
### Task 4: Condition check rules (Frightened, Incapacitated, Restrained, Blinded, Deafened)

**Files:**
- Create: `src/system/CanonicalSituations.js`
- Modify: `src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`, `src/system/Conditions.js`,
  `src/document/types/actor/types/character/CharacterDataModel.js` (`_applySituationalCheckModifierElements`),
  `lang/en.json`, `CHANGELOG.md`
- Test: `tests/unit/CheckModifierLocalizationKeys.test.js`, `tests/unit/ConditionDefinitions.test.js`,
  `tests/unit/ConditionMechanics.test.js`, `tests/e2e/condition-checks.spec.js` (create)

**Interfaces:**
- Consumes: spec A's `advantage` / `automaticFailure` modifier types and `situation` selector;
  `createConditionedCharacter` from Task 2's `ConditionMechanics.test.js`.
- Produces: `CANONICAL_SITUATIONS` (moved; adds `situationReliesOnHearing: 'Relies on Hearing'`,
  `situationReliesOnSight: 'Relies on Sight'`); situation keys `reliesOnSight`, `reliesOnHearing` (camel case of the
  canonical strings); condition elements below. A cached situational entry's `label` is `element.label`, else the
  localized `element.labelKey`, else `element.key`.

| Condition | Element added | uuid |
|---|---|---|
| Blinded | `automaticFailure`, checkType `any`, selector `situation`, key "Relies on Sight", skill `perception` | `condition-blinded-sight` |
| Deafened | `automaticFailure`, checkType `any`, selector `situation`, key "Relies on Hearing", skill `perception` | `condition-deafened-hearing` |
| Frightened | `advantage` −1, checkType `any`, selector `any` | `condition-frightened-checks` |
| Incapacitated | `automaticFailure`, checkType `resistance`, selector `resistance`, key `reflexes` | `condition-incapacitated-reflexes` |
| Restrained | same as Incapacitated | `condition-restrained-reflexes` |

- [ ] **Step 1: Move the canonical situations to a shared module (behaviour-preserving)**

Create `src/system/CanonicalSituations.js`:

```js
/**
 * The canonical source string of each system situation, by localization key. The camel-case form of the string is the
 * situation key on every client, so it never depends on the client's language and equals the key a user-typed situation
 * with the same English text gets. The displayed label is localized separately from the key; a unit test requires
 * every key's `LOCAL.<key>.text` entry in the English localization. Armor traits and conditions both impose these
 * situations.
 * @type {Readonly<Record<string, string>>}
 */
export const CANONICAL_SITUATIONS = Object.freeze({
   situationJump: 'Jump',
   situationRemainUndetectedByHearing: 'Remain Undetected by Hearing',
   situationSwimFlyClimb: 'Swim, Fly, or Climb',
});
```

In `src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`, delete the `CANONICAL_SITUATIONS` JSDoc and
`export const` block, and add after the `localize` import:

```js
import { CANONICAL_SITUATIONS } from '~/system/CanonicalSituations.js';
```

In `tests/unit/CheckModifierLocalizationKeys.test.js`, replace the `CANONICAL_SITUATIONS` import line with:

```js
import { CANONICAL_SITUATIONS } from '~/system/CanonicalSituations.js';
```

Run: `npx vitest run tests/unit/CheckModifierLocalizationKeys.test.js tests/unit/ArmorTraitCheckModifiers.test.js`
Expected: PASS (nothing changed but the module the constant lives in); then `npm run eslint` → 0 errors.

```bash
git branch --show-current
git status --short
git add src/system/CanonicalSituations.js src/document/types/item/types/armor/ArmorTraitCheckModifiers.js \
   tests/unit/CheckModifierLocalizationKeys.test.js
git commit -F - <<'EOF'
refactor(situations): move the canonical situation strings to src/system

Armor traits and conditions both impose system situations, so the
canonical strings live in their own module.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

- [ ] **Step 2: Write the failing definition and mechanics tests**

In `tests/unit/ConditionDefinitions.test.js`:
(a) add to the imports:

```js
import { CANONICAL_SITUATIONS } from '~/system/CanonicalSituations.js';
```

(b) add after the `quarterPenalty` helper:

```js
/**
 * Builds the expected "automatically fails Perception checks that rely on <sense>" situation.
 * @param {string} id - The condition id.
 * @param {string} labelKey - The situation's localization key (a CANONICAL_SITUATIONS key).
 * @param {string} uuidSuffix - The uuid's last segment.
 * @returns {object} The expected element.
 */
function senseFailure(id, labelKey, uuidSuffix) {
   return {
      checkType: 'any',
      key: CANONICAL_SITUATIONS[labelKey],
      labelKey,
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill: 'perception',
      uuid: `condition-${id}-${uuidSuffix}`,
      value: 1,
   };
}

/**
 * Builds the expected "automatically fails Reflexes checks" element.
 * @param {string} id - The condition id.
 * @returns {object} The expected element.
 */
function reflexesFailure(id) {
   return {
      checkType: 'resistance',
      key: 'reflexes',
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'resistance',
      skill: '',
      uuid: `condition-${id}-reflexes`,
      value: 1,
   };
}
```

(c) replace the Blinded test with:

```js
   it('seeds blinded with -¼ of base melee, accuracy, and defense and a sight-reliant Perception failure', () => {
      expect(def('blinded').system.rulesElement).toEqual([
         quarterPenalty('blinded', 'rating', 'melee'),
         quarterPenalty('blinded', 'rating', 'accuracy'),
         quarterPenalty('blinded', 'rating', 'defense'),
         senseFailure('blinded', 'situationReliesOnSight', 'sight'),
      ]);
   });

   it('seeds deafened with a hearing-reliant Perception failure', () => {
      expect(def('deafened').system.rulesElement).toEqual([
         senseFailure('deafened', 'situationReliesOnHearing', 'hearing'),
      ]);
   });

   it('seeds frightened with Disadvantage on every check', () => {
      expect(def('frightened').system.rulesElement).toEqual([
         {
            checkType: 'any',
            key: '',
            modifierType: 'advantage',
            operation: 'conditionalCheckModifier',
            selector: 'any',
            skill: '',
            uuid: 'condition-frightened-checks',
            value: -1,
         },
      ]);
   });

   it('seeds incapacitated with a Reflexes check failure', () => {
      expect(def('incapacitated').system.rulesElement).toEqual([reflexesFailure('incapacitated')]);
   });

   it('keys every condition situation by its canonical string', () => {
      for (const condition of buildConditionDefinitions()) {
         for (const element of condition.system?.rulesElement ?? []) {
            if (element.selector === 'situation') {
               expect(element.key, element.uuid).toBe(CANONICAL_SITUATIONS[element.labelKey]);
               expect(element.label, `${element.uuid} stores no client-localized label`).toBeUndefined();
            }
         }
      }
   });
```

(d) in the Restrained test, append `reflexesFailure('restrained'),` after the `setSum` element and rename it to
`'seeds restrained with -¼ of base melee, accuracy, and defense, speed set to 0, and a Reflexes check failure'`.

(e) replace the "leaves the conditions without stat mechanics" test with:

```js
   it('leaves dead and unconscious without rules elements', () => {
      for (const id of [
         'dead',
         'unconscious',
      ]) {
         expect(def(id).system, `${id} should have no system.rulesElement`).toBeUndefined();
      }
   });
```

Append to `tests/unit/ConditionMechanics.test.js`:

```js
describe('condition check rules', () => {
   it('Frightened gives Attribute and Resistance checks Disadvantage', () => {
      /** @type {object} The Frightened character. */
      const model = createConditionedCharacter(['frightened']);
      expect(model.getAttributeCheckMod('advantage', 'body', 'athletics')).toBe(-1);
      expect(model.getResistanceCheckMod('advantage', 'willpower')).toBe(-1);
   });

   it.each([
      'incapacitated',
      'restrained',
   ])('%s automatically fails Reflexes checks and no other Resistance check', (id) => {
      /** @type {object} The conditioned character. */
      const model = createConditionedCharacter([id]);
      expect(model.getResistanceCheckMod('automaticFailure', 'reflexes')).toBeGreaterThan(0);
      expect(model.getResistanceCheckMod('automaticFailure', 'resilience')).toBe(0);
   });

   it.each([
      [
         'blinded',
         'reliesOnSight',
         'situationReliesOnSight',
      ],
      [
         'deafened',
         'reliesOnHearing',
         'situationReliesOnHearing',
      ],
   ])('%s offers the %s Automatic Failure on Perception checks only', (id, key, labelKey) => {
      /** @type {object} The conditioned character. */
      const model = createConditionedCharacter([id]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'perception' })).toEqual([
         {
            key,
            label: `LOCAL.${labelKey}.text`,
            labelKey,
            modifierType: 'automaticFailure',
            sources: [id],
            value: 1,
         },
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([]);
   });
});
```

(The `installSchemaMocks` stand-in `game.i18n.localize` returns its argument, so the localized label reads
`LOCAL.<labelKey>.text`.)

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ConditionDefinitions.test.js tests/unit/ConditionMechanics.test.js`
Expected: FAIL — the check-rule elements do not exist and `CANONICAL_SITUATIONS.situationReliesOnSight` is undefined.

- [ ] **Step 4: Add the situations and the condition check rules**

In `src/system/CanonicalSituations.js`, add two entries in alphabetical key order:

```js
export const CANONICAL_SITUATIONS = Object.freeze({
   situationJump: 'Jump',
   situationReliesOnHearing: 'Relies on Hearing',
   situationReliesOnSight: 'Relies on Sight',
   situationRemainUndetectedByHearing: 'Remain Undetected by Hearing',
   situationSwimFlyClimb: 'Swim, Fly, or Climb',
});
```

In `src/system/Conditions.js`:
(a) add after the existing imports:

```js
import { CANONICAL_SITUATIONS } from '~/system/CanonicalSituations.js';
```

(b) add after `createQuarterBasePenalty`:

```js
/**
 * Builds a condition's "automatically fails any Awareness and Perception checks that rely on <sense>" rule: a
 * situational Automatic Failure offered on Perception checks. Awareness is a passive rating with no check of its own,
 * so Perception checks are the Awareness checks. The element stores `labelKey` and no `label`: a condition's rules
 * elements persist on its Active Effect, and the situational cache localizes `labelKey` on each client.
 * Source: TITAN Rules Compendium (09_26_2026), "Blinded" and "Deafened".
 * @param {string} conditionId - The condition id, which names the element's uuid.
 * @param {string} labelKey - The situation's CANONICAL_SITUATIONS key.
 * @param {string} uuidSuffix - The uuid's last segment.
 * @returns {ConditionalCheckModifierElement} The element.
 */
function createSenseAutomaticFailure(conditionId, labelKey, uuidSuffix) {
   return {
      checkType: 'any',
      key: CANONICAL_SITUATIONS[labelKey],
      labelKey,
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill: 'perception',
      uuid: `condition-${conditionId}-${uuidSuffix}`,
      value: 1,
   };
}

/**
 * Builds a condition's "automatically fails Reflexes checks" rule: an always-on Automatic Failure on Reflexes
 * Resistance Checks. Source: TITAN Rules Compendium (09_26_2026), "Incapacitated" and "Restrained".
 * @param {string} conditionId - The condition id, which names the element's uuid.
 * @returns {ConditionalCheckModifierElement} The element.
 */
function createReflexesAutomaticFailure(conditionId) {
   return {
      checkType: 'resistance',
      key: 'reflexes',
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'resistance',
      skill: '',
      uuid: `condition-${conditionId}-reflexes`,
      value: 1,
   };
}
```

(c) in the `blinded` entry, append after the three quarter penalties:

```js
               createSenseAutomaticFailure('blinded', 'situationReliesOnSight', 'sight'),
```

(d) replace the `deafened`, `frightened`, and `incapacitated` entries with:

```js
      {
         id: 'deafened',
         name: 'LOCAL.deafened.text',
         img: 'icons/svg/deaf.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createSenseAutomaticFailure('deafened', 'situationReliesOnHearing', 'hearing'),
            ],
         },
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.text',
         img: 'icons/svg/terror.svg',
         type: 'condition',
         system: {
            rulesElement: [
               // Disadvantage on every check. The rules scope it to while the creature can detect the source of its
               // fear; the condition is applied only while that holds.
               {
                  checkType: 'any',
                  key: '',
                  modifierType: 'advantage',
                  operation: 'conditionalCheckModifier',
                  selector: 'any',
                  skill: '',
                  uuid: 'condition-frightened-checks',
                  value: -1,
               },
            ],
         },
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.text',
         img: 'icons/svg/paralysis.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createReflexesAutomaticFailure('incapacitated'),
            ],
         },
      },
```

(e) in the `restrained` entry, append after the `setSum` element:

```js
               createReflexesAutomaticFailure('restrained'),
```

(f) update the `buildConditionDefinitions` JSDoc's first sentences to: "Builds the static list of TITAN condition
definitions for CONFIG.statusEffects. Every condition is the 'condition' Active Effect subtype; every condition with
mechanics carries a `system.rulesElement` array expressing its stat and check rules (applied through the shared
rules-element pipeline). Dead and Unconscious carry none (Unconscious's companion conditions are applied on creation)."

- [ ] **Step 5: Localize a stored `labelKey` in the situational cache**

In `CharacterDataModel.js` `_applySituationalCheckModifierElements`, replace

```js
            label: element.label ?? element.key,
```

with

```js
            label: element.label ?? (element.labelKey ? localize(element.labelKey) : element.key),
```

and replace the JSDoc sentence "`label` is the element's own `label` when it has one (a system situation, localized)
and its key otherwise" with "`label` is the element's own `label` when it has one (an armor-trait situation, localized
when built), else its `labelKey` localized on this client (a condition's situation, whose stored element carries no
label), else its key".

- [ ] **Step 6: Localize the situations and the Frightened text**

In `lang/en.json` (`LOCAL`), insert in alphabetical key order:

```json
      "situationReliesOnHearing.text": "Relies on Hearing",
      "situationReliesOnSight.text": "Relies on Sight",
```

and replace the value of `frightened.desc.text`:

```json
      "frightened.desc.text": "<p>A <strong>Frightened</strong> creature cannot willingly move closer to the source of their fear.</p><p>While the creature can detect the source of its fear, it has <strong>Disadvantage</strong> on all <strong>Checks</strong> rolled.</p>",
```

In `CHANGELOG.md`, append to the `## Unreleased:` list:

```markdown
- Frightened gives Disadvantage on every check; Incapacitated and Restrained automatically fail Reflexes checks;
  Blinded and Deafened offer "Relies on Sight" / "Relies on Hearing" Automatic Failures on Perception checks.
```

- [ ] **Step 7: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/ConditionDefinitions.test.js tests/unit/ConditionMechanics.test.js
tests/unit/CheckModifierLocalizationKeys.test.js`
Expected: PASS.

- [ ] **Step 8: Write the check e2e**

Create `tests/e2e/condition-checks.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { readNewestCheckFlags, setSelectField } from './checkDialog.js';

/**
 * Condition check rules on rolled checks: Frightened raises a check's Difficulty through Disadvantage, Incapacitated
 * and Restrained fail Reflexes checks, and Blinded and Deafened fail Perception checks that rely on their sense.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Condition Check Actor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The check-options setting in force before this spec. */
let originalCheckOptions;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   originalCheckOptions = await page.evaluate(() => game.settings.get('titan', 'getCheckOptions'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((value) => game.settings.set('titan', 'getCheckOptions', value), originalCheckOptions);
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Rebuilds the actor carrying the given conditions.
 * @param {string[]} conditionIds - The condition ids to apply.
 * @returns {Promise<void>} Resolves once every condition is in the actor's statuses.
 */
async function seedActor(conditionIds) {
   await page.evaluate(async ({ name, ids }) => {
      await game.actors.getName(name)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name,
         type: 'player',
      });
      for (const id of ids) {
         await actor.toggleStatusEffect(id, { active: true });
      }
      await titanWait(() => ids.every((id) => actor.statuses.has(id)), { message: 'conditions applied' });
   }, {
      ids: conditionIds,
      name: ACTOR_NAME,
   });
}

/**
 * Rolls a check straight to chat (no dialog) and returns its message data.
 * @param {string} method - The CharacterDataModel roll method (`rollAttributeCheck` or `rollResistanceCheck`).
 * @param {object} options - The check options.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The rolled check's message.
 */
async function rollCheck(method, options) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await page.evaluate(async ({ name, rollMethod, checkOptions }) => {
      await game.actors.getName(name).system[rollMethod](checkOptions);
   }, {
      checkOptions: options,
      name: ACTOR_NAME,
      rollMethod: method,
   });
   return readNewestCheckFlags(page, baseline);
}

test('Frightened gives an Attribute Check Disadvantage, raising its Difficulty from 4 to 5', async () => {
   await seedActor(['frightened']);

   /** @type {{parameters: object}} The rolled check's message. */
   const flags = await rollCheck('rollAttributeCheck', { attribute: 'body' });
   expect(flags.parameters).toMatchObject({
      advantage: -1,
      baseDifficulty: 4,
      difficulty: 5,
   });
});

for (const conditionId of [
   'incapacitated',
   'restrained',
]) {
   test(`${conditionId} automatically fails Reflexes checks but not Resilience checks`, async () => {
      await seedActor([conditionId]);
      expect((await rollCheck('rollResistanceCheck', { resistance: 'reflexes' })).parameters.automaticFailure)
         .toBe(true);
      expect((await rollCheck('rollResistanceCheck', { resistance: 'resilience' })).parameters.automaticFailure)
         .toBe(false);
   });
}

for (const [conditionId, key, labelKey] of [
   [
      'blinded',
      'reliesOnSight',
      'situationReliesOnSight',
   ],
   [
      'deafened',
      'reliesOnHearing',
      'situationReliesOnHearing',
   ],
]) {
   test(`${conditionId} fails a Perception check that relies on the sense, and only when named`, async () => {
      await seedActor([conditionId]);

      /** @type {string} The situation's localized label. */
      const label = await page.evaluate((localizationKey) => game.i18n.localize(`LOCAL.${localizationKey}.text`),
         labelKey);

      /** @type {{parameters: object}} A Perception check naming the situation. */
      const failed = await rollCheck('rollAttributeCheck', {
         situations: [key],
         skill: 'perception',
      });
      expect(failed.parameters.automaticFailure).toBe(true);
      expect(failed.parameters.situations).toEqual([
         {
            key,
            label,
            labelKey,
         },
      ]);

      /** @type {{parameters: object}} A Perception check that does not rely on the sense. */
      const unaffected = await rollCheck('rollAttributeCheck', { skill: 'perception' });
      expect(unaffected.parameters.automaticFailure).toBe(false);
   });
}

test('Blinded offers Relies on Sight in a Perception dialog; the row leaves on a Skill change', async () => {
   await seedActor(['blinded']);
   await page.evaluate(async (name) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(name).system.requestAttributeCheck({ skill: 'perception' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open dialog. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The Relies on Sight row. */
   const row = dialog.getByTestId('situation-row-reliesOnSight');
   await expect(row).toBeVisible();

   await setSelectField(dialog, 'skill', 'athletics');
   await expect(row).toHaveCount(0);
});
```

- [ ] **Step 9: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/condition-checks.spec.js tests/e2e/armor-trait-situations.spec.js
tests/e2e/logic/conditions.spec.js` → all pass.

- [ ] **Step 10: Commit**

```bash
git branch --show-current
git status --short
git add src/system/CanonicalSituations.js src/system/Conditions.js \
   src/document/types/actor/types/character/CharacterDataModel.js lang/en.json CHANGELOG.md \
   tests/unit/ConditionDefinitions.test.js tests/unit/ConditionMechanics.test.js tests/e2e/condition-checks.spec.js
git commit -F - <<'EOF'
feat(conditions): Frightened, Incapacitated, Restrained, Blinded, Deafened check rules

Frightened is Disadvantage on every check; Incapacitated and Restrained
automatically fail Reflexes; Blinded and Deafened offer sense situations on
Perception checks. Condition situations store labelKey only and the
situational cache localizes it per client.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 5: Condition-effect sync migration and the Migration Mode fix

Bug fix (logged as `docs/CLOSED_BUGS.md` #74 in Task 14): Migration Mode "Disabled" ran `migrateWorld()` (the `else`
branch of `onceReady`), contradicting its hint "Disabled: skips migration entirely".

**Files:**
- Create: `src/helpers/migration/SyncConditionEffects.js`
- Modify: `src/helpers/migration/MigrateWorld.js`, `src/hooks/OnceReady.js`, `CHANGELOG.md`
- Test: `tests/unit/SyncConditionEffects.test.js`, `tests/unit/MigrationAction.test.js` (create),
  `tests/e2e/condition-migration.spec.js` (create)

**Interfaces:**
- Consumes: `CONFIG.statusEffects` (built by `setupConditions`, carrying `flags.titan.description`).
- Produces: `toCanonicalJson(value): string`; `getConditionEffectUpdate(effect, statusEffects): object|null`
  (`{ _id, 'system.rulesElement', 'flags.titan.description' }`); `getConditionEffectUpdates(actor, statusEffects):
  object[]`; `getSyncedActors(): Generator<TitanActor>` (world actors, then every unlinked token's actor on every
  scene); `conditionEffectsNeedSync(): boolean`; default `syncConditionEffects(): Promise<number>` (actors updated;
  GM-only); `resolveMigrationAction(mode, needsMigration): 'none'|'migrate'|'prompt'` (named export of
  `MigrateWorld.js`). `worldNeedsMigration()` also reports stale condition effects; `migrateWorld()` also syncs them.

- [ ] **Step 1: Write the failing sync tests**

Create `tests/unit/SyncConditionEffects.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildConditionDefinitions } from '~/system/Conditions.js';
import syncConditionEffects, {
   conditionEffectsNeedSync,
   getConditionEffectUpdate,
   getConditionEffectUpdates,
   getSyncedActors,
   toCanonicalJson,
} from '~/helpers/migration/SyncConditionEffects.js';

/**
 * The condition definitions as `setupConditions` registers them: each with a description flag.
 * @type {object[]}
 */
const STATUS_EFFECTS = buildConditionDefinitions().map((condition) => ({
   ...condition,
   flags: {
      titan: {
         description: `${condition.id} description`,
         type: 'condition',
      },
   },
}));

/**
 * Returns a condition definition's rules elements.
 * @param {string} id - The condition id.
 * @returns {object[]} The definition's rules elements (empty for a condition with none).
 */
function currentElements(id) {
   return STATUS_EFFECTS.find((condition) => condition.id === id).system?.rulesElement ?? [];
}

/**
 * Builds a flat -1 rating element, the pre-09_26 condition penalty.
 * @param {string} id - The condition id.
 * @param {string} key - The rating.
 * @returns {object} The old element.
 */
function oldFlat(id, key) {
   return {
      operation: 'flatModifier',
      selector: 'rating',
      key,
      value: -1,
      uuid: `condition-${id}-${key}`,
   };
}

/**
 * The rules elements each condition's Active Effect carried when created from the v2.1.0 definitions, for every
 * condition whose definition changed.
 * @type {Record<string, object[]>}
 */
const OLD_FORMS = {
   blinded: [
      oldFlat('blinded', 'melee'),
      oldFlat('blinded', 'accuracy'),
      oldFlat('blinded', 'defense'),
   ],
   contaminated: [
      {
         operation: 'flatModifier',
         selector: 'attribute',
         key: 'all',
         value: -1,
         uuid: 'condition-contaminated-attributes',
      },
      {
         operation: 'flatModifier',
         selector: 'resistance',
         key: 'all',
         value: -1,
         uuid: 'condition-contaminated-resistances',
      },
   ],
   deafened: [],
   frightened: [],
   incapacitated: [],
   prone: [
      {
         operation: 'mulSum',
         selector: 'speed',
         key: 'all',
         value: 0.5,
         rounding: 'up',
         uuid: 'condition-prone-speed',
      },
      oldFlat('prone', 'melee'),
      oldFlat('prone', 'accuracy'),
   ],
   restrained: [
      oldFlat('restrained', 'melee'),
      oldFlat('restrained', 'accuracy'),
      oldFlat('restrained', 'defense'),
      {
         operation: 'setSum',
         selector: 'speed',
         key: 'all',
         value: 0,
         mode: 'set',
         uuid: 'condition-restrained-speed',
      },
   ],
   stunned: [oldFlat('stunned', 'defense')],
};

/**
 * Builds a fake Active Effect whose `toObject()` returns its stored source.
 * @param {object} data - The effect's data.
 * @param {string} [data.id] - The effect id.
 * @param {string} [data.type] - The effect subtype.
 * @param {string[]} data.statuses - The effect's status ids.
 * @param {object[]} data.rulesElement - The stored rules elements.
 * @param {string} data.description - The stored description flag.
 * @returns {object} The fake effect.
 */
function createEffect({ id = 'effect0', type = 'condition', statuses, rulesElement, description }) {
   /** @type {object} The stored source. */
   const source = {
      flags: {
         titan: {
            description,
         },
      },
      system: {
         rulesElement,
      },
   };
   return {
      id,
      statuses: new Set(statuses),
      toObject: () => structuredClone(source),
      type,
   };
}

/**
 * Builds a fake actor holding the given effects.
 * @param {string} name - The actor's name.
 * @param {object[]} effects - The actor's effects.
 * @returns {object} The fake actor, whose `updateEmbeddedDocuments` is a spy.
 */
function createActor(name, effects) {
   return {
      effects,
      name,
      updateEmbeddedDocuments: vi.fn(async () => []),
   };
}

/**
 * Builds a fake Blinded effect in its v2.1.0 form.
 * @param {string} id - The effect id.
 * @returns {object} The stale effect.
 */
function staleBlinded(id) {
   return createEffect({
      description: 'old text',
      id,
      rulesElement: OLD_FORMS.blinded,
      statuses: ['blinded'],
   });
}

describe('toCanonicalJson', () => {
   it('serializes objects with sorted keys at every depth and keeps array order', () => {
      expect(toCanonicalJson({
         b: 1,
         a: [
            {
               d: 2,
               c: 3,
            },
            4,
         ],
      })).toBe('{"a":[{"c":3,"d":2},4],"b":1}');
   });
});

describe('getConditionEffectUpdate', () => {
   it.each(Object.entries(OLD_FORMS))('rewrites a %s effect created from the old definition', (id, oldElements) => {
      expect(getConditionEffectUpdate(createEffect({
         description: 'old text',
         rulesElement: oldElements,
         statuses: [id],
      }), STATUS_EFFECTS)).toEqual({
         _id: 'effect0',
         'flags.titan.description': `${id} description`,
         'system.rulesElement': currentElements(id),
      });
   });

   it.each(STATUS_EFFECTS.map((condition) => condition.id))('leaves an up-to-date %s effect alone', (id) => {
      expect(getConditionEffectUpdate(createEffect({
         description: `${id} description`,
         rulesElement: structuredClone(currentElements(id)),
         statuses: [id],
      }), STATUS_EFFECTS)).toBeNull();
   });

   it('ignores the key order of stored elements', () => {
      /** @type {object[]} Blinded's current elements with every element's keys reversed. */
      const reordered = currentElements('blinded').map((element) => Object.fromEntries(Object.entries(element)
         .reverse()));
      expect(getConditionEffectUpdate(createEffect({
         description: 'blinded description',
         rulesElement: reordered,
         statuses: ['blinded'],
      }), STATUS_EFFECTS)).toBeNull();
   });

   it('refreshes a stale description alone', () => {
      expect(getConditionEffectUpdate(createEffect({
         description: 'old text',
         rulesElement: structuredClone(currentElements('dead')),
         statuses: ['dead'],
      }), STATUS_EFFECTS)).toEqual({
         _id: 'effect0',
         'flags.titan.description': 'dead description',
         'system.rulesElement': [],
      });
   });

   it('leaves an effect-subtype effect and a condition naming no system condition alone', () => {
      expect(getConditionEffectUpdate(createEffect({
         description: 'old text',
         rulesElement: OLD_FORMS.blinded,
         statuses: ['blinded'],
         type: 'effect',
      }), STATUS_EFFECTS)).toBeNull();
      expect(getConditionEffectUpdate(createEffect({
         description: 'custom',
         rulesElement: [],
         statuses: ['customStatus'],
      }), STATUS_EFFECTS)).toBeNull();
   });

   it('is idempotent: applying its update leaves nothing to update', () => {
      /** @type {object} The update for a stale Blinded. */
      const update = getConditionEffectUpdate(staleBlinded('effect0'), STATUS_EFFECTS);
      expect(getConditionEffectUpdate(createEffect({
         description: update['flags.titan.description'],
         rulesElement: update['system.rulesElement'],
         statuses: ['blinded'],
      }), STATUS_EFFECTS)).toBeNull();
   });

   it('returns a copy the caller may not share with CONFIG', () => {
      /** @type {object} The update for a stale Blinded. */
      const update = getConditionEffectUpdate(staleBlinded('effect0'), STATUS_EFFECTS);
      expect(update['system.rulesElement']).not.toBe(currentElements('blinded'));
   });
});

describe('getConditionEffectUpdates', () => {
   it('collects one update per stale condition effect', () => {
      expect(getConditionEffectUpdates(createActor('A', [
         staleBlinded('effect1'),
         createEffect({
            description: 'dead description',
            id: 'effect2',
            rulesElement: [],
            statuses: ['dead'],
         }),
      ]), STATUS_EFFECTS).map((update) => update._id)).toEqual(['effect1']);
   });
});

describe('world sync', () => {
   /** @type {object} The world actor with a stale Blinded. */
   let worldActor;
   /** @type {object} The unlinked token's actor with a stale Blinded. */
   let tokenActor;
   /** @type {object} A linked token's actor (the world actor's twin), which the sync reaches as a world actor. */
   let linkedActor;

   beforeEach(() => {
      worldActor = createActor('World', [staleBlinded('effect1')]);
      tokenActor = createActor('Token', [staleBlinded('effect2')]);
      linkedActor = createActor('Linked', [staleBlinded('effect3')]);
      globalThis.CONFIG = { statusEffects: STATUS_EFFECTS };
      globalThis.ui = {
         notifications: {
            error: vi.fn(),
         },
      };
      globalThis.game = {
         actors: [worldActor],
         scenes: [
            {
               tokens: [
                  {
                     actor: tokenActor,
                     actorLink: false,
                  },
                  {
                     actor: linkedActor,
                     actorLink: true,
                  },
                  {
                     actor: null,
                     actorLink: false,
                  },
               ],
            },
         ],
         user: { isGM: true },
      };
   });

   afterEach(() => {
      delete globalThis.CONFIG;
      delete globalThis.ui;
      delete globalThis.game;
   });

   it('visits world actors, then unlinked token actors, and skips linked and actorless tokens', () => {
      expect([...getSyncedActors()]).toEqual([
         worldActor,
         tokenActor,
      ]);
   });

   it('reports a stale condition effect and reports nothing once none is stale', () => {
      expect(conditionEffectsNeedSync()).toBe(true);
      game.actors = [];
      game.scenes = [];
      expect(conditionEffectsNeedSync()).toBe(false);
   });

   it('updates each stale actor once with its effects\' updates', async () => {
      expect(await syncConditionEffects()).toBe(2);
      expect(worldActor.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
         getConditionEffectUpdate(staleBlinded('effect1'), STATUS_EFFECTS),
      ]);
      expect(tokenActor.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
         getConditionEffectUpdate(staleBlinded('effect2'), STATUS_EFFECTS),
      ]);
      expect(linkedActor.updateEmbeddedDocuments).not.toHaveBeenCalled();
   });

   it('does nothing for a non-GM', async () => {
      game.user.isGM = false;
      expect(await syncConditionEffects()).toBe(0);
      expect(worldActor.updateEmbeddedDocuments).not.toHaveBeenCalled();
   });

   it('reports a failing actor and still syncs the rest', async () => {
      /** @type {Function} The console.error spy, silencing the expected error output. */
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      worldActor.updateEmbeddedDocuments.mockRejectedValueOnce(new Error('write refused'));
      expect(await syncConditionEffects()).toBe(1);
      expect(tokenActor.updateEmbeddedDocuments).toHaveBeenCalledTimes(1);
      expect(ui.notifications.error).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
   });
});
```

Create `tests/unit/MigrationAction.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { resolveMigrationAction } from '~/helpers/migration/MigrateWorld.js';

describe('resolveMigrationAction', () => {
   it.each([
      [
         'disabled',
         true,
         'none',
      ],
      [
         'disabled',
         false,
         'none',
      ],
      [
         'automatic',
         true,
         'migrate',
      ],
      [
         'automatic',
         false,
         'none',
      ],
      [
         'prompt',
         true,
         'prompt',
      ],
      [
         'prompt',
         false,
         'none',
      ],
   ])('mode %s with pending migration %s resolves to %s', (mode, needsMigration, action) => {
      expect(resolveMigrationAction(mode, needsMigration)).toBe(action);
   });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/SyncConditionEffects.test.js tests/unit/MigrationAction.test.js`
Expected: FAIL — `SyncConditionEffects.js` does not exist and `resolveMigrationAction` is not exported.

- [ ] **Step 3: Implement the sync**

Create `src/helpers/migration/SyncConditionEffects.js`:

```js
import error from '~/helpers/utility-functions/Error.js';
import log from '~/helpers/utility-functions/Log.js';

/**
 * An update bringing one condition Active Effect in line with its system definition.
 * @typedef {object} ConditionEffectUpdate
 * @property {string} _id - The Active Effect's id.
 * @property {object[]} system.rulesElement - The definition's rules elements (key `system.rulesElement`).
 * @property {string} flags.titan.description - The definition's description (key `flags.titan.description`).
 */

/**
 * Serializes a value to JSON with every object's keys sorted, so structurally equal values serialize identically
 * whatever order their keys were written in. Stored rules elements keep the key order of whatever wrote them, so a
 * plain JSON comparison would report an up-to-date condition as stale on every load.
 * @param {*} value - The value to serialize.
 * @returns {string} The canonical JSON.
 */
export function toCanonicalJson(value) {
   return JSON.stringify(value, (key, entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
         return Object.fromEntries(Object.keys(entry).sort().map((entryKey) => [
            entryKey,
            entry[entryKey],
         ]));
      }
      return entry;
   });
}

/**
 * Builds the update that brings a condition Active Effect in line with its system definition. A condition's rules
 * elements and description are copied onto its effect at creation, so a changed definition reaches existing effects
 * only through this update. The definition is the first status effect whose id the effect's statuses hold.
 * @param {TitanActiveEffect} effect - The Active Effect to check.
 * @param {object[]} statusEffects - The system condition definitions (CONFIG.statusEffects).
 * @returns {ConditionEffectUpdate|null} The update, or null when the effect is not a system condition or is current.
 */
export function getConditionEffectUpdate(effect, statusEffects) {
   if (effect.type !== 'condition') {
      return null;
   }

   /** @type {object|undefined} The system condition this effect applies. */
   const definition = statusEffects.find((condition) => effect.statuses.has(condition.id));
   if (!definition) {
      return null;
   }

   /** @type {object[]} The definition's rules elements. */
   const rulesElement = definition.system?.rulesElement ?? [];

   /** @type {string} The definition's description. */
   const description = definition.flags?.titan?.description ?? '';

   /** @type {object} The effect's stored data. */
   const source = effect.toObject();
   if (
      toCanonicalJson(source.system?.rulesElement ?? []) === toCanonicalJson(rulesElement) &&
      (source.flags?.titan?.description ?? '') === description
   ) {
      return null;
   }

   return {
      _id: effect.id,
      'flags.titan.description': description,
      'system.rulesElement': structuredClone(rulesElement),
   };
}

/**
 * Builds the updates that bring an actor's condition Active Effects in line with their definitions.
 * @param {TitanActor} actor - The actor to check.
 * @param {object[]} statusEffects - The system condition definitions (CONFIG.statusEffects).
 * @returns {ConditionEffectUpdate[]} One update per stale condition effect.
 */
export function getConditionEffectUpdates(actor, statusEffects) {
   /** @type {ConditionEffectUpdate[]} The updates. */
   const updates = [];
   for (const effect of actor.effects) {
      /** @type {ConditionEffectUpdate|null} The effect's update, if it is stale. */
      const update = getConditionEffectUpdate(effect, statusEffects);
      if (update) {
         updates.push(update);
      }
   }
   return updates;
}

/**
 * Yields every actor whose condition effects the sync covers: each world actor, then the actor of each unlinked token
 * on every scene. A linked token's actor is its world actor, so it is covered once. An unlinked token's actor holds its
 * own (delta) effects, which its world actor's update never reaches.
 * @yields {TitanActor} The next actor.
 * @returns {Generator<TitanActor>} The actors.
 */
export function* getSyncedActors() {
   yield* game.actors;
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (!token.actorLink && token.actor) {
            yield token.actor;
         }
      }
   }
}

/**
 * Checks whether any condition Active Effect in the world differs from its system definition.
 * @returns {boolean} Whether any condition effect needs the sync.
 */
export function conditionEffectsNeedSync() {
   for (const actor of getSyncedActors()) {
      if (getConditionEffectUpdates(actor, CONFIG.statusEffects).length > 0) {
         return true;
      }
   }
   return false;
}

/**
 * Rewrites every stale condition Active Effect (world actors and unlinked token actors) from its system definition:
 * its rules elements and its description. Idempotent: a synced effect produces no update. GM-only. An actor whose
 * update fails is reported and the rest still sync.
 * @returns {Promise<number>} The number of actors updated.
 */
export default async function syncConditionEffects() {
   if (!game.user.isGM) {
      return 0;
   }

   /** @type {number} The actors updated. */
   let updated = 0;
   for (const actor of getSyncedActors()) {
      /** @type {ConditionEffectUpdate[]} The actor's condition updates. */
      const updates = getConditionEffectUpdates(actor, CONFIG.statusEffects);
      if (updates.length === 0) {
         continue;
      }
      try {
         await actor.updateEmbeddedDocuments('ActiveEffect', updates);
         updated++;
      }
      catch (err) {
         error(`Failed to sync the conditions of Actor "${actor.name}".`, err);
      }
   }

   if (updated > 0) {
      log(`Synced the conditions of ${updated} actors.`);
   }
   return updated;
}
```

- [ ] **Step 4: Join the sync to the migration system and fix Disabled**

In `src/helpers/migration/MigrateWorld.js`:
(a) add after the `weaponMigrations` import:

```js
import syncConditionEffects, { conditionEffectsNeedSync } from '~/helpers/migration/SyncConditionEffects.js';
```

(b) in `worldNeedsMigration`, replace the final `return false;` with:

```js
   // Condition effects hold copies of their definitions, which a system update may change.
   return conditionEffectsNeedSync();
```

and update its JSDoc summary to: "Checks whether any Actor or Item in the world, including items embedded within
actors, needs a version migration, or any condition Active Effect differs from its system definition."

(c) in `migrateWorld`, insert before `log('World migration complete.');`:

```js
   // Rewrite stale condition effects from the current definitions.
   await syncConditionEffects();
```

and replace its JSDoc summary with: "Migrates all Actor and Item documents in the world to the latest schema version,
including items embedded within actors, then syncs every condition Active Effect (world actors and unlinked token
actors) to its system definition. Only runs for the GM. Skips documents that are already up to date. The one-shot
legacy-effect converter is run separately from the Ready hook."

(d) append:

```js
/**
 * Resolves what a GM world load does about migration. Source: the `migrationMode` setting's hint ("Prompt: displays a
 * confirmation dialog before migrating. Automatic: migrates immediately without prompting. Disabled: skips migration
 * entirely.").
 * @param {string} mode - The `migrationMode` setting ('prompt', 'automatic', or 'disabled').
 * @param {boolean} needsMigration - Whether the world has a pending migration (worldNeedsMigration()).
 * @returns {'none'|'migrate'|'prompt'} Nothing, migrate now, or ask the GM first.
 */
export function resolveMigrationAction(mode, needsMigration) {
   if (mode === 'disabled' || !needsMigration) {
      return 'none';
   }
   if (mode === 'automatic') {
      return 'migrate';
   }
   return 'prompt';
}
```

Replace the whole of `src/hooks/OnceReady.js` with:

```js
import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import { migrateWorld, resolveMigrationAction, worldNeedsMigration } from '~/helpers/migration/MigrateWorld.js';
import convertEffectItemsToActiveEffects from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';
import ConfirmMigrateWorldDialog from '~/helpers/migration/ConfirmMigrateWorldDialog.js';
import TitanPlayerHud from '~/ui/player-hud/TitanPlayerHud.js';
import PlayerHudSettingsApplication from '~/ui/player-hud/settings/PlayerHudSettingsApplication.js';

/**
 * Attached to the Ready hook.
 * For the GM, runs the one-shot legacy-effect-to-Active-Effect converter unconditionally (it self-guards on GM and is
 * idempotent), then acts on any pending migration (version chains and condition-effect sync) as the migration mode
 * setting decides: prompt asks the GM through a dialog, automatic migrates now, disabled skips migration. The Player
 * HUD is built after the migration, so its existence marks a finished load. Finally registers the hot-bar drop hook
 * for all users.
 * @returns {Promise<void>}
 */
export default async function onceReady() {
   if (game.user.isGM) {
      await convertEffectItemsToActiveEffects();

      switch (resolveMigrationAction(game.settings.get('titan', 'migrationMode'), worldNeedsMigration())) {
         case 'prompt': {
            new ConfirmMigrateWorldDialog().render(true);
            break;
         }
         case 'migrate': {
            await migrateWorld();
            break;
         }
         default: {
            break;
         }
      }
   }

   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);

   // Build and attach the Player HUD and its shared configuration window.
   game.titan.playerHud = new TitanPlayerHud();
   game.titan.playerHud.init();
   game.titan.playerHudSettings = new PlayerHudSettingsApplication();
}
```

In `CHANGELOG.md`, insert as the first line under the `## Unreleased:` summary line (above every bullet):

```markdown
**Back up your world before updating. The first GM login rewrites every existing condition on world actors and
unlinked tokens to the new rules (as the Migration Mode setting allows).**
```

and append to the list:

```markdown
- Existing conditions update to the current rules and descriptions through the world migration.
- The Migration Mode setting's "Disabled" choice skips migration, as its description says.
```

- [ ] **Step 5: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/SyncConditionEffects.test.js tests/unit/MigrationAction.test.js`
Expected: PASS.

- [ ] **Step 6: Write the migration e2e**

Check the test world's pending state first (read-only), so a prompt-mode dialog at login is expected rather than a
surprise: in a logged-in E2E GM page run
`page.evaluate(() => game.settings.get('titan', 'migrationMode'))`. In `prompt` mode with stale conditions in the test
world, every GM login shows the migration dialog until this spec's automatic-mode reload syncs the world; run this
spec first among the task's e2e specs.

Create `tests/e2e/condition-migration.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * The condition-effect sync on a GM world load: Disabled leaves a stale condition, Prompt asks and leaves it until
 * confirmed, and Automatic rewrites it on a world actor and on an unlinked token's actor.
 */

/** @type {string} Name of the world actor carrying a stale Blinded. */
const WORLD_ACTOR_NAME = 'E2E Migration World Actor';

/** @type {string} Name of the actor whose unlinked token carries a token-only stale Deafened. */
const TOKEN_ACTOR_NAME = 'E2E Migration Token Actor';

/** @type {string} Name of the scene holding the unlinked token. */
const SCENE_NAME = 'E2E Migration Scene';

/**
 * Blinded's rules elements before the 09_26 rules (flat -1).
 * @type {object[]}
 */
const STALE_BLINDED = [
   'melee',
   'accuracy',
   'defense',
].map((key) => ({
   operation: 'flatModifier',
   selector: 'rating',
   key,
   value: -1,
   uuid: `condition-blinded-${key}`,
}));

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The migration mode in force before this spec. */
let originalMode;
/** @type {{sceneId: string, tokenId: string}} The seeded scene and unlinked token. */
let seeded;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await closeAllApps(page);
   originalMode = await page.evaluate(() => game.settings.get('titan', 'migrationMode'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async ({ mode, sceneName }) => {
      await game.settings.set('titan', 'migrationMode', mode);
      await game.scenes.getName(sceneName)?.delete();
   }, {
      mode: originalMode,
      sceneName: SCENE_NAME,
   });
   await deleteFixtureActor(page, WORLD_ACTOR_NAME);
   await deleteFixtureActor(page, TOKEN_ACTOR_NAME);
   await page?.close();
});

/**
 * Seeds a world actor with a Blinded effect in its pre-09_26 form and an unlinked token whose own actor carries a
 * Deafened effect with no rules elements (its pre-09_26 form).
 * @returns {Promise<{sceneId: string, tokenId: string}>} The seeded scene and token ids.
 */
function seedStaleConditions() {
   return page.evaluate(async ({ worldActorName, tokenActorName, sceneName, staleBlinded }) => {
      await game.actors.getName(worldActorName)?.delete();
      await game.actors.getName(tokenActorName)?.delete();
      await game.scenes.getName(sceneName)?.delete();

      /** @type {TitanActor} The world actor. */
      const worldActor = await Actor.create({
         name: worldActorName,
         type: 'player',
      });
      await worldActor.toggleStatusEffect('blinded', { active: true });
      await worldActor.effects.find((effect) => effect.statuses.has('blinded')).update({
         'flags.titan.description': 'stale',
         'system.rulesElement': staleBlinded,
      });

      /** @type {TitanActor} The base actor of the unlinked token. */
      const tokenActor = await Actor.create({
         name: tokenActorName,
         prototypeToken: { actorLink: false },
         type: 'npc',
      });

      /** @type {Scene} The fixture scene. */
      const scene = await Scene.create({ name: sceneName });

      /** @type {TokenDocument[]} The created token, alone in the array. */
      const [token] = await scene.createEmbeddedDocuments('Token', [
         {
            actorId: tokenActor.id,
            actorLink: false,
            name: tokenActorName,
            x: 0,
            y: 0,
         },
      ]);
      await token.actor.toggleStatusEffect('deafened', { active: true });
      await token.actor.effects.find((effect) => effect.statuses.has('deafened')).update({
         'flags.titan.description': 'stale',
         'system.rulesElement': [],
      });
      return {
         sceneId: scene.id,
         tokenId: token.id,
      };
   }, {
      sceneName: SCENE_NAME,
      staleBlinded: STALE_BLINDED,
      tokenActorName: TOKEN_ACTOR_NAME,
      worldActorName: WORLD_ACTOR_NAME,
   });
}

/**
 * Reads whether each seeded condition matches its current definition.
 * @returns {Promise<{blinded: boolean, deafened: boolean}>} Whether each condition's rules elements and description
 * equal CONFIG.statusEffects'.
 */
function readSynced() {
   return page.evaluate(({ worldActorName, sceneId, tokenId }) => {
      /**
       * Serializes a value with sorted object keys, so stored key order never decides the comparison.
       * @param {*} value - The value.
       * @returns {string} The canonical JSON.
       */
      const canonical = (value) => JSON.stringify(value, (key, entry) => {
         if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            return Object.fromEntries(Object.keys(entry).sort().map((entryKey) => [
               entryKey,
               entry[entryKey],
            ]));
         }
         return entry;
      });

      /**
       * Compares a condition effect with its definition.
       * @param {TitanActor} actor - The actor carrying the effect.
       * @param {string} id - The condition id.
       * @returns {boolean} Whether the effect matches.
       */
      const matches = (actor, id) => {
         /** @type {TitanActiveEffect} The condition effect. */
         const effect = actor.effects.find((entry) => entry.statuses.has(id));

         /** @type {object} The condition's definition. */
         const definition = CONFIG.statusEffects.find((condition) => condition.id === id);
         return canonical(effect.toObject().system.rulesElement) === canonical(definition.system?.rulesElement ?? []) &&
            effect.flags.titan.description === definition.flags.titan.description;
      };
      return {
         blinded: matches(game.actors.getName(worldActorName), 'blinded'),
         deafened: matches(game.scenes.get(sceneId).tokens.get(tokenId).actor, 'deafened'),
      };
   }, {
      sceneId: seeded.sceneId,
      tokenId: seeded.tokenId,
      worldActorName: WORLD_ACTOR_NAME,
   });
}

/**
 * Sets the migration mode and reloads the world as the same GM, returning once the load has passed its migration step
 * (onceReady builds the Player HUD after it).
 * @param {string} mode - The migration mode.
 * @returns {Promise<void>} Resolves once the reloaded world finished onceReady.
 */
async function reloadWithMode(mode) {
   await page.evaluate((value) => game.settings.set('titan', 'migrationMode', value), mode);
   await page.reload();
   await page.waitForURL('**/game', { timeout: 15_000 });
   await page.waitForFunction(
      () => globalThis.game?.ready === true && !!game.titan?.playerHud,
      null,
      { timeout: 60_000 },
   );
}

test('Disabled and Prompt leave stale conditions; Automatic rewrites world and token-only ones', async () => {
   seeded = await seedStaleConditions();
   expect(await readSynced()).toEqual({
      blinded: false,
      deafened: false,
   });

   // Disabled: the load passed its migration step without touching the stale conditions.
   await reloadWithMode('disabled');
   expect(await readSynced()).toEqual({
      blinded: false,
      deafened: false,
   });

   // Prompt: the migration dialog asks first; nothing is rewritten until the GM confirms.
   await reloadWithMode('prompt');

   /** @type {string} The migration dialog's localized description. */
   const promptText = await page.evaluate(() => game.i18n.localize('LOCAL.confirmMigrateWorld.desc.text'));
   await expect(page.locator('.application.titan-dialog').filter({ hasText: promptText })).toBeVisible();
   expect(await readSynced()).toEqual({
      blinded: false,
      deafened: false,
   });
   await closeAllApps(page);

   // Automatic: both conditions are rewritten before the load finishes.
   await reloadWithMode('automatic');
   expect(await readSynced()).toEqual({
      blinded: true,
      deafened: true,
   });
});
```

- [ ] **Step 7: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/condition-migration.spec.js` → pass; then
`npm run test:e2e -- tests/e2e/pack-conversion.spec.js tests/e2e/logic/conditions.spec.js` → all pass (the converter
still runs on every load and conditions still apply).

- [ ] **Step 8: Commit**

```bash
git branch --show-current
git status --short
git add src/helpers/migration/SyncConditionEffects.js src/helpers/migration/MigrateWorld.js src/hooks/OnceReady.js \
   CHANGELOG.md tests/unit/SyncConditionEffects.test.js tests/unit/MigrationAction.test.js \
   tests/e2e/condition-migration.spec.js
git commit -F - <<'EOF'
feat(migration): sync condition effects to their definitions on world load

worldNeedsMigration reports condition Active Effects (world actors and
unlinked token actors) whose rules elements or description differ from
CONFIG.statusEffects, and migrateWorld rewrites them, so Migration Mode
governs the sync. Migration Mode Disabled now skips migration as its hint
says.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---
### Task 6: One rules-element operation registry (behaviour-preserving)

The operation list, the operation select's rebuild switch, the editor dispatch, and the actor's applier switch are
four hand lists of the same ten operations; Task 8 adds an eleventh. This task makes the factory registry the single
source and guards the two switches that must stay switches.

**Files:**
- Create: `src/document/types/item/rules-element/RulesElementFactories.js`
- Modify: `src/system/RulesElementOperations.js`,
  `src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte`
- Test: `tests/unit/RulesElementOperationRegistry.test.js` (create), `tests/e2e/component-probe-selects.spec.js`

**Interfaces:**
- Produces: `RULES_ELEMENT_FACTORIES: Readonly<Record<string, (options?: object) => object>>` (operation → factory,
  editor display order); `RULES_ELEMENT_OPERATIONS` becomes `Object.freeze(Object.keys(RULES_ELEMENT_FACTORIES))`
  (same values, same order).

- [ ] **Step 1: Pin the current operation surface**

Create `tests/unit/RulesElementOperationRegistry.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { RULES_ELEMENT_OPERATIONS } from '~/system/RulesElementOperations.js';

/** @type {string} The repository root. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.join(ROOT, 'lang/en.json'), 'utf-8'));

/**
 * Reads the `case '<operation>':` labels of one switch in a source file: from the switch's opening text up to its
 * `default: {` branch.
 * @param {string} relativePath - The source file, relative to the repository root.
 * @param {string} switchStart - Text that starts the switch (unique in the file).
 * @returns {string[]} The case labels, sorted.
 */
function readSwitchCases(relativePath, switchStart) {
   /** @type {string} The source. */
   const source = readFileSync(path.join(ROOT, relativePath), 'utf-8');

   /** @type {number} Where the switch starts. */
   const start = source.indexOf(switchStart);
   expect(start, `${switchStart} in ${relativePath}`).toBeGreaterThanOrEqual(0);

   /** @type {string} The switch body up to its default branch. */
   const body = source.slice(start, source.indexOf('default: {', start));
   return [...body.matchAll(/case '(\w+)':/g)].map((match) => match[1]).sort();
}

describe('rules-element operations', () => {
   it('lists the operations in editor display order', () => {
      expect(RULES_ELEMENT_OPERATIONS).toEqual([
         'flatModifier',
         'mulBase',
         'mulSum',
         'setSum',
         'fastHealing',
         'persistentDamage',
         'turnMessage',
         'rollMessage',
         'conditionalRatingModifier',
         'conditionalCheckModifier',
      ]);
   });

   it.each(RULES_ELEMENT_OPERATIONS)('LOCAL labels the %s operation', (operation) => {
      expect(lang.LOCAL[`${operation}.text`]).toBeTypeOf('string');
   });

   it('the item sheet dispatches an editor for exactly the operations', () => {
      expect(readSwitchCases(
         'src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte',
         'const operationSettingsComponent',
      )).toEqual([...RULES_ELEMENT_OPERATIONS].sort());
   });

   it('the actor buckets exactly the operations', () => {
      expect(readSwitchCases(
         'src/document/types/actor/types/character/CharacterDataModel.js',
         'switch (element.operation) {',
      )).toEqual([...RULES_ELEMENT_OPERATIONS].sort());
   });
});
```

Run: `npx vitest run tests/unit/RulesElementOperationRegistry.test.js`
Expected: PASS (pins current behaviour). Commit it alone:

```bash
git branch --show-current
git status --short
git add tests/unit/RulesElementOperationRegistry.test.js
git commit -F - <<'EOF'
test(rules-elements): pin the operation list and its two switches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

- [ ] **Step 2: Write the failing registry tests**

Append to `tests/unit/RulesElementOperationRegistry.test.js` (add the import to the top import block):

```js
import { RULES_ELEMENT_FACTORIES } from '~/document/types/item/rules-element/RulesElementFactories.js';
```

```js
describe('RULES_ELEMENT_FACTORIES', () => {
   it('is the operation list', () => {
      expect(Object.keys(RULES_ELEMENT_FACTORIES)).toEqual([...RULES_ELEMENT_OPERATIONS]);
   });

   it.each(RULES_ELEMENT_OPERATIONS)('the %s factory builds its own operation and keeps a given uuid', (operation) => {
      /** @type {object} The built element. */
      const element = RULES_ELEMENT_FACTORIES[operation]({ uuid: 'kept-uuid' });
      expect(element.operation).toBe(operation);
      expect(element.uuid).toBe('kept-uuid');
   });

   it('the operation select rebuilds through the registry, with no operation switch of its own', () => {
      /** @type {string} The operation select's source. */
      const source = readFileSync(path.join(
         ROOT,
         'src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte',
      ), 'utf-8');
      expect(source).toContain('RULES_ELEMENT_FACTORIES');
      expect(source).not.toMatch(/case '\w+':/);
   });
});
```

Run: `npx vitest run tests/unit/RulesElementOperationRegistry.test.js`
Expected: FAIL — `RulesElementFactories.js` does not exist.

- [ ] **Step 3: Create the registry and derive the list from it**

Create `src/document/types/item/rules-element/RulesElementFactories.js`:

```js
import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';
import createMulSumElement from '~/document/types/item/rules-element/MulSum.js';
import createSetSumElement from '~/document/types/item/rules-element/SetSum.js';
import createFastHealingElement from '~/document/types/item/rules-element/FastHealing.js';
import createPersistentDamageElement from '~/document/types/item/rules-element/PersistentDamage.js';
import createTurnMessageElement from '~/document/types/item/rules-element/TurnMessage.js';
import createRollMessageElement from '~/document/types/item/rules-element/RollMessage.js';
import createConditionalRatingModifierElement from '~/document/types/item/rules-element/ConditionalRatingModifier.js';
import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier.js';

/**
 * The factory of every rules-element operation, keyed by operation, in editor display order. The single source of the
 * operations: RULES_ELEMENT_OPERATIONS is its key list and the operation select rebuilds a retyped element through it.
 * Each factory takes the element being replaced (its `uuid` is kept) and returns the operation's default element.
 * Implicit coupling: the item sheet's editor dispatch (ItemSheetRulesElementSettings) and the actor's bucket switch
 * (CharacterDataModel._applyRulesElements) must name every key; RulesElementOperationRegistry.test.js enforces both.
 * @type {Readonly<Record<string, (options?: object) => object>>}
 */
export const RULES_ELEMENT_FACTORIES = Object.freeze({
   flatModifier: createFlatModifierElement,
   mulBase: createMulBaseElement,
   mulSum: createMulSumElement,
   setSum: createSetSumElement,
   fastHealing: createFastHealingElement,
   persistentDamage: createPersistentDamageElement,
   turnMessage: createTurnMessageElement,
   rollMessage: createRollMessageElement,
   conditionalRatingModifier: createConditionalRatingModifierElement,
   conditionalCheckModifier: createConditionalCheckModifierElement,
});
```

Replace the whole of `src/system/RulesElementOperations.js` with:

```js
import { RULES_ELEMENT_FACTORIES } from '~/document/types/item/rules-element/RulesElementFactories.js';

/**
 * Every system Rules Element operation, in editor display order: the keys of RULES_ELEMENT_FACTORIES.
 * @type {readonly string[]}
 */
export const RULES_ELEMENT_OPERATIONS = Object.freeze(Object.keys(RULES_ELEMENT_FACTORIES));
```

In `ItemSheetRulesElementOperationSelect.svelte`, replace the ten `create*Element` import lines with:

```js
   import { RULES_ELEMENT_FACTORIES } from '~/document/types/item/rules-element/RulesElementFactories.js';
```

and replace the whole `onRulesElementOperationChanged` function (JSDoc and body) with:

```js
   /**
    * Rebuilds a Rules Element as its new operation's default element (keeping its uuid) when its Operation changes.
    * @returns {Promise<void>} Returns after the item owning the Rules Element has been updated.
    */
   async function onRulesElementOperationChanged() {
      if (document.data && idx < document.data?.system.rulesElement.length) {
         /** @type {string} The element's new operation. */
         const operation = document.data.system.rulesElement[idx].operation;
         if (!Object.hasOwn(RULES_ELEMENT_FACTORIES, operation)) {
            error(`Invalid Rules Element operation ${operation}`);
            return;
         }

         document.data.system.rulesElement[idx] = RULES_ELEMENT_FACTORIES[operation](
            document.data.system.rulesElement[idx],
         );
         await document.data.update({
            system: {
               rulesElement: structuredClone(document.data.system.rulesElement),
            },
         });
      }
   }
```

- [ ] **Step 4: Derive the probe's expected operations**

In `tests/e2e/component-probe-selects.spec.js`:
(a) add to the imports (keep existing ones; add `readFileSync` / `fileURLToPath` imports if the file lacks them):

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
```

(b) add before the `RulesElementOperationSelect` describe block:

```js
/**
 * The rules-element operations, read from their single source (RULES_ELEMENT_FACTORIES' keys) so the probe follows the
 * registry.
 * @type {string[]}
 */
const RULES_ELEMENT_OPERATIONS = [
   ...readFileSync(
      fileURLToPath(new URL('../../src/document/types/item/rules-element/RulesElementFactories.js', import.meta.url)),
      'utf-8',
   ).matchAll(/^ {3}(\w+): create\w+Element,$/gm),
].map((match) => match[1]);
```

(c) replace the block comment line `// RulesElementOperationSelect — RULES_ELEMENT_OPERATIONS constant (8 entries); no allowNone.` with
`// RulesElementOperationSelect — the RULES_ELEMENT_FACTORIES operations; no allowNone.`

(d) replace the eleven `expect(optionValues)...` lines (the ten `toContain` and the `toHaveLength(10)`) with:

```js
      expect(RULES_ELEMENT_OPERATIONS.length).toBeGreaterThanOrEqual(10);
      expect(optionValues).toEqual(RULES_ELEMENT_OPERATIONS);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/RulesElementOperationRegistry.test.js tests/unit/RulesElementFactories.test.js`
Expected: PASS.

- [ ] **Step 6: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm run stylelint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/component-probe-selects.spec.js tests/e2e/rules-element-crud.spec.js` → all pass.

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git status --short
git add src/document/types/item/rules-element/RulesElementFactories.js src/system/RulesElementOperations.js \
   src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte \
   tests/unit/RulesElementOperationRegistry.test.js tests/e2e/component-probe-selects.spec.js
git commit -F - <<'EOF'
refactor(rules-elements): one operation-to-factory registry

RULES_ELEMENT_OPERATIONS is the registry's key list, the operation select
rebuilds through it, and a guard test pins the editor dispatch and the
actor's bucket switch to it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 7: One rules-element source list (behaviour-preserving)

`_applyRulesElements` gathers elements from items, the armor's traits, effects, and conditions inline. Task 9's
immunity pre-pass must read exactly the same sources, so the gathering moves to `_getRulesElementSources()`.

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Test: `tests/unit/RulesElementSources.test.js` (create)

**Interfaces:**
- Produces: typedef `RulesElementSource` `{ elements: object[], type: string, id: string, name: string, effect?:
  TitanActiveEffect }`; `CharacterDataModel#_getRulesElementSources(): RulesElementSource[]` (item sources in item
  order, then the equipped armor's trait source when it has elements, then enabled `effect` Active Effects, then
  enabled `condition` Active Effects); `CharacterDataModel#_getItemRulesElementType(item): string|null`.

- [ ] **Step 1: Characterize the current gathering**

Create `tests/unit/RulesElementSources.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// Which items and Active Effects contribute rules elements, to which mod bucket, and in what order, exercised on a
// bare CharacterDataModel through the real `_applyRulesElements`.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * Builds a source's two elements: a flat Melee modifier worth `value` and an Advantage situation keyed by `situation`.
 * @param {number} value - The flat Melee modifier (a distinct power of two per source).
 * @param {string} situation - The situation key naming the source.
 * @returns {object[]} The elements.
 */
function sourceElements(value, situation) {
   return [
      {
         key: 'melee',
         operation: 'flatModifier',
         selector: 'rating',
         uuid: `${situation}-flat`,
         value,
      },
      {
         checkType: 'any',
         key: situation,
         modifierType: 'advantage',
         operation: 'conditionalCheckModifier',
         selector: 'situation',
         skill: '',
         uuid: `${situation}-situation`,
         value: 1,
      },
   ];
}

/**
 * Builds a fake owned item.
 * @param {string} id - The item id.
 * @param {string} type - The item type.
 * @param {number} value - The flat Melee modifier.
 * @param {object} [system] - Extra system data (equipped, trait).
 * @returns {object} The fake item.
 */
function item(id, type, value, system = {}) {
   return {
      _id: id,
      id,
      name: id,
      system: {
         rulesElement: sourceElements(value, `from ${id}`),
         ...system,
      },
      type,
   };
}

/**
 * Builds a fake Active Effect.
 * @param {string} id - The effect id.
 * @param {string} type - The effect subtype (effect or condition).
 * @param {number} value - The flat Melee modifier.
 * @param {boolean} disabled - Whether the effect is disabled.
 * @returns {object} The fake effect.
 */
function activeEffect(id, type, value, disabled) {
   return {
      disabled,
      id,
      name: id,
      statuses: new Set(),
      system: {
         rulesElement: sourceElements(value, `from ${id}`),
      },
      type,
   };
}

/**
 * Builds a bare Character owning one applying and one non-applying source of every kind, with Melee at base 0.
 * @returns {object} The model.
 */
function createSourcedCharacter() {
   /** @type {object[]} The owned items, in item order. */
   const items = [
      item('ability', 'ability', 1),
      item('armorEquipped', 'armor', 2, {
         trait: [
            {
               name: 'loud',
               value: true,
            },
         ],
      }),
      item('armorUnequipped', 'armor', 4, { trait: [] }),
      item('shieldEquipped', 'shield', 8),
      item('shieldUnequipped', 'shield', 16),
      item('weaponEquipped', 'weapon', 32, { equipped: true }),
      item('weaponUnequipped', 'weapon', 64, { equipped: false }),
      item('equipmentEquipped', 'equipment', 128, { equipped: true }),
      item('equipmentUnequipped', 'equipment', 256, { equipped: false }),
   ];

   /** @type {object[]} The Active Effects. */
   const effects = [
      activeEffect('effectEnabled', 'effect', 512, false),
      activeEffect('effectDisabled', 'effect', 1024, true),
      activeEffect('conditionEnabled', 'condition', 2048, false),
      activeEffect('conditionDisabled', 'condition', 4096, true),
   ];

   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      effects: new Map(effects.map((effect) => [
         effect.id,
         effect,
      ])),
      items: new Map(items.map((entry) => [
         entry.id,
         entry,
      ])),
      rulesElementsCache: {},
   };
   model.equipped = {
      armor: 'armorEquipped',
      shield: 'shieldEquipped',
   };
   model.rating = {
      melee: {
         baseValue: 0,
         mod: {
            static: 0,
            equipment: 0,
            effect: 0,
            ability: 0,
            condition: 0,
         },
      },
   };
   return model;
}

describe('rules-element sources', () => {
   it('fills each bucket from exactly the applying sources', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();
      model._applyRulesElements();
      expect(model.rating.melee.mod).toEqual({
         static: 0,
         equipment: 2 + 8 + 32 + 128,
         effect: 512,
         ability: 1,
         condition: 2048,
      });
   });

   it('gathers items in item order, then the armor\'s traits, then effects, then conditions', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();
      model._applyRulesElements();
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'stealth' }).map((entry) => [
         entry.key,
         entry.sources,
      ])).toEqual([
         [
            'fromAbility',
            ['ability'],
         ],
         [
            'fromArmorEquipped',
            ['armorEquipped'],
         ],
         [
            'fromShieldEquipped',
            ['shieldEquipped'],
         ],
         [
            'fromWeaponEquipped',
            ['weaponEquipped'],
         ],
         [
            'fromEquipmentEquipped',
            ['equipmentEquipped'],
         ],
         [
            'remainUndetectedByHearing',
            ['armorEquipped'],
         ],
         [
            'fromEffectEnabled',
            ['effectEnabled'],
         ],
         [
            'fromConditionEnabled',
            ['conditionEnabled'],
         ],
      ]);
   });
});
```

Run: `npx vitest run tests/unit/RulesElementSources.test.js`
Expected: PASS on the current code (`camelize` upper-cases each word's first letter and keeps existing capitals, so
"from armorEquipped" keys as `fromArmorEquipped`). Commit it alone:

```bash
git branch --show-current
git status --short
git add tests/unit/RulesElementSources.test.js
git commit -F - <<'EOF'
test(rules-elements): characterize which sources apply, to which bucket, in order

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

- [ ] **Step 2: Write the failing source-list test**

Append to `tests/unit/RulesElementSources.test.js`:

```js
describe('_getRulesElementSources', () => {
   it('lists each applying source with its bucket, id, name, and owning effect', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();

      /** @type {RulesElementSource[]} The sources. */
      const sources = model._getRulesElementSources();
      expect(sources.map((source) => [
         source.type,
         source.id,
         source.name,
         source.effect?.id,
      ])).toEqual([
         [
            'ability',
            'ability',
            'ability',
            undefined,
         ],
         [
            'equipment',
            'armorEquipped',
            'armorEquipped',
            undefined,
         ],
         [
            'equipment',
            'shieldEquipped',
            'shieldEquipped',
            undefined,
         ],
         [
            'equipment',
            'weaponEquipped',
            'weaponEquipped',
            undefined,
         ],
         [
            'equipment',
            'equipmentEquipped',
            'equipmentEquipped',
            undefined,
         ],
         [
            'equipment',
            'armorEquipped',
            'armorEquipped',
            undefined,
         ],
         [
            'effect',
            'effectEnabled',
            'effectEnabled',
            'effectEnabled',
         ],
         [
            'condition',
            'conditionEnabled',
            'conditionEnabled',
            'conditionEnabled',
         ],
      ]);
   });

   it('omits the armor trait source when the armor\'s traits impose nothing', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();
      model.parent.items.get('armorEquipped').system.trait = [];
      expect(model._getRulesElementSources().filter((source) => source.id === 'armorEquipped')).toHaveLength(1);
   });
});
```

Run: `npx vitest run tests/unit/RulesElementSources.test.js`
Expected: FAIL — `model._getRulesElementSources is not a function`.

- [ ] **Step 3: Extract the source list**

In `CharacterDataModel.js`, add directly after the `SituationalCheckModifier` typedef (above `isBlankSelectorKey`):

```js
/**
 * A source of rules elements on a Character: an owned item, the equipped armor's traits, or an Active Effect.
 * @typedef {object} RulesElementSource
 * @property {object[]} elements - The source's rules elements (not copied; callers copy before tagging).
 * @property {string} type - The mod bucket its elements fill: ability, equipment, effect, or condition.
 * @property {string} id - The owning item's or Active Effect's id.
 * @property {string} name - The owning item's or Active Effect's name; situational modifiers list their sources by it.
 * @property {TitanActiveEffect} [effect] - The owning Active Effect, for an effect or condition source.
 */
```

Replace the start of `_applyRulesElements`, from `// Get all the Rules Elements.` through the end of the second
`this.parent.effects.forEach(...)` block (the condition pass, just before `// Expand any 'all'-key elements`), with:

```js
      // Copy every applying source's Rules Elements, tagging each with its bucket and its source's name (situational
      // modifiers list their sources).
      /** @type {object[]} The gathered, tagged Rules Elements. */
      const rulesElements = [];
      for (const source of this._getRulesElementSources()) {
         /** @type {object[]} Copies of the source's elements, safe to tag. */
         const copiedElements = structuredClone(source.elements);
         for (const element of copiedElements) {
            element.type = source.type;
            element.sourceName = source.name;
         }
         rulesElements.push(...copiedElements);
      }
```

Add these two methods directly above `_applyRulesElements`:

```js
   /**
    * Lists the sources whose Rules Elements apply to this Character, in application order: owned items (abilities
    * always; armor and shields while equipped in their slot; weapons and equipment while equipped), then the equipped
    * armor's traits (synthetic situational check modifiers, sourced as the armor), then enabled `effect` Active
    * Effects, then enabled `condition` Active Effects. The order is the order situational modifiers list their
    * sources in. Every rules-element pass reads this one list.
    * @returns {RulesElementSource[]} The applying sources.
    * @private
    */
   _getRulesElementSources() {
      /** @type {RulesElementSource[]} The sources. */
      const sources = [];
      this.parent.items.forEach((item) => {
         if (!(item.system.rulesElement?.length > 0)) {
            return;
         }

         /** @type {string|null} The bucket the item's elements fill, or null when they do not apply. */
         const type = this._getItemRulesElementType(item);
         if (type) {
            sources.push({
               elements: item.system.rulesElement,
               id: item.id,
               name: item.name,
               type,
            });
         }
      });

      // The equipped armor's traits add synthetic situational check modifiers, sourced as the armor. They are gathered
      // here because the conditional-check caches are built before _applyArmorAndShields runs.
      /** @type {TitanItem|boolean} The equipped armor, or false when none is equipped. */
      const equippedArmor = this.getEquippedArmor();
      if (equippedArmor) {
         /** @type {ConditionalCheckModifierElement[]} The armor traits' situational modifiers. */
         const traitElements = createArmorTraitCheckModifiers(equippedArmor.system.trait);
         if (traitElements.length > 0) {
            sources.push({
               elements: traitElements,
               id: equippedArmor.id,
               name: equippedArmor.name,
               type: 'equipment',
            });
         }
      }

      // Enabled Active Effects: the 'effect' subtype, then the 'condition' subtype, each filling its own bucket.
      for (const effectType of [
         'effect',
         'condition',
      ]) {
         this.parent.effects.forEach((effect) => {
            if (effect.type === effectType && !effect.disabled && effect.system.rulesElement?.length > 0) {
               sources.push({
                  effect,
                  elements: effect.system.rulesElement,
                  id: effect.id,
                  name: effect.name,
                  type: effectType,
               });
            }
         });
      }

      return sources;
   }

   /**
    * Gets the mod bucket an owned item's Rules Elements fill: abilities always apply; armor and shields apply while
    * equipped in their slot; weapons and equipment apply while equipped.
    * @param {TitanItem} item - The owned item.
    * @returns {string|null} 'ability' or 'equipment', or null when the item's elements do not apply.
    * @private
    */
   _getItemRulesElementType(item) {
      switch (item.type) {
         case 'ability': {
            return 'ability';
         }
         case 'armor': {
            return this.equipped.armor === item._id ? 'equipment' : null;
         }
         case 'shield': {
            return this.equipped.shield === item._id ? 'equipment' : null;
         }
         case 'weapon':
         case 'equipment': {
            return item.system.equipped ? 'equipment' : null;
         }
         default: {
            return null;
         }
      }
   }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/RulesElementSources.test.js tests/unit/ConditionMechanics.test.js
tests/unit/CharacterCheckModifiers.test.js`
Expected: PASS (the characterization tests from Step 1 are unchanged and still green).

- [ ] **Step 5: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/reactive-armor-shield.spec.js tests/e2e/armor-trait-situations.spec.js
tests/e2e/effect-reactivity.spec.js tests/e2e/logic/conditions.spec.js` → all pass.

- [ ] **Step 6: Commit**

```bash
git branch --show-current
git status --short
git add src/document/types/actor/types/character/CharacterDataModel.js tests/unit/RulesElementSources.test.js
git commit -F - <<'EOF'
refactor(actor): gather rules elements from one source list

_getRulesElementSources lists the applying items, the armor's trait
modifiers, and the enabled effects and conditions in application order,
so every rules-element pass reads the same sources.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 8: The `immunity` rules element and its editor

**Files:**
- Create: `src/document/types/item/rules-element/Immunity.js`,
  `src/helpers/svelte-components/input/select/ConditionSelect.svelte`,
  `src/document/svelte-components/select/DocumentConditionSelect.svelte`,
  `src/document/types/item/sheet/rules-element/ItemSheetImmunitySettings.svelte`
- Modify: `src/system/Conditions.js` (export `CONDITION_IDS`), `src/system/ConditionalCheckModifierTypes.js`
  (`TYPED_KEY_SELECTORS.immunity`), `src/document/types/item/rules-element/RulesElementFactories.js`,
  `src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte`,
  `src/document/svelte-components/input/DocumentTextInput.svelte` (`testId`),
  `src/document/types/actor/types/character/CharacterDataModel.js` (bucket switch), `lang/en.json`
- Test: `tests/unit/RulesElementOperationRegistry.test.js`, `tests/unit/TypedKeySelectorEditors.test.js`,
  `tests/unit/RulesElementFactories.test.js`, `tests/e2e/rules-element-immunity-editor.spec.js` (create)

**Interfaces:**
- Produces: `CONDITION_IDS: readonly string[]` (definition order); `IMMUNITY_SELECTORS: readonly ['condition',
  'effect']`; typedef `ImmunityElement` `{ operation: 'immunity', selector: 'condition'|'effect', key: string, uuid:
  string }`; `createImmunityElement(options?)` → `{ operation: 'immunity', selector: 'condition', key:
  CONDITION_IDS[0], uuid }`; `TYPED_KEY_SELECTORS.immunity = ['effect']`; editor test ids `immunity-selector`,
  `immunity-key`; `DocumentTextInput` / `ConditionSelect` / `DocumentConditionSelect` accept `testId`.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/RulesElementOperationRegistry.test.js`, append `'immunity',` as the last entry of the pinned list in
`'lists the operations in editor display order'`.

In `tests/unit/TypedKeySelectorEditors.test.js`, add to `EDITORS` (alphabetical position):

```js
   immunity: 'ItemSheetImmunitySettings.svelte',
```

In `tests/unit/RulesElementFactories.test.js`, add the import

```js
import createImmunityElement, { IMMUNITY_SELECTORS } from '~/document/types/item/rules-element/Immunity.js';
import { CONDITION_IDS, buildConditionDefinitions } from '~/system/Conditions.js';
```

and append inside the `describe` block:

```js
   it('createImmunityElement defaults to immunity to the first condition', () => {
      expect(createImmunityElement({ uuid: 'fixed-uuid' })).toEqual({
         key: CONDITION_IDS[0],
         operation: 'immunity',
         selector: 'condition',
         uuid: 'fixed-uuid',
      });
   });

   it('offers condition and effect immunity', () => {
      expect(IMMUNITY_SELECTORS).toEqual([
         'condition',
         'effect',
      ]);
   });

   it('lists every condition id in definition order', () => {
      expect(CONDITION_IDS).toEqual(buildConditionDefinitions().map((condition) => condition.id));
   });
```

Run: `npx vitest run tests/unit/RulesElementOperationRegistry.test.js tests/unit/TypedKeySelectorEditors.test.js
tests/unit/RulesElementFactories.test.js`
Expected: FAIL — `Immunity.js` does not exist; the operation list lacks `immunity`.

- [ ] **Step 2: Add the element, its selectors, and the typed key**

In `src/system/Conditions.js`, add directly after `buildConditionDefinitions`:

```js
/**
 * Every condition id, in definition order. The options of a condition picker (the immunity editor).
 * @type {readonly string[]}
 */
export const CONDITION_IDS = Object.freeze(buildConditionDefinitions().map((condition) => condition.id));
```

Create `src/document/types/item/rules-element/Immunity.js`:

```js
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import { CONDITION_IDS } from '~/system/Conditions.js';

/**
 * A Rules Element making a Character immune to a condition or to an effect. While it applies, creating a matching
 * condition or effect on the Character is refused, and an existing one is suppressed (its rules elements stop
 * applying) until the immunity ends. An immunity never suppresses the effect granting it.
 * @typedef {object} ImmunityElement
 * @property {string} operation - The operation to be performed by the Rules Element (immunity).
 * @property {string} selector - What the immunity blocks: 'condition' or 'effect'.
 * @property {string} key - A condition id (condition selector), or an effect name matched in camel case (effect
 * selector).
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * What an immunity can block, in editor display order.
 * @type {readonly string[]}
 */
export const IMMUNITY_SELECTORS = Object.freeze([
   'condition',
   'effect',
]);

/**
 * Creates a Rules Element making a Character immune to a condition.
 * @param {object} [options] - Options for the rules element.
 * @param {string} [options.uuid] - The uuid to keep (the element being replaced).
 * @returns {ImmunityElement} The new Rules Element.
 */
export default function createImmunityElement(options) {
   return {
      operation: 'immunity',
      selector: 'condition',
      key: CONDITION_IDS[0],
      uuid: options?.uuid ?? generateUUID(),
   };
}
```

In `RulesElementFactories.js`, add the import

```js
import createImmunityElement from '~/document/types/item/rules-element/Immunity.js';
```

and the last registry entry

```js
   immunity: createImmunityElement,
```

In `src/system/ConditionalCheckModifierTypes.js`, add to `TYPED_KEY_SELECTORS` (alphabetical position, after
`conditionalRatingModifier`):

```js
   immunity: Object.freeze(['effect']),
```

and extend its JSDoc's first sentence to: "The selectors whose keys the user types free-form (a custom trait name, a
spell tradition, a situation label, an effect name), keyed by the rules-element operation that carries them."

In `CharacterDataModel.js` `_applyRulesElements`, add inside `switch (element.operation)` after the
`conditionalCheckModifier` case:

```js
               case 'immunity': {
                  // An immunity modifies no stat or check, so it joins no applier.
                  break;
               }
```

In `lang/en.json` (`LOCAL`), insert in alphabetical key order:

```json
      "immunity.text": "Immunity",
```

- [ ] **Step 3: Build the editor**

Add a `testId` prop to `src/document/svelte-components/input/DocumentTextInput.svelte`: in the typedef add
`@property {string} [testId] - Optional stable selector forwarded to the inner input as \`data-testid\`.`, in the props
destructure add `testId = void 0,` after `tooltip = void 0,`, and add `{testId}` to the `<TextInput ... />` props
(alphabetical, before `{tooltip}`).

Create `src/helpers/svelte-components/input/select/ConditionSelect.svelte`:

```svelte
<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { CONDITION_IDS } from '~/system/Conditions.js';

   /**
    * @typedef {object} ConditionSelectProps
    * @property {string} [value] - The value that this input should modify (a condition id).
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {() => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the trigger.
    */

   /** @type {ConditionSelectProps} */
   let {
      value = $bindable(void 0),
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {string[]} The condition ids; each option's label localizes `LOCAL.<id>.text`. */
   const options = [...CONDITION_IDS];
</script>

<Select
   bind:value
   {disabled}
   {onchange}
   {options}
   {testId}
   {tooltip}
/>
```

Create `src/document/svelte-components/select/DocumentConditionSelect.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import ConditionSelect from '~/helpers/svelte-components/input/select/ConditionSelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentConditionSelectProps
    * @property {string} [value] - The value that this input should modify (a condition id).
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string} [testId] - Optional stable selector forwarded to the select's trigger.
    */

   /** @type {DocumentConditionSelectProps} */
   let {
      value = $bindable(void 0),
      disabled = false,
      tooltip = void 0,
      testId = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ConditionSelect
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {testId}
   {tooltip}
/>
```

Create `src/document/types/item/sheet/rules-element/ItemSheetImmunitySettings.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentConditionSelect from '~/document/svelte-components/select/DocumentConditionSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import { IMMUNITY_SELECTORS } from '~/document/types/item/rules-element/Immunity.js';
   import { CONDITION_IDS } from '~/system/Conditions.js';

   /**
    * @typedef {object} ItemSheetImmunitySettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetImmunitySettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Resets the element key when the selector changes: the first condition for a condition immunity, an empty name
    * for an effect immunity.
    * @returns {void}
    */
   function onSelectorChange() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'condition': {
            document.data.system.rulesElement[idx].key = CONDITION_IDS[0];
            break;
         }
         case 'effect': {
            document.data.system.rulesElement[idx].key = '';
            break;
         }
         default: {
            break;
         }
      }
   }

   /**
    * Returns the key input for the current selector: a condition picker, or a text input for an effect name.
    * @returns {object | undefined} The input component, or undefined for an unknown selector.
    */
   function getKeyInput() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'condition': {
            return DocumentConditionSelect;
         }
         case 'effect': {
            return DocumentTextInput;
         }
         default: {
            return undefined;
         }
      }
   }
</script>

<!--Operation settings-->
<div class="settings">

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={IMMUNITY_SELECTORS}
         testId={'immunity-selector'}
      />
   </div>

   <!--Key-->
   <div class="field key">
      {#if getKeyInput()}
         {@const KeyInput = getKeyInput()}
         <KeyInput
            bind:value={document.data.system.rulesElement[idx].key}
            testId={'immunity-key'}
         />
      {/if}
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;
         @include flex-group-left;
      }
   }
</style>
```

In `ItemSheetRulesElementSettings.svelte`, add the import (after the `ItemSheetFlatModifierSettings` import):

```js
   import ItemSheetImmunitySettings
   from '~/document/types/item/sheet/rules-element/ItemSheetImmunitySettings.svelte';
```

and the dispatch case after `case 'flatModifier': { ... }`:

```js
         case 'immunity': {
            return ItemSheetImmunitySettings;
         }
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/RulesElementOperationRegistry.test.js tests/unit/TypedKeySelectorEditors.test.js
tests/unit/RulesElementFactories.test.js`
Expected: PASS.

- [ ] **Step 5: Write the editor e2e**

Create `tests/e2e/rules-element-immunity-editor.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { readTitanSelectValue, selectTitanOption, titanSelectOptionValues } from './select.js';

/**
 * The immunity editor: the selector offers condition and effect, a condition immunity picks from every condition, and
 * an effect immunity takes a typed effect name.
 */

/** @type {string} Name of the world ability item this spec edits. */
const ITEM_NAME = 'E2E Immunity Editor';

/**
 * The condition ids, read from their single source (`buildConditionDefinitions`) so the expectation follows the code.
 * @type {string[]}
 */
const CONDITION_IDS = [
   ...readFileSync(fileURLToPath(new URL('../../src/system/Conditions.js', import.meta.url)), 'utf-8')
      .matchAll(/^\s+id: '(\w+)',$/gm),
].map((match) => match[1]);

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.beforeEach(async () => {
   // Rebuild the item with one default immunity element and open its Rules Elements tab.
   await page.evaluate(async (name) => {
      await game.items.getName(name)?.delete();

      /** @type {TitanItem} The rebuilt ability. */
      const item = await Item.create({
         name,
         type: 'ability',
         system: {
            rulesElement: [
               {
                  key: 'blinded',
                  operation: 'immunity',
                  selector: 'condition',
                  uuid: 'e2e-immunity-editor-0',
               },
            ],
         },
      });
      /** @type {TitanItemSheet} The rendered item sheet. */
      const app = await item.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
   }, ITEM_NAME);

   /** @type {string} The localized Rules Elements tab label. */
   const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
   await openSheetTab(page, label);
   await expect(sheet().getByTestId('immunity-selector')).toBeVisible();
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((name) => game.items.getName(name)?.delete(), ITEM_NAME);
   await page?.close();
});

/**
 * Locates the open item sheet.
 * @returns {import('@playwright/test').Locator} The sheet window.
 */
function sheet() {
   return page.locator('.application.titan-document-sheet');
}

/**
 * Reads the edited element's stored selector and key.
 * @returns {Promise<{key: string, selector: string}>} The element's selector and key.
 */
function readElement() {
   return page.evaluate((name) => {
      /** @type {ImmunityElement} The edited element. */
      const element = game.items.getName(name).system.rulesElement[0];
      return {
         key: element.key,
         selector: element.selector,
      };
   }, ITEM_NAME);
}

test('a condition immunity picks from every condition and stores the choice', async () => {
   /** @type {import('@playwright/test').Locator} The selector select's trigger. */
   const selector = sheet().getByTestId('immunity-selector');
   expect(await titanSelectOptionValues(page, selector)).toEqual([
      'condition',
      'effect',
   ]);

   /** @type {import('@playwright/test').Locator} The condition picker's trigger. */
   const key = sheet().getByTestId('immunity-key');
   expect(await titanSelectOptionValues(page, key)).toEqual(CONDITION_IDS);
   await selectTitanOption(page, key, 'offBalance');
   await expect.poll(readElement, { message: 'the chosen condition is stored' }).toEqual({
      key: 'offBalance',
      selector: 'condition',
   });
   expect(await readTitanSelectValue(key)).toBe('offBalance');
});

test('an effect immunity swaps the picker for a name input and stores the typed name', async () => {
   await selectTitanOption(page, sheet().getByTestId('immunity-selector'), 'effect');
   await expect.poll(readElement, { message: 'switching to effect clears the key' }).toEqual({
      key: '',
      selector: 'effect',
   });

   /** @type {import('@playwright/test').Locator} The effect-name input. */
   const key = sheet().locator('input[data-testid="immunity-key"]');
   await expect(key).toBeVisible();
   await key.fill('Poisoned Blade');
   await key.press('End');
   await expect.poll(readElement, { message: 'the typed name is stored' }).toEqual({
      key: 'Poisoned Blade',
      selector: 'effect',
   });
});

test('retyping an element to Immunity builds the default condition immunity', async () => {
   await page.evaluate(async (name) => {
      await game.items.getName(name).update({
         system: {
            rulesElement: [
               {
                  key: 'melee',
                  operation: 'flatModifier',
                  selector: 'rating',
                  uuid: 'e2e-immunity-editor-0',
                  value: 1,
               },
            ],
         },
      });
   }, ITEM_NAME);
   await expect(sheet().getByTestId('immunity-selector')).toHaveCount(0);

   /** @type {import('@playwright/test').Locator} The operation select's trigger. */
   const operation = sheet().locator('.rules-element .operation [role="combobox"]').first();
   await selectTitanOption(page, operation, 'immunity');
   await expect(sheet().getByTestId('immunity-selector')).toBeVisible();
   await expect.poll(readElement, { message: 'the default immunity is stored' }).toEqual({
      key: CONDITION_IDS[0],
      selector: 'condition',
   });
});
```

- [ ] **Step 6: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm run stylelint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/rules-element-immunity-editor.spec.js tests/e2e/component-probe-selects.spec.js
tests/e2e/rules-element-crud.spec.js` → all pass.

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git status --short
git add src/document/types/item/rules-element/Immunity.js src/document/types/item/rules-element/RulesElementFactories.js \
   src/helpers/svelte-components/input/select/ConditionSelect.svelte \
   src/document/svelte-components/select/DocumentConditionSelect.svelte \
   src/document/types/item/sheet/rules-element/ItemSheetImmunitySettings.svelte \
   src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte \
   src/document/svelte-components/input/DocumentTextInput.svelte src/system/Conditions.js \
   src/system/ConditionalCheckModifierTypes.js src/document/types/actor/types/character/CharacterDataModel.js \
   lang/en.json tests/unit/RulesElementOperationRegistry.test.js tests/unit/TypedKeySelectorEditors.test.js \
   tests/unit/RulesElementFactories.test.js tests/e2e/rules-element-immunity-editor.spec.js
git commit -F - <<'EOF'
feat(rules-elements): immunity element and editor

An immunity names a condition (picked from every condition) or an effect
(typed name, matched in camel case). The engine reads it in the next change.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---
### Task 9: Immunity engine — derivation, suppression, refusal

**Files:**
- Create: `src/document/types/active-effect/IsSuppressedByImmunity.js`
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`,
  `src/document/types/active-effect/ConditionDataModel.js`,
  `src/document/types/active-effect/TitanActiveEffectDataModel.js`,
  `src/document/types/active-effect/TitanActiveEffect.js`, `src/helpers/utility-functions/ApplyEffectToTargets.js`,
  `lang/en.json`, `CHANGELOG.md`
- Test: `tests/unit/Immunity.test.js`, `tests/unit/ApplyEffectToTargets.test.js` (create), `tests/e2e/immunity.spec.js`
  (create)

**Interfaces:**
- Consumes: `_getRulesElementSources()` (Task 7), `ImmunityElement` and `TYPED_KEY_SELECTORS.immunity` (Task 8).
- Produces: typedefs `ImmunitySource` `{ id: string, name: string }` and `Immunities` `{ condition: Map<string,
  ImmunitySource[]>, effect: Map<string, ImmunitySource[]> }`; `CharacterDataModel#prepareBaseData()` (sets
  `this.parent.immunities`); getter `CharacterDataModel#immunities: Immunities`; `CharacterDataModel#_getImmunities():
  Immunities`; `CharacterDataModel#getImmunitySources(effect): ImmunitySource[]`; default
  `isSuppressedByImmunity(effect): true|undefined`; getters `ConditionDataModel#isSuppressed` and
  `TitanActiveEffectDataModel#isSuppressed` (`true` while immune, else `undefined`); `TitanActiveEffect#_preCreate`
  returns `false` for an immune creation; `applyEffectToTargets` reports only created copies.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/Immunity.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import { buildConditionDefinitions } from '~/system/Conditions.js';
import { TYPED_KEY_SELECTORS } from '~/system/ConditionalCheckModifierTypes.js';
import isSuppressedByImmunity from '~/document/types/active-effect/IsSuppressedByImmunity.js';

// Immunity derivation, suppression, and refusal on a bare CharacterDataModel whose parent carries items and Active
// Effects; each effect's `system.isSuppressed` delegates to isSuppressedByImmunity as the data models do. The models
// are imported after the Foundry stand-ins are installed; dynamic import in beforeAll is permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;
/** @type {Function} The dynamically imported ConditionDataModel class. */
let ConditionDataModel;
/** @type {Function} The dynamically imported TitanActiveEffectDataModel class. */
let TitanActiveEffectDataModel;
/** @type {Function} The dynamically imported TitanActiveEffect class. */
let TitanActiveEffect;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.game.i18n.format = (key, data) => `${key} ${JSON.stringify(data)}`;
   globalThis.ui = {
      notifications: {
         warn: vi.fn(),
      },
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };

   // Core's ActiveEffect#_preCreate resolves undefined; TypeDataModel#prepareBaseData is a no-op.
   globalThis.foundry.documents = {
      ActiveEffect: class {
         /**
          * Stands in for core's pre-create handler.
          * @returns {Promise<undefined>} Nothing, as core returns.
          */
         async _preCreate() {
            return undefined;
         }
      },
   };
   globalThis.foundry.abstract.TypeDataModel.prototype.prepareBaseData = function prepareBaseData() {};

   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
   ConditionDataModel = (await import('~/document/types/active-effect/ConditionDataModel.js')).default;
   TitanActiveEffectDataModel = (await import('~/document/types/active-effect/TitanActiveEffectDataModel.js')).default;
   TitanActiveEffect = (await import('~/document/types/active-effect/TitanActiveEffect.js')).default;
});

afterAll(() => {
   delete globalThis.foundry.abstract.TypeDataModel.prototype.prepareBaseData;
   delete globalThis.foundry.documents;
   restoreSchemaMocks();
   delete globalThis.ui;
   delete globalThis.Actor;
   delete globalThis.CONST;
});

beforeEach(() => {
   ui.notifications.warn.mockClear();
});

/**
 * Builds an immunity element.
 * @param {string} selector - 'condition' or 'effect'.
 * @param {string} key - The condition id or effect name.
 * @returns {ImmunityElement} The element.
 */
function immunity(selector, key) {
   return {
      key,
      operation: 'immunity',
      selector,
      uuid: `immunity-${selector}-${key}`,
   };
}

/**
 * Builds a fake ability item.
 * @param {string} id - The item id (its name is `<id> name`).
 * @param {object[]} elements - Its rules elements.
 * @param {string} [type] - The item type.
 * @param {object} [system] - Extra system data.
 * @returns {object} The fake item.
 */
function item(id, elements, type = 'ability', system = {}) {
   return {
      _id: id,
      id,
      name: `${id} name`,
      system: {
         rulesElement: elements,
         ...system,
      },
      type,
   };
}

/**
 * Builds a fake Active Effect whose `system.isSuppressed` delegates to isSuppressedByImmunity.
 * @param {object} data - The effect's data.
 * @param {string} data.id - The effect id.
 * @param {string} data.name - The effect name.
 * @param {string} data.type - 'condition' or 'effect'.
 * @param {string[]} [data.statuses] - The status ids.
 * @param {object[]} [data.rulesElement] - The rules elements.
 * @param {boolean} [data.disabled] - Whether the effect is disabled.
 * @returns {object} The fake effect.
 */
function activeEffect({ id, name, type, statuses = [], rulesElement = [], disabled = false }) {
   /** @type {object} The effect. */
   const effect = {
      disabled,
      id,
      name,
      statuses: new Set(statuses),
      type,
   };
   effect.system = {
      rulesElement,

      /**
       * Delegates to the shared suppression rule, as the data models do.
       * @returns {boolean|undefined} Whether the effect is suppressed.
       */
      get isSuppressed() {
         return isSuppressedByImmunity(effect);
      },
   };
   return effect;
}

/**
 * Builds a fake condition Active Effect carrying its definition's rules elements.
 * @param {string} conditionId - The condition id.
 * @returns {object} The fake effect.
 */
function conditionEffect(conditionId) {
   return activeEffect({
      id: `${conditionId}Effect`,
      name: conditionId,
      rulesElement: structuredClone(buildConditionDefinitions()
         .find((condition) => condition.id === conditionId).system?.rulesElement ?? []),
      statuses: [conditionId],
      type: 'condition',
   });
}

/**
 * Builds a stat at base 8 with every mod bucket at 0.
 * @returns {{baseValue: number, mod: Record<string, number>}} The stat.
 */
function stat() {
   return {
      baseValue: 8,
      mod: {
         static: 0,
         equipment: 0,
         effect: 0,
         ability: 0,
         condition: 0,
      },
   };
}

/**
 * Builds a bare Character owning the given items and Active Effects, with base-8 Melee, Accuracy, and Defense.
 * @param {object} [contents] - The Character's contents.
 * @param {object[]} [contents.items] - The owned items.
 * @param {object[]} [contents.effects] - The Active Effects.
 * @returns {object} The model.
 */
function createCharacter({ items = [], effects = [] } = {}) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      effects: new Map(),
      items: new Map(items.map((entry) => [
         entry.id,
         entry,
      ])),
      name: 'Immune Hero',
      rulesElementsCache: {},
      system: model,
   };
   for (const effect of effects) {
      effect.parent = model.parent;
      model.parent.effects.set(effect.id, effect);
   }
   model.equipped = {
      armor: null,
      shield: null,
   };
   model.rating = {
      accuracy: stat(),
      defense: stat(),
      melee: stat(),
   };
   return model;
}

describe('immunity derivation', () => {
   it('derives nothing before prepareBaseData and the immunities after it', () => {
      /** @type {object} The model. */
      const model = createCharacter({ items: [item('ward', [immunity('condition', 'blinded')])] });
      expect(model.immunities.condition.size).toBe(0);
      model.prepareBaseData();
      expect(model.parent.immunities.condition.get('blinded')).toEqual([
         {
            id: 'ward',
            name: 'ward name',
         },
      ]);
   });

   it('keys effect immunities in camel case', () => {
      /** @type {object} The model. */
      const model = createCharacter({ items: [item('ward', [immunity('effect', 'Poisoned Blade')])] });
      model.prepareBaseData();
      expect([...model.immunities.effect.keys()]).toEqual(['poisonedBlade']);
   });

   it.each(TYPED_KEY_SELECTORS.immunity)('camel-cases every typed %s key', (selector) => {
      /** @type {object} The model. */
      const model = createCharacter({ items: [item('ward', [immunity(selector, 'Two Words')])] });
      model.prepareBaseData();
      expect([...model.immunities[selector].keys()]).toEqual(['twoWords']);
   });

   it('skips blank keys and unknown selectors', () => {
      /** @type {object} The model. */
      const model = createCharacter({
         items: [
            item('ward', [
               immunity('condition', ' '),
               immunity('trait', 'fire'),
            ]),
         ],
      });
      model.prepareBaseData();
      expect(model.immunities.condition.size).toBe(0);
      expect(model.immunities.effect.size).toBe(0);
   });

   it('lists each source once, in source order', () => {
      /** @type {object} The model. */
      const model = createCharacter({
         items: [
            item('wardA', [
               immunity('condition', 'blinded'),
               immunity('condition', 'blinded'),
            ]),
            item('wardB', [immunity('condition', 'blinded')]),
         ],
      });
      model.prepareBaseData();
      expect(model.immunities.condition.get('blinded').map((source) => source.id)).toEqual([
         'wardA',
         'wardB',
      ]);
   });

   it('reads only applying sources', () => {
      /** @type {object} The model. */
      const model = createCharacter({
         effects: [
            activeEffect({
               disabled: true,
               id: 'offWard',
               name: 'Off Ward',
               rulesElement: [immunity('condition', 'stunned')],
               type: 'effect',
            }),
         ],
         items: [item('sword', [immunity('condition', 'prone')], 'weapon', { equipped: false })],
      });
      model.prepareBaseData();
      expect(model.immunities.condition.size).toBe(0);
   });
});

describe('getImmunitySources', () => {
   it('matches a condition by its statuses and an effect by its camel-cased name', () => {
      /** @type {object} The model. */
      const model = createCharacter({
         items: [
            item('ward', [
               immunity('condition', 'blinded'),
               immunity('effect', 'Poisoned Blade'),
            ]),
         ],
      });
      model.prepareBaseData();

      /** @type {ImmunitySource[]} The expected sources. */
      const ward = [
         {
            id: 'ward',
            name: 'ward name',
         },
      ];
      expect(model.getImmunitySources(conditionEffect('blinded'))).toEqual(ward);
      expect(model.getImmunitySources(activeEffect({
         id: 'blade',
         name: 'poisoned blade',
         type: 'effect',
      }))).toEqual(ward);
      expect(model.getImmunitySources(conditionEffect('prone'))).toEqual([]);
      expect(model.getImmunitySources(activeEffect({
         id: 'other',
         name: 'Blinded',
         type: 'effect',
      }))).toEqual([]);
   });

   it('never names the effect granting the immunity', () => {
      /** @type {object} The self-naming effect. */
      const ward = activeEffect({
         id: 'wardEffect',
         name: 'Ward',
         rulesElement: [immunity('effect', 'Ward')],
         type: 'effect',
      });

      /** @type {object} The model. */
      const model = createCharacter({ effects: [ward] });
      model.prepareBaseData();
      expect(model.getImmunitySources(ward)).toEqual([]);
   });
});

describe('suppression', () => {
   it('both data models report suppression only while immune, leaving expiry to core otherwise', () => {
      /** @type {object} The Blinded effect. */
      const blinded = conditionEffect('blinded');

      /** @type {object} The Prone effect. */
      const prone = conditionEffect('prone');
      createCharacter({
         effects: [
            blinded,
            prone,
         ],
         items: [item('ward', [immunity('condition', 'blinded')])],
      }).prepareBaseData();
      for (const DataModel of [
         ConditionDataModel,
         TitanActiveEffectDataModel,
      ]) {
         /** @type {Function} The data model's isSuppressed getter. */
         const getter = Object.getOwnPropertyDescriptor(DataModel.prototype, 'isSuppressed').get;
         expect(getter.call({ parent: blinded })).toBe(true);
         expect(getter.call({ parent: prone })).toBeUndefined();
      }
   });

   it('never suppresses an effect whose parent is not a Character', () => {
      expect(isSuppressedByImmunity({
         parent: { system: { isCharacter: false } },
         statuses: new Set(['blinded']),
         type: 'condition',
      })).toBeUndefined();
      expect(isSuppressedByImmunity({
         parent: null,
         statuses: new Set(['blinded']),
         type: 'condition',
      })).toBeUndefined();
   });

   it('a suppressed condition stops applying and applies again once the immunity ends', () => {
      /** @type {object} The immunity ability. */
      const ward = item('ward', [immunity('condition', 'blinded')]);

      /** @type {object} The model. */
      const model = createCharacter({
         effects: [conditionEffect('blinded')],
         items: [ward],
      });
      model.prepareBaseData();
      model._applyRulesElements();
      expect(model.rating.defense.mod.condition).toBe(0);

      // The immunity ends: the next preparation applies Blinded's -¼ of base 8.
      ward.system.rulesElement = [];
      model.rating = {
         accuracy: stat(),
         defense: stat(),
         melee: stat(),
      };
      model.prepareBaseData();
      model._applyRulesElements();
      expect(model.rating.defense.mod.condition).toBe(-2);
   });
});

describe('TitanActiveEffect#_preCreate', () => {
   /**
    * Builds a pending TitanActiveEffect on the given Character.
    * @param {object} model - The Character.
    * @param {object} data - The effect's type, name, and statuses.
    * @returns {object} The pending effect.
    */
   function pendingEffect(model, { type, name, statuses = [] }) {
      /** @type {object} The pending effect. */
      const effect = Object.create(TitanActiveEffect.prototype);
      Object.assign(effect, {
         name,
         parent: model.parent,
         statuses: new Set(statuses),
         type,
      });
      return effect;
   }

   /**
    * Builds a Character immune to Blinded and to the effect "Poisoned Blade" through the ability "ward".
    * @returns {object} The prepared model.
    */
   function createImmuneCharacter() {
      /** @type {object} The model. */
      const model = createCharacter({
         items: [
            item('ward', [
               immunity('condition', 'blinded'),
               immunity('effect', 'Poisoned Blade'),
            ]),
         ],
      });
      model.prepareBaseData();
      return model;
   }

   it('refuses a condition the actor is immune to and names the immunity\'s source', async () => {
      /** @type {object} The pending Blinded. */
      const effect = pendingEffect(createImmuneCharacter(), {
         name: 'Blinded',
         statuses: ['blinded'],
         type: 'condition',
      });
      expect(await effect._preCreate({}, {}, {})).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(`LOCAL.immuneToEffect.text ${JSON.stringify({
         actor: 'Immune Hero',
         effect: 'Blinded',
         sources: 'ward name',
      })}`);
   });

   it('refuses an effect the actor is immune to by name', async () => {
      expect(await pendingEffect(createImmuneCharacter(), {
         name: 'Poisoned Blade',
         type: 'effect',
      })._preCreate({}, {}, {})).toBe(false);
   });

   it('creates a condition the actor is not immune to', async () => {
      expect(await pendingEffect(createImmuneCharacter(), {
         name: 'Prone',
         statuses: ['prone'],
         type: 'condition',
      })._preCreate({}, {}, {})).toBeUndefined();
      expect(ui.notifications.warn).not.toHaveBeenCalled();
   });
});
```

Create `tests/unit/ApplyEffectToTargets.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';
import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';

vi.mock('~/helpers/utility-functions/GetBestCharactersToUpdate.js', () => ({
   default: vi.fn(),
}));

/** @type {object} The effect being applied. */
const EFFECT = {
   name: 'Blessing',
   toObject: () => ({ name: 'Blessing' }),
};

/**
 * Builds an owned target whose ActiveEffect creation returns the given documents.
 * @param {object[]} created - What createEmbeddedDocuments resolves to (empty when the creation is refused).
 * @returns {object} The fake actor.
 */
function target(created) {
   return {
      createEmbeddedDocuments: vi.fn(async () => created),
      isOwner: true,
   };
}

beforeEach(() => {
   globalThis.game = {
      i18n: {
         format: (key, data) => `${key} ${data.name} ${data.count}`,
         localize: (key) => key,
      },
   };
   globalThis.ui = {
      notifications: {
         info: vi.fn(),
         warn: vi.fn(),
      },
   };
});

afterEach(() => {
   delete globalThis.game;
   delete globalThis.ui;
});

describe('applyEffectToTargets', () => {
   it('counts only the targets that accepted the effect', async () => {
      getBestCharactersToUpdate.mockReturnValue([
         target([]),
         target([{ id: 'created' }]),
      ]);
      await applyEffectToTargets(EFFECT);
      expect(ui.notifications.info).toHaveBeenCalledWith('LOCAL.effectTrayApplied.text Blessing 1');
   });

   it('reports nothing applied when every target refused the effect', async () => {
      getBestCharactersToUpdate.mockReturnValue([target([])]);
      await applyEffectToTargets(EFFECT);
      expect(ui.notifications.info).not.toHaveBeenCalled();
   });

   it('warns when there is no owned target', async () => {
      getBestCharactersToUpdate.mockReturnValue([]);
      await applyEffectToTargets(EFFECT);
      expect(ui.notifications.warn).toHaveBeenCalledWith('LOCAL.effectTrayNoTargets.text');
   });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/Immunity.test.js tests/unit/ApplyEffectToTargets.test.js`
Expected: FAIL — `IsSuppressedByImmunity.js` does not exist; `applyEffectToTargets` reports 2 targets.

- [ ] **Step 3: Derive immunities before core applies Active Effects**

In `CharacterDataModel.js`:
(a) add after the `RulesElementSource` typedef:

```js
/**
 * The item or Active Effect granting an immunity.
 * @typedef {object} ImmunitySource
 * @property {string} id - The source document's id.
 * @property {string} name - The source document's name, named in the refusal notification.
 */

/**
 * A Character's immunities, each key mapped to the sources granting it.
 * @typedef {object} Immunities
 * @property {Map<string, ImmunitySource[]>} condition - Condition immunities, keyed by condition id.
 * @property {Map<string, ImmunitySource[]>} effect - Effect immunities, keyed by camel-case effect name.
 */
```

(b) add directly above `prepareDerivedData()`:

```js
   /**
    * Derives this Character's immunities. Runs in the system's base-data pass, before `Actor#applyActiveEffects`
    * (prepareEmbeddedDocuments) reads each Active Effect's `active`, which reads `isSuppressed`, which reads these
    * immunities; derived data would be one preparation late.
    * @override
    */
   prepareBaseData() {
      super.prepareBaseData();
      this.parent.immunities = this._getImmunities();
   }

   /**
    * This Character's condition and effect immunities, derived in prepareBaseData. Empty before the first preparation.
    * @returns {Immunities} The immunities.
    */
   get immunities() {
      return this.parent.immunities ?? {
         condition: new Map(),
         effect: new Map(),
      };
   }
```

(c) add directly above `_getRulesElementSources()`:

```js
   /**
    * Gathers this Character's immunities from the immunity elements of every applying rules-element source (the same
    * sources `_applyRulesElements` reads). A source counts whether or not it is itself suppressed, because suppression
    * is decided from these immunities. A blank key or an unknown selector grants nothing; a typed selector's key (an
    * effect name) is camel-cased so it matches the effect's name regardless of case or spacing. A source granting the
    * same immunity twice is listed once.
    * @returns {Immunities} The immunities.
    * @private
    */
   _getImmunities() {
      /** @type {Immunities} The immunities. */
      const immunities = {
         condition: new Map(),
         effect: new Map(),
      };
      for (const source of this._getRulesElementSources()) {
         for (const element of source.elements) {
            if (
               element.operation !== 'immunity' ||
               !Object.hasOwn(immunities, element.selector) ||
               isBlankSelectorKey(element.key)
            ) {
               continue;
            }

            /** @type {string} The key the immunity is matched by. */
            const key = TYPED_KEY_SELECTORS.immunity.includes(element.selector) ?
               camelize(String(element.key)) :
               element.key;

            /** @type {ImmunitySource[]} The sources already granting this immunity. */
            const keySources = immunities[element.selector].get(key) ?? [];
            if (!keySources.some((entry) => entry.id === source.id)) {
               keySources.push({
                  id: source.id,
                  name: source.name,
               });
            }
            immunities[element.selector].set(key, keySources);
         }
      }
      return immunities;
   }

   /**
    * Gets the sources of this Character's immunities to an Active Effect: a condition by any of its statuses, an
    * effect by its camel-cased name. An immunity never covers the effect granting it.
    * @param {TitanActiveEffect} effect - The Active Effect (existing or pending creation).
    * @returns {ImmunitySource[]} The sources granting an immunity to it, each once; empty when not immune.
    */
   getImmunitySources(effect) {
      /** @type {Immunities} This Character's immunities. */
      const immunities = this.immunities;

      /** @type {ImmunitySource[]} Every matching source, possibly repeated. */
      const matches = [];
      if (effect.type === 'condition') {
         for (const status of effect.statuses) {
            matches.push(...(immunities.condition.get(status) ?? []));
         }
      }
      else if (effect.type === 'effect') {
         matches.push(...(immunities.effect.get(camelize(String(effect.name))) ?? []));
      }

      return matches.filter((source, index) => source.id !== effect.id &&
         matches.findIndex((entry) => entry.id === source.id) === index);
   }
```

(d) in `_applyRulesElements`, at the top of the `for (const source of this._getRulesElementSources())` loop body, add:

```js
         // An Active Effect suppressed by an immunity applies nothing until the immunity ends. Only the immunity
         // suppression is read here: `disabled` is the gate for an effect's own state.
         if (source.effect?.system.isSuppressed) {
            continue;
         }
```

(e) replace the `case 'immunity':` comment with:

```js
                  // Immunities are read by the prepareBaseData pre-pass (`_getImmunities`); an immunity modifies no
                  // stat or check, so it joins no applier.
```

- [ ] **Step 4: Suppress through the data models and refuse immune creations**

Create `src/document/types/active-effect/IsSuppressedByImmunity.js`:

```js
/**
 * Decides whether an Active Effect is suppressed by its Character's immunities. Core's
 * `ActiveEffect#isSuppressed` returns `!!(this.system.isSuppressed ?? this.duration.expired)`, so returning undefined
 * when not immune leaves core's expiry test in charge. A suppressed effect is inactive (core leaves it out of
 * `actor.statuses`) and its rules elements stop applying; it returns untouched when the immunity ends.
 * @param {TitanActiveEffect} effect - The Active Effect.
 * @returns {true|undefined} True while the effect's Character is immune to it; otherwise undefined.
 */
export default function isSuppressedByImmunity(effect) {
   /** @type {object|undefined} The owning document's system data. */
   const system = effect?.parent?.system;
   if (!system?.isCharacter) {
      return undefined;
   }
   return system.getImmunitySources(effect).length > 0 ? true : undefined;
}
```

In `ConditionDataModel.js` and `TitanActiveEffectDataModel.js`, add the import

```js
import isSuppressedByImmunity from '~/document/types/active-effect/IsSuppressedByImmunity.js';
```

and, in each class after `_defineDocumentSchema()`, the getter:

```js
   /**
    * Whether this Active Effect is suppressed: true while its Character is immune to it; otherwise undefined, so core's
    * expiry test decides.
    * @returns {true|undefined} The immunity suppression.
    */
   get isSuppressed() {
      return isSuppressedByImmunity(this.parent);
   }
```

In `TitanActiveEffect.js` `_preCreate`, insert directly after the `if (retVal === false) { return false; }` block:

```js
      // Refuse a condition or effect the Character is immune to, naming the immunity's sources.
      /** @type {ImmunitySource[]} The sources granting an immunity to this effect. */
      const immunitySources = this.parent?.system?.isCharacter ? this.parent.system.getImmunitySources(this) : [];
      if (immunitySources.length > 0) {
         ui.notifications.warn(game.i18n.format('LOCAL.immuneToEffect.text', {
            actor: this.parent.name,
            effect: this.name,
            sources: immunitySources.map((source) => source.name).join(', '),
         }));
         return false;
      }
```

and change the method's JSDoc summary to: "Performs initialization logic before document creation. Refuses a condition or
effect the owning Character is immune to. For the 'effect' subtype, captures initial document data and forces the
status icon to always display."

Replace the loop and report at the end of `src/helpers/utility-functions/ApplyEffectToTargets.js` (from
`// Copy the effect onto each owned target in turn.` to the end of the function) with:

```js
   // Copy the effect onto each owned target in turn; a target immune to it refuses the copy.
   /** @type {number} The targets the effect was applied to. */
   let applied = 0;
   for (const target of targets) {
      /** @type {ActiveEffect[]} The created copy, or nothing when refused. */
      const created = await target.createEmbeddedDocuments('ActiveEffect', [effectData]);
      applied += created.length;
   }

   // Report the outcome with the effect name and the number of targets that accepted it.
   if (applied > 0) {
      ui.notifications.info(game.i18n.format('LOCAL.effectTrayApplied.text', {
         name: effect.name,
         count: applied,
      }));
   }
```

and update its JSDoc summary's last sentence to "a notification reports how many accepted it (an immune target's
refusal notifies separately)."

In `lang/en.json` (`LOCAL`), insert in alphabetical key order:

```json
      "immuneToEffect.text": "{actor} is immune to {effect} ({sources}).",
```

In `CHANGELOG.md`, append to the `## Unreleased:` list:

```markdown
- New Immunity rules element: an item or effect can make a character immune to a condition or to an effect by name.
  Applying it is refused with a notification, and an existing one stops applying until the immunity ends.
```

- [ ] **Step 5: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/Immunity.test.js tests/unit/ApplyEffectToTargets.test.js
tests/unit/RulesElementSources.test.js tests/unit/ConditionMechanics.test.js`
Expected: PASS.

- [ ] **Step 6: Write the immunity e2e**

Create `tests/e2e/immunity.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * Immunity on the live pipeline: an immunity effect suppresses an existing Contaminated (its penalty leaves and its
 * status drops) and restores it when removed; creating a condition or an effect the actor is immune to is refused
 * with a notification naming the immunity's source.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Immunity Actor';

/** @type {string} Name of the Active Effect granting the immunities. */
const WARD_NAME = 'E2E Immunity Ward';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.beforeEach(async () => {
   // A fresh actor with Body 8 each test.
   await page.evaluate(async (name) => {
      await game.actors.getName(name)?.delete();
      await Actor.create({
         name,
         system: {
            attribute: { body: { baseValue: 8 } },
         },
         type: 'player',
      });
   }, ACTOR_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Adds the permanent ward effect granting the given immunities.
 * @param {object[]} elements - The ward's immunity elements.
 * @returns {Promise<void>} Resolves once the ward exists.
 */
async function addWard(elements) {
   await page.evaluate(async ({ name, wardName, rulesElement }) => {
      await game.actors.getName(name).createEmbeddedDocuments('ActiveEffect', [
         {
            name: wardName,
            system: {
               duration: { type: 'permanent' },
               rulesElement,
            },
            type: 'effect',
         },
      ]);
   }, {
      name: ACTOR_NAME,
      rulesElement: elements,
      wardName: WARD_NAME,
   });
}

/**
 * Reads the actor's Body value, whether it holds a Contaminated effect, and whether Contaminated is an active status.
 * @returns {Promise<{body: number, hasEffect: boolean, active: boolean}>} The snapshot.
 */
function readContaminated() {
   return page.evaluate((name) => {
      /** @type {TitanActor} The actor. */
      const actor = game.actors.getName(name);
      return {
         active: actor.statuses.has('contaminated'),
         body: actor.system.attribute.body.value,
         hasEffect: actor.effects.some((effect) => effect.statuses.has('contaminated')),
      };
   }, ACTOR_NAME);
}

/**
 * Captures warning notifications while the action runs.
 * @param {string} actionSource - The in-page async function body to run (receives the actor as `actor`).
 * @returns {Promise<string[]>} The warnings raised.
 */
function captureWarnings(actionSource) {
   return page.evaluate(async ({ name, source }) => {
      /** @type {string[]} The warnings raised. */
      const warnings = [];

      /** @type {Function} The original warn method. */
      const original = ui.notifications.warn;
      ui.notifications.warn = (message, options) => {
         warnings.push(message);
         return original.call(ui.notifications, message, options);
      };
      try {
         await new Function('actor', `return (async () => { ${source} })();`)(game.actors.getName(name));
      }
      finally {
         ui.notifications.warn = original;
      }
      return warnings;
   }, {
      name: ACTOR_NAME,
      source: actionSource,
   });
}

test('an immunity effect suppresses an existing Contaminated, which returns when the effect is removed', async () => {
   await page.evaluate((name) => game.actors.getName(name).toggleStatusEffect('contaminated', { active: true }),
      ACTOR_NAME);
   await expect.poll(readContaminated).toEqual({
      active: true,
      body: 6,
      hasEffect: true,
   });

   await addWard([
      {
         key: 'contaminated',
         operation: 'immunity',
         selector: 'condition',
         uuid: 'e2e-immunity-contaminated',
      },
   ]);
   await expect.poll(readContaminated, { message: 'suppressed: penalty and status gone, effect kept' }).toEqual({
      active: false,
      body: 8,
      hasEffect: true,
   });

   await page.evaluate(async ({ name, wardName }) => {
      await game.actors.getName(name).effects.getName(wardName).delete();
   }, {
      name: ACTOR_NAME,
      wardName: WARD_NAME,
   });
   await expect.poll(readContaminated, { message: 'the immunity ended: Contaminated applies again' }).toEqual({
      active: true,
      body: 6,
      hasEffect: true,
   });
});

test('applying a condition the actor is immune to is refused, naming the immunity\'s source', async () => {
   await addWard([
      {
         key: 'contaminated',
         operation: 'immunity',
         selector: 'condition',
         uuid: 'e2e-immunity-contaminated',
      },
   ]);

   /** @type {string[]} The warnings raised by the toggle. */
   const warnings = await captureWarnings('await actor.toggleStatusEffect("contaminated", { active: true });');
   expect(warnings).toHaveLength(1);
   expect(warnings[0]).toContain(WARD_NAME);

   // The awaited toggle has settled (the warning above is its positive edge): no Contaminated was created.
   expect((await readContaminated()).hasEffect).toBe(false);
});

test('an effect immunity refuses an effect by name and admits another', async () => {
   await addWard([
      {
         key: 'Poisoned Blade',
         operation: 'immunity',
         selector: 'effect',
         uuid: 'e2e-immunity-poisoned-blade',
      },
   ]);

   /** @type {string[]} The warnings raised by the two creations. */
   const warnings = await captureWarnings(`
      await actor.createEmbeddedDocuments('ActiveEffect', [{ name: 'poisoned blade', type: 'effect' }]);
      await actor.createEmbeddedDocuments('ActiveEffect', [{ name: 'Blessing', type: 'effect' }]);
   `);
   expect(warnings).toHaveLength(1);
   expect(warnings[0]).toContain(WARD_NAME);

   /** @type {string[]} The actor's effect names. */
   const names = await page.evaluate((name) => game.actors.getName(name).effects.map((effect) => effect.name),
      ACTOR_NAME);
   expect(names).toContain('Blessing');
   expect(names).not.toContain('poisoned blade');
});
```

- [ ] **Step 7: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/immunity.spec.js tests/e2e/effect-tray.spec.js tests/e2e/effect-reactivity.spec.js
tests/e2e/logic/conditions.spec.js` → all pass.

- [ ] **Step 8: Commit**

```bash
git branch --show-current
git status --short
git add src/document/types/active-effect/IsSuppressedByImmunity.js \
   src/document/types/actor/types/character/CharacterDataModel.js \
   src/document/types/active-effect/ConditionDataModel.js \
   src/document/types/active-effect/TitanActiveEffectDataModel.js \
   src/document/types/active-effect/TitanActiveEffect.js src/helpers/utility-functions/ApplyEffectToTargets.js \
   lang/en.json CHANGELOG.md tests/unit/Immunity.test.js tests/unit/ApplyEffectToTargets.test.js \
   tests/e2e/immunity.spec.js
git commit -F - <<'EOF'
feat(immunity): derive, suppress, and refuse immune conditions and effects

The Character derives its immunities in prepareBaseData from the same
source list as every rules-element pass; the Active Effect data models
report isSuppressed while immune, so core drops the status and the rules
elements stop applying; _preCreate refuses an immune creation with a
notification naming the source. The effect tray counts only accepted copies.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 10: Targeting, distance, and target-condition helpers

**Files:**
- Create: `src/helpers/utility-functions/GetTargetedCharacterTokens.js`,
  `src/helpers/utility-functions/MeasureTokenDistance.js`, `src/check/types/attack-check/TargetConditionModifiers.js`
- Modify: `src/helpers/utility-functions/GetTargetedCharacters.js`
- Test: `tests/unit/GetTargetedCharacters.test.js`, `tests/unit/MeasureTokenDistance.test.js`,
  `tests/unit/TargetConditionModifiers.test.js` (create)

**Interfaces:**
- Produces: `getTargetedCharacterTokens(): Token[]` (targeted tokens, or a GM's controlled tokens when none are
  targeted, filtered to Character actors); `getTargetedCharacters()` maps those tokens to actors (unchanged result);
  `measureTokenDistance(fromToken: TokenDocument, toToken: TokenDocument): number|null` (spaces between the nearest
  occupied spaces; null when either is missing or they are on different scenes); constants
  `INCAPACITATED_TARGET_DIFFICULTY = 2`, `PRONE_CLOSE_DISTANCE = 1`, `PRONE_FAR_DISTANCE = 10`; typedef
  `TargetConditionModifier` `{ condition: string, modifier: 'melee'|'accuracy'|'difficulty', value: number }`;
  `getTargetConditionModifiers({ statuses, distance, melee: {base, value}, accuracy: {base, value} })`;
  `sumTargetRatingModifiers(modifiers, rating): number`; `selectAttackTargetConditions(modifiers, attackType)`;
  `getTargetConditionDifficulty(modifiers): number|null`; `getTargetConditionModifierLabel(modifier): string`.

- [ ] **Step 1: Pin getTargetedCharacters**

Create `tests/unit/GetTargetedCharacters.test.js`:

```js
import { describe, it, expect, afterEach } from 'vitest';
import getTargetedCharacters from '~/helpers/utility-functions/GetTargetedCharacters.js';

/**
 * Builds a token whose actor is or is not a Character.
 * @param {string} uuid - The actor's uuid.
 * @param {boolean} [isCharacter] - Whether the actor is a Character.
 * @returns {object} The fake token.
 */
function token(uuid, isCharacter = true) {
   return {
      actor: {
         system: { isCharacter },
         uuid,
      },
   };
}

/**
 * Installs the user's targets, GM flag, and controlled tokens.
 * @param {object} state - The targeting state.
 * @param {object[]} state.targets - The targeted tokens.
 * @param {object[]} state.controlled - The controlled tokens.
 * @param {boolean} state.isGM - Whether the user is a GM.
 */
function setTargeting({ targets, controlled, isGM }) {
   globalThis.game = {
      user: {
         isGM,
         targets: new Set(targets),
      },
   };
   globalThis.canvas = { tokens: { controlled } };
}

afterEach(() => {
   delete globalThis.game;
   delete globalThis.canvas;
});

describe('getTargetedCharacters', () => {
   it('returns the targeted tokens\' Character actors', () => {
      setTargeting({
         controlled: [token('Actor.c')],
         isGM: true,
         targets: [
            token('Actor.a'),
            token('Actor.loot', false),
         ],
      });
      expect(getTargetedCharacters().map((actor) => actor.uuid)).toEqual(['Actor.a']);
   });

   it('falls back to a GM\'s controlled tokens when nothing is targeted', () => {
      setTargeting({
         controlled: [token('Actor.c')],
         isGM: true,
         targets: [],
      });
      expect(getTargetedCharacters().map((actor) => actor.uuid)).toEqual(['Actor.c']);
   });

   it('gives a player no fallback', () => {
      setTargeting({
         controlled: [token('Actor.c')],
         isGM: false,
         targets: [],
      });
      expect(getTargetedCharacters()).toEqual([]);
   });
});
```

Run: `npx vitest run tests/unit/GetTargetedCharacters.test.js`
Expected: PASS (pins current behaviour). Commit it alone:

```bash
git branch --show-current
git status --short
git add tests/unit/GetTargetedCharacters.test.js
git commit -F - <<'EOF'
test(targeting): pin getTargetedCharacters' targets and GM fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

- [ ] **Step 2: Write the failing helper tests**

Append to `tests/unit/GetTargetedCharacters.test.js` (add the import to the top):

```js
import getTargetedCharacterTokens from '~/helpers/utility-functions/GetTargetedCharacterTokens.js';
```

```js
describe('getTargetedCharacterTokens', () => {
   it('returns the Character tokens the characters come from, in target order', () => {
      /** @type {object[]} The targeted tokens. */
      const targets = [
         token('Actor.a'),
         token('Actor.loot', false),
         token('Actor.b'),
      ];
      setTargeting({
         controlled: [],
         isGM: false,
         targets,
      });
      expect(getTargetedCharacterTokens()).toEqual([
         targets[0],
         targets[2],
      ]);
   });
});
```

Create `tests/unit/MeasureTokenDistance.test.js`:

```js
import { describe, it, expect } from 'vitest';
import measureTokenDistance from '~/helpers/utility-functions/MeasureTokenDistance.js';

/**
 * Builds a fake scene with a 100-pixel square grid measuring 5 units per space and the equidistant diagonal rule.
 * @returns {object} The fake scene.
 */
function squareScene() {
   return {
      grid: {
         distance: 5,

         /**
          * Returns an offset's center point.
          * @param {{i: number, j: number}} offset - The grid offset (row i, column j).
          * @returns {{x: number, y: number}} The center point.
          */
         getCenterPoint: ({ i, j }) => ({
            x: (j * 100) + 50,
            y: (i * 100) + 50,
         }),

         /**
          * Measures a two-waypoint path with the equidistant diagonal rule.
          * @param {{x: number, y: number}[]} waypoints - The path.
          * @returns {{distance: number}} The path's distance in grid units.
          */
         measurePath: ([a, b]) => ({
            distance: (Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 100) * 5,
         }),
      },
   };
}

/**
 * Builds a fake token document occupying the given grid offsets.
 * @param {object} scene - The token's scene.
 * @param {{i: number, j: number}[]} offsets - The occupied offsets (empty on a gridless scene).
 * @param {{x: number, y: number}} [center] - The token's center point.
 * @returns {object} The fake token document.
 */
function tokenDocument(scene, offsets, center = {
   x: 0,
   y: 0,
}) {
   return {
      getCenterPoint: () => center,
      getOccupiedGridSpaceOffsets: () => offsets,
      parent: scene,
   };
}

describe('measureTokenDistance', () => {
   it('measures adjacent tokens as 1 space', () => {
      /** @type {object} The scene. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [
            {
               i: 0,
               j: 0,
            },
         ]),
         tokenDocument(scene, [
            {
               i: 0,
               j: 1,
            },
         ]),
      )).toBe(1);
   });

   it('measures between the nearest spaces a large token occupies, not its center', () => {
      /** @type {object} The scene. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [
            {
               i: 0,
               j: 0,
            },
         ]),
         tokenDocument(scene, [
            {
               i: 0,
               j: 1,
            },
            {
               i: 0,
               j: 2,
            },
            {
               i: 1,
               j: 1,
            },
            {
               i: 1,
               j: 2,
            },
         ]),
      )).toBe(1);
   });

   it('measures 21 spaces along a row', () => {
      /** @type {object} The scene. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [
            {
               i: 0,
               j: 0,
            },
         ]),
         tokenDocument(scene, [
            {
               i: 0,
               j: 21,
            },
         ]),
      )).toBe(21);
   });

   it('measures center to center when a token occupies no space (gridless)', () => {
      /** @type {object} The scene. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [], {
            x: 0,
            y: 0,
         }),
         tokenDocument(scene, [], {
            x: 300,
            y: 0,
         }),
      )).toBe(3);
   });

   it('measures nothing without both tokens on one scene', () => {
      /** @type {object} A token on one scene. */
      const token = tokenDocument(squareScene(), []);
      expect(measureTokenDistance(undefined, token)).toBeNull();
      expect(measureTokenDistance(token, undefined)).toBeNull();
      expect(measureTokenDistance(token, tokenDocument(squareScene(), []))).toBeNull();
   });
});
```

Create `tests/unit/TargetConditionModifiers.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   getTargetConditionDifficulty,
   getTargetConditionModifierLabel,
   getTargetConditionModifiers,
   selectAttackTargetConditions,
   sumTargetRatingModifiers,
} from '~/check/types/attack-check/TargetConditionModifiers.js';

beforeAll(() => {
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
   };
});

afterAll(() => {
   delete globalThis.game;
});

/**
 * Computes the modifiers for a target with the given statuses at the given distance, the attacker's Melee and
 * Accuracy both at the given base and value.
 * @param {string[]} statuses - The target's condition ids.
 * @param {number|null} distance - The distance in spaces, or null without tokens.
 * @param {number} [base] - The attacker's base Melee and Accuracy.
 * @param {number} [value] - The attacker's current Melee and Accuracy.
 * @returns {TargetConditionModifier[]} The modifiers.
 */
function modifiers(statuses, distance, base = 8, value = base) {
   return getTargetConditionModifiers({
      accuracy: {
         base,
         value,
      },
      distance,
      melee: {
         base,
         value,
      },
      statuses: new Set(statuses),
   });
}

/**
 * Builds a modifier.
 * @param {string} condition - The condition id.
 * @param {string} modifier - melee, accuracy, or difficulty.
 * @param {number} value - The value.
 * @returns {TargetConditionModifier} The modifier.
 */
function entry(condition, modifier, value) {
   return {
      condition,
      modifier,
      value,
   };
}

describe('getTargetConditionModifiers', () => {
   it('gives a target with no conditions no modifiers', () => {
      expect(modifiers([], 1)).toEqual([]);
   });

   it.each([
      0,
      1,
   ])('gives both ratings +¼ of base (rounded up) against a Prone target %i spaces away', (distance) => {
      expect(modifiers(['prone'], distance, 6)).toEqual([
         entry('prone', 'melee', 2),
         entry('prone', 'accuracy', 2),
      ]);
   });

   it('gives no bonus when a quarter of the base rounds to 0', () => {
      expect(modifiers(['prone'], 1, 0)).toEqual([]);
   });

   it.each([
      2,
      5,
      10,
   ])('gives nothing against a Prone target %i spaces away', (distance) => {
      expect(modifiers(['prone'], distance)).toEqual([]);
   });

   it.each([
      [
         11,
         8,
         8,
         -2,
      ],
      [
         21,
         8,
         8,
         -4,
      ],
      [
         31,
         8,
         8,
         -6,
      ],
      [
         21,
         3,
         3,
         -1,
      ],
      [
         31,
         8,
         3,
         -3,
      ],
   ])('at %i spaces, base %i, Accuracy %i: Accuracy changes by %i', (distance, base, value, change) => {
      expect(modifiers(['prone'], distance, base, value)).toEqual([entry('prone', 'accuracy', change)]);
   });

   it.each([
      [
         11,
         3,
         3,
      ],
      [
         21,
         8,
         0,
      ],
   ])('at %i spaces, base %i, Accuracy %i: no penalty (rounds to 0 or Accuracy is 0)', (distance, base, value) => {
      expect(modifiers(['prone'], distance, base, value)).toEqual([]);
   });

   it('gives no distance modifier without tokens to measure', () => {
      expect(modifiers(['prone'], null)).toEqual([]);
   });

   it('fixes the Difficulty at 2 against an Incapacitated target, with or without tokens', () => {
      expect(modifiers(['incapacitated'], null)).toEqual([entry('incapacitated', 'difficulty', 2)]);
      expect(modifiers([
         'prone',
         'incapacitated',
      ], 1)).toEqual([
         entry('prone', 'melee', 2),
         entry('prone', 'accuracy', 2),
         entry('incapacitated', 'difficulty', 2),
      ]);
   });
});

describe('target condition selection', () => {
   /** @type {TargetConditionModifier[]} Adjacent Prone and Incapacitated. */
   const all = [
      entry('prone', 'melee', 2),
      entry('prone', 'accuracy', 2),
      entry('incapacitated', 'difficulty', 2),
   ];

   it('sums one rating\'s modifiers', () => {
      expect(sumTargetRatingModifiers(all, 'melee')).toBe(2);
      expect(sumTargetRatingModifiers([], 'accuracy')).toBe(0);
   });

   it('keeps the attack\'s own rating and the Difficulty', () => {
      expect(selectAttackTargetConditions(all, 'melee')).toEqual([
         all[0],
         all[2],
      ]);
      expect(selectAttackTargetConditions(all, 'ranged')).toEqual([
         all[1],
         all[2],
      ]);
   });

   it('reads the fixed Difficulty, or null', () => {
      expect(getTargetConditionDifficulty(all)).toBe(2);
      expect(getTargetConditionDifficulty([all[0]])).toBeNull();
   });

   it('labels a rating modifier signed and a Difficulty plain', () => {
      expect(getTargetConditionModifierLabel(all[0])).toBe('LOCAL.prone.text: LOCAL.melee.text +2');
      expect(getTargetConditionModifierLabel(entry('prone', 'accuracy', -4)))
         .toBe('LOCAL.prone.text: LOCAL.accuracy.text -4');
      expect(getTargetConditionModifierLabel(all[2])).toBe('LOCAL.incapacitated.text: LOCAL.difficulty.text 2');
   });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/GetTargetedCharacters.test.js tests/unit/MeasureTokenDistance.test.js
tests/unit/TargetConditionModifiers.test.js`
Expected: FAIL — the three new modules do not exist.

- [ ] **Step 4: Implement the helpers**

Create `src/helpers/utility-functions/GetTargetedCharacterTokens.js`:

```js
import getTargetedTokens from '~/helpers/utility-functions/GetTargetedTokens.js';
import getControlledTokens from '~/helpers/utility-functions/GetControlledTokens.js';

/**
 * Gets the tokens of the Character Actors targeted by the current user, in target order. A GM who targets nothing
 * falls back to their controlled tokens.
 * @returns {Token[]} The targeted (or, for a GM, controlled) tokens whose actors are Characters.
 */
export default function getTargetedCharacterTokens() {
   /** @type {Token[]} The targeted tokens. */
   let tokens = getTargetedTokens();

   // A GM who targets nothing acts on their controlled tokens.
   if (tokens.length < 1 && game.user.isGM) {
      tokens = getControlledTokens();
   }

   return tokens.filter((token) => token.actor?.system.isCharacter);
}
```

Replace the whole of `src/helpers/utility-functions/GetTargetedCharacters.js` with:

```js
import getTargetedCharacterTokens from '~/helpers/utility-functions/GetTargetedCharacterTokens.js';

/**
 * Gets the Character Actors targeted by the current user. A GM who targets nothing falls back to their controlled
 * tokens.
 * @returns {TitanActor[]} The actors of getTargetedCharacterTokens(), in target order.
 */
export default function getTargetedCharacters() {
   return getTargetedCharacterTokens().map((token) => token.actor);
}
```

Create `src/helpers/utility-functions/MeasureTokenDistance.js`:

```js
/**
 * Measures the distance in grid spaces between two tokens: between the nearest spaces they occupy, using the scene
 * grid's own path measurement (its diagonal rule). Measuring from centers would put an adjacent Large token 1.5 or 2
 * spaces away. A token occupying no space (a gridless scene) is measured from its center.
 * @param {TokenDocument} [fromToken] - The first token.
 * @param {TokenDocument} [toToken] - The second token.
 * @returns {number|null} The distance in spaces (grid units ÷ the grid's units per space), or null when either token
 * is missing or they are on different scenes.
 */
export default function measureTokenDistance(fromToken, toToken) {
   if (!fromToken || !toToken || !fromToken.parent || fromToken.parent !== toToken.parent) {
      return null;
   }

   /** @type {foundry.grid.BaseGrid} The scene's grid. */
   const grid = fromToken.parent.grid;

   /**
    * Gets the center points of the spaces a token occupies, or its own center when it occupies none.
    * @param {TokenDocument} token - The token.
    * @returns {{x: number, y: number}[]} The points.
    */
   const getPoints = (token) => {
      /** @type {object[]} The grid offsets the token occupies. */
      const offsets = token.getOccupiedGridSpaceOffsets();
      return offsets.length > 0 ? offsets.map((offset) => grid.getCenterPoint(offset)) : [token.getCenterPoint()];
   };

   /** @type {number} The shortest distance found, in grid units. */
   let shortest = Infinity;
   for (const fromPoint of getPoints(fromToken)) {
      for (const toPoint of getPoints(toToken)) {
         shortest = Math.min(shortest, grid.measurePath([
            fromPoint,
            toPoint,
         ]).distance);
      }
   }
   return shortest / grid.distance;
}
```

Create `src/check/types/attack-check/TargetConditionModifiers.js`:

```js
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * The Difficulty of an attack against an Incapacitated target. Source: TITAN Rules Compendium (09_26_2026),
 * "Incapacitated": "The Difficulty to hit an Incapacitated creature is always 2".
 * @type {number}
 */
export const INCAPACITATED_TARGET_DIFFICULTY = 2;

/**
 * The farthest distance, in spaces, at which an attacker gains the close Prone bonus. Source: TITAN Rules Compendium
 * (09_26_2026), "Prone": "within 1 space".
 * @type {number}
 */
export const PRONE_CLOSE_DISTANCE = 1;

/**
 * The distance step, in spaces, of the far Prone penalty: beyond it, Accuracy drops per full step. Source: TITAN Rules
 * Compendium (09_26_2026), "Prone": "greater than 10 spaces ... per 10 spaces".
 * @type {number}
 */
export const PRONE_FAR_DISTANCE = 10;

/**
 * A modifier an attack takes from its target's conditions.
 * @typedef {object} TargetConditionModifier
 * @property {string} condition - The target's condition id (prone or incapacitated).
 * @property {string} modifier - What it modifies: 'melee' or 'accuracy' (the attacker's rating) or 'difficulty'.
 * @property {number} value - The rating change, or the fixed Difficulty.
 */

/**
 * Computes the modifiers an attack takes from its target's conditions. Source: TITAN Rules Compendium (09_26_2026),
 * "Prone" and "Incapacitated".
 * - Prone target within 1 space: Melee and Accuracy each gain ¼ of their base, rounded up (the attack uses one).
 * - Prone target beyond 10 spaces: Accuracy loses ¼ of its base per full 10 spaces, the resulting Accuracy rounded up
 *   (so the loss is rounded down), never below 0.
 * - Incapacitated target: the Difficulty is 2.
 * A modifier that rounds to 0 is left out.
 * @param {object} target - The target and attacker values.
 * @param {Set<string>} target.statuses - The target's active condition ids.
 * @param {number|null} target.distance - The distance in spaces, or null when it cannot be measured (no distance
 * modifier applies).
 * @param {{base: number, value: number}} target.melee - The attacker's base and current Melee.
 * @param {{base: number, value: number}} target.accuracy - The attacker's base and current Accuracy.
 * @returns {TargetConditionModifier[]} The modifiers: Prone's before Incapacitated's.
 */
export function getTargetConditionModifiers({ statuses, distance, melee, accuracy }) {
   /** @type {TargetConditionModifier[]} The modifiers. */
   const modifiers = [];
   if (statuses.has('prone') && distance !== null) {
      if (distance <= PRONE_CLOSE_DISTANCE) {
         for (const [modifier, rating] of [
            [
               'melee',
               melee,
            ],
            [
               'accuracy',
               accuracy,
            ],
         ]) {
            /** @type {number} A quarter of the rating's base, rounded up. */
            const bonus = Math.ceil(rating.base * 0.25);
            if (bonus > 0) {
               modifiers.push({
                  condition: 'prone',
                  modifier,
                  value: bonus,
               });
            }
         }
      }
      else if (distance > PRONE_FAR_DISTANCE) {
         /** @type {number} The Accuracy lost: rounded down (the result rounds up) and capped at the current value. */
         const penalty = Math.min(
            Math.floor(accuracy.base * 0.25 * Math.floor(distance / PRONE_FAR_DISTANCE)),
            Math.max(accuracy.value, 0),
         );
         if (penalty > 0) {
            modifiers.push({
               condition: 'prone',
               modifier: 'accuracy',
               value: -penalty,
            });
         }
      }
   }
   if (statuses.has('incapacitated')) {
      modifiers.push({
         condition: 'incapacitated',
         modifier: 'difficulty',
         value: INCAPACITATED_TARGET_DIFFICULTY,
      });
   }
   return modifiers;
}

/**
 * Sums the target-condition modifiers to one of the attacker's ratings.
 * @param {TargetConditionModifier[]} modifiers - The modifiers.
 * @param {string} rating - 'melee' or 'accuracy'.
 * @returns {number} The summed change.
 */
export function sumTargetRatingModifiers(modifiers, rating) {
   return modifiers.filter((modifier) => modifier.modifier === rating)
      .reduce((sum, modifier) => sum + modifier.value, 0);
}

/**
 * Keeps the target-condition modifiers that apply to an attack: its own rating's (Melee for a melee attack, Accuracy
 * otherwise) and the Difficulty.
 * @param {TargetConditionModifier[]} modifiers - The modifiers for both ratings.
 * @param {string} attackType - The attack type (melee or ranged).
 * @returns {TargetConditionModifier[]} The applied modifiers.
 */
export function selectAttackTargetConditions(modifiers, attackType) {
   /** @type {string} The rating the attack uses. */
   const rating = attackType === 'melee' ? 'melee' : 'accuracy';
   return modifiers.filter((modifier) => modifier.modifier === rating || modifier.modifier === 'difficulty');
}

/**
 * Reads the Difficulty a target's conditions fix.
 * @param {TargetConditionModifier[]} modifiers - The modifiers.
 * @returns {number|null} The fixed Difficulty, or null when none is fixed.
 */
export function getTargetConditionDifficulty(modifiers) {
   return modifiers.find((modifier) => modifier.modifier === 'difficulty')?.value ?? null;
}

/**
 * Labels a target-condition modifier for the dialog and the chat card, localized on this client: "Prone: Melee +2",
 * "Incapacitated: Difficulty 2".
 * @param {TargetConditionModifier} modifier - The modifier.
 * @returns {string} The label.
 */
export function getTargetConditionModifierLabel(modifier) {
   /** @type {string} The value, signed for a rating change. */
   const value = modifier.modifier !== 'difficulty' && modifier.value > 0 ? `+${modifier.value}` : `${modifier.value}`;
   return `${localize(modifier.condition)}: ${localize(modifier.modifier)} ${value}`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/GetTargetedCharacters.test.js tests/unit/MeasureTokenDistance.test.js
tests/unit/TargetConditionModifiers.test.js`
Expected: PASS.

- [ ] **Step 6: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/effect-tray.spec.js tests/e2e/interaction-rolls.spec.js` → all pass (both resolve
targets through `getTargetedCharacters`).

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git status --short
git add src/helpers/utility-functions/GetTargetedCharacterTokens.js \
   src/helpers/utility-functions/GetTargetedCharacters.js src/helpers/utility-functions/MeasureTokenDistance.js \
   src/check/types/attack-check/TargetConditionModifiers.js tests/unit/GetTargetedCharacters.test.js \
   tests/unit/MeasureTokenDistance.test.js tests/unit/TargetConditionModifiers.test.js
git commit -F - <<'EOF'
feat(attack): target token, distance, and target-condition helpers

getTargetedCharacterTokens keeps the tokens behind getTargetedCharacters;
measureTokenDistance measures between the nearest occupied spaces with the
scene grid's rule; TargetConditionModifiers computes Prone's close bonus and
far penalty and Incapacitated's Difficulty 2.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 11: Target-aware attack checks (options, parameters, dialog, card)

**Files:**
- Create: `src/check/types/attack-check/dialog/AttackCheckDialogTargetConditionsField.svelte`,
  `src/check/types/attack-check/chat-message/AttackCheckChatTargetConditions.svelte`
- Modify: `src/check/types/attack-check/AttackCheckOptions.js`, `src/check/types/attack-check/AttackCheckParameters.js`,
  `src/document/types/actor/types/character/CharacterDataModel.js`,
  `src/check/types/attack-check/dialog/AttackCheckDialogShell.svelte`,
  `src/check/types/attack-check/chat-message/AttackCheckChatMessage.svelte`, `lang/en.json`, `CHANGELOG.md`
- Test: `tests/unit/check/rebuild-check-options.test.js`, `tests/unit/check/check-shape-parity.test.js`,
  `tests/unit/check/check-options-defaults.test.js`, `tests/unit/CheckChatMessageSchemaEquivalence.test.js`,
  `tests/unit/CharacterCheckModifiers.test.js`, `tests/e2e/target-conditions.spec.js` (create)

**Interfaces:**
- Consumes: Task 10's helpers.
- Produces: `AttackCheckOptions.targetConditions: TargetConditionModifier[]` (both ratings and the Difficulty; default
  `[]` from `createAttackCheckOptions`, derived from the target in `initializeAttackCheckOptions` when the caller
  omits it); `AttackCheckParameters.targetConditions: TargetConditionModifier[]` (the attack's rating and the
  Difficulty; persisted in the attack chat message's `system.parameters`); `CharacterDataModel#_getAttackTargetToken():
  Token|undefined`. Test ids `attack-target-conditions`, `attack-target-condition`, `check-chat-target-conditions`,
  `check-chat-target-condition`.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/check/check-shape-parity.test.js`, add to `OPTIONS` (alphabetical position, after `targetDefense: 0,`):

```js
   targetConditions: [],
```

In `tests/unit/check/check-options-defaults.test.js`, append:

```js
describe('attack options — target conditions', () => {
   it('default to none and keep supplied ones', () => {
      expect(createAttackCheckOptions({}).targetConditions).toEqual([]);

      /** @type {TargetConditionModifier[]} Supplied target conditions. */
      const targetConditions = [
         {
            condition: 'incapacitated',
            modifier: 'difficulty',
            value: 2,
         },
      ];
      expect(createAttackCheckOptions({ targetConditions }).targetConditions).toEqual(targetConditions);
   });
});
```

In `tests/unit/CheckChatMessageSchemaEquivalence.test.js`, in the attack check's `parameters` golden, add after
`targetDefense: integerField(0),`:

```js
         targetConditions: emptyObjectArray(),
```

In `tests/unit/CharacterCheckModifiers.test.js` `beforeAll`, add after the `globalThis.CONST = {...};` statement:

```js
   globalThis.game.user = {
      isGM: false,
      targets: new Set(),
   };
   globalThis.canvas = { tokens: { controlled: [] } };
```

and in its `afterAll` add `delete globalThis.canvas;`.

In `tests/unit/check/rebuild-check-options.test.js`:
(a) in `createCharacter`, add to `model.parent` (alphabetical position):

```js
      getActiveTokens: () => [],
```

and

```js
      uuid: 'Actor.rebuild',
```

(b) replace `targetToken` (JSDoc and body) with:

```js
/**
 * Builds a character-targeting token whose actor has the given Defense rating and conditions.
 * @param {number} defense - The target's Defense rating.
 * @param {object} [options] - The target's conditions and position.
 * @param {string[]} [options.statuses] - The target's active condition ids.
 * @param {number} [options.x] - The token's center x on the fake gridless scene (100 pixels per space).
 * @param {string} [options.uuid] - The target actor's uuid.
 * @returns {object} A stand-in token for `game.user.targets`.
 */
function targetToken(defense, { statuses = [], x = 100, uuid = 'Actor.target' } = {}) {
   return {
      actor: {
         statuses: new Set(statuses),
         system: {
            getRollData: () => ({ rating: { defense: { value: defense } } }),
            isCharacter: true,
         },
         uuid,
      },
      document: tokenDocument(x),
   };
}

/**
 * A gridless fake scene, 100 pixels per space and 1 unit per space, measuring straight lines.
 * @type {object}
 */
const GRIDLESS_SCENE = {
   grid: {
      distance: 1,

      /**
       * Measures a straight two-waypoint path in grid units.
       * @param {{x: number, y: number}[]} waypoints - The path.
       * @returns {{distance: number}} The distance.
       */
      measurePath: ([a, b]) => ({ distance: Math.hypot(b.x - a.x, b.y - a.y) / 100 }),
   },
};

/**
 * Builds a token document centered at the given x on the gridless fake scene.
 * @param {number} x - The center x.
 * @returns {object} The fake token document.
 */
function tokenDocument(x) {
   return {
      getCenterPoint: () => ({
         x,
         y: 0,
      }),
      getOccupiedGridSpaceOffsets: () => [],
      parent: GRIDLESS_SCENE,
   };
}

/**
 * Gives a Character base-8 Melee and Accuracy (current value 8) and a token at x = 0 on the fake scene.
 * @param {object} system - The Character.
 * @returns {object} The Character.
 */
function withAttackerToken(system) {
   system.rating = {
      accuracy: {
         baseValue: 8,
         value: 8,
      },
      melee: {
         baseValue: 8,
         value: 8,
      },
   };
   system.parent.getActiveTokens = () => [tokenDocument(0)];
   return system;
}
```

(c) append:

```js
describe('Attack target conditions', () => {
   /**
    * Builds a Character with a weapon and a token, and targets a token with the given conditions and position.
    * @param {string[]} statuses - The target's condition ids.
    * @param {number} [x] - The target token's center x (100 = adjacent, 2100 = 21 spaces).
    * @returns {object} The Character.
    */
   function attackTarget(statuses, x = 100) {
      /** @type {object} The Character rolling the check. */
      const system = withAttackerToken(createCharacter({ w: createItem(weaponRollData()) }));
      globalThis.game.user.targets = new Set([
         targetToken(5, {
            statuses,
            x,
         }),
      ]);
      return system;
   }

   it('an adjacent Prone target raises the attack\'s rating by a quarter of its base', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);

      /** @type {AttackCheckOptions} The initialized options. */
      const options = system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      });
      expect(options).toMatchObject({
         attackerAccuracy: 10,
         attackerMelee: 10,
         targetConditions: [
            {
               condition: 'prone',
               modifier: 'melee',
               value: 2,
            },
            {
               condition: 'prone',
               modifier: 'accuracy',
               value: 2,
            },
         ],
         targetDefense: 5,
      });
      expect(system.getAttackCheckParameters(options).targetConditions).toEqual([
         {
            condition: 'prone',
            modifier: 'melee',
            value: 2,
         },
      ]);
   });

   it('a Prone target 21 spaces away lowers a ranged attack\'s Accuracy by two quarters of its base', () => {
      /** @type {AttackCheckOptions} The initialized options. */
      const options = attackTarget(['prone'], 2100).initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
         type: 'ranged',
      });
      expect(options.attackerAccuracy).toBe(4);
      expect(options.targetConditions).toEqual([
         {
            condition: 'prone',
            modifier: 'accuracy',
            value: -4,
         },
      ]);
   });

   it('an Incapacitated target fixes the Difficulty at 2 after Advantage, with or without tokens', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['incapacitated']);
      system.parent.getActiveTokens = () => [];

      /** @type {AttackCheckParameters} Parameters with Disadvantage. */
      const parameters = system.getAttackCheckParameters(system.initializeAttackCheckOptions({
         advantage: -1,
         attackIdx: 0,
         itemId: 'w',
      }));
      expect(parameters.difficulty).toBe(2);
      expect(parameters.targetConditions).toEqual([
         {
            condition: 'incapacitated',
            modifier: 'difficulty',
            value: 2,
         },
      ]);
   });

   it('a Prone target with no attacker token applies no distance modifier', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);
      system.parent.getActiveTokens = () => [];
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      })).toMatchObject({
         attackerMelee: 8,
         targetConditions: [],
      });
   });

   it('never reads the attacker\'s own controlled token as a GM\'s target', () => {
      /** @type {object} The Character, Prone, whose GM controls its token and targets nothing. */
      const system = withAttackerToken(createCharacter({ w: createItem(weaponRollData()) }));
      globalThis.game.user.isGM = true;
      globalThis.canvas.tokens.controlled = [
         targetToken(9, {
            statuses: ['prone'],
            uuid: 'Actor.rebuild',
         }),
      ];
      try {
         expect(system.initializeAttackCheckOptions({
            attackIdx: 0,
            itemId: 'w',
         })).toMatchObject({
            attackerMelee: 8,
            targetConditions: [],
            targetDefense: 8,
         });
      }
      finally {
         globalThis.game.user.isGM = false;
         globalThis.canvas.tokens.controlled = [];
      }
   });

   it('keeps a caller\'s rating and a caller\'s target conditions', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         attackerMelee: 3,
         itemId: 'w',
      }).attackerMelee).toBe(3);
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
         targetConditions: [],
      })).toMatchObject({
         attackerMelee: 8,
         targetConditions: [],
      });
   });

   it('records the target\'s conditions resolved at open as caller values, kept after untargeting', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);
      system._createAttackCheckDialog({
         attackIdx: 0,
         itemId: 'w',
      });

      /** @type {object} The caller options the dialog received. */
      const callerOptions = dialogCalls[0][3];
      expect(callerOptions.targetConditions).toEqual(dialogCalls[0][0].targetConditions);

      globalThis.game.user.targets = new Set();
      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system,
         userEdits: {},
      })).toMatchObject({
         attackerMelee: 10,
         targetDefense: 5,
      });
   });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/check tests/unit/CheckChatMessageSchemaEquivalence.test.js
tests/unit/CharacterCheckModifiers.test.js`
Expected: FAIL — `targetConditions` is missing from the options, the parameters, and the schema.

- [ ] **Step 3: Carry target conditions in the options and parameters**

In `AttackCheckOptions.js`, add to the typedef (after `targetDefense`):

```js
 * @property {TargetConditionModifier[]} [targetConditions] - The target's condition modifiers to both of the
 * attacker's ratings and to the Difficulty; derived from the first target when omitted.
```

and to the returned object (after `targetDefense`):

```js
      targetConditions: options.targetConditions ?? [],
```

In `AttackCheckParameters.js`:
(a) add at the top:

```js
import { selectAttackTargetConditions } from '~/check/types/attack-check/TargetConditionModifiers.js';
```

(b) add to the typedef (after `@property {SituationLabel[]} situations ...`):

```js
 * @property {TargetConditionModifier[]} targetConditions - The target-condition modifiers applied to the attack: its
 * own rating's and the Difficulty.
```

(c) add to the shape (after `targetDefense: 0,`): `targetConditions: [],`
(d) add to the factory's returned object (after `targetDefense: options.targetDefense,`):

```js
      targetConditions: selectAttackTargetConditions(options.targetConditions, options.type),
```

- [ ] **Step 4: Derive the target's conditions in the attack check**

In `CharacterDataModel.js`:
(a) add imports (alphabetical among the helper imports):

```js
import getTargetedCharacterTokens from '~/helpers/utility-functions/GetTargetedCharacterTokens.js';
import measureTokenDistance from '~/helpers/utility-functions/MeasureTokenDistance.js';
import {
   getTargetConditionDifficulty,
   getTargetConditionModifiers,
   sumTargetRatingModifiers,
} from '~/check/types/attack-check/TargetConditionModifiers.js';
```

and delete the `getTargetedCharacters` import (its last use is replaced below).

(b) in `initializeAttackCheckOptions`, replace everything from `// Melee.` through the end of the `// Target defense.`
block (just before `return checkOptions;`) with:

```js
      /**
       * Gets the attacker's rating for this attack before any target condition. Read only where a value is derived,
       * so a caller supplying every rating and target value needs no rating data.
       * @param {string} rating - 'melee' or 'accuracy'.
       * @returns {number} The rating with the attack's conditional rating modifiers.
       */
      const getAttackRating = (rating) => this.rating[rating].value + this._getAttackRatingMod(
         rating,
         checkOptions.multiAttack,
         checkOptions.type,
         attackTraits,
         customTraits,
      );

      // The target, read only when a target value is not supplied by the caller.
      /** @type {Token|undefined} The first targeted Character token other than the attacker's own. */
      const targetToken = options.targetDefense === undefined || options.targetConditions === undefined ?
         this._getAttackTargetToken() :
         undefined;

      // Target conditions: modifiers to both ratings (the dialog can switch the attack type) and the Difficulty.
      if (options.targetConditions === undefined) {
         checkOptions.targetConditions = targetToken ?
            getTargetConditionModifiers({
               accuracy: {
                  base: this.rating.accuracy.baseValue,
                  value: getAttackRating('accuracy'),
               },
               distance: measureTokenDistance(this.parent.getActiveTokens(false, true)[0], targetToken.document),
               melee: {
                  base: this.rating.melee.baseValue,
                  value: getAttackRating('melee'),
               },
               statuses: targetToken.actor.statuses,
            }) :
            [];
      }

      // Melee.
      if (options.attackerMelee === undefined) {
         checkOptions.attackerMelee = getAttackRating('melee') +
            sumTargetRatingModifiers(checkOptions.targetConditions, 'melee');
      }

      // Accuracy.
      if (options.attackerAccuracy === undefined) {
         checkOptions.attackerAccuracy = getAttackRating('accuracy') +
            sumTargetRatingModifiers(checkOptions.targetConditions, 'accuracy');
      }

      // Target defense: the target's, or without a target the attacker's own rating for the attack.
      if (options.targetDefense === undefined) {
         if (targetToken) {
            checkOptions.targetDefense = targetToken.actor.system.getRollData().rating.defense.value;
         }
         else {
            checkOptions.targetDefense = checkOptions.type === 'melee' ?
               checkOptions.attackerMelee :
               checkOptions.attackerAccuracy;
         }
      }
```

(c) add directly after `initializeAttackCheckOptions`:

```js
   /**
    * Gets the token an Attack Check targets: the first targeted Character token (a GM with no target falls back to
    * their controlled tokens) other than the attacker's own, so a GM rolling from a controlled attacker never reads the
    * attacker as its own target.
    * @returns {Token|undefined} The target token, if any.
    * @private
    */
   _getAttackTargetToken() {
      return getTargetedCharacterTokens().find((token) => token.actor.uuid !== this.parent.uuid);
   }
```

(d) in `_createAttackCheckDialog`, replace the `callerOptions` comment and declaration with:

```js
         // A target's Defense and conditions resolved now are fixed for the dialog's lifetime, like a caller's values;
         // without a target they stay derived, following the attacker's fallback rating and picking up a later target.
         /** @type {boolean} Whether a target token resolved this check's target values. */
         const hasTarget = this._getAttackTargetToken() !== undefined;

         /** @type {object} The options the dialog keeps through its rebuilds. */
         const callerOptions = {
            ...options,
            ...(hasTarget && options.targetDefense === undefined ? { targetDefense: checkOptions.targetDefense } : {}),
            ...(hasTarget && options.targetConditions === undefined ?
               { targetConditions: checkOptions.targetConditions } :
               {}),
         };
```

(e) in `getAttackCheckParameters`, insert directly after `this._applyCheckAdvantage(parameters);`:

```js
      // An Incapacitated target fixes the Difficulty after the rating math and Advantage.
      /** @type {number|null} The Difficulty the target's conditions fix, if any. */
      const targetDifficulty = getTargetConditionDifficulty(parameters.targetConditions);
      if (targetDifficulty !== null) {
         parameters.difficulty = targetDifficulty;
      }
```

- [ ] **Step 5: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/check tests/unit/CheckChatMessageSchemaEquivalence.test.js
tests/unit/CharacterCheckModifiers.test.js`
Expected: PASS.

- [ ] **Step 6: Show the target's conditions in the dialog and on the card**

Create `src/check/types/attack-check/dialog/AttackCheckDialogTargetConditionsField.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { getTargetConditionModifierLabel } from '~/check/types/attack-check/TargetConditionModifiers.js';

   /** @type {import('svelte/store').Writable} Reference to the Check Parameters store. */
   const checkParameters = getContext('checkParameters');
</script>

<!--Field-->
<div
   class="field"
   data-testid="attack-target-conditions"
>

   <!--Label-->
   <div class="sign">
      <Text text={'targetConditions'}/>
   </div>

   <!--Applied modifiers-->
   <div class="value">
      {#each $checkParameters.targetConditions as modifier (`${modifier.condition}.${modifier.modifier}`)}
         <div
            class="tag"
            data-testid="attack-target-condition"
         >
            {getTargetConditionModifierLabel(modifier)}
         </div>
      {/each}
   </div>
</div>

<style lang="scss">
   .field {
      @include flex-row;
      @include flex-group-center;
      @include padding-standard;

      width: 100%;

      .sign {
         @include flex-group-right;
         @include border-right;

         width: 100%;
         font-weight: bold;

         @include padding-right-large;
      }

      .value {
         @include flex-row;
         @include flex-group-left;

         width: 100%;
         flex-wrap: wrap;

         .tag {
            @include border;
            @include tag;
            @include margin-left-large;
         }
      }
   }
</style>
```

Create `src/check/types/attack-check/chat-message/AttackCheckChatTargetConditions.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import { getTargetConditionModifierLabel } from '~/check/types/attack-check/TargetConditionModifiers.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div
   class="target-conditions"
   data-testid="check-chat-target-conditions"
>
   <!--Label-->
   <div class="label">{localize('targetConditions')}</div>

   <!--Applied modifiers, localized on this client-->
   {#each document.data.system.parameters.targetConditions as modifier (`${modifier.condition}.${modifier.modifier}`)}
      <div class="stat">
         <Tag testId={'check-chat-target-condition'}>
            {getTargetConditionModifierLabel(modifier)}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .target-conditions {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      flex-wrap: wrap;

      .label {
         font-weight: bold;
      }

      .stat {
         @include tag-container-child-margin;
      }
   }
</style>
```

In `AttackCheckChatMessage.svelte`, add the import

```js
   import AttackCheckChatTargetConditions
   from '~/check/types/attack-check/chat-message/AttackCheckChatTargetConditions.svelte';
```

and insert after the `<!--Stats-->` section:

```svelte
   <!--Target Conditions-->
   {#if document.data.system.parameters.targetConditions.length}
      <div class="section tags">
         <AttackCheckChatTargetConditions/>
      </div>
   {/if}
```

In `AttackCheckDialogShell.svelte`:
(a) add the import

```js
   import AttackCheckDialogTargetConditionsField
   from '~/check/types/attack-check/dialog/AttackCheckDialogTargetConditionsField.svelte';
```

(b) replace the `rows` declaration (JSDoc and `$state([...])`) with:

```js
   /**
    * @type {Array<typeof import('svelte').SvelteComponent>} Components for changing the options and displaying the
    * parameters: the attack type's rating first, and the target's conditions only when any apply.
    */
   let rows = $derived([
      $checkOptions.type === 'melee' ? AttackCheckDialogMeleeField : AttackCheckDialogAccuracyField,
      AttackCheckDialogDefenseField,
      ...($checkParameters.targetConditions.length > 0 ? [AttackCheckDialogTargetConditionsField] : []),
      AttackCheckDialogAttackTypeField,
      CheckDialogAttributeField,
      CheckDialogSkillField,
      CheckDialogDamageModField,
      CheckDialogDiceModField,
      CheckDialogTrainingModField,
      CheckDialogExpertiseModField,
      CheckDialogDoubleTrainingField,
      CheckDialogDoubleExpertiseField,
      CheckDialogAdvantageField,
      CheckDialogAutomaticFailureField,
      CheckDialogDifficultySummary,
      CheckDialogTotalDiceSummary,
      CheckDialogTotalExpertiseSummary,
   ]);
```

(c) delete the `// Update the first row whenever the attack type is changed.` `$effect` block (the derived list replaces
it).

In `lang/en.json` (`LOCAL`), insert in alphabetical key order:

```json
      "targetConditions.text": "Target Conditions",
```

In `CHANGELOG.md`, append to the `## Unreleased:` list:

```markdown
- Attack checks read the target's conditions: a Prone target within 1 space raises the attacker's Melee or Accuracy
  by a quarter of its base, one beyond 10 spaces lowers Accuracy by a quarter per 10 spaces, and an Incapacitated
  target's Difficulty is 2. The dialog and the chat card list them.
```

- [ ] **Step 7: Write the target e2e**

Create `tests/e2e/target-conditions.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor, showChatLog } from './world.js';
import { readNewestCheckFlags } from './checkDialog.js';

/**
 * Attack checks against a targeted token's conditions on a live 1-unit-per-space grid: an adjacent Prone target raises
 * Melee, a Prone target 21 spaces away lowers a ranged attack's Accuracy, and an Incapacitated target fixes the
 * Difficulty at 2. The dialog and the chat card list the applied modifiers.
 */

/** @type {string} Name of the attacking player actor. */
const ATTACKER_NAME = 'E2E Target Attacker';

/** @type {string} Name of the target player actor. */
const TARGET_NAME = 'E2E Target Victim';

/** @type {string} Name of the fixture scene. */
const SCENE_NAME = 'E2E Target Conditions Scene';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {{originalSceneId: string|null, sceneId: string, targetTokenId: string, weaponId: string}} Fixture ids. */
let fixture;
/** @type {string} The check-options setting in force before this spec. */
let originalCheckOptions;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await showChatLog(page);
   originalCheckOptions = await page.evaluate(() => game.settings.get('titan', 'getCheckOptions'));

   fixture = await page.evaluate(async ({ attackerName, targetName, sceneName }) => {
      await game.actors.getName(attackerName)?.delete();
      await game.actors.getName(targetName)?.delete();
      await game.scenes.getName(sceneName)?.delete();

      /** @type {string|null} The scene this client viewed before the spec. */
      const originalSceneId = canvas.scene?.id ?? null;

      /** @type {TitanActor} The attacker: Body, Mind, Melee Weapons, and Ranged Weapons 8 (Melee and Accuracy 8). */
      const attacker = await Actor.create({
         name: attackerName,
         prototypeToken: { actorLink: true },
         system: {
            attribute: {
               body: { baseValue: 8 },
               mind: { baseValue: 8 },
            },
            skill: {
               meleeWeapons: { training: { baseValue: 8 } },
               rangedWeapons: { training: { baseValue: 8 } },
            },
         },
         type: 'player',
      });

      /** @type {TitanItem[]} The attacker's default weapon, alone in the array. */
      const [weapon] = await attacker.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Target Weapon',
            type: 'weapon',
         },
      ]);

      /** @type {TitanActor} The target. */
      const target = await Actor.create({
         name: targetName,
         prototypeToken: { actorLink: true },
         type: 'player',
      });

      /** @type {Scene} A 40 × 10 space scene, 1 unit per space. */
      const scene = await Scene.create({
         grid: {
            distance: 1,
            size: 100,
         },
         height: 1000,
         name: sceneName,
         padding: 0,
         width: 4000,
      });
      await scene.view();
      await titanWait(() => canvas.ready && canvas.scene?.id === scene.id, {
         message: 'fixture scene drawn',
         timeout: 5000,
      });

      /** @type {TokenDocument[]} The attacker's and the target's tokens, adjacent. */
      const [, targetToken] = await scene.createEmbeddedDocuments('Token', [
         await attacker.getTokenDocument({
            x: 0,
            y: 0,
         }),
         await target.getTokenDocument({
            x: 100,
            y: 0,
         }),
      ]);
      await titanWait(() => !!targetToken.object, { message: 'target token drawn' });
      return {
         originalSceneId,
         sceneId: scene.id,
         targetTokenId: targetToken.id,
         weaponId: weapon.id,
      };
   }, {
      attackerName: ATTACKER_NAME,
      sceneName: SCENE_NAME,
      targetName: TARGET_NAME,
   });
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await clearTargets();
   await page.evaluate(async ({ originalSceneId, sceneId, checkOptions }) => {
      await game.settings.set('titan', 'getCheckOptions', checkOptions);
      if (originalSceneId) {
         await game.scenes.get(originalSceneId).view();
         await titanWait(() => canvas.ready && canvas.scene?.id === originalSceneId, {
            message: 'original scene redrawn',
            timeout: 5000,
         });
      }
      await game.scenes.get(sceneId)?.delete();
   }, {
      checkOptions: originalCheckOptions,
      originalSceneId: fixture.originalSceneId,
      sceneId: fixture.sceneId,
   });
   await deleteFixtureActor(page, ATTACKER_NAME);
   await deleteFixtureActor(page, TARGET_NAME);
   await page?.close();
});

/**
 * Gives the target exactly the given conditions, moves its token to the given x, and targets it.
 * @param {string[]} statuses - The target's condition ids.
 * @param {number} x - The target token's x (100 = adjacent; 2100 = 21 spaces away).
 * @returns {Promise<void>} Resolves once the target is set up and targeted.
 */
async function setTarget(statuses, x) {
   await page.evaluate(async ({ targetName, sceneId, tokenId, ids, tokenX }) => {
      /** @type {TitanActor} The target. */
      const target = game.actors.getName(targetName);
      await target.deleteEmbeddedDocuments('ActiveEffect', target.effects
         .filter((effect) => effect.type === 'condition')
         .map((effect) => effect.id));
      for (const id of ids) {
         await target.toggleStatusEffect(id, { active: true });
      }

      /** @type {TokenDocument} The target's token. */
      const token = game.scenes.get(sceneId).tokens.get(tokenId);
      if (token.x !== tokenX) {
         await token.update({ x: tokenX });
      }
      token.object.setTarget(true, { releaseOthers: true });
      await titanWait(() => game.user.targets.has(token.object) && token.x === tokenX &&
         ids.every((id) => target.statuses.has(id)), { message: 'target set up' });
   }, {
      ids: statuses,
      sceneId: fixture.sceneId,
      targetName: TARGET_NAME,
      tokenId: fixture.targetTokenId,
      tokenX: x,
   });
}

/**
 * Rolls an attack straight to chat and returns its message data.
 * @param {object} [options] - Extra attack options (type, advantage).
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The rolled check's message.
 */
async function rollAttack(options = {}) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await page.evaluate(async ({ attackerName, checkOptions }) => {
      await game.actors.getName(attackerName).system.rollAttackCheck(checkOptions);
   }, {
      attackerName: ATTACKER_NAME,
      checkOptions: {
         attackIdx: 0,
         itemId: fixture.weaponId,
         ...options,
      },
   });
   return readNewestCheckFlags(page, baseline, 'attackCheck');
}

/**
 * Builds the localized label of a target-condition modifier.
 * @param {string} condition - The condition id.
 * @param {string} modifier - melee, accuracy, or difficulty.
 * @param {string} value - The displayed value.
 * @returns {Promise<string>} The label.
 */
function label(condition, modifier, value) {
   return page.evaluate(({ conditionId, modifierKey, shown }) => {
      /** @type {string} The localized condition name. */
      const conditionName = game.i18n.localize(`LOCAL.${conditionId}.text`);

      /** @type {string} The localized modified value's name. */
      const modifierName = game.i18n.localize(`LOCAL.${modifierKey}.text`);
      return `${conditionName}: ${modifierName} ${shown}`;
   }, {
      conditionId: condition,
      modifierKey: modifier,
      shown: value,
   });
}

/**
 * Clears the user's targets.
 * @returns {Promise<void>} Resolves once nothing is targeted.
 */
async function clearTargets() {
   await page.evaluate(async () => {
      for (const token of [...game.user.targets]) {
         token.setTarget(false, { releaseOthers: false });
      }
      await titanWait(() => game.user.targets.size === 0, { message: 'targets cleared' });
   });
}

/**
 * Locates a chat message's target-condition tags.
 * @param {string} messageId - The chat message id.
 * @returns {import('@playwright/test').Locator} The tags.
 */
function chatTargetConditions(messageId) {
   return page.locator(`#chat .message[data-message-id="${messageId}"] [data-testid="check-chat-target-condition"]`);
}

test('an adjacent Prone target raises a melee attack\'s Melee by a quarter of its base', async () => {
   await setTarget(['prone'], 100);

   /** @type {{id: string, parameters: object}} The rolled attack. */
   const flags = await rollAttack();
   expect(flags.parameters).toMatchObject({
      attackerMelee: 10,
      targetConditions: [
         {
            condition: 'prone',
            modifier: 'melee',
            value: 2,
         },
      ],
   });
   await expect(chatTargetConditions(flags.id)).toHaveText([await label('prone', 'melee', '+2')]);
});

test('a Prone target 21 spaces away lowers a ranged attack\'s Accuracy by two quarters of its base', async () => {
   await setTarget(['prone'], 2100);

   /** @type {{id: string, parameters: object}} The rolled attack. */
   const flags = await rollAttack({ type: 'ranged' });
   expect(flags.parameters).toMatchObject({
      attackerAccuracy: 4,
      targetConditions: [
         {
            condition: 'prone',
            modifier: 'accuracy',
            value: -4,
         },
      ],
   });
   await expect(chatTargetConditions(flags.id)).toHaveText([await label('prone', 'accuracy', '-4')]);
});

test('an Incapacitated target fixes the Difficulty at 2 even with Disadvantage', async () => {
   await setTarget(['incapacitated'], 100);

   /** @type {{id: string, parameters: object}} The rolled attack. */
   const flags = await rollAttack({ advantage: -1 });
   expect(flags.parameters.difficulty).toBe(2);
   await expect(chatTargetConditions(flags.id)).toHaveText([await label('incapacitated', 'difficulty', '2')]);
});

test('the dialog lists the target\'s conditions and keeps them after untargeting', async () => {
   await setTarget(['prone'], 100);
   await page.evaluate(async ({ attackerName, weaponId }) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(attackerName).system.requestAttackCheck({
         attackIdx: 0,
         itemId: weaponId,
      });
   }, {
      attackerName: ATTACKER_NAME,
      weaponId: fixture.weaponId,
   });

   /** @type {import('@playwright/test').Locator} The open Attack Check dialog. */
   const dialog = page.locator('.application.titan-dialog[id^="titan-attack-check-dialog-"]');
   await expect(dialog).toBeVisible();

   /** @type {string} The expected entry. */
   const expected = await label('prone', 'melee', '+2');
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);

   // The target's conditions were fixed at open: untargeting leaves the entry.
   await clearTargets();
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);
});
```

- [ ] **Step 8: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm run stylelint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/target-conditions.spec.js tests/e2e/checks-dialog.spec.js
tests/e2e/check-dialog-advantage.spec.js tests/e2e/attack-tags.spec.js tests/e2e/chat-message-mounts.spec.js`
→ all pass.

- [ ] **Step 9: Commit**

```bash
git branch --show-current
git status --short
git add src/check/types/attack-check/AttackCheckOptions.js src/check/types/attack-check/AttackCheckParameters.js \
   src/document/types/actor/types/character/CharacterDataModel.js \
   src/check/types/attack-check/dialog/AttackCheckDialogTargetConditionsField.svelte \
   src/check/types/attack-check/dialog/AttackCheckDialogShell.svelte \
   src/check/types/attack-check/chat-message/AttackCheckChatTargetConditions.svelte \
   src/check/types/attack-check/chat-message/AttackCheckChatMessage.svelte lang/en.json CHANGELOG.md \
   tests/unit/check/rebuild-check-options.test.js tests/unit/check/check-shape-parity.test.js \
   tests/unit/check/check-options-defaults.test.js tests/unit/CheckChatMessageSchemaEquivalence.test.js \
   tests/unit/CharacterCheckModifiers.test.js tests/e2e/target-conditions.spec.js
git commit -F - <<'EOF'
feat(attack): target-aware attack checks

initializeAttackCheckOptions reads the first targeted Character token
other than the attacker's own: its conditions and the grid distance give
Prone's close bonus and far penalty to the attacker's ratings, and
Incapacitated fixes the Difficulty at 2 after Advantage. The dialog pins
them at open like the target's Defense; the dialog and the chat card list
the applied modifiers.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---
### Task 12: Unconscious applies Prone and Incapacitated and drops held gear

**Files:**
- Modify: `src/system/Conditions.js`, `src/document/types/actor/types/character/CharacterDataModel.js`,
  `src/document/types/active-effect/TitanActiveEffect.js`, `CHANGELOG.md`
- Test: `tests/unit/Unconscious.test.js`, `tests/e2e/unconscious.spec.js` (create)

**Interfaces:**
- Produces: `UNCONSCIOUS_COMPANION_CONDITIONS: readonly ['prone', 'incapacitated']`;
  `CharacterDataModel#fallUnconscious(): Promise<void>`; `TitanActiveEffect#_onCreate(data, options, userId)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/Unconscious.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import { UNCONSCIOUS_COMPANION_CONDITIONS } from '~/system/Conditions.js';

// Falling Unconscious on a bare CharacterDataModel whose parent records its updates, and the creating-client hook on
// TitanActiveEffect. The classes are imported after the Foundry stand-ins are installed; dynamic import in beforeAll is
// permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;
/** @type {Function} The dynamically imported TitanActiveEffect class. */
let TitanActiveEffect;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.game.user = { id: 'creator' };
   globalThis.ui = {
      notifications: {
         error: vi.fn(),
      },
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   globalThis.foundry.documents = {
      ActiveEffect: class {
         /**
          * Stands in for core's creation handler.
          * @returns {void}
          */
         _onCreate() {}
      },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
   TitanActiveEffect = (await import('~/document/types/active-effect/TitanActiveEffect.js')).default;
});

afterAll(() => {
   delete globalThis.foundry.documents;
   restoreSchemaMocks();
   delete globalThis.ui;
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * Builds a bare Character owning the given items, with the given shield equipped.
 * @param {object[]} items - The owned items.
 * @param {string|null} shieldId - The equipped shield's id.
 * @param {boolean} [isOwner] - Whether the current user owns the Character.
 * @returns {object} The model, whose parent's update methods are spies.
 */
function createCharacter(items, shieldId, isOwner = true) {
   /** @type {Map<string, object>} The owned items, with Collection's filter. */
   const itemCollection = Object.assign(new Map(items.map((item) => [
      item.id,
      item,
   ])), {
      /**
       * Filters the items, as Foundry's Collection does.
       * @param {Function} predicate - The filter.
       * @returns {object[]} The matching items.
       */
      filter(predicate) {
         return [...this.values()].filter(predicate);
      },
   });

   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      isOwner,
      items: itemCollection,
      name: 'Sleeper',
      toggleStatusEffect: vi.fn(async () => true),
      update: vi.fn(async () => {}),
      updateEmbeddedDocuments: vi.fn(async () => []),
   };
   model.equipped = {
      armor: null,
      shield: shieldId,
   };
   return model;
}

/**
 * Builds a fake owned item.
 * @param {string} id - The item id.
 * @param {string} type - The item type.
 * @param {boolean} [equipped] - Whether a weapon is equipped.
 * @returns {object} The fake item.
 */
function item(id, type, equipped = false) {
   return {
      id,
      system: { equipped },
      type,
   };
}

describe('fallUnconscious', () => {
   it('applies Prone and Incapacitated and drops equipped weapons and the shield', async () => {
      /** @type {object} The model. */
      const model = createCharacter([
         item('sword', 'weapon', true),
         item('bow', 'weapon', false),
         item('buckler', 'shield'),
         item('cloak', 'equipment', true),
      ], 'buckler');
      await model.fallUnconscious();
      expect(model.parent.toggleStatusEffect.mock.calls).toEqual(UNCONSCIOUS_COMPANION_CONDITIONS.map((id) => [
         id,
         { active: true },
      ]));
      expect(model.parent.updateEmbeddedDocuments).toHaveBeenCalledWith('Item', [
         {
            _id: 'sword',
            'system.equipped': false,
         },
      ]);
      expect(model.parent.update).toHaveBeenCalledWith({
         system: {
            equipped: {
               shield: null,
            },
         },
      });
   });

   it('updates no gear when nothing is held', async () => {
      /** @type {object} The model. */
      const model = createCharacter([item('bow', 'weapon', false)], null);
      await model.fallUnconscious();
      expect(model.parent.updateEmbeddedDocuments).not.toHaveBeenCalled();
      expect(model.parent.update).not.toHaveBeenCalled();
   });

   it('changes nothing for a non-owner', async () => {
      /** @type {Function} The console.assert spy, silencing the expected assertion output. */
      const consoleAssert = vi.spyOn(console, 'assert').mockImplementation(() => {});

      /** @type {object} The model. */
      const model = createCharacter([item('sword', 'weapon', true)], null, false);
      await model.fallUnconscious();
      expect(model.parent.toggleStatusEffect).not.toHaveBeenCalled();
      expect(model.parent.updateEmbeddedDocuments).not.toHaveBeenCalled();
      consoleAssert.mockRestore();
   });
});

describe('TitanActiveEffect#_onCreate', () => {
   /**
    * Builds a created effect on a Character whose fallUnconscious is a spy, and runs its creation hook.
    * @param {object} data - The effect's type and statuses, and the creating user.
    * @param {string} data.type - The effect subtype.
    * @param {string[]} data.statuses - The effect's status ids.
    * @param {string} data.userId - The creating user's id.
    * @returns {Function} The fallUnconscious spy.
    */
   function create({ type, statuses, userId }) {
      /** @type {Function} The spy. */
      const fallUnconscious = vi.fn();

      /** @type {object} The created effect. */
      const effect = Object.create(TitanActiveEffect.prototype);
      Object.assign(effect, {
         parent: {
            system: {
               fallUnconscious,
               isCharacter: true,
            },
         },
         statuses: new Set(statuses),
         type,
      });
      effect._onCreate({}, {}, userId);
      return fallUnconscious;
   }

   it('makes the Character fall Unconscious on the creating client only', () => {
      expect(create({
         statuses: ['unconscious'],
         type: 'condition',
         userId: 'creator',
      })).toHaveBeenCalledTimes(1);
      expect(create({
         statuses: ['unconscious'],
         type: 'condition',
         userId: 'someone-else',
      })).not.toHaveBeenCalled();
   });

   it('ignores other conditions and effect-subtype effects', () => {
      expect(create({
         statuses: ['prone'],
         type: 'condition',
         userId: 'creator',
      })).not.toHaveBeenCalled();
      expect(create({
         statuses: ['unconscious'],
         type: 'effect',
         userId: 'creator',
      })).not.toHaveBeenCalled();
   });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/Unconscious.test.js`
Expected: FAIL — `UNCONSCIOUS_COMPANION_CONDITIONS` is not exported and `fallUnconscious` does not exist.

- [ ] **Step 3: Implement falling Unconscious**

In `src/system/Conditions.js`, add after `CONDITION_IDS`:

```js
/**
 * The conditions an Unconscious creature also has: it "falls Prone, and is Incapacitated". Applied once when
 * Unconscious is created (CharacterDataModel#fallUnconscious); removing Unconscious removes neither, since standing up
 * is a separate Move or Action. Source: TITAN Rules Compendium (09_26_2026), "Unconscious" and "Prone".
 * @type {readonly string[]}
 */
export const UNCONSCIOUS_COMPANION_CONDITIONS = Object.freeze([
   'prone',
   'incapacitated',
]);
```

In `CharacterDataModel.js`:
(a) add the import (after the `ModBuckets` import):

```js
import { UNCONSCIOUS_COMPANION_CONDITIONS } from '~/system/Conditions.js';
```

(b) fix the stale JSDoc summary of `unEquipShield` ("Un-equips the currently equipped Armor item from the Character.")
to "Un-equips the currently equipped Shield from the Character.", and add directly after `unEquipShield`:

```js
   /**
    * Applies what falling Unconscious does besides the condition itself: the Character falls Prone and is
    * Incapacitated (each applied only if absent) and drops what it holds (its equipped weapons and shield are
    * unequipped). Source: TITAN Rules Compendium (09_26_2026), "Unconscious".
    * @returns {Promise<void>}
    */
   async fallUnconscious() {
      if (!assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         return;
      }

      // Fall Prone and become Incapacitated; an active toggle leaves an existing condition alone.
      for (const conditionId of UNCONSCIOUS_COMPANION_CONDITIONS) {
         await this.parent.toggleStatusEffect(conditionId, { active: true });
      }

      // Drop held weapons.
      /** @type {TitanItem[]} The equipped weapons. */
      const heldWeapons = this.parent.items.filter((item) => item.type === 'weapon' && item.system.equipped);
      if (heldWeapons.length > 0) {
         await this.parent.updateEmbeddedDocuments('Item', heldWeapons.map((item) => ({
            _id: item.id,
            'system.equipped': false,
         })));
      }

      // Drop the shield.
      if (this.getShield()) {
         await this.unEquipShield();
      }
   }
```

In `TitanActiveEffect.js`, add after `_preUpdate`:

```js
   /**
    * Performs follow-up logic after document creation, on every client. On the creating client, an Unconscious
    * condition on a Character makes it fall Unconscious (Prone, Incapacitated, dropped gear); the other clients receive
    * those changes as updates.
    * @override
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {string} userId - The id of the User who requested the creation.
    * @protected
    */
   _onCreate(data, options, userId) {
      super._onCreate(data, options, userId);
      if (
         userId === game.user.id &&
         this.type === 'condition' &&
         this.statuses.has('unconscious') &&
         this.parent?.system?.isCharacter
      ) {
         // _onCreate is synchronous; the follow-up updates run after it returns.
         this.parent.system.fallUnconscious();
      }
   }
```

In `CHANGELOG.md`, append to the `## Unreleased:` list:

```markdown
- Falling Unconscious also applies Prone and Incapacitated and unequips held weapons and shields; removing
  Unconscious leaves Prone and Incapacitated.
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/Unconscious.test.js tests/unit/Immunity.test.js`
Expected: PASS.

- [ ] **Step 5: Write the Unconscious e2e**

Create `tests/e2e/unconscious.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * Falling Unconscious applies Prone and Incapacitated once and drops the equipped weapon and shield; removing
 * Unconscious leaves Prone and Incapacitated.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Unconscious Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.beforeEach(async () => {
   // A fresh actor holding an equipped weapon and an equipped shield.
   await page.evaluate(async (name) => {
      await game.actors.getName(name)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name,
         type: 'player',
      });

      /** @type {TitanItem[]} The weapon and the shield. */
      const [, shield] = await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Held Sword',
            system: { equipped: true },
            type: 'weapon',
         },
         {
            name: 'E2E Held Shield',
            type: 'shield',
         },
      ]);
      await actor.system.equipShield(shield.id);
   }, ACTOR_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Reads the actor's conditions (with how many effects carry each) and held gear.
 * @returns {Promise<object>} The snapshot.
 */
function readActor() {
   return page.evaluate((name) => {
      /** @type {TitanActor} The actor. */
      const actor = game.actors.getName(name);

      /**
       * Counts the condition effects carrying a status.
       * @param {string} id - The status id.
       * @returns {number} The count.
       */
      const count = (id) => actor.effects.filter((effect) => effect.statuses.has(id)).length;
      return {
         incapacitated: count('incapacitated'),
         prone: count('prone'),
         shieldEquipped: actor.system.equipped.shield !== null,
         unconscious: count('unconscious'),
         weaponEquipped: actor.items.getName('E2E Held Sword').system.equipped,
      };
   }, ACTOR_NAME);
}

/**
 * Sets a condition on the actor.
 * @param {string} id - The condition id.
 * @param {boolean} active - Whether it should be active.
 * @returns {Promise<void>} Resolves once toggled.
 */
async function toggle(id, active) {
   await page.evaluate(({ name, conditionId, state }) => game.actors.getName(name)
      .toggleStatusEffect(conditionId, { active: state }), {
      conditionId: id,
      name: ACTOR_NAME,
      state: active,
   });
}

test('falling Unconscious adds Prone and Incapacitated and drops the held weapon and shield', async () => {
   expect(await readActor()).toEqual({
      incapacitated: 0,
      prone: 0,
      shieldEquipped: true,
      unconscious: 0,
      weaponEquipped: true,
   });

   await toggle('unconscious', true);
   await expect.poll(readActor, { message: 'Unconscious and its effects applied' }).toEqual({
      incapacitated: 1,
      prone: 1,
      shieldEquipped: false,
      unconscious: 1,
      weaponEquipped: false,
   });

   // Removing Unconscious leaves Prone and Incapacitated.
   await toggle('unconscious', false);
   await expect.poll(readActor, { message: 'Unconscious removed alone' }).toEqual({
      incapacitated: 1,
      prone: 1,
      shieldEquipped: false,
      unconscious: 0,
      weaponEquipped: false,
   });
});

test('an actor already Prone gains no second Prone', async () => {
   await toggle('prone', true);
   await expect.poll(async () => (await readActor()).prone).toBe(1);

   await toggle('unconscious', true);
   await expect.poll(readActor, { message: 'Unconscious applied' }).toMatchObject({
      incapacitated: 1,
      prone: 1,
      unconscious: 1,
   });
});
```

- [ ] **Step 6: Lint, full unit suite, build, e2e**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds;
`npm run test:e2e -- tests/e2e/unconscious.spec.js tests/e2e/reactive-armor-shield.spec.js
tests/e2e/reactive-weapon.spec.js tests/e2e/player-hud-effects-panel.spec.js` → all pass.

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git status --short
git add src/system/Conditions.js src/document/types/actor/types/character/CharacterDataModel.js \
   src/document/types/active-effect/TitanActiveEffect.js CHANGELOG.md tests/unit/Unconscious.test.js \
   tests/e2e/unconscious.spec.js
git commit -F - <<'EOF'
feat(conditions): Unconscious applies Prone and Incapacitated and drops held gear

On the creating client, an Unconscious condition makes the Character fall
Unconscious: Prone and Incapacitated are applied if absent and equipped
weapons and the shield are unequipped. Removing Unconscious removes neither.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 13: Rules journal typos (compendium module)

Works in `C:\FoundryVTT\V14\dev\foundryuserdata\Data\modules\titan-vttrpg-compendium`. `packs/**` there is the live
LevelDB that Foundry holds open: never stage, revert, or compile into it while Foundry runs.

**Files:**
- Modify: `src/packs/rules/Rules_Reference_mczts3I29Q5vaopp.json` (module repo)

**Interfaces:** none (content only).

- [ ] **Step 1: Branch in the module repo**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git log --oneline -1
git status --short -- . ':(exclude)packs'
```

Expected: branch `todo-closeout` at `d95c52b` (one commit ahead of `main` `8f8479b`; plan A's unmerged module work),
and no non-`packs/` changes. If the branch or head differs, stop and report it to the controller. Otherwise:

```bash
git switch -c conditions-and-rulings
```

(Creating a branch at the current head changes no files, so the live `packs/` churn does not block it.)

- [ ] **Step 2: Fix the two typos**

In `src/packs/rules/Rules_Reference_mczts3I29Q5vaopp.json`, use the Edit tool (never a shell substitution) to replace
the exact text

```
decrease by <strong>--¼</strong> of their total, rounded up.
```

with

```
decrease by <strong>-¼</strong> of their base value, rounded up.
```

and the exact text

```
within <strong>1 spac</strong>e increases
```

with

```
within <strong>1 space</strong> increases
```

Each old string occurs exactly once (verified 2026-09-29); the Edit tool fails if not. Stunned's text already reads
"decreases by -¼ of their base value, rounded up" (no change).

- [ ] **Step 3: Validate**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node -e "JSON.parse(require('fs').readFileSync('src/packs/rules/Rules_Reference_mczts3I29Q5vaopp.json','utf8')); console.log('json ok')"
grep -c "of their total" src/packs/rules/Rules_Reference_mczts3I29Q5vaopp.json
npm run check:links
npm run packs:compile -- src/packs .work/compiled-conditions
```

Expected: `json ok`; the `grep -c` prints `0`; `check:links` reports no broken links; the scratch compile finishes
without errors (it writes only under `.work/`, never the live `packs/`). Delete the scratch output with
`trash .work/compiled-conditions`.

- [ ] **Step 4: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/rules/Rules_Reference_mczts3I29Q5vaopp.json
git commit -F - <<'EOF'
fix(rules): Blinded reads "-1/4 of their base value"; Prone's "1 space" is whole

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

- [ ] **Step 5: Controller checkpoint — live packs**

The live `packs/` still carries the old journal text until it is recompiled, which needs Foundry stopped (the world
locks every pack LevelDB, and stopping the server is not available to agents). The controller asks the user to either
stop Foundry so `npm run packs:compile` (default `src/packs → packs`) can run and be verified in the test world, or to
authorize logging "recompile the module's live packs from `src/packs`" in `docs/TODO.md`. Nothing is deferred without
that answer.

---

### Task 14: Documentation, skill, memory, and full verification

**Files:**
- Modify: `docs/TODO.md`, `docs/CLOSED_BUGS.md`, `docs/POST_WORK_FINDINGS.md`,
  `docs/superpowers/specs/2026-09-27-conditions-rework-design.md`, `CHANGELOG.md`,
  `.claude/skills/titan-codebase/references/abstractions.md`, `.claude/skills/titan-codebase/references/architecture.md`,
  `.claude/skills/titan-codebase/references/data-flow.md`, `.claude/skills/titan-codebase/references/conventions.md`
- Modify (auto-memory, not in git): `C:\Users\emper\.claude\projects\C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan\memory\five-conditions-inert.md`
  and its line in `MEMORY.md`

- [ ] **Step 1: Backlog and bug records**

In `docs/TODO.md`, delete the whole "Conditions rework to the 2026-09-26 rules" bullet. Keep every other bullet
(the Google Sheets fixture, the compendium audit findings, applying caster/target-derived effects, and extending
immunity by trait). Add any item the user authorized deferring during this campaign (Task 13 Step 5, the open
questions), each with its authorization date.

Append to `docs/CLOSED_BUGS.md`:

```markdown
### 74. Migration Mode "Disabled" still ran the world migration

- **What:** `onceReady` ran `migrateWorld()` in the `else` branch of its prompt-mode test, so the "Disabled" choice
  migrated exactly like "Automatic", contradicting the setting's hint ("Disabled: skips migration entirely").
- **Found:** 2026-09-29 while planning the condition-effect sync (spec B, conditions rework).
- **Fixed:** 2026-09-29 — `resolveMigrationAction(mode, needsMigration)` (`src/helpers/migration/MigrateWorld.js`)
  maps the mode to none / migrate / prompt and `onceReady` switches on it. Gated by
  `tests/unit/MigrationAction.test.js` and `tests/e2e/condition-migration.spec.js` (a Disabled reload leaves a stale
  condition untouched).

### 75. Stat breakdowns never listed condition modifiers

- **What:** `ModifiableStatValueLabel` and `createModifiableStatTooltip` took one prop per modifier bucket and had no
  `condition` bucket, so no sheet or Player HUD stat tooltip showed a condition's penalty; the Speed and Mod rows also
  omitted Abilities, and the skill Training/Expertise tooltip hand-rolled its own partial breakdown.
- **Found:** 2026-09-29 while planning spec B's sheet-rating checks.
- **Fixed:** 2026-09-29 — the label takes the stat's `mod` object and the tooltip walks `MOD_BUCKET_LABELS`
  (`src/system/ModBuckets.js`), whose dynamic buckets `_resetDynamicMods` also reads. Gated by
  `tests/unit/ModBuckets.test.js` (bucket order, tooltip, and a scan rejecting any Svelte source that names a bucket)
  and `tests/e2e/stat-breakdown-conditions.spec.js`.
```

- [ ] **Step 2: Post-work findings**

Append to `docs/POST_WORK_FINDINGS.md`:

```markdown
### Condition effects are synced to their definitions on every GM load (2026-09-29)

A condition Active Effect keeps the rules elements and description copied at creation, so a changed definition in
`src/system/Conditions.js` reaches existing conditions only through `syncConditionEffects`
(`src/helpers/migration/SyncConditionEffects.js`), which the migration system runs. It matches an effect to its
definition by `effect.statuses`, compares with sorted-key JSON, and rewrites `system.rulesElement` and
`flags.titan.description`; an effect whose statuses name no system condition is left alone, and a GM who edits a
condition effect's rules elements by hand has that edit replaced on the next load. It covers world actors and
unlinked token actors (a version-chain step could not: an unlinked token inherits its base actor's
`documentVersion`). In Prompt mode a world with stale conditions shows the migration dialog on each GM load until the
GM confirms.

### Immunity suppression is separate from `disabled` (2026-09-29)

An immunity suppresses a condition or effect through the data models' `isSuppressed` (core then drops it from
`actor.statuses`), and `_applyRulesElements` skips only `system.isSuppressed` sources: `disabled` stays the gate for an
effect's own state, and core's duration expiry does not start suppressing TITAN effects. The sheet's effect rows and
the Player HUD effects panel still list a suppressed effect as active.

### Target distance is measured between the nearest occupied spaces (2026-09-29)

`measureTokenDistance` measures between the nearest grid spaces two tokens occupy with the scene grid's own
`measurePath` (its diagonal rule), in spaces; center to center would put an adjacent Large token 1.5 or 2 spaces away.
A gridless scene measures center to center. The attacker's token is `getActiveTokens(false, true)[0]` on the viewed
scene: with no canvas or no attacker token there, no distance-based Prone modifier applies.
```

- [ ] **Step 3: Spec as-built amendments**

Append to `docs/superpowers/specs/2026-09-27-conditions-rework-design.md`:

```markdown
## As built (2026-09-29)

- Immunities are `{ condition: Map, effect: Map }` of source lists (`{ id, name }`), not Sets: the refusal names the
  source and an immunity must skip the effect granting it. They are derived in `CharacterDataModel.prepareBaseData`,
  before core's `applyActiveEffects` reads `isSuppressed`, from the same source list as `_applyRulesElements`
  (`_getRulesElementSources`).
- Suppression is the data models' `isSuppressed` (true while immune, undefined otherwise so core's expiry test
  decides).
- The migration is an idempotent sync inside the migration system (`syncConditionEffects`), not a version-chain step,
  so Migration Mode governs it and unlinked token actors are covered; it also refreshes `flags.titan.description`.
  Migration Mode "Disabled" now skips migration (bug #74).
- Condition situations store `labelKey` without a localized `label`; the canonical situation strings live in
  `src/system/CanonicalSituations.js`.
- Off-Balance's id is `offBalance`.
- The rounding select lists `down`, `up`, `nearest`, so an element without a stored `rounding` shows and keeps the
  engine's default.
- The attack's target excludes the attacker's own token; distance is measured between the nearest occupied spaces;
  `options.targetConditions` carries both ratings' modifiers and `parameters.targetConditions` the applied ones; the
  Prone penalty beyond 10 spaces applies to Accuracy only.
- The module's Stunned text was already correct; Prone's split `<strong>1 spac</strong>e` was fixed with Blinded's.
- Stat breakdowns list condition modifiers (bug #75).
```

- [ ] **Step 4: titan-codebase skill (current state, not history)**

In `.claude/skills/titan-codebase/references/abstractions.md`:
(a) in the rules-element table, replace the `mulBase` row's second line
`` `up`/`down` `rounding` field for the scaled base. `` with
`` `rounding` field (`ROUNDING_DIRECTIONS`: down/up/nearest).``, and add a row after `createTurnMessageElement`:

```markdown
| `createImmunityElement`          | `immunity`                   | Make the character immune to a condition (key: id) |
|                                  |                              | or an effect (key: name, camel-case matched).      |
```

(b) after the table, add: "`RULES_ELEMENT_FACTORIES` (`src/document/types/item/rules-element/RulesElementFactories.js`)
maps every operation to its factory; `RULES_ELEMENT_OPERATIONS` is its key list, the operation select rebuilds a
retyped element through it, and `tests/unit/RulesElementOperationRegistry.test.js` pins the item sheet's editor
dispatch and the actor's bucket switch to it."
(c) replace the paragraph beginning "`CharacterDataModel._applyRulesElements` (called from `prepareDerivedData`)
applies rules elements from three sources" up to "There is no hardcoded condition `switch`; the old
`_applyConditions` method was retired. All feed the character's derived stats." with:

```markdown
`CharacterDataModel._getRulesElementSources()` lists every applying source in order: owned items (abilities always;
armor and shields while equipped in their slot; weapons and equipment while equipped), the equipped armor's trait
check rules (synthetic situational elements sourced as the armor), enabled `effect`-subtype Active Effects, then
enabled `condition`-subtype Active Effects. `_applyRulesElements` (called from `prepareDerivedData`) copies each
source's elements tagged with its bucket (`ability`/`equipment`/`effect`/`condition`) and name, skipping an Active
Effect whose `system.isSuppressed` is true (immunity). Condition mechanics derive entirely through this pipeline from
each condition's seeded `system.rulesElement` (see `Conditions.js`): "−¼ of base, rounded up" is `mulBase` 0.75
`rounding: 'up'`; check rules are `conditionalCheckModifier` elements (Frightened: Advantage −1 on every check;
Incapacitated/Restrained: Automatic Failure on Reflexes; Blinded/Deafened: situational Automatic Failure "Relies on
Sight"/"Relies on Hearing" on Perception checks, stored with `labelKey` only). The mod buckets are
`DYNAMIC_MOD_BUCKETS` (`src/system/ModBuckets.js`: equipment, effect, ability, condition, in `_applyMods` order) plus
the persisted `static`.

**Immunity.** `CharacterDataModel.prepareBaseData` sets `actor.immunities` (`_getImmunities`, read through the
`immunities` getter): `{ condition: Map<id, ImmunitySource[]>, effect: Map<camelName, ImmunitySource[]> }` gathered
from the same sources' `immunity` elements. `getImmunitySources(effect)` matches a condition by its statuses and an
effect by its camel-cased name, never the effect granting the immunity. `ConditionDataModel` and
`TitanActiveEffectDataModel` expose `isSuppressed` (`isSuppressedByImmunity`: true while immune, else undefined so
core's expiry test decides); core's `ActiveEffect#isSuppressed` reads it, so a suppressed condition leaves
`actor.statuses`. `TitanActiveEffect._preCreate` refuses an immune creation with `LOCAL.immuneToEffect` naming the
sources. Deferred: immunity by trait (docs/TODO.md).

**Unconscious.** `TitanActiveEffect._onCreate`, on the creating client, calls `CharacterDataModel.fallUnconscious()`
for an Unconscious condition: `UNCONSCIOUS_COMPANION_CONDITIONS` (Prone, Incapacitated) are toggled active, equipped
weapons unequipped, and the shield unequipped. Removing Unconscious removes neither.
```

(d) in the "Rules-element math" bullet, replace "`roundDirectional(value, rounding)` ceils on `'up'`, floors otherwise"
with "`roundDirectional(value, rounding)` ceils on `'up'`, rounds on `'nearest'` (`Math.round`), floors otherwise;
`ROUNDING_DIRECTIONS` lists the editor options, `down` first".
(e) in the "Labels" bullet, add after `ModifiableStatValueLabel`: "(takes the stat's `mod` object; its tooltip,
`createModifiableStatTooltip`, walks `MOD_BUCKET_LABELS`)".

In `.claude/skills/titan-codebase/references/architecture.md`, replace the `OnceSetup.js` and `OnceReady.js` bullets
with:

```markdown
- `OnceSetup.js` (Foundry `setup` hook) calls `setupConditions()` from `src/system/Conditions.js`. That module
  exports a pure `buildConditionDefinitions()` (no `game`/localize access, unit-tested) returning the static
  condition list (every entry `type: 'condition'`; every condition but Dead and Unconscious carries a
  `system.rulesElement` array), `CONDITION_IDS`, and `UNCONSCIOUS_COMPANION_CONDITIONS`; `setupConditions()`
  localize-sorts the definitions, adds `flags.titan.description`/`type`, and sets `CONFIG.statusEffects`.
- `OnceReady.js` (Foundry `ready` hook), for the GM, runs the one-shot effect-item→Active-Effect converter, then acts
  on `resolveMigrationAction(migrationMode, worldNeedsMigration())`: prompt → `ConfirmMigrateWorldDialog`, migrate →
  `migrateWorld()` (version chains, then the condition-effect sync), none → nothing (Disabled, or nothing pending).
  It then builds the Player HUD (so `game.titan.playerHud` marks a finished load) and registers `hotbarDrop`.
```

In `.claude/skills/titan-codebase/references/data-flow.md`:
(a) in the Migration system "Where it lives" list, add
"- `SyncConditionEffects.js` — `syncConditionEffects()` rewrites every stale condition Active Effect (world actors and
unlinked token actors) from `CONFIG.statusEffects` (rules elements and description); `conditionEffectsNeedSync()`
feeds `worldNeedsMigration()`."
(b) replace the "What triggers it" numbered item 2 (and its two sub-bullets) with:

```markdown
2. It then acts on `resolveMigrationAction(game.settings.get('titan', 'migrationMode'), worldNeedsMigration())`
   (`worldNeedsMigration()` is true for a pending version-chain step or a stale condition effect):
   - `'prompt'` → renders `ConfirmMigrateWorldDialog`, which calls `migrateWorld()` on GM confirmation.
   - `'migrate'` (Automatic mode) → awaits `migrateWorld()`: the version chains, then `syncConditionEffects()`.
   - `'none'` (Disabled mode, or nothing pending) → no migration.
```

(c) replace "Attack difficulty is `clamp(targetDefense - attackerRating + 4, 2, 6)`; with no target selected
`targetDefense` defaults to the attacker's own rating, yielding difficulty 4." with:

```markdown
Attack difficulty is `clamp(targetDefense - attackerRating + 4, 2, 6)`. The target is `_getAttackTargetToken()`: the
first targeted Character token other than the attacker's own (a GM with no target falls back to controlled tokens).
With no target, `targetDefense` defaults to the attacker's own rating (difficulty 4). With one,
`initializeAttackCheckOptions` also derives `targetConditions` (`TargetConditionModifiers.js`) from the target's
statuses and `measureTokenDistance` (nearest occupied spaces, scene grid rule): a Prone target within 1 space adds
`ceil(base × ¼)` to Melee and Accuracy, beyond 10 spaces subtracts `floor(base × ¼ × floor(d / 10))` from Accuracy
(never below 0), and an Incapacitated target fixes the Difficulty at 2 after `_applyCheckAdvantage`. The dialog pins a
target's Defense and conditions at open; `parameters.targetConditions` keeps the attack's rating's entries and the
Difficulty for the dialog row and the chat card.
```

In `.claude/skills/titan-codebase/references/conventions.md`, in the typed-key paragraph listing the
`TYPED_KEY_SELECTORS` entries, add "`immunity` (`effect`)" to the list, and in the situational check modifiers
paragraph add: "System situations (armor traits and conditions) are keyed by `CANONICAL_SITUATIONS`
(`src/system/CanonicalSituations.js`); a condition's situation stores only `labelKey`, which the situational cache
localizes."

- [ ] **Step 5: Auto-memory**

Replace the body of the memory file `five-conditions-inert.md` (keep its frontmatter keys) with a description line
"dead stays mechanically inert; deafened, frightened, incapacitated, unconscious now carry 09_26 mechanics (2026-09-29
conditions rework)." and this body:

```markdown
2026-06-01 ruling (fe5a7668): "incapacitated, unconscious, frightened, deafened, dead are mechanically inert."
Superseded on 2026-09-27 for the 09_26 conditions rework: Frightened, Incapacitated and Unconscious may carry mechanics,
and Deafened (with Blinded) auto-fails Awareness/Perception checks as a situational modifier. Dead stays inert.

**Why:** the 09_26 rules give these conditions real mechanics; spec B (2026-09-27) implemented them.
**How to apply:** Dead has no mechanics; ask before adding any. The rest are defined in `src/system/Conditions.js`.
Related: [[rules-element-sum-operations]].
```

and update its `MEMORY.md` line to
`- [Five conditions inert](five-conditions-inert.md) — only Dead stays inert; Deafened/Frightened/Incapacitated/Unconscious carry 09_26 mechanics (2026-09-29).`

- [ ] **Step 6: Graph and full verification**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
graphify update .
npm run eslint
npm run stylelint
npm test
npm run build
```

Expected: 0 lint errors; every unit test passes (read the Vitest summary); the build succeeds. Then run the full e2e
suite in the background, writing to the debug sink: `npm run test:e2e > debug/dumps/e2e-full.log 2>&1` with
`run_in_background`, and read Playwright's own passed/failed/flaky counts from the log (never an exit code through a
pipe). Every failure is fixed before the commit (a failure is treated as an implementation defect first). Record the
unit and e2e counts in the task report, then `trash debug/dumps/e2e-full.log`.

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git status --short
git add docs/TODO.md docs/CLOSED_BUGS.md docs/POST_WORK_FINDINGS.md \
   docs/superpowers/specs/2026-09-27-conditions-rework-design.md CHANGELOG.md \
   .claude/skills/titan-codebase/references/abstractions.md .claude/skills/titan-codebase/references/architecture.md \
   .claude/skills/titan-codebase/references/data-flow.md .claude/skills/titan-codebase/references/conventions.md
git commit -F - <<'EOF'
docs: conditions rework — backlog, bugs 74-75, findings, spec as-built, skill

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

(`git add .claude/skills/...` stages only those four files; the other `.claude/*` working-tree changes stay unstaged.
`graphify-out/` is untracked (`git ls-files graphify-out` is empty, checked 2026-09-29), so the graph update stages
nothing.)

---

## Self-Review

**Spec coverage (spec B → task):**

| Spec B | Task |
|---|---|
| §1 Blinded/Contaminated/Off-Balance/Prone/Restrained/Stunned stat rules; Off-Balance definition, icon, localization; `.desc` text | 2 |
| §1 Blinded/Deafened sense situations, Frightened, Incapacitated/Restrained Reflexes | 4 |
| §1 Incapacitated/Prone target-side | 10, 11 |
| §1 Unconscious | 12 |
| §1 uuids `condition-<id>-<stat>` | 2, 4 (guard test) |
| §2 `nearest` rounding, editors, `down` default | 1 |
| §3 target statuses, distance, Prone ±, Incapacitated Difficulty 2 after Advantage, recorded + card + dialog | 10, 11 |
| §4 Unconscious on creating client, Prone/Incapacitated if absent, unequip weapons/shield, removal keeps them | 12 |
| §5 `immunity` operation, condition/effect selectors, camel-case names | 8 |
| §5 pre-pass, refusal notification, suppression, never self-suppress | 7, 9 |
| §5 editor `ItemSheetImmunitySettings.svelte` | 8 |
| §6 migration, world + unlinked token actors | 5 |
| §7 module journal typos | 13 |
| Testing: definitions per condition, mulBase 0.75 bases 1-8, stacked Blinded + Off-Balance, nearest, immunity, Prone table | 1, 2, 9, 10 |
| Testing e2e: ratings per condition, Frightened Difficulty, Incapacitated attack Difficulty 2, Unconscious, immunity effect, migration | 2, 3, 4, 5, 9, 11, 12 |
| Documentation: TODO, skill, memory | 14 |

Additions beyond spec B's text, each required by it or found while planning: bug #74 (Migration Mode Disabled, Task 5,
blocks the spec's migration from obeying the setting), bug #75 (condition bucket missing from breakdowns, Task 3, the
spec's "sheet's ratings" check), the operation registry (Task 6, so the new operation cannot drift from its four
lists), the source list (Task 7, so immunity and application read the same sources), and the effect-tray count fix
(Task 9, refused copies were reported as applied).

**Placeholder scan:** every step names exact files and carries the complete code or the exact text to replace; no
"TBD", "similar to", or unwritten tests. Task 13 Step 5 and the open questions are controller checkpoints that ask
the user; they defer nothing.

**Type consistency:** `ROUNDING_DIRECTIONS` (Task 1) is read by both editors and the rounding e2e.
`createQuarterBasePenalty` / `createSenseAutomaticFailure` / `createReflexesAutomaticFailure` are module-private in
`Conditions.js`; `CONDITION_IDS` (Task 8) and `UNCONSCIOUS_COMPANION_CONDITIONS` (Task 12) are its exports.
`DYNAMIC_MOD_BUCKETS` / `MOD_BUCKET_LABELS` / `getInnateModTotal` (Task 3) are used by `_resetDynamicMods`, the tooltip,
the label, and the skill row. `CANONICAL_SITUATIONS` moves in Task 4 and is imported by the armor module, Conditions.js,
and the localization test. `RULES_ELEMENT_FACTORIES` (Task 6) gains `immunity` in Task 8. `RulesElementSource` /
`_getRulesElementSources` (Task 7) feed `_applyRulesElements` (Task 7) and `_getImmunities` (Task 9); Task 9 adds the
`source.effect?.system.isSuppressed` skip. `ImmunitySource` / `Immunities` / `getImmunitySources` /
`isSuppressedByImmunity` (Task 9) are used by both data models and `TitanActiveEffect._preCreate`.
`TargetConditionModifier` and its helpers (Task 10) are used by `AttackCheckOptions`/`AttackCheckParameters`,
`initializeAttackCheckOptions`, `getAttackCheckParameters`, and both Svelte components (Task 11).
`getTargetedCharacterTokens` (Task 10) replaces the last `getTargetedCharacters` use in `CharacterDataModel`
(Task 11); `GetBestCharactersToUpdate` keeps `getTargetedCharacters`. `fallUnconscious` (Task 12) is called only by
`TitanActiveEffect._onCreate`.

**Review Focus mapping:** 1 → Tasks 10 (table: 10 vs 11 spaces, Accuracy 0, rounds-to-0) and 11 (e2e 1 and 21
spaces); 2 → Task 11 unit test "never reads the attacker's own controlled token"; 3 → Task 9 unit and e2e; 4 → Task 5
unit (idempotence, key order, custom status, token actors) and e2e; 5 → Task 12 unit and e2e; 6 → Task 11 schema golden
and Incapacitated-with-Disadvantage unit and e2e; 7 → Tasks 2 (stacked Defense 8 → 4) and 1 (contribution vs result
rounding).
