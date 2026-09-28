# Advantage, Disadvantage, Situational Modifiers, and Resistance-Check Modifiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Checks gain Advantage/Disadvantage, Automatic Failure, and opt-in situational modifiers; Resistance checks
read conditional check modifiers; the Heavy, Encumbering, and Loud armor traits apply their check rules; the
check-options setting becomes never / situational / always.

**Architecture:** Two new `conditionalCheckModifier` types (`advantage`, `automaticFailure`) flow through the existing
summed cache into check options exactly like `diceMod`. A new `situation` selector routes elements into a separate
cache that `getSituationalCheckModifiers` exposes to the check dialog as checkboxes; ticked keys ride on
`options.situations` and are added at parameter time. A pure `applyAdvantage` helper turns the summed level into the
post-Advantage Difficulty after every other Difficulty rule. Chat schemas grow from the shared parameter shapes;
legacy messages fill `baseDifficulty` in `migrateData`.

**Tech Stack:** Foundry VTT v14 (ApplicationV2), JavaScript, Svelte 5 (runes), SCSS, Vitest (happy-dom), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-advantage-disadvantage-design.md` (spec A, user-approved 2026-09-27).
Executors read it alongside this plan. Its consumers are
`docs/superpowers/specs/2026-09-27-conditions-rework-design.md` (spec B: Frightened `advantage` -1 any/any,
Incapacitated/Restrained `automaticFailure` on Resistance `reflexes`, Blinded/Deafened `automaticFailure` situations
narrowed to `perception`) and `docs/superpowers/specs/2026-09-27-compendium-rulings-design.md` (spec C: a `weapon`
selector on attack checks keyed by weapon name, added to `USER_KEYED_CHECK_MODIFIER_SELECTORS`; Abyssal Darkness
Greater Advantage as a situational `advantage` +2). Do not implement B or C here; the interfaces below are shaped for
them.

**Branch:** `todo-closeout`. Do not switch branches. The working tree carries unrelated user changes (`.claude/*`,
deleted `CLAUDE.md`, images, untracked rules documents): never stage them. Stage only the files each task lists.

**Iron rule — every implementer, reviewer, and fix dispatch prompt the executor writes MUST contain this paragraph
verbatim:**

> Invoke the core skill immediately. The iron rule is no deferrals of existing work, or new work as it comes up - we fix this now unless I give my EXPRESS authorization. The only exception is if a bug or to-do has a genuine blocker that is already logged in a milestone in PLAN.md that has not been started yet. Another iron clad is rule is that when faced with a design fork, determine the best long term shape in keeping with our plans and goals, and implement accordingly. You only need to ask me if the question "what is the best long term shape in keeping with our plans and goals?" is not able to answer the question. Churn is not a concern. This paragraph must be copied verbatim to any agents dispatched in this campaign.

"The core skill" is the `titan-codebase` skill (`.claude/skills/titan-codebase/SKILL.md` + `references/*.md`).
Every dispatch also loads `foundry-vtt`; Tasks 2, 6, 7, and 8 (Svelte) also load `svelte-5` and `foundry-svelte`.

---

## Global Constraints

- Project style (`.claude/claude.md`, ESLint-enforced): 120-character lines; braces on every conditional (`case x: {`
  blocks too); objects with more than one property and arrays with more than one entry are multi-line (tests
  included); trailing commas on multi-line literals; 3-space indent; every variable typed and given a one-line
  comment; every function has full JSDoc with typed params and returns; present-tense comments with no history or
  process meta; clean stale comments in any scope you touch.
- No `:global` CSS, no dynamic `import()` in `src/`, no `console.log`, no test code in shipping builds.
- Rules source (`docs/TITAN Rules Compendium - Source - 09_26_2026.md`): Advantage lowers the Difficulty by 1 (min 2),
  Disadvantage raises it by 1 (max 6), two or more sources are Greater (±2), Advantage and Disadvantage cancel
  (lines 1737-1759); Encumbering: Disadvantage to Swim, Fly, or Climb (2765); Loud: Disadvantage to remain undetected
  by hearing (2770); Heavy: Greater Disadvantage to Swim, Fly, or Climb, cannot Jump (2775); a Jump check is Body
  (Athletics) (2300).
- Advantage math: `net = clamp(sum, -2, 2)`; `net > 0` → `max(2, difficulty - net)` unless the Difficulty is already
  below 2; `net < 0` → `min(6, difficulty - net)` unless already above 6; `net === 0` → unchanged.
- Check-type names used as modifier check types and in `getSituationalCheckModifiers`: `attribute`, `resistance`,
  `attack`, `casting`, `item` (the editor offers `any`, `attack`, `casting`, `item`, `resistance`).
- Setting `titan.getCheckOptions` (client scope): `never` | `situational` (default) | `always`; a stored Boolean
  reads `true` → `always`, `false` → `situational`, and any other value outside the choices reads `situational`.
- Localization: TITAN strings are flat `"<key>.text"` entries inside `lang/en.json` → `LOCAL`, inserted in
  alphabetical order; settings strings live under `SETTINGS.getCheckOptions`. Every new visible label gets an entry
  in the task that first renders it.
- Every task ends, in this order: `npm run eslint` (0 errors), `npm run stylelint` when a `.svelte`/`.scss` file
  changed, `npm test` (all green), `npm run build`, then the task's e2e specs with
  `npm run test:e2e -- <spec paths>` from a foreground shell (the live Foundry at http://localhost:30000 serves this
  directory's `dist/`, so build first). Read Playwright's own pass/fail counts; never trust an exit code through a
  pipe.
- E2E rules: log in only as `E2E GM 1`/`E2E GM 2`/`E2E Player 1`/`E2E Player 2` (never `Gamemaster`; one live session
  per user); every absence assertion is a presence→absence transition on the same resolved subject (or follows a
  happens-after positive edge); no fixed sleeps (`expect.poll`, web-first assertions, `titanWait`); chat locators are
  scoped to `#chat .message[data-message-id="…"]`; sheet locators to `.application.titan-document-sheet`; CSS changes
  are verified by live `getComputedStyle` against resolved theme tokens.
- Serial execution: tasks share one working tree, one git index, one `dist/`, one live Foundry. Never parallelize.
- Commits: before each commit run `git branch --show-current` (must print `todo-closeout`) and `git status --short`
  (stage only the task's listed files; never `packs/**`). Every commit message ends with exactly:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
  ```

## Spec-versus-code resolutions (decided under the iron rule's best-long-term-shape clause)

1. **No `acrobatics` skill exists** (`src/system/Skills.js`): the armor-trait situations are narrowed to Athletics
   and Stealth, matching spec §6.
2. **`sources: string[]` replaces the spec's `source` string** on `SituationalCheckModifier`: same-key entries sum
   across owners (Heavy + Encumbering on one armor, or armor + an effect), so one entry can have several sources.
3. **`parameters.situations` is `{ key, label }[]`**, not `string[]`. `buildSchemaFromShape` maps an empty array to an
   `ArrayField(ObjectField)`, which rejects strings; objects also let the card show labels without an actor lookup.
   `options.situations` stays `string[]` (ticked keys), as the spec says.
4. **Modifier types are filtered per check type** (`CHECK_TYPE_MODIFIER_TYPES`): an `any`-check situational Damage
   modifier is not offered on an Attribute Check, which has no Damage. The same table drives the editor in both
   directions (spec §5): the check-type options offer only check types that read the element's modifier type
   (replacing the hand-written `healingCheckTypeOptions` list), and the modifier-type options offer only the types
   the element's check type reads (every type for `any`), so the editor cannot build a combination no check reads.
5. **The editor's check-type/selector reset becomes a membership test** (`selectorOptions[checkType].includes(...)`).
   The old condition kept `attribute` when switching to a check type without it (would break `resistance`) and
   dropped `skill` when switching to `any`, which offers it.
6. **Legacy `baseDifficulty` comes from `CheckChatMessageDataModel.migrateData`**: a schema initial cannot read another
   field. The other new parameters take their schema initials (0 / false / []).
7. **A stored legacy Boolean setting is rewritten at init** to its mapped choice (as well as mapped at read time), so
   the settings window's select shows a valid option.
8. **`automaticFailure` elements count as 1 in every cache** whatever their stored `value`, honoring "its `value` is
   unused" even for hand-authored pack data.
9. **Automatic Failure keeps the dice and the critical counts**; only `successes`, `extraSuccesses`, and `succeeded`
   are forced (the spec defines only those).
10. **The check dialog gains an effective-Difficulty summary** (`check-summary-difficulty`, labeled "Effective
    Difficulty"): the spec's e2e requires the displayed Difficulty to change, and Attack dialogs show no Difficulty
    at all today.
11. **A caller-supplied `options.situations` is honored on every roll path.** Nothing is applied automatically — a
    situational entry applies only when a caller names its key — and the check dialog is the only UI that ticks them;
    a macro or module that passes `situations` to `roll<Type>Check` or `request<Type>Check` has them applied like any
    other option it passes. Spec A §4 ("a check rolled without the dialog applies none") is amended in Task 10.
12. **An automatically failed card offers no action that could change its outcome.** The chat log's Re-roll
    Failures, Double Training, and Double Expertise entries, the reset-Expertise button, and per-die Expertise are
    withheld on it, and no die is styled as a success (Task 2). Recalculation still keeps the result forced (spec §3)
    for every path that reaches it.
13. **The editor's Skill narrowing is offered only for non-Resistance situations.** A Resistance Check has no Skill,
    so a Skill-narrowed Resistance situation would never be offered; the Skill select is hidden for check type
    `resistance` and the stored `skill` is cleared when the check type becomes `resistance`, and every selector
    change clears it (Task 8).

## Review Focus

1. A situation ticked in the dialog, then made inapplicable by changing the dialog's Skill, must not apply to the roll
   or appear on the card (unit test in Task 3, e2e in Task 9).
2. Opposing sources that net to zero (+1 and -1) leave the Difficulty unchanged (unit test and parameter e2e in
   Task 3) and show no Advantage tag on the card (card e2e in Task 7, anchored after the DC renders).
3. Recalculating an automatically failed card (the re-roll and Expertise paths) keeps it at 0 successes, and a
   Resistance card still reduces no damage (unit test in Task 2); the card itself withholds those actions and styles
   no die as a success (e2e in Task 2, against a normal card).
4. Partial chat-message update diffs (a results-only or advantage-only update) must not gain an `undefined`
   `baseDifficulty` from `migrateData` (unit test in Task 2).
5. A Difficulty already at 6 stays 6 under Disadvantage and one at 2 stays 2 under Advantage (`applyAdvantage` table
   in Task 1; `_applyCheckAdvantage` in Task 2). Through `getAttackCheckParameters`, Advantage applies after the
   rating clamp (a rating Difficulty of 9 clamps to 6, then Advantage makes it 5), and `getCastingCheckParameters`
   and `getItemCheckParameters` apply it too (unit tests in Task 2).
6. The rules-element editor never writes a value the four-level select cannot show (a stored 0 or ±3 displays as its
   normalized level and is not rewritten), and modifier types and check types filter each other (e2e in Task 8).
7. The check dialog follows the Actor while open: removing the effect behind a ticked situation removes its row and
   its contribution to the displayed Difficulty (e2e in Task 6).
8. Every label the plan adds exists in `lang/en.json` (`tests/unit/CheckModifierLocalizationKeys.test.js`, extended
   by each task that adds keys).

## Model/Effort directives

- Plan writer: `sdd-plan-writer-opus` (dispatched; this document).
- Execution: subagent-driven development, with the mainline session running the dispatch loop itself (no
  `sdd-dispatcher` delegation). Tasks run strictly serially.
- Implementer default: `sdd-implementer` (Sonnet, medium). Escalation ladder when an implementer reports BLOCKED or
  DONE_WITH_CONCERNS citing complexity: `sdd-implementer-highthink` → `sdd-implementer-opus` → the human. Never skip a
  rung. A fix dispatch reuses the tier that produced the task.
- Haiku-eligible (pure transcription into 1-2 files): Task 1 may dispatch `sdd-implementer-haiku`.
- Per-task reviewer: `sdd-reviewer`. Escalate to `sdd-reviewer-opus` for Tasks 2, 3, 5, and 6 (multi-file schema,
  cache, setting-semantics, and Svelte diffs), and for any task whose `sdd-reviewer` findings read shallow or
  uncertain.
- Final whole-branch review: `sdd-final-reviewer`, once, after Task 10.
- Dispatch without `name:` (the subagent's final plain-text message is the report). Each prompt names the task, this
  plan's path, the spec's path, the iron-rule paragraph verbatim, and the skills to load.

## Buddy-check directives

- Plan buddy check: done 2026-09-28, two Opus reviewers, converged in 3 rounds with no unresolved disagreements; 24
  agreed findings (5 Important, 19 Minor) folded in.
- Flagged tasks: none — the per-task reviews follow the Model/Effort directives.
- Unflagged tasks showing risk signals: ask.

---

## File Structure

Create:

- `src/check/ApplyAdvantage.js` — pure Advantage math, level labels, level options (Task 1).
- `src/check/dialog/CheckDialogAdvantageField.svelte`, `CheckDialogAutomaticFailureField.svelte`,
  `CheckDialogDifficultySummary.svelte`, `CheckDialogSituationsField.svelte` — dialog rows (Task 6).
- `src/check/dialog/GroupSituationalModifiers.js` — pure grouping/description for the situations checkboxes (Task 6).
- `src/helpers/utility-functions/ResolveCheckOptionsMode.js` — legacy-aware setting resolver (Task 5).
- `src/document/types/item/types/armor/ArmorTraitCheckModifiers.js` — synthetic armor-trait elements (Task 9).
- Tests: `tests/unit/check/apply-advantage.test.js`, `tests/unit/check/check-options-defaults.test.js`,
  `tests/unit/CheckChatMessageDataModel.test.js`, `tests/unit/CharacterCheckModifiers.test.js`,
  `tests/unit/ConditionalCheckModifierTypes.test.js`, `tests/unit/ShouldGetCheckOptions.test.js`,
  `tests/unit/check/group-situational-modifiers.test.js`, `tests/unit/ArmorTraitCheckModifiers.test.js`,
  `tests/unit/CheckModifierLocalizationKeys.test.js`,
  `tests/e2e/check-advantage.spec.js`, `tests/e2e/resistance-check-modifiers.spec.js`,
  `tests/e2e/check-options-setting.spec.js`, `tests/e2e/check-dialog-advantage.spec.js`,
  `tests/e2e/rules-element-check-modifier-editor.spec.js`, `tests/e2e/armor-trait-situations.spec.js`.

Modify:

- `src/check/Check.js`, `src/check/CheckResults.js`, `src/check/chat-message/CheckChatMessageDataModel.js`,
  `src/check/chat-message/CheckChatResults.svelte`, `src/check/chat-message/CheckChatMessageDie.svelte`,
  `src/hooks/OnGetChatLogEntryContext.js`, `src/check/dialog/CheckDialogShell.svelte`,
  `src/check/dialog/CheckDialogBase.svelte`.
- `src/check/types/{attribute,resistance,attack,casting,item}-check/*CheckOptions.js`, `*CheckParameters.js`,
  `dialog/*CheckDialog.js`, `dialog/*CheckDialogShell.svelte`.
- `src/document/types/actor/types/character/CharacterDataModel.js`.
- `src/system/ConditionalCheckModifierTypes.js`, `src/system/SystemSettings.js`,
  `src/helpers/utility-functions/ShouldGetCheckOptions.js`.
- `src/document/types/item/rules-element/ConditionalCheckModifier.js`,
  `src/document/types/item/sheet/rules-element/ItemSheetConditionalCheckModifierSettings.svelte`,
  `src/document/svelte-components/select/DocumentSelect.svelte`.
- `lang/en.json`; existing tests named per task (including the `tests/e2e/checkDialog.js` helpers); `docs/TODO.md`,
  `docs/POST_WORK_FINDINGS.md`, `docs/superpowers/specs/2026-09-27-advantage-disadvantage-design.md` (spec A),
  `.claude/skills/titan-codebase/references/*.md`.

---

### Task 1: `applyAdvantage` helper

**Files:**
- Create: `src/check/ApplyAdvantage.js`
- Test: `tests/unit/check/apply-advantage.test.js`

**Interfaces:**
- Consumes: `clamp(value, min, max)` from `~/helpers/utility-functions/Clamp.js`.
- Produces: `default applyAdvantage(difficulty: number, advantage: number): number`;
  `clampAdvantage(advantage: number): number`; `getAdvantageLabel(advantage: number): string` (localization key:
  `greaterDisadvantage` | `disadvantage` | `noAdvantage` | `advantage` | `greaterAdvantage`);
  `MAX_ADVANTAGE_LEVEL = 2`; `ADVANTAGE_LEVEL_OPTIONS` (five `{ value, label }`, -2…2);
  `ADVANTAGE_ELEMENT_LEVEL_OPTIONS` (the four non-zero levels).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/check/apply-advantage.test.js`:

```js
import { describe, it, expect } from 'vitest';
import applyAdvantage, {
   ADVANTAGE_ELEMENT_LEVEL_OPTIONS,
   ADVANTAGE_LEVEL_OPTIONS,
   clampAdvantage,
   getAdvantageLabel,
} from '~/check/ApplyAdvantage.js';

describe('applyAdvantage', () => {
   it.each([
      {
         difficulty: 4,
         advantage: 0,
         expected: 4,
      },
      {
         difficulty: 4,
         advantage: 1,
         expected: 3,
      },
      {
         difficulty: 4,
         advantage: 2,
         expected: 2,
      },
      {
         difficulty: 4,
         advantage: 3,
         expected: 2,
      },
      {
         difficulty: 3,
         advantage: 2,
         expected: 2,
      },
      {
         difficulty: 2,
         advantage: 1,
         expected: 2,
      },
      {
         difficulty: 1,
         advantage: 1,
         expected: 1,
      },
      {
         difficulty: 7,
         advantage: 1,
         expected: 6,
      },
      {
         difficulty: 4,
         advantage: -1,
         expected: 5,
      },
      {
         difficulty: 4,
         advantage: -2,
         expected: 6,
      },
      {
         difficulty: 4,
         advantage: -5,
         expected: 6,
      },
      {
         difficulty: 5,
         advantage: -2,
         expected: 6,
      },
      {
         difficulty: 6,
         advantage: -1,
         expected: 6,
      },
      {
         difficulty: 7,
         advantage: -1,
         expected: 7,
      },
      {
         difficulty: 1,
         advantage: -1,
         expected: 2,
      },
   ])('Difficulty $difficulty with Advantage $advantage becomes $expected', ({ difficulty, advantage, expected }) => {
      expect(applyAdvantage(difficulty, advantage)).toBe(expected);
   });
});

describe('clampAdvantage and getAdvantageLabel', () => {
   it('caps a summed Advantage at Greater in either direction', () => {
      expect(clampAdvantage(-3)).toBe(-2);
      expect(clampAdvantage(3)).toBe(2);
      expect(clampAdvantage(1)).toBe(1);
   });

   it('names the clamped level', () => {
      expect(getAdvantageLabel(0)).toBe('noAdvantage');
      expect(getAdvantageLabel(-1)).toBe('disadvantage');
      expect(getAdvantageLabel(-5)).toBe('greaterDisadvantage');
      expect(getAdvantageLabel(1)).toBe('advantage');
      expect(getAdvantageLabel(4)).toBe('greaterAdvantage');
   });

   it('offers five dialog levels and the four non-zero element levels', () => {
      expect(ADVANTAGE_LEVEL_OPTIONS.map((option) => option.value)).toEqual([
         -2,
         -1,
         0,
         1,
         2,
      ]);
      expect(ADVANTAGE_ELEMENT_LEVEL_OPTIONS.map((option) => option.value)).toEqual([
         -2,
         -1,
         1,
         2,
      ]);
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/check/apply-advantage.test.js`
Expected: FAIL — cannot resolve `~/check/ApplyAdvantage.js`.

- [ ] **Step 3: Write the implementation**

Create `src/check/ApplyAdvantage.js`:

```js
import clamp from '~/helpers/utility-functions/Clamp.js';

/**
 * The strongest Advantage or Disadvantage a check can have: two or more sources make it Greater (±2), never more.
 * Source: TITAN Rules Compendium (09_26_2026), lines 1737-1759.
 * @type {number}
 */
export const MAX_ADVANTAGE_LEVEL = 2;

/**
 * The five Advantage levels a check dialog offers, from Greater Disadvantage to Greater Advantage. Labels are
 * localization keys.
 * @type {ReadonlyArray<{value: number, label: string}>}
 */
export const ADVANTAGE_LEVEL_OPTIONS = Object.freeze([
   {
      value: -2,
      label: 'greaterDisadvantage',
   },
   {
      value: -1,
      label: 'disadvantage',
   },
   {
      value: 0,
      label: 'noAdvantage',
   },
   {
      value: 1,
      label: 'advantage',
   },
   {
      value: 2,
      label: 'greaterAdvantage',
   },
]);

/**
 * The four levels an `advantage` rules element stores: every dialog level except none.
 * @type {ReadonlyArray<{value: number, label: string}>}
 */
export const ADVANTAGE_ELEMENT_LEVEL_OPTIONS = Object.freeze(
   ADVANTAGE_LEVEL_OPTIONS.filter((option) => option.value !== 0),
);

/**
 * Clamps a summed Advantage to the levels the rules allow, Greater Disadvantage to Greater Advantage.
 * @param {number} advantage - The sum of every Advantage (+) and Disadvantage (-) source.
 * @returns {number} The applied level, from -2 to 2.
 */
export function clampAdvantage(advantage) {
   return clamp(advantage, -MAX_ADVANTAGE_LEVEL, MAX_ADVANTAGE_LEVEL);
}

/**
 * Gets the localization key naming a summed Advantage's applied level.
 * @param {number} advantage - The sum of every Advantage (+) and Disadvantage (-) source.
 * @returns {string} The key of the clamped level's label (`noAdvantage` for 0).
 */
export function getAdvantageLabel(advantage) {
   /** @type {number} The applied level. */
   const level = clampAdvantage(advantage);
   return ADVANTAGE_LEVEL_OPTIONS.find((option) => option.value === level).label;
}

/**
 * Applies a summed Advantage to a check's Difficulty. Advantage lowers the Difficulty by its level to a minimum of 2;
 * Disadvantage raises it by its level to a maximum of 6; the two cancel through the sum. A Difficulty already past the
 * bound in the direction of the change is left unchanged, so Advantage never raises a Difficulty and Disadvantage never
 * lowers one. Source: TITAN Rules Compendium (09_26_2026), lines 1737-1759.
 * @param {number} difficulty - The Difficulty before Advantage.
 * @param {number} advantage - The sum of every Advantage (+) and Disadvantage (-) source.
 * @returns {number} The Difficulty after Advantage.
 */
export default function applyAdvantage(difficulty, advantage) {
   /** @type {number} The applied level, capped at Greater. */
   const net = clampAdvantage(advantage);

   // Advantage lowers the Difficulty toward 2.
   if (net > 0) {
      return difficulty < 2 ? difficulty : Math.max(2, difficulty - net);
   }

   // Disadvantage raises the Difficulty toward 6.
   if (net < 0) {
      return difficulty > 6 ? difficulty : Math.min(6, difficulty - net);
   }

   return difficulty;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/check/apply-advantage.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Lint, full unit suite, build**

Run: `npm run eslint` → 0 errors; `npm test` → all pass; `npm run build` → succeeds. No e2e spec exercises this
helper yet (it has no runtime consumer until Task 2).

- [ ] **Step 6: Commit**

```bash
git branch --show-current
git status --short
git add src/check/ApplyAdvantage.js tests/unit/check/apply-advantage.test.js
git commit -F - <<'EOF'
feat(check): add the applyAdvantage Difficulty helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 2: Advantage, Automatic Failure, and situations in check options, parameters, results, and chat schemas

**Files:**
- Modify: `src/check/Check.js` (typedefs)
- Modify: `src/check/types/attribute-check/AttributeCheckOptions.js`,
  `src/check/types/resistance-check/ResistanceCheckOptions.js`, `src/check/types/attack-check/AttackCheckOptions.js`,
  `src/check/types/casting-check/CastingCheckOptions.js`, `src/check/types/item-check/ItemCheckOptions.js`
- Modify: `src/check/types/attribute-check/AttributeCheckParameters.js`,
  `src/check/types/resistance-check/ResistanceCheckParameters.js`,
  `src/check/types/attack-check/AttackCheckParameters.js`, `src/check/types/casting-check/CastingCheckParameters.js`,
  `src/check/types/item-check/ItemCheckParameters.js`
- Modify: `src/check/CheckResults.js`, `src/check/chat-message/CheckChatMessageDataModel.js`
- Modify: `src/check/chat-message/CheckChatMessageDie.svelte`, `src/check/chat-message/CheckChatResults.svelte`,
  `src/hooks/OnGetChatLogEntryContext.js`
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Modify tests: `tests/unit/CheckChatMessageSchemaEquivalence.test.js`, `tests/unit/check/check-shape-parity.test.js`,
  `tests/unit/check/calculate-check-results.test.js`, `tests/unit/check/type-results.test.js`,
  `tests/e2e/checkDialog.js`
- Create tests: `tests/unit/check/check-options-defaults.test.js`, `tests/unit/CheckChatMessageDataModel.test.js`,
  `tests/unit/CharacterCheckModifiers.test.js`, `tests/e2e/check-advantage.spec.js`

**Interfaces:**
- Consumes: `applyAdvantage` (Task 1); `showChatLog(page)` (`tests/e2e/world.js`).
- Produces: every `create<Type>CheckOptions` returns `advantage: number` (default 0), `automaticFailure: boolean`
  (default false), `situations: string[]` (default []). Every `create<Type>CheckParametersShape` gains
  `advantage: 0`, `automaticFailure: false`, `baseDifficulty: 0` (attack: 4), `situations: []`; every
  `create<Type>CheckParameters` copies `advantage` and `automaticFailure` from the options.
  `calculateCheckResults` honors `parameters.automaticFailure`. `CheckChatMessageDataModel.migrateData(source)`.
  `CharacterDataModel._applyCheckAdvantage(parameters): void` (sets `baseDifficulty`, then the post-Advantage
  `difficulty`), called last in all five `get<Type>CheckParameters`. Typedef `SituationLabel` (`{ key, label }`) in
  `src/check/Check.js`. An automatically failed card withholds the chat-log Re-roll Failures / Double Training /
  Double Expertise entries, the reset-Expertise button, and per-die Expertise, and styles every die as a failure (a 1
  as a critical failure). Test helpers `createModel(rulesElementsCache)` and `createItemModel(itemRollData)` in
  `tests/unit/CharacterCheckModifiers.test.js`. `readNewestCheckFlags(page, baseline, type?)` in
  `tests/e2e/checkDialog.js` gains the optional subtype filter and returns `{ id, type, parameters, results }`. E2E
  helpers `rollAttributeCheck(targetPage, options)`, `seedEffect(targetPage, rulesElement)`,
  `checkModifierElement(overrides)`, and `readChatContextMenu(card)` in `tests/e2e/check-advantage.spec.js`.

- [ ] **Step 1: Write the failing unit tests**

(a) In `tests/unit/CheckChatMessageSchemaEquivalence.test.js`, replace the file-header comment block (the lines
starting `// Characterization (golden-master) gate for the five check chat-message DataModel schemas, authored as`
through `// no-dynamic-import rule governs the shipping bundle only).`) with:

```js
// Characterization (golden-master) gate for the five check chat-message DataModel schemas: parameters and results are
// typed SchemaFields built from the shared check parameter/result shape templates via buildSchemaFromShape(). The check
// chat DataModels chain through CheckChatMessageDataModel -> TitanChatMessageDataModel -> TitanDataModel ->
// foundry.abstract.TypeDataModel, define their schema via the create*Field helpers (which call foundry.data.fields.*),
// and expose a component getter that imports a .svelte component. This suite installs stand-ins for TypeDataModel, the
// data-field classes, i18n, and ApplicationV2 before dynamically importing the real data models, then fingerprints each
// schema and asserts it deep-equals the committed golden written inline below. Dynamic import is permitted in tests
// (the no-dynamic-import rule governs the shipping bundle only).
```

Replace the JSDoc above `const GOLDENS = {` with:

```js
/**
 * The committed golden fingerprints for each check chat-message DataModel schema: parameters and results are
 * SchemaFields whose sub-fields fingerprint each field of the corresponding check parameter/result shape under the
 * buildSchemaFromShape rules (string -> StringField, number -> integer NumberField, boolean -> BooleanField, [] ->
 * ObjectField array, nested object -> SchemaField).
 * @type {object}
 */
```

Then add these four entries to EACH of the five `parameters: schemaField({ ... })` goldens (keep the object's
alphabetical order; `advantage` first, `automaticFailure` after `attributeDice`, `baseDifficulty` after
`automaticFailure`, `situations` before `skill`):

```js
         advantage: integerField(0),
         automaticFailure: booleanField(false),
         baseDifficulty: integerField(0),
         situations: emptyObjectArray(),
```

In the `attack` golden only, `baseDifficulty` is `integerField(4)` (it mirrors attack's `difficulty: 4` constant).
The `resistance` golden has no `attributeDice`; place `automaticFailure` and `baseDifficulty` after `advantage` there.

(b) In `tests/unit/check/check-shape-parity.test.js`, add to the `OPTIONS` object (alphabetical position):

```js
   advantage: 0,
   automaticFailure: false,
```

(c) In `tests/unit/check/calculate-check-results.test.js`, add `import recalculateCheckResults from
'~/check/chat-message/RecalculateCheckResults.js';` after the `calculateCheckResults` import, and append:

```js
describe('calculateCheckResults — automatic failure', () => {
   it('keeps the dice and critical counts but reports no successes and a failure', () => {
      /** @type {object} An automatically failed 4:1 check. */
      const params = {
         automaticFailure: true,
         complexity: 1,
         difficulty: 4,
         extraFailureOnCritical: false,
         extraSuccessOnCritical: false,
      };
      /** @type {object} The calculated results. */
      const r = calculateCheckResults(diceResults([
         6,
         5,
         1,
      ]), params);
      expect(r.dice.map((die) => die.final)).toEqual([
         6,
         5,
         1,
      ]);
      expect(r.criticalSuccesses).toBe(1);
      expect(r.criticalFailures).toBe(1);
      expect(r.successes).toBe(0);
      expect(r.extraSuccesses).toBe(0);
      expect(r.succeeded).toBe(false);
   });

   it('stays forced when a stored Resistance Check card is recalculated', () => {
      /** @type {object} The recalculated results. */
      const r = recalculateCheckResults({
         type: 'resistanceCheck',
         parameters: {
            automaticFailure: true,
            complexity: 1,
            damageToReduce: 3,
            difficulty: 4,
            extraFailureOnCritical: false,
            extraSuccessOnCritical: false,
         },
         results: diceResults([
            6,
            6,
         ]),
      });
      expect(r.successes).toBe(0);
      expect(r.succeeded).toBe(false);
      expect(r.damageTaken).toBe(3);
   });
});
```

(d) In `tests/unit/check/type-results.test.js`, append:

```js
describe('automatic failure in type results', () => {
   it('deals no attack damage', () => {
      /** @type {object} An automatically failed attack dealing 2 + 1 Damage. */
      const params = {
         automaticFailure: true,
         complexity: 1,
         damage: 2,
         damageMod: 1,
         difficulty: 4,
         extraFailureOnCritical: false,
         extraSuccessOnCritical: false,
         plusExtraSuccessDamage: true,
      };
      /** @type {object} The calculated results. */
      const r = calculateAttackCheckResults(diceResults([
         6,
         6,
      ]), params);
      expect(r.succeeded).toBe(false);
      expect(r.damage).toBe(0);
   });

   it('reduces no damage on a Resistance Check', () => {
      /** @type {object} An automatically failed Resistance Check against 4 Damage. */
      const params = {
         automaticFailure: true,
         complexity: 1,
         damageToReduce: 4,
         difficulty: 4,
         extraFailureOnCritical: false,
         extraSuccessOnCritical: false,
      };
      /** @type {object} The calculated results. */
      const r = calculateResistanceCheckResults(diceResults([
         6,
         5,
      ]), params);
      expect(r.successes).toBe(0);
      expect(r.damageTaken).toBe(4);
   });
});
```

(e) Create `tests/unit/check/check-options-defaults.test.js`:

```js
import { describe, it, expect } from 'vitest';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';

/** @type {Array<[string, Function]>} Every check type's options factory. */
const FACTORIES = [
   [
      'attribute',
      createAttributeCheckOptions,
   ],
   [
      'resistance',
      createResistanceCheckOptions,
   ],
   [
      'attack',
      createAttackCheckOptions,
   ],
   [
      'casting',
      createCastingCheckOptions,
   ],
   [
      'item',
      createItemCheckOptions,
   ],
];

describe('check options — Advantage, Automatic Failure, situations', () => {
   it.each(FACTORIES)('%s options default to no Advantage, no Automatic Failure, no situations', (_name, factory) => {
      expect(factory({})).toMatchObject({
         advantage: 0,
         automaticFailure: false,
         situations: [],
      });
   });

   it.each(FACTORIES)('%s options keep supplied values', (_name, factory) => {
      expect(factory({
         advantage: -3,
         automaticFailure: true,
         situations: ['underwater'],
      })).toMatchObject({
         advantage: -3,
         automaticFailure: true,
         situations: ['underwater'],
      });
   });
});
```

(f) Create `tests/unit/CheckChatMessageDataModel.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// CheckChatMessageDataModel.migrateData fills `baseDifficulty` from `difficulty` on check-message sources whose
// parameters carry a Difficulty but no base Difficulty. A pass-through TypeDataModel stand-in terminates the
// migrateData super-chain. Dynamic import is permitted in tests (the no-dynamic-import rule governs the shipping bundle
// only).

/** Minimal stand-in for foundry.abstract.TypeDataModel: a pass-through static migrateData. */
class MockTypeDataModel {
   /**
    * Returns the source data unchanged, terminating the migrateData super-chain.
    * @param {object} source - The source data being migrated.
    * @returns {object} The unchanged source data.
    */
   static migrateData(source) {
      return source;
   }
}

/** @type {Function} Holds the dynamically imported CheckChatMessageDataModel class. */
let CheckChatMessageDataModel;

beforeAll(async () => {
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;
   CheckChatMessageDataModel = (await import('~/check/chat-message/CheckChatMessageDataModel.js')).default;
});

afterAll(() => {
   delete globalThis.foundry.abstract.TypeDataModel;
});

describe('CheckChatMessageDataModel.migrateData', () => {
   it('reads the stored Difficulty as the base Difficulty of a source that has none', () => {
      /** @type {object} The migrated source. */
      const migrated = CheckChatMessageDataModel.migrateData({
         parameters: {
            difficulty: 5,
         },
      });
      expect(migrated.parameters.baseDifficulty).toBe(5);
   });

   it('leaves a present base Difficulty unchanged', () => {
      /** @type {object} The migrated source. */
      const migrated = CheckChatMessageDataModel.migrateData({
         parameters: {
            baseDifficulty: 4,
            difficulty: 5,
         },
      });
      expect(migrated.parameters.baseDifficulty).toBe(4);
   });

   it('leaves a results-only update diff untouched', () => {
      /** @type {object} The migrated diff. */
      const migrated = CheckChatMessageDataModel.migrateData({
         results: {
            successes: 1,
         },
      });
      expect(migrated.parameters).toBeUndefined();
   });

   it('adds no base Difficulty to a parameters diff that carries no Difficulty', () => {
      /** @type {object} The migrated diff. */
      const migrated = CheckChatMessageDataModel.migrateData({
         parameters: {
            advantage: 0,
         },
      });
      expect('baseDifficulty' in migrated.parameters).toBe(false);
   });
});
```

(g) Create `tests/unit/CharacterCheckModifiers.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// Check-modifier behavior of CharacterDataModel, exercised on a bare instance (Object.create over the prototype) whose
// parent carries only a rules-elements cache and whose roll data is stubbed. The model is imported after the Foundry
// stand-ins are installed; dynamic import in beforeAll is permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

/**
 * Stubbed actor roll data: Body 3; Reflexes 4 and Willpower 2; Athletics and Dexterity with 1 Training.
 * @type {object}
 */
const ROLL_DATA = {
   attribute: {
      body: { value: 3 },
   },
   resistance: {
      reflexes: { value: 4 },
      willpower: { value: 2 },
   },
   skill: {
      athletics: {
         defaultAttribute: 'body',
         expertise: { value: 0 },
         training: { value: 1 },
      },
      dexterity: {
         defaultAttribute: 'body',
         expertise: { value: 0 },
         training: { value: 1 },
      },
   },
};

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
 * Creates a bare CharacterDataModel whose parent holds the given rules-elements cache and whose roll data is stubbed.
 * @param {object|boolean} [rulesElementsCache] - The parent's rules-elements cache (`false` when there are none).
 * @returns {object} The model instance.
 */
function createModel(rulesElementsCache = {}) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = { rulesElementsCache };
   model.getRollData = () => structuredClone(ROLL_DATA);
   return model;
}

describe('CharacterDataModel._applyCheckAdvantage', () => {
   it('keeps the pre-Advantage Difficulty and applies the level', () => {
      /** @type {object} Parameters with Disadvantage. */
      const parameters = {
         advantage: -1,
         difficulty: 4,
      };
      createModel()._applyCheckAdvantage(parameters);
      expect(parameters).toEqual({
         advantage: -1,
         baseDifficulty: 4,
         difficulty: 5,
      });
   });

   it('holds a Difficulty at 6 under Disadvantage and at 2 under Advantage', () => {
      /** @type {object} An Attack Check at the Difficulty ceiling. */
      const ceiling = {
         advantage: -1,
         difficulty: 6,
      };
      /** @type {object} An Attack Check at the Difficulty floor. */
      const floor = {
         advantage: 2,
         difficulty: 2,
      };
      createModel()._applyCheckAdvantage(ceiling);
      createModel()._applyCheckAdvantage(floor);
      expect(ceiling.difficulty).toBe(6);
      expect(floor.difficulty).toBe(2);
   });
});

describe('CharacterDataModel.getAttributeCheckParameters — Advantage', () => {
   it('applies the options Advantage after the Difficulty is set', () => {
      /** @type {object} The derived Attribute Check parameters. */
      const parameters = createModel().getAttributeCheckParameters(createAttributeCheckOptions({
         advantage: 2,
         attribute: 'body',
         skill: 'athletics',
      }));
      expect(parameters.baseDifficulty).toBe(4);
      expect(parameters.difficulty).toBe(2);
      expect(parameters.totalDice).toBe(4);
      expect(parameters.situations).toEqual([]);
   });
});

/**
 * Creates a bare model whose every owned item returns the given roll data.
 * @param {object} itemRollData - The roll data each owned item's `system.getRollData()` returns.
 * @returns {object} The model instance.
 */
function createItemModel(itemRollData) {
   /** @type {object} The bare model. */
   const model = createModel();
   model.parent.items = {
      get: () => ({
         system: {
            getRollData: () => structuredClone(itemRollData),
         },
      }),
   };
   return model;
}

describe('Advantage on item-based check parameters', () => {
   it('applies Advantage to an Attack Check after the rating-derived Difficulty is clamped', () => {
      /** @type {object} A weapon with one plain attack. */
      const weaponRollData = {
         attack: [
            {
               customTrait: [],
               damage: 1,
               label: 'x',
               trait: [],
            },
         ],
         attackNotes: '',
         customTrait: [],
         img: '',
         name: 'W',
      };

      // Defense 5 against Melee 0 rates a Difficulty of 9, clamped to 6; Advantage then lowers it to 5.
      /** @type {object} The derived Attack Check parameters. */
      const parameters = createItemModel(weaponRollData).getAttackCheckParameters(createAttackCheckOptions({
         advantage: 1,
         attackerMelee: 0,
         attribute: 'body',
         itemId: 'w',
         skill: 'athletics',
         targetDefense: 5,
         type: 'melee',
      }));
      expect(parameters.baseDifficulty).toBe(6);
      expect(parameters.difficulty).toBe(5);
   });

   it('applies Disadvantage to a Casting Check', () => {
      /** @type {object} A spell with no aspects. */
      const spellRollData = {
         aspect: [],
         customAspect: [],
         customTrait: [],
         description: '',
         img: '',
         name: 'S',
         tradition: '',
      };

      /** @type {object} The derived Casting Check parameters. */
      const parameters = createItemModel(spellRollData).getCastingCheckParameters(createCastingCheckOptions({
         advantage: -1,
         attribute: 'body',
         itemId: 's',
         skill: 'athletics',
      }));
      expect(parameters.baseDifficulty).toBe(4);
      expect(parameters.difficulty).toBe(5);
   });

   it('applies Greater Advantage to an Item Check', () => {
      /** @type {object} An item with one check that deals no damage or healing. */
      const itemRollData = {
         check: [
            {
               isDamage: false,
               isHealing: false,
               label: 'C',
               opposedCheck: {
                  attribute: 'body',
                  enabled: false,
                  skill: 'none',
               },
               resistanceCheck: 'none',
               resolveCost: 0,
            },
         ],
         customTrait: [],
         description: '',
         img: '',
         name: 'I',
      };

      /** @type {object} The derived Item Check parameters. */
      const parameters = createModel().getItemCheckParameters(createItemCheckOptions({
         advantage: 2,
         attribute: 'body',
         difficulty: 4,
         itemRollData,
         skill: 'athletics',
      }));
      expect(parameters.baseDifficulty).toBe(4);
      expect(parameters.difficulty).toBe(2);
   });
});
```

- [ ] **Step 2: Run the new and changed unit tests to verify they fail**

Run: `npx vitest run tests/unit/CheckChatMessageSchemaEquivalence.test.js tests/unit/check tests/unit/CheckChatMessageDataModel.test.js tests/unit/CharacterCheckModifiers.test.js`
Expected: FAIL — goldens lack the four fields; options lack `advantage`; auto-fail cases report successes;
`migrateData` does not set `baseDifficulty`; `_applyCheckAdvantage` is not a function; the Attribute, Attack,
Casting, and Item parameters carry no `baseDifficulty` and an unchanged `difficulty`.

- [ ] **Step 3: Update the check typedefs in `src/check/Check.js`**

In the `CheckOptions` typedef add (keep booleans, numbers, arrays grouped as the file does):

```js
 * @property {boolean} [automaticFailure] - Whether the check fails automatically; its dice still roll.
 * @property {number} [advantage] - The summed Advantage (+) and Disadvantage (-) from always-on sources and the dialog.
 * @property {string[]} [situations] - The camel-case keys of the situational modifiers ticked in the check dialog.
```

and change its `difficulty` line to ` * @property {number} [difficulty] - The Difficulty before Advantage.`

In the `CheckParameters` typedef add:

```js
 * @property {boolean} automaticFailure - Whether the check fails automatically; its dice still roll.
 * @property {number} advantage - The summed Advantage (+) and Disadvantage (-), ticked situations included; clamped
 * to ±2 when applied.
 * @property {number} baseDifficulty - The Difficulty before Advantage is applied.
 * @property {SituationLabel[]} situations - The situational modifiers applied to the check.
```

and change its `difficulty` line to
` * @property {number} difficulty - The minimum roll on a die to achieve a Success, after Advantage.`

Add after the `CheckParameters` typedef:

```js
/**
 * A situational modifier applied to a check, as its chat card lists it.
 * @typedef {object} SituationLabel
 * @property {string} key - The camel-case situation key.
 * @property {string} label - The situation's display label.
 */
```

- [ ] **Step 4: Update the five options factories**

In each of `AttributeCheckOptions.js`, `ResistanceCheckOptions.js`, `AttackCheckOptions.js`, `CastingCheckOptions.js`,
`ItemCheckOptions.js`, add to the typedef:

```js
 * @property {boolean} [automaticFailure] - Whether the check fails automatically; its dice still roll.
 * @property {number} [advantage] - The summed Advantage (+) and Disadvantage (-) from always-on sources and the dialog.
 * @property {string[]} [situations] - The camel-case keys of the situational modifiers ticked in the check dialog.
```

(in Attribute, Resistance, Casting, and Item also change `@property {number} [difficulty]` to
`- The Difficulty before Advantage.`), and add these three keys to the returned object, in alphabetical position:

```js
      advantage: options.advantage ?? 0,
      automaticFailure: options.automaticFailure ?? false,
      situations: options.situations ?? [],
```

- [ ] **Step 5: Update the five parameter shapes and factories**

In each `*CheckParameters.js`, add to the typedef:

```js
 * @property {boolean} automaticFailure - Whether the check fails automatically; its dice still roll.
 * @property {number} advantage - The summed Advantage (+) and Disadvantage (-), ticked situations included.
 * @property {number} baseDifficulty - The Difficulty before Advantage is applied.
 * @property {SituationLabel[]} situations - The situational modifiers applied to the check.
```

and change the typedef's `difficulty` line to `- The minimum roll on a die to achieve a Success, after Advantage.`
Then:

`AttributeCheckParameters.js` — the shape and factory become:

```js
export function createAttributeCheckParametersShape() {
   return {
      advantage: 0,
      attribute: '',
      attributeDice: 0,
      automaticFailure: false,
      baseDifficulty: 0,
      complexity: 0,
      damageToReduce: 0,
      diceMod: 0,
      difficulty: 0,
      doubleExpertise: false,
      doubleTraining: false,
      expertiseMod: 0,
      extraFailureOnCritical: false,
      extraSuccessOnCritical: false,
      situations: [],
      skill: '',
      skillExpertise: 0,
      skillTrainingDice: 0,
      totalDice: 0,
      totalExpertise: 0,
      totalTrainingDice: 0,
      trainingMod: 0,
   };
}

export default function createAttributeCheckParameters(options) {
   return {
      ...createAttributeCheckParametersShape(),
      advantage: options.advantage,
      attribute: options.attribute,
      automaticFailure: options.automaticFailure,
      complexity: options.complexity,
      damageToReduce: options.damageToReduce,
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      doubleTraining: options.doubleTraining,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      skill: options.skill,
      trainingMod: options.trainingMod,
   };
}
```

(keep both functions' existing JSDoc blocks.)

`ResistanceCheckParameters.js`:

```js
export function createResistanceCheckParametersShape() {
   return {
      advantage: 0,
      automaticFailure: false,
      baseDifficulty: 0,
      complexity: 0,
      damageToReduce: 0,
      diceMod: 0,
      difficulty: 0,
      doubleExpertise: false,
      expertiseMod: 0,
      extraFailureOnCritical: false,
      extraSuccessOnCritical: false,
      resistance: '',
      resistanceDice: 0,
      situations: [],
      totalDice: 0,
      totalExpertise: 0,
   };
}

export default function createResistanceCheckParameters(options) {
   return {
      ...createResistanceCheckParametersShape(),
      advantage: options.advantage,
      automaticFailure: options.automaticFailure,
      complexity: options.complexity,
      damageToReduce: options.damageToReduce,
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      resistance: options.resistance,
   };
}
```

`AttackCheckParameters.js` — in `createAttackCheckParametersShape()` add `advantage: 0,` as the first key,
`automaticFailure: false,` and `baseDifficulty: 4,` after `attributeDice: 0,`, and `situations: [],` after
`rend: false,`; in `createAttackCheckParameters` add `advantage: options.advantage,` right after the shape spread and
`automaticFailure: options.automaticFailure,` after `attribute: options.attribute,`. Update the shape JSDoc's factory-
constant sentence to: `Factory constants \`complexity: 1\`, \`difficulty: 4\`, and \`baseDifficulty: 4\` are kept at
their canonical values.`

`CastingCheckParameters.js` — in the shape add `advantage: 0,` first, `automaticFailure: false,` and
`baseDifficulty: 0,` after `attributeDice: 0,`, `situations: [],` after `scalingAspect: [],`; in the factory add
`advantage: options.advantage,` after the spread and `automaticFailure: options.automaticFailure,` after
`attribute: options.attribute,`.

`ItemCheckParameters.js` — in the shape add `advantage: 0,` first, `automaticFailure: false,` and
`baseDifficulty: 0,` after `attributeDice: 0,`, `situations: [],` after `scaling: false,`; in the factory add
`advantage: options.advantage,` after the spread and `automaticFailure: options.automaticFailure,` after
`attribute: options.attribute,`.

- [ ] **Step 6: Force automatic failures in `src/check/CheckResults.js`**

In `calculateCheckResults`, directly after the `for` loop that classifies each die (before
`// Calculate whether the Check Succeeded.`), insert:

```js
   // An automatically failed check keeps its rolled dice and critical counts but reports no Successes and fails.
   if (parameters.automaticFailure) {
      retVal.successes = 0;
      return retVal;
   }
```

- [ ] **Step 7: Add `migrateData` to `src/check/chat-message/CheckChatMessageDataModel.js`**

Append inside the class, after `_defineCheckDataSchema`:

```js
   /**
    * Fills `baseDifficulty` on a check message whose stored parameters carry a `difficulty` but no `baseDifficulty`.
    * Such a message rolled with no Advantage, so its stored `difficulty` is its base Difficulty; its `advantage`,
    * `automaticFailure`, and `situations` take their schema initials (0, false, []). A partial update diff that
    * carries no Difficulty is left untouched.
    * INVARIANT: every parameter update carries `baseDifficulty` whenever it carries `difficulty`; a diff carrying only
    * `difficulty` would have its base overwritten with the post-Advantage value. The fill is not gated on
    * `advantage`, because a diff need not carry it.
    * @override
    * @param {object} source - The source data for the check chat message.
    * @returns {object} The migrated source data.
    */
   static migrateData(source) {
      if (
         source.parameters &&
         source.parameters.baseDifficulty === undefined &&
         source.parameters.difficulty !== undefined
      ) {
         source.parameters.baseDifficulty = source.parameters.difficulty;
      }

      return super.migrateData(source);
   }
```

- [ ] **Step 8: Apply Advantage in `CharacterDataModel`**

Add the import after `import roundDirectional from '~/helpers/utility-functions/RoundDirectional.js';`:

```js
import applyAdvantage from '~/check/ApplyAdvantage.js';
```

Add this method directly after `_initializeAttributeBasedCheck` (in the `/* === Checks === */` section):

```js
   /**
    * Applies the check's summed Advantage to its Difficulty, keeping the pre-Advantage value as `baseDifficulty`.
    * INVARIANT: runs after the rating-derived and option Difficulty (an Attack Check's rating clamp included);
    * target-condition overrides may follow it.
    * @param {CheckParameters} parameters - The check parameters. Modified in place.
    * @private
    */
   _applyCheckAdvantage(parameters) {
      parameters.baseDifficulty = parameters.difficulty;
      parameters.difficulty = applyAdvantage(parameters.baseDifficulty, parameters.advantage);
   }
```

Call it last in each `get<Type>CheckParameters`:

- `getAttributeCheckParameters`: replace
  `this._initializeAttributeBasedCheck(parameters, actorRollData);\n\n      return parameters;` with
  `this._initializeAttributeBasedCheck(parameters, actorRollData);\n\n      // Advantage adjusts the final Difficulty.\n      this._applyCheckAdvantage(parameters);\n\n      return parameters;`.
- `getResistanceCheckParameters`: after the `parameters.totalExpertise = …` line insert a blank line,
  `      // Advantage adjusts the final Difficulty.` and `      this._applyCheckAdvantage(parameters);`.
- `getAttackCheckParameters`: after
  `parameters.difficulty = clamp(parameters.targetDefense - parameters.attackerRating + 4, 2, 6);` insert a blank line,
  `      // Advantage adjusts the rating-derived Difficulty.` and `      this._applyCheckAdvantage(parameters);`.
- `getCastingCheckParameters`: after `processAspects(itemRollData.customAspect);` insert a blank line,
  `      // Advantage adjusts the final Difficulty.` and `      this._applyCheckAdvantage(parameters);`.
- `getItemCheckParameters`: after the closing `}` of the `if (checkData.isDamage || checkData.isHealing) {` block
  (the one ending with `parameters.scaling = checkData.scaling;`) insert a blank line,
  `      // Advantage adjusts the final Difficulty.` and `      this._applyCheckAdvantage(parameters);`.

- [ ] **Step 9: Withhold outcome-changing actions on an automatically failed card**

One decision covers the card (resolution #12): an automatically failed check has no Successes to gain, so nothing on
its card offers to change the outcome, and no die looks successful.

In `src/hooks/OnGetChatLogEntryContext.js`, replace the body of `canReRollFailures` (everything between its opening
`{` and closing `}`) with:

```js
   /** @type {object|false} The check data, or false when the message is not an owned, visible check. */
   const checkData = getCheckData(li);
   if (checkData) {

      // Offer the re-roll on a check that did not fail automatically and has not re-rolled its failures, or to a GM.
      if (
         isCheck(checkData.type) &&
         !checkData.parameters.automaticFailure &&
         (checkData.failuresReRolled === false || game.user.isGM)
      ) {

         // Return true if the check has any failures.
         for (const die of checkData.results.dice) {
            if (die.base < checkData.parameters.difficulty) {
               return true;
            }
         }
      }
   }

   return false;
```

Replace the body of `canDoubleTraining` with:

```js
   // Offer the option on a check with Training that has not been doubled and did not fail automatically.
   /** @type {object|false} The check data, or false when the message is not an owned, visible check. */
   const checkData = getCheckData(li);
   return (checkData &&
      isCheck(checkData.type) &&
      !checkData.parameters.automaticFailure &&
      checkData.parameters.totalTrainingDice > 0 &&
      (checkData.parameters.doubleTraining === false));
```

Replace the body of `canDoubleExpertise` with:

```js
   // Offer the option on a check with Expertise that has not been doubled and did not fail automatically.
   /** @type {object|false} The check data, or false when the message is not an owned, visible check. */
   const checkData = getCheckData(li);
   return (checkData &&
      isCheck(checkData.type) &&
      !checkData.parameters.automaticFailure &&
      checkData.parameters.totalExpertise > 0 &&
      (checkData.parameters.doubleExpertise === false));
```

In `src/check/chat-message/CheckChatMessageDie.svelte`, replace the `result` and `disabled` declarations (from
`/** @type {string} The class to affect the appearance of the die. */` through the `disabled` `$derived(...)`'s
closing `);`) with:

```js
   /**
    * @type {string} The class to affect the appearance of the die. An automatically failed check has no successful
    * die, so each shows as a failure (a 1 as a critical failure).
    */
   const result = $derived.by(() => {
      if (document.data.system.parameters.automaticFailure) {
         return die.final <= 1 ? 'critical-failure' : 'failure';
      }

      return die.final >= 6 ? 'critical-success' :
         die.final >= document.data.system.parameters.difficulty ? 'success' :
            die.final <= 1 ? 'critical-failure' :
            'failure';
   });

   /**
    * @type {boolean} Whether applying Expertise to the die should be disabled. Expertise cannot change an
    * automatically failed check.
    */
   const disabled = $derived(
      !document.data.isOwner ||
         document.data.system.parameters.automaticFailure ||
         document.data.system.results.expertiseRemaining === 0 ||
         die.final >= 6,
   );
```

In `src/check/chat-message/CheckChatResults.svelte`, replace

```svelte
         <!--Reset Button-->
         {#if document.data.constructor.getSpeakerActor(document.data.speaker)?.isOwner}
```

with

```svelte
         <!--Reset Button: Expertise cannot change an automatically failed check.-->
         {#if !document.data.system.parameters.automaticFailure &&
            document.data.constructor.getSpeakerActor(document.data.speaker)?.isOwner}
```

- [ ] **Step 10: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/CheckChatMessageSchemaEquivalence.test.js tests/unit/check tests/unit/CheckChatMessageDataModel.test.js tests/unit/CharacterCheckModifiers.test.js`
Expected: PASS.

- [ ] **Step 11: Extend the check-message helper and write the e2e spec**

In `tests/e2e/checkDialog.js`, replace `readNewestCheckFlags` (its JSDoc and function) with:

```js
/**
 * Polls for the newest check chat message created after the given baseline count and returns its id, subtype,
 * parameters, and results. The wait is bounded by the message actually appearing, and a message created before the
 * roll is never read.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {number} baseline - The chat-message count captured immediately before the roll.
 * @param {string} [type] - The check subtype to wait for (e.g. `attributeCheck`); any check subtype when omitted.
 * @returns {Promise<{ id: string, type: string, parameters: object, results: object }>} The newest check message's
 * data.
 */
export async function readNewestCheckFlags(page, baseline, type = undefined) {
   /** @type {{ id: string, type: string, parameters: object, results: object } | null} The resolved message data. */
   let flags = null;
   await expect.poll(
      async () => {
         flags = await page.evaluate(({ base, subtype }) => {
            /** @type {string[]} The accepted subtypes: the requested one, or all five check subtypes. */
            const checkTypes = subtype ?
               [subtype] :
               [
                  'attributeCheck',
                  'resistanceCheck',
                  'attackCheck',
                  'castingCheck',
                  'itemCheck',
               ];

            // Only consider messages created after the baseline; return the newest accepted one.
            if (game.messages.size <= base) {
               return null;
            }

            /** @type {ChatMessage[]} The messages created after the baseline. */
            const created = game.messages.contents.slice(base);

            /** @type {ChatMessage|null} The newest accepted check message, if any. */
            const message = [...created].reverse().find((msg) => checkTypes.includes(msg?.type)) ?? null;
            return message ?
               {
                  id: message.id,
                  type: message.type,
                  parameters: message.system.parameters,
                  results: message.system.results,
               } :
               null;
         }, {
            base: baseline,
            subtype: type,
         });
         return flags?.type ?? null;
      },
      {
         message: 'a titan check chat message should be created after the roll',
         timeout: 1000,
      },
   ).not.toBeNull();
   return flags;
}
```

Create `tests/e2e/check-advantage.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor, showChatLog } from './world.js';
import { forceDice, resetDice } from './dice.js';
import { readNewestCheckFlags } from './checkDialog.js';

/**
 * Advantage, Disadvantage, and Automatic Failure on rolled checks: the parameters the check engine stores, the
 * conditional modifiers that feed them, and the chat card that renders them.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Advantage Actor';

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

test.beforeEach(async () => {
   // Rebuild the actor with no items or effects so each test seeds only what it needs.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName)?.delete();
      await Actor.create({
         name: actorName,
         type: 'player',
      });
   }, ACTOR_NAME);
});

test.afterEach(async () => {
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Rolls an Attribute Check for the spec's actor without the dialog and returns the created message.
 * @param {import('@playwright/test').Page} targetPage - The logged-in page.
 * @param {object} options - The Attribute Check options.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The new message's id, subtype,
 * parameters, and results.
 */
async function rollAttributeCheck(targetPage, options) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await targetPage.evaluate(() => game.messages.size);
   await targetPage.evaluate(async ({ actorName, checkOptions }) => {
      await game.actors.getName(actorName).system.rollAttributeCheck(checkOptions);
   }, {
      actorName: ACTOR_NAME,
      checkOptions: options,
   });

   return readNewestCheckFlags(targetPage, baseline, 'attributeCheck');
}

/**
 * Opens the chat log's context menu on a card, returns its entries' labels, and closes it again.
 * @param {import('@playwright/test').Locator} card - The card's list item in the chat log.
 * @returns {Promise<string[]>} The trimmed label of each menu entry.
 */
async function readChatContextMenu(card) {
   await card.locator('.message-header').click({ button: 'right' });

   /** @type {import('@playwright/test').Locator} The open menu's entries. */
   const entries = page.locator('#context-menu li.context-item');
   await expect(entries.first()).toBeVisible();

   /** @type {string[]} The entries' labels. */
   const labels = (await entries.allInnerTexts()).map((text) => text.trim());
   await page.evaluate(() => ui.context?.close({ animate: false }));
   await expect(page.locator('#context-menu')).toHaveCount(0);
   return labels;
}

/**
 * Adds one effect carrying the given rules elements to the spec's actor.
 * @param {import('@playwright/test').Page} targetPage - The logged-in page.
 * @param {object[]} rulesElement - The effect's rules elements (a uuid is generated for each).
 * @returns {Promise<void>} Resolves once the effect exists.
 */
async function seedEffect(targetPage, rulesElement) {
   await targetPage.evaluate(async ({ actorName, elements }) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Advantage Effect',
            type: 'effect',
            system: {
               rulesElement: elements.map((element) => ({
                  ...element,
                  uuid: foundry.utils.randomID(),
               })),
            },
         },
      ]);
   }, {
      actorName: ACTOR_NAME,
      elements: rulesElement,
   });
}

/**
 * Builds a conditional check modifier element: any check type, any selector, Dice +1, unless overridden.
 * @param {object} overrides - Fields replacing the defaults.
 * @returns {object} The element, without a uuid.
 */
function checkModifierElement(overrides) {
   return {
      checkType: 'any',
      key: '',
      modifierType: 'dice',
      operation: 'conditionalCheckModifier',
      selector: 'any',
      skill: '',
      value: 1,
      ...overrides,
   };
}

test.describe('Advantage and Automatic Failure in check options', () => {
   test('options Advantage moves the rolled Difficulty and keeps the base', async () => {
      /** @type {{id: string, parameters: object, results: object}} The check rolled with Advantage. */
      const advantaged = await rollAttributeCheck(page, {
         advantage: 1,
         attribute: 'body',
      });
      expect(advantaged.parameters).toMatchObject({
         advantage: 1,
         baseDifficulty: 4,
         difficulty: 3,
      });

      /** @type {{id: string, parameters: object, results: object}} The check rolled with a -3 Advantage sum. */
      const disadvantaged = await rollAttributeCheck(page, {
         advantage: -3,
         attribute: 'body',
      });
      expect(disadvantaged.parameters).toMatchObject({
         advantage: -3,
         baseDifficulty: 4,
         difficulty: 6,
      });
   });

   test('an automatically failed check rolls its dice but has no successes', async () => {
      // Positive control: the same forced die succeeds without Automatic Failure.
      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The check rolled without Automatic Failure. */
      const control = await rollAttributeCheck(page, {
         attribute: 'body',
         complexity: 1,
      });
      expect(control.results).toMatchObject({
         successes: 1,
         succeeded: true,
      });

      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The check rolled with Automatic Failure. */
      const failed = await rollAttributeCheck(page, {
         attribute: 'body',
         automaticFailure: true,
         complexity: 1,
      });
      expect(failed.parameters.automaticFailure).toBe(true);
      expect(failed.results.dice.map((die) => die.base)).toEqual([6]);
      expect(failed.results).toMatchObject({
         criticalSuccesses: 1,
         successes: 0,
         succeeded: false,
      });
   });

   test('an automatically failed card offers no outcome-changing action and styles no die as a success', async () => {
      /** @type {Record<string, string>} The localized labels of the actions a failed card withholds. */
      const labels = await page.evaluate(() => ({
         doubleExpertise: game.i18n.localize('LOCAL.doubleExpertise.text'),
         doubleExpertiseSpendResolve: game.i18n.localize('LOCAL.doubleExpertiseSpendResolve.text'),
         doubleTraining: game.i18n.localize('LOCAL.doubleTraining.text'),
         doubleTrainingSpendResolve: game.i18n.localize('LOCAL.doubleTrainingSpendResolve.text'),
         expertiseRemaining: game.i18n.localize('LOCAL.expertiseRemaining.text'),
         reRollFailures: game.i18n.localize('LOCAL.reRollFailures.text'),
         reRollFailuresSpendResolve: game.i18n.localize('LOCAL.reRollFailuresSpendResolve.text'),
         resetExpertise: game.i18n.localize('LOCAL.resetExpertise.text'),
      }));

      /** @type {string[]} Every context-menu label a failed card withholds (a GM sees both forms of each). */
      const withheld = [
         labels.reRollFailures,
         labels.reRollFailuresSpendResolve,
         labels.doubleExpertise,
         labels.doubleExpertiseSpendResolve,
         labels.doubleTraining,
         labels.doubleTrainingSpendResolve,
      ];

      /** @type {object} Two dice (Body 1 + Training 1), 1 Expertise, and a 4:1 check, so every action applies. */
      const checkOptions = {
         attribute: 'body',
         complexity: 1,
         expertiseMod: 1,
         trainingMod: 1,
      };
      await showChatLog(page);

      // Positive control: without Automatic Failure the card offers every action and styles the 6 a critical success.
      await forceDice(page, [
         6,
         2,
      ]);
      /** @type {{id: string, parameters: object, results: object}} The normal card's message. */
      const control = await rollAttributeCheck(page, checkOptions);

      /** @type {import('@playwright/test').Locator} The normal card in the chat log. */
      const controlCard = page.locator(`#chat .chat-log li[data-message-id="${control.id}"]`);
      await expect(controlCard.locator('.die.critical-success')).toHaveCount(1);
      await expect(controlCard.getByRole('button', { name: labels.resetExpertise })).toBeVisible();
      expect(await readChatContextMenu(controlCard)).toEqual(expect.arrayContaining(withheld));

      // The same roll with Automatic Failure: the card renders its dice and Expertise row but withholds the actions.
      await forceDice(page, [
         6,
         2,
      ]);
      /** @type {{id: string, parameters: object, results: object}} The automatically failed card's message. */
      const failed = await rollAttributeCheck(page, {
         ...checkOptions,
         automaticFailure: true,
      });

      /** @type {import('@playwright/test').Locator} The automatically failed card in the chat log. */
      const failedCard = page.locator(`#chat .chat-log li[data-message-id="${failed.id}"]`);
      await expect(failedCard.locator('.die')).toHaveCount(2);
      await expect(failedCard.getByText(labels.expertiseRemaining)).toBeVisible();
      await expect(failedCard.locator('.die.success, .die.critical-success')).toHaveCount(0);
      await expect(failedCard.getByRole('button', { name: labels.resetExpertise })).toHaveCount(0);

      /** @type {string[]} The failed card's context-menu labels. */
      const failedMenu = await readChatContextMenu(failedCard);
      for (const label of withheld) {
         expect(failedMenu).not.toContain(label);
      }

      // The rolled 6 renders in the resolved failure color.
      await expect.poll(() => failedCard.locator('.die', { hasText: '6' }).evaluate((element) => {
         /** @type {HTMLSpanElement} A probe resolving the failure token to computed rgb() form. */
         const probe = document.createElement('span');
         probe.style.backgroundColor = 'var(--titan-failure-background)';
         element.appendChild(probe);

         /** @type {string} The resolved failure background. */
         const failure = getComputedStyle(probe).backgroundColor;
         probe.remove();
         return getComputedStyle(element.querySelector('button')).backgroundColor === failure;
      }), { message: 'the failed card\'s 6 shows the failure background' }).toBe(true);
   });

   test('a check message without the Advantage fields initializes and renders from its source', async () => {
      /** @type {{messageId: string, parameters: object}} The created card's id and the in-memory document's fields. */
      const result = await page.evaluate(async () => {
         // A complete Attribute Check payload without `advantage`, `automaticFailure`, `baseDifficulty`, and
         // `situations`.
         /** @type {object} The message's system data. */
         const legacySystem = {
            failuresReRolled: false,
            parameters: {
               attribute: 'body',
               attributeDice: 1,
               complexity: 1,
               damageToReduce: 0,
               diceMod: 0,
               difficulty: 4,
               doubleExpertise: false,
               doubleTraining: false,
               expertiseMod: 0,
               extraFailureOnCritical: false,
               extraSuccessOnCritical: false,
               skill: 'none',
               skillExpertise: 0,
               skillTrainingDice: 0,
               totalDice: 1,
               totalExpertise: 0,
               totalTrainingDice: 0,
               trainingMod: 0,
            },
            results: {
               criticalFailures: 0,
               criticalSuccesses: 0,
               damageTaken: 0,
               dice: [
                  {
                     base: 5,
                     expertiseApplied: 0,
                     final: 5,
                  },
               ],
               expertiseRemaining: 0,
               extraSuccesses: 0,
               succeeded: true,
               successes: 1,
            },
         };

         // An in-memory document built from the source takes the initialization path a loaded one takes.
         /** @type {ChatMessage} The in-memory document. */
         const legacy = new ChatMessage.implementation({
            type: 'attributeCheck',
            system: legacySystem,
         });

         /** @type {ChatMessage} The created message, rendered in the chat log. */
         const created = await ChatMessage.create({
            type: 'attributeCheck',
            speaker: ChatMessage.getSpeaker(),
            system: legacySystem,
         });
         return {
            messageId: created.id,
            parameters: {
               advantage: legacy.system.parameters.advantage,
               automaticFailure: legacy.system.parameters.automaticFailure,
               baseDifficulty: legacy.system.parameters.baseDifficulty,
               situations: legacy.system.parameters.situations,
            },
         };
      });

      expect(result.parameters).toEqual({
         advantage: 0,
         automaticFailure: false,
         baseDifficulty: 4,
         situations: [],
      });

      /** @type {import('@playwright/test').Locator} The rendered card's check content. */
      const card = page.locator(`#chat .message[data-message-id="${result.messageId}"] .check-chat-message`);
      await expect(card).toBeAttached();
      await expect(card).toContainText('4:1');
   });
});
```

- [ ] **Step 12: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm run stylelint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/check-advantage.spec.js tests/e2e/checks-dialog.spec.js tests/e2e/checks-integration.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/chat-message-mounts.spec.js`
Expected: 0 lint and stylelint errors; all unit tests pass; build succeeds; every listed spec passes.

- [ ] **Step 13: Commit**

```bash
git branch --show-current
git status --short
git add src/check/Check.js src/check/CheckResults.js src/check/chat-message/CheckChatMessageDataModel.js \
   src/check/chat-message/CheckChatMessageDie.svelte src/check/chat-message/CheckChatResults.svelte \
   src/hooks/OnGetChatLogEntryContext.js tests/e2e/checkDialog.js \
   src/check/types/attribute-check/AttributeCheckOptions.js src/check/types/attribute-check/AttributeCheckParameters.js \
   src/check/types/resistance-check/ResistanceCheckOptions.js \
   src/check/types/resistance-check/ResistanceCheckParameters.js \
   src/check/types/attack-check/AttackCheckOptions.js src/check/types/attack-check/AttackCheckParameters.js \
   src/check/types/casting-check/CastingCheckOptions.js src/check/types/casting-check/CastingCheckParameters.js \
   src/check/types/item-check/ItemCheckOptions.js src/check/types/item-check/ItemCheckParameters.js \
   src/document/types/actor/types/character/CharacterDataModel.js \
   tests/unit/CheckChatMessageSchemaEquivalence.test.js tests/unit/check/check-shape-parity.test.js \
   tests/unit/check/calculate-check-results.test.js tests/unit/check/type-results.test.js \
   tests/unit/check/check-options-defaults.test.js tests/unit/CheckChatMessageDataModel.test.js \
   tests/unit/CharacterCheckModifiers.test.js tests/e2e/check-advantage.spec.js
git commit -F - <<'EOF'
feat(check): carry Advantage, Automatic Failure, and situations through checks

Check options, parameters, and chat schemas gain advantage, automaticFailure,
baseDifficulty, and situations; the Difficulty applies Advantage last; an
automatic failure keeps its dice but has no successes; legacy messages read
their stored Difficulty as the base.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 3: `advantage` and `automaticFailure` modifier types and situational check modifiers

**Files:**
- Modify: `src/system/ConditionalCheckModifierTypes.js`
- Modify: `src/document/types/item/rules-element/ConditionalCheckModifier.js`
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Modify: `lang/en.json`
- Modify tests: `tests/unit/CharacterCheckModifiers.test.js`, `tests/unit/RulesElementFactories.test.js`,
  `tests/e2e/check-advantage.spec.js`
- Create tests: `tests/unit/ConditionalCheckModifierTypes.test.js`, `tests/unit/CheckModifierLocalizationKeys.test.js`

**Interfaces:**
- Consumes: `_applyCheckAdvantage`, the options/parameters fields from Task 2.
- Produces: `CONDITIONAL_CHECK_MODIFIER_TYPES` gains `advantage`, `automaticFailure`;
  `USER_KEYED_CHECK_MODIFIER_SELECTORS` gains `situation`; new exports
  `CHECK_TYPE_MODIFIER_TYPES: Record<'attribute'|'resistance'|'attack'|'casting'|'item', readonly string[]>` and
  `MODIFIER_TYPE_PARAMETER_KEYS: Record<string, string>`; `createConditionalCheckModifierElement()` gains `skill: ''`.
  On `CharacterDataModel`: `_getConditionalCheckModifierValue(element): number`;
  `_applySituationalCheckModifierElements(elements): void` (cache key `situationalCheckModifier`);
  `getSituationalCheckModifiers(checkType: string, { skill?: string } = {}): SituationalCheckModifier[]` where
  `SituationalCheckModifier = { key, label, modifierType, value, sources: string[] }`;
  `_applySituationalModifiers(parameters, checkType: string, situations: string[]): void`. Rules elements gathered by
  `_applyRulesElements` carry `sourceName` (owning item/effect name). The four attribute-based
  `initialize<Type>CheckOptions` read `advantage` and `automaticFailure` from the cache. A caller-supplied
  `options.situations` is honored on every roll path (resolution #11). `LOCAL_KEYS` in
  `tests/unit/CheckModifierLocalizationKeys.test.js`, which Tasks 6, 8, and 9 extend.

- [ ] **Step 1: Write the failing unit tests**

(a) Create `tests/unit/ConditionalCheckModifierTypes.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
   CHECK_TYPE_MODIFIER_TYPES,
   CONDITIONAL_CHECK_MODIFIER_TYPES,
   MODIFIER_TYPE_PARAMETER_KEYS,
   USER_KEYED_CHECK_MODIFIER_SELECTORS,
} from '~/system/ConditionalCheckModifierTypes.js';

describe('conditional check modifier type tables', () => {
   it('lists Advantage and Automatic Failure as modifier types and situation as a user-keyed selector', () => {
      expect(CONDITIONAL_CHECK_MODIFIER_TYPES).toContain('advantage');
      expect(CONDITIONAL_CHECK_MODIFIER_TYPES).toContain('automaticFailure');
      expect(USER_KEYED_CHECK_MODIFIER_SELECTORS).toContain('situation');
   });

   it('maps every check type only to known modifier types', () => {
      for (const modifierTypes of Object.values(CHECK_TYPE_MODIFIER_TYPES)) {
         for (const modifierType of modifierTypes) {
            expect(CONDITIONAL_CHECK_MODIFIER_TYPES).toContain(modifierType);
         }
      }
   });

   it('gives Resistance Checks no Training, Damage, or Healing and Attribute Checks no Damage or Healing', () => {
      expect(CHECK_TYPE_MODIFIER_TYPES.resistance).not.toContain('training');
      expect(CHECK_TYPE_MODIFIER_TYPES.resistance).not.toContain('damage');
      expect(CHECK_TYPE_MODIFIER_TYPES.resistance).not.toContain('healing');
      expect(CHECK_TYPE_MODIFIER_TYPES.attribute).not.toContain('damage');
      expect(CHECK_TYPE_MODIFIER_TYPES.attack).not.toContain('healing');
   });

   it('names a parameter for every summable modifier type', () => {
      for (const modifierType of CONDITIONAL_CHECK_MODIFIER_TYPES) {
         if (modifierType !== 'automaticFailure') {
            expect(MODIFIER_TYPE_PARAMETER_KEYS[modifierType]).toBeTypeOf('string');
         }
      }
   });
});
```

(b) In `tests/unit/RulesElementFactories.test.js` add the import
`import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier.js';`
and append inside the `describe`:

```js
   it('createConditionalCheckModifierElement narrows to no Skill by default', () => {
      expect(createConditionalCheckModifierElement()).toMatchObject({
         checkType: 'any',
         modifierType: 'damage',
         operation: 'conditionalCheckModifier',
         selector: 'any',
         skill: '',
      });
   });
```

(c) In `tests/unit/CharacterCheckModifiers.test.js` add at the top, after the existing imports:

```js
import camelize from '~/helpers/utility-functions/Camelize.js';
```

and append:

```js
/**
 * Builds a conditional check modifier element tagged with its source name, as `_applyRulesElements` passes it on.
 * @param {object} overrides - Fields replacing the defaults (any check type, any selector, Dice +1).
 * @returns {object} The element.
 */
function checkModifier(overrides) {
   return {
      checkType: 'any',
      key: '',
      modifierType: 'dice',
      operation: 'conditionalCheckModifier',
      selector: 'any',
      skill: '',
      sourceName: 'Source',
      value: 1,
      ...overrides,
   };
}

/**
 * Builds a model whose cache holds the given situational elements.
 * @param {object[]} elements - The situational elements.
 * @returns {object} The model instance.
 */
function situationalModel(elements) {
   /** @type {object} The model under test. */
   const model = createModel();
   model._applySituationalCheckModifierElements(elements);
   return model;
}

describe('conditional check modifier cache — Advantage and Automatic Failure', () => {
   it('sums mixed Advantage levels per check type, selector, and key', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'advantage',
            value: 2,
         }),
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
         checkModifier({
            key: 'athletics',
            modifierType: 'advantage',
            selector: 'skill',
            value: 1,
         }),
      ]);
      expect(model.getAttributeCheckMod('advantage', 'body', 'athletics')).toBe(2);
      expect(model.getAttributeCheckMod('advantage', 'body', 'dexterity')).toBe(1);
   });

   it('nets opposing sources to no Advantage and leaves the Difficulty unchanged', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'advantage',
            value: 1,
         }),
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {object} The initialized Attribute Check options. */
      const options = model.initializeAttributeCheckOptions({
         attribute: 'body',
         skill: 'athletics',
      });
      expect(options.advantage).toBe(0);
      expect(model.getAttributeCheckParameters(options).difficulty).toBe(4);
   });

   it('counts an Automatic Failure element as 1 whatever its stored value', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'automaticFailure',
            value: 0,
         }),
      ]);
      expect(model.getAttributeCheckMod('automaticFailure', 'body', 'none')).toBe(1);
   });

   it('initializes Attribute Check options from the cache unless they are provided', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
         checkModifier({
            modifierType: 'automaticFailure',
         }),
      ]);
      expect(model.initializeAttributeCheckOptions({
         attribute: 'body',
         skill: 'athletics',
      })).toMatchObject({
         advantage: -1,
         automaticFailure: true,
      });
      expect(model.initializeAttributeCheckOptions({
         advantage: 2,
         attribute: 'body',
         automaticFailure: false,
         skill: 'athletics',
      })).toMatchObject({
         advantage: 2,
         automaticFailure: false,
      });
   });
});

describe('situational check modifiers', () => {
   it('offers a check its own type and any, filtered to the modifier types it reads', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Underwater',
            selector: 'situation',
            sourceName: 'Pool',
            value: -1,
         }),
         checkModifier({
            checkType: 'casting',
            key: 'Chanting',
            selector: 'situation',
         }),
         checkModifier({
            key: 'Charging',
            modifierType: 'damage',
            selector: 'situation',
         }),
         checkModifier({
            checkType: 'resistance',
            key: 'Braced',
            modifierType: 'advantage',
            selector: 'situation',
         }),
      ]);
      /**
       * Lists the offered keys for a check type.
       * @param {string} checkType - The check type.
       * @returns {string[]} The offered situation keys.
       */
      const keysFor = (checkType) => model.getSituationalCheckModifiers(checkType, { skill: 'athletics' })
         .map((modifier) => modifier.key);
      expect(keysFor('attribute')).toEqual(['underwater']);
      expect(keysFor('casting')).toEqual([
         'underwater',
         'chanting',
         'charging',
      ]);
      expect(keysFor('resistance')).toEqual([
         'underwater',
         'braced',
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })[0]).toEqual({
         key: 'underwater',
         label: 'Underwater',
         modifierType: 'dice',
         sources: ['Pool'],
         value: -1,
      });
   });

   it('offers an element narrowed to a Skill only on checks using that Skill', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Jump',
            modifierType: 'automaticFailure',
            selector: 'situation',
            skill: 'athletics',
         }),
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toHaveLength(1);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'dexterity' })).toHaveLength(0);
      expect(model.getSituationalCheckModifiers('resistance')).toHaveLength(0);
   });

   it('sums one key and modifier type across sources and lists every source once', () => {
      /** @type {string} A situation label shared by several sources. */
      const label = 'Swim, Fly, or Climb';
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: label,
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Plate',
            value: -2,
         }),
         checkModifier({
            key: label,
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Plate',
            value: -1,
         }),
         checkModifier({
            key: label,
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Cloak',
            value: -1,
         }),
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([
         {
            key: camelize(label),
            label,
            modifierType: 'advantage',
            sources: [
               'Plate',
               'Cloak',
            ],
            value: -4,
         },
      ]);
   });

   it('adds ticked situations on top of the options without double counting', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Underwater',
            selector: 'situation',
            value: -1,
         }),
         checkModifier({
            key: 'Underwater',
            modifierType: 'advantage',
            selector: 'situation',
            value: -1,
         }),
      ]);
      /** @type {object} Options with the situation ticked. */
      const options = createAttributeCheckOptions({
         attribute: 'body',
         situations: ['underwater'],
         skill: 'athletics',
      });
      /** @type {object} The parameters with the situation ticked. */
      const ticked = model.getAttributeCheckParameters(options);
      /** @type {object} The parameters after unticking it. */
      const unticked = model.getAttributeCheckParameters({
         ...options,
         situations: [],
      });
      /** @type {object} The parameters after ticking it again. */
      const reticked = model.getAttributeCheckParameters(options);

      expect(options.diceMod).toBe(0);
      expect(options.advantage).toBe(0);
      expect(ticked).toMatchObject({
         advantage: -1,
         diceMod: -1,
         difficulty: 5,
         situations: [
            {
               key: 'underwater',
               label: 'Underwater',
            },
         ],
         totalDice: 3,
      });
      expect(unticked).toMatchObject({
         advantage: 0,
         diceMod: 0,
         difficulty: 4,
         situations: [],
         totalDice: 4,
      });
      expect(reticked).toEqual(ticked);
   });

   it('ignores a ticked situation that no longer applies to the check\'s Skill', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Jump',
            modifierType: 'automaticFailure',
            selector: 'situation',
            skill: 'athletics',
         }),
      ]);
      /** @type {object} Dexterity-check parameters with the Athletics-only situation ticked. */
      const parameters = model.getAttributeCheckParameters(createAttributeCheckOptions({
         attribute: 'body',
         situations: ['jump'],
         skill: 'dexterity',
      }));
      expect(parameters.automaticFailure).toBe(false);
      expect(parameters.situations).toEqual([]);
   });

   it('offers nothing when the actor has no rules elements', () => {
      expect(createModel(false).getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([]);
   });
});
```

(d) Create `tests/unit/CheckModifierLocalizationKeys.test.js` (`tests/unit/LocalizationKeys.test.js` only rejects
values that contain `LOCAL.`; this suite proves each key the plan adds exists):

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @type {string} This test file's directory. */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.resolve(__dirname, '../../lang/en.json'), 'utf-8'));

/**
 * The flat `LOCAL` keys the Advantage, Automatic Failure, situational-modifier, and check-dialog labels render through,
 * in alphabetical order.
 * @type {string[]}
 */
const LOCAL_KEYS = [
   'advantage.text',
   'automaticFailure.text',
];

describe('check-modifier localization keys', () => {
   it.each(LOCAL_KEYS)('LOCAL defines %s', (key) => {
      expect(lang.LOCAL[key]).toBeTypeOf('string');
      expect(lang.LOCAL[key].length).toBeGreaterThan(0);
   });
});
```

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run tests/unit/ConditionalCheckModifierTypes.test.js tests/unit/RulesElementFactories.test.js tests/unit/CharacterCheckModifiers.test.js tests/unit/CheckModifierLocalizationKeys.test.js`
Expected: FAIL — missing exports, no `skill` on the factory, `_applySituationalCheckModifierElements` undefined,
`advantage` rejected by the modifier-type assert, `LOCAL` lacks `advantage.text` and `automaticFailure.text`.

- [ ] **Step 3: Replace `src/system/ConditionalCheckModifierTypes.js`**

```js
/**
 * The values a conditional check modifier's `modifierType` can take. The single source for both the rules-element
 * editor's options and the actor's modifier lookups: the actor caches conditional modifiers under these exact
 * strings, so a lookup under any other string silently finds nothing. `advantage` stores its level (±1 Advantage,
 * ±2 Greater) in `value`; `automaticFailure` ignores `value`.
 * @type {readonly string[]}
 */
export const CONDITIONAL_CHECK_MODIFIER_TYPES = Object.freeze([
   'damage',
   'dice',
   'expertise',
   'training',
   'healing',
   'advantage',
   'automaticFailure',
]);

/**
 * Conditional check modifier selectors whose keys the user types free-form (a custom trait name, a spell tradition, a
 * situation label). Their keys are compared in camel case, so "Field Medicine" matches "fieldMedicine".
 * @type {readonly string[]}
 */
export const USER_KEYED_CHECK_MODIFIER_SELECTORS = Object.freeze([
   'customTrait',
   'spellTradition',
   'situation',
]);

/**
 * The modifier types each check type reads. A situational modifier is offered to a check only for a type it reads (an
 * Attribute Check has no Damage), and the rules-element editor offers a check type only for the modifier types it
 * reads. Attribute Checks read only `any`-check-type modifiers, so the editor has no `attribute` check type.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const CHECK_TYPE_MODIFIER_TYPES = Object.freeze({
   attack: Object.freeze([
      'damage',
      'dice',
      'expertise',
      'training',
      'advantage',
      'automaticFailure',
   ]),
   attribute: Object.freeze([
      'dice',
      'expertise',
      'training',
      'advantage',
      'automaticFailure',
   ]),
   casting: CONDITIONAL_CHECK_MODIFIER_TYPES,
   item: CONDITIONAL_CHECK_MODIFIER_TYPES,
   resistance: Object.freeze([
      'dice',
      'expertise',
      'advantage',
      'automaticFailure',
   ]),
});

/**
 * The check parameter each summable modifier type adds to when a situational modifier is ticked. Automatic Failure is
 * a flag, not a sum, so it has no entry.
 * @type {Readonly<Record<string, string>>}
 */
export const MODIFIER_TYPE_PARAMETER_KEYS = Object.freeze({
   advantage: 'advantage',
   damage: 'damageMod',
   dice: 'diceMod',
   expertise: 'expertiseMod',
   healing: 'healingMod',
   training: 'trainingMod',
});
```

- [ ] **Step 4: Add `skill` to the element factory**

In `src/document/types/item/rules-element/ConditionalCheckModifier.js`, replace the typedef's property list with:

```js
 * @property {string} operation - The operation to be performed by the Rules Element (conditionalCheckModifier).
 * @property {string} modifierType - The part of the check to modify (damage, dice, advantage, etc.).
 * @property {string} checkType - The type of check modified (any, attack, casting, item, or resistance).
 * @property {string} selector - The condition for modifying the check (any, attribute, trait, situation, etc.).
 * @property {string} key - The specific result of the condition for modifying the check (body, melee, a situation
 * label, etc.).
 * @property {string} skill - For the `situation` selector, the one Skill whose checks offer the modifier ('' = any).
 * @property {number} value - The modifier's amount; for `advantage` its level (±1, ±2); unused by `automaticFailure`.
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
```

and add `skill: '',` after `key: '',` in the returned object.

- [ ] **Step 5: Tag sources and split situational elements in `_applyRulesElements`**

In `CharacterDataModel.js`, change the import to:

```js
import {
   CHECK_TYPE_MODIFIER_TYPES,
   CONDITIONAL_CHECK_MODIFIER_TYPES,
   MODIFIER_TYPE_PARAMETER_KEYS,
   USER_KEYED_CHECK_MODIFIER_SELECTORS,
} from '~/system/ConditionalCheckModifierTypes.js';
```

Replace the inner `processElements` function and its JSDoc with:

```js
      /**
       * Copies a source array of Rules Elements into the shared Rules Elements array, tagging each with the provided
       * category type and the name of the item or effect that owns it (situational modifiers list their sources).
       * Shared by the owned-item pass and the Active Effect passes.
       * @param {object[]} sourceElements - The source Rules Elements array to copy from.
       * @param {string} type - The type by which to categorize the Rules Elements (ability, equipment, effect, or
       * condition).
       * @param {string} sourceName - The name of the owning item or effect.
       */
      function processElements(sourceElements, type, sourceName) {
         /** @type {object[]} Copies of the source elements, safe to tag. */
         const copiedElements = structuredClone(sourceElements);
         for (const element of copiedElements) {
            element.type = type;
            element.sourceName = sourceName;
         }
         rulesElements.push(...copiedElements);
      }
```

In `processItemElements` change the call to `processElements(item.system.rulesElement, type, item.name);`. In the
effect pass change it to `processElements(effect.system.rulesElement, 'effect', effect.name);` and in the condition
pass to `processElements(effect.system.rulesElement, 'condition', effect.name);`.

After `const conditionalCheckModifierElements = [];` add:

```js
         /** @type {object[]} Situational (`situation`-selector) conditional check modifiers, cached apart. */
         const situationalCheckModifierElements = [];
```

Replace the `case 'conditionalCheckModifier': { … }` branch with:

```js
               case 'conditionalCheckModifier': {
                  // Situational modifiers never apply automatically, so they are cached apart from the summed ones.
                  if (element.selector === 'situation') {
                     situationalCheckModifierElements.push(element);
                  }
                  else {
                     conditionalCheckModifierElements.push(element);
                  }
                  break;
               }
```

After `this._applyConditionalCheckModifierElements(conditionalCheckModifierElements);` add
`         this._applySituationalCheckModifierElements(situationalCheckModifierElements);`.

- [ ] **Step 6: Count Automatic Failure as 1 and cache situational elements**

In `_applyConditionalCheckModifierElements`, change `checkTypeMap[selector] += element.value;` to
`checkTypeMap[selector] += this._getConditionalCheckModifierValue(element);` and
`selectorMap[key] += element.value;` to `selectorMap[key] += this._getConditionalCheckModifierValue(element);`.

Add these two methods directly after `_applyConditionalCheckModifierElements`:

```js
   /**
    * Gets the value a Conditional Check Modifier element contributes to a cache. An Automatic Failure element counts
    * as 1 whatever its stored value, so any matching element makes a lookup positive.
    * @param {ConditionalCheckModifierElement} element - The element.
    * @returns {number} The element's contribution.
    * @private
    */
   _getConditionalCheckModifierValue(element) {
      return element.modifierType === 'automaticFailure' ? 1 : element.value;
   }

   /**
    * Caches the situational (`situation`-selector) Conditional Check Modifier Rules Elements apart from the summed
    * modifiers, because they never apply automatically. Each cached entry is `{ checkType, key, label, modifierType,
    * skill, source, value }`: `key` is the camel-case form of the typed `label`, `skill` narrows the entry to checks
    * using one Skill (`''` = any; an element without a `skill` field is cached as `''`), and `source` names the owning
    * item or effect.
    * @param {ConditionalCheckModifierElement[]} elements - The situational elements, each tagged with its `sourceName`.
    * @private
    */
   _applySituationalCheckModifierElements(elements) {
      if (elements.length > 0) {
         this.rulesElementsCache.situationalCheckModifier = elements.map((element) => ({
            checkType: element.checkType,
            key: this._normalizeConditionalCheckModKey('situation', element.key),
            label: element.key,
            modifierType: element.modifierType,
            skill: element.skill ?? '',
            source: element.sourceName,
            value: this._getConditionalCheckModifierValue(element),
         }));
         return;
      }

      this.rulesElementsCache.situationalCheckModifier = false;
   }
```

- [ ] **Step 7: Add the situational lookup and application**

Add this typedef after the `CustomEffectReportData` typedef (before the class JSDoc):

```js
/**
 * A situational check modifier a check offers in its dialog.
 * @typedef {object} SituationalCheckModifier
 * @property {string} key - The camel-case situation key, as `options.situations` stores it.
 * @property {string} label - The situation's display label, as its first source typed it.
 * @property {string} modifierType - One of CONDITIONAL_CHECK_MODIFIER_TYPES.
 * @property {number} value - The summed value of every source sharing this key and modifier type.
 * @property {string[]} sources - The names of the items and effects the modifier comes from.
 */
```

Add these two methods directly after `_getConditionalCheckModsForType`:

```js
   /**
    * Gets the situational check modifiers a check offers in its dialog: those of the check's own type and of `any`,
    * whose modifier type the check reads (CHECK_TYPE_MODIFIER_TYPES), and, for an element narrowed to a Skill, only
    * when the check uses that Skill. Elements sharing a key and a modifier type sum into one entry.
    * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
    * @param {object} [options] - Options for the lookup.
    * @param {string} [options.skill] - The Skill the check uses, if any.
    * @returns {SituationalCheckModifier[]} The applicable entries, in the order their sources were gathered.
    */
   getSituationalCheckModifiers(checkType, { skill } = {}) {
      /** @type {object[]|boolean|undefined} The cached situational elements, if any. */
      const elements = this.rulesElementsCache?.situationalCheckModifier;
      if (!elements) {
         return [];
      }

      /** @type {readonly string[]} The modifier types this check type reads. */
      const modifierTypes = CHECK_TYPE_MODIFIER_TYPES[checkType];

      /** @type {Map<string, SituationalCheckModifier>} The entries keyed by situation key and modifier type. */
      const entries = new Map();
      for (const element of elements) {
         // Skip elements for another check type, a modifier type this check does not read, or another Skill.
         if (
            (element.checkType !== 'any' && element.checkType !== checkType) ||
            !modifierTypes.includes(element.modifierType) ||
            (element.skill !== '' && element.skill !== skill)
         ) {
            continue;
         }

         /** @type {string} The entry identity: one entry per situation key and modifier type. */
         const entryId = `${element.key}.${element.modifierType}`;

         /** @type {SituationalCheckModifier|undefined} The entry already started for this identity, if any. */
         const entry = entries.get(entryId);
         if (entry) {
            entry.value += element.value;
            pushUnique(entry.sources, element.source);
         }
         else {
            entries.set(entryId, {
               key: element.key,
               label: element.label,
               modifierType: element.modifierType,
               sources: [element.source],
               value: element.value,
            });
         }
      }

      return [...entries.values()];
   }

   /**
    * Adds the situational modifiers named in `options.situations` to a check's parameters and records them for the
    * chat card. The keys come from the dialog's ticks or from a caller that names them; nothing applies
    * automatically. Options hold only the always-on values, so recomputing the parameters after a tick or untick
    * never double-counts. A named key that no longer applies (the dialog's Skill changed) is ignored.
    * @param {CheckParameters} parameters - The check parameters, before any total is derived. Modified in place.
    * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
    * @param {string[]} situations - The camel-case keys of the situations to apply.
    * @private
    */
   _applySituationalModifiers(parameters, checkType, situations) {
      /** @type {Map<string, SituationLabel>} The applied situations keyed by situation key, in first-applied order. */
      const applied = new Map();
      for (const modifier of this.getSituationalCheckModifiers(checkType, { skill: parameters.skill })) {
         if (!situations.includes(modifier.key)) {
            continue;
         }

         // Automatic Failure is a flag; every other type adds to its parameter.
         if (modifier.modifierType === 'automaticFailure') {
            parameters.automaticFailure = true;
         }
         else {
            parameters[MODIFIER_TYPE_PARAMETER_KEYS[modifier.modifierType]] += modifier.value;
         }

         if (!applied.has(modifier.key)) {
            applied.set(modifier.key, {
               key: modifier.key,
               label: modifier.label,
            });
         }
      }

      parameters.situations = [...applied.values()];
   }
```

- [ ] **Step 8: Read Advantage and Automatic Failure into options, and apply situations to parameters**

In `getAttributeCheckMod`, replace everything from `// Contaminated creatures have -1 to all dice rolls.` through
`const anyCheckMods = checkMods.any;` (the stale comment block and the declarations it annotates) with:

```js
      /** @type {number} The summed modifier. */
      let retVal = 0;

      // Check for conditional modifiers for this check type.
      /** @type {object|undefined} The cached modifiers of this type, keyed by check type. */
      const checkMods = this._getConditionalCheckModsForType(modifierType);
      if (checkMods) {

         // The editor has no Attribute Check type, so Attribute Checks read only `any`-check-type modifiers.
         /** @type {object|undefined} The `any`-check-type modifiers, keyed by selector. */
         const anyCheckMods = checkMods.any;
```

In `initializeAttributeCheckOptions`, before `return checkOptions;` add:

```js
      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getAttributeCheckMod('advantage', checkOptions.attribute, checkOptions.skill);
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure =
            this.getAttributeCheckMod('automaticFailure', checkOptions.attribute, checkOptions.skill) > 0;
      }
```

In `initializeAttackCheckOptions`, after the `// Damage mod.` block add:

```js
      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getAttackCheckMod(
            'advantage',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getAttackCheckMod(
            'automaticFailure',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         ) > 0;
      }
```

In `initializeCastingCheckOptions`, after the `// Healing mod.` block add:

```js
      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getCastingCheckMod(
            'advantage',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getCastingCheckMod(
            'automaticFailure',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         ) > 0;
      }
```

In `initializeItemCheckOptions`, after the `// Healing mod.` block add:

```js
      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getItemCheckMod(
            'advantage',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getItemCheckMod(
            'automaticFailure',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         ) > 0;
      }
```

In each of `getAttributeCheckParameters`, `getAttackCheckParameters`, `getCastingCheckParameters`,
`getItemCheckParameters`, directly after the `const parameters = create<Type>CheckParameters(options);` line add
(using the matching check type string `'attribute'`, `'attack'`, `'casting'`, `'item'`):

```js

      // Add the situations the options name (the dialog's ticks) before any total is derived.
      this._applySituationalModifiers(parameters, 'attribute', options.situations);
```

- [ ] **Step 9: Localize the two new modifier types**

In `lang/en.json` → `LOCAL`, insert alphabetically:

```json
      "advantage.text": "Advantage",
      "automaticFailure.text": "Automatic Failure",
```

- [ ] **Step 10: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/ConditionalCheckModifierTypes.test.js tests/unit/RulesElementFactories.test.js tests/unit/CharacterCheckModifiers.test.js tests/unit/CheckModifierLocalizationKeys.test.js tests/unit/LocalizationKeys.test.js`
Expected: PASS.

- [ ] **Step 11: Extend the e2e spec**

Append to `tests/e2e/check-advantage.spec.js`:

```js
test.describe('Advantage and Automatic Failure from conditional modifiers', () => {
   test('an effect with Disadvantage raises a rolled check\'s Difficulty', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });
      expect(message.parameters).toMatchObject({
         advantage: -1,
         baseDifficulty: 4,
         difficulty: 5,
      });
   });

   test('opposing Advantage sources cancel', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: 1,
         }),
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });
      expect(message.parameters).toMatchObject({
         advantage: 0,
         baseDifficulty: 4,
         difficulty: 4,
      });
   });

   test('an effect with Automatic Failure fails a rolled check', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'automaticFailure',
         }),
      ]);
      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, {
         attribute: 'body',
         complexity: 1,
      });
      expect(message.parameters.automaticFailure).toBe(true);
      expect(message.results).toMatchObject({
         successes: 0,
         succeeded: false,
      });
   });
});
```

- [ ] **Step 12: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/check-advantage.spec.js tests/e2e/conditional-damage-healing-mods.spec.js tests/e2e/rules-element-crud.spec.js tests/e2e/effect-checks.spec.js`
Expected: all pass.

- [ ] **Step 13: Commit**

```bash
git branch --show-current
git status --short
git add src/system/ConditionalCheckModifierTypes.js src/document/types/item/rules-element/ConditionalCheckModifier.js \
   src/document/types/actor/types/character/CharacterDataModel.js lang/en.json \
   tests/unit/ConditionalCheckModifierTypes.test.js tests/unit/RulesElementFactories.test.js \
   tests/unit/CharacterCheckModifiers.test.js tests/unit/CheckModifierLocalizationKeys.test.js \
   tests/e2e/check-advantage.spec.js
git commit -F - <<'EOF'
feat(rules-element): advantage, automatic failure, and situational check modifiers

Conditional check modifiers gain the advantage and automaticFailure types and
the situation selector; situational elements are cached apart, offered per
check type and Skill, and added to parameters only when ticked.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 4: Resistance checks read conditional check modifiers

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Modify test: `tests/unit/CharacterCheckModifiers.test.js`
- Create test: `tests/e2e/resistance-check-modifiers.spec.js`

**Interfaces:**
- Consumes: `_getConditionalCheckModsForType`, `_getConditionalCheckModsForSelectorKey`, `_applySituationalModifiers`,
  `_applyCheckAdvantage`; `readNewestCheckFlags(page, baseline, type)` (`tests/e2e/checkDialog.js`, Task 2).
- Produces: `getResistanceCheckMod(modifierType: string, resistance: string): number`;
  `initializeResistanceCheckOptions` fills `diceMod`, `expertiseMod`, `advantage`, `automaticFailure` when absent;
  `getResistanceCheckParameters` applies ticked situations. Spec B's Incapacitated/Restrained elements (checkType
  `resistance`, selector `resistance`, key `reflexes`, type `automaticFailure`) resolve through this lookup.

- [ ] **Step 1: Write the failing unit tests**

In `tests/unit/CharacterCheckModifiers.test.js` add the import
`import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';` and append:

```js
describe('Resistance Check conditional modifiers', () => {
   /**
    * Builds a model caching the Resistance-relevant and irrelevant Dice penalties used below.
    * @returns {object} The model instance.
    */
   function resistanceModel() {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            value: -1,
         }),
         checkModifier({
            checkType: 'resistance',
            value: -1,
         }),
         checkModifier({
            checkType: 'resistance',
            key: 'reflexes',
            selector: 'resistance',
            value: -2,
         }),
         checkModifier({
            key: 'body',
            selector: 'attribute',
            value: -5,
         }),
         checkModifier({
            key: 'athletics',
            selector: 'skill',
            value: -7,
         }),
      ]);
      return model;
   }

   it('reads any/any, resistance/any, and resistance keyed by the rolled Resistance, never attribute or skill', () => {
      /** @type {object} The model under test. */
      const model = resistanceModel();
      expect(model.getResistanceCheckMod('dice', 'reflexes')).toBe(-4);
      expect(model.getResistanceCheckMod('dice', 'willpower')).toBe(-2);
   });

   it('initializes Resistance Check options from the cache unless they are provided', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            value: -1,
         }),
         checkModifier({
            checkType: 'resistance',
            key: 'reflexes',
            modifierType: 'automaticFailure',
            selector: 'resistance',
         }),
         checkModifier({
            modifierType: 'expertise',
            value: 2,
         }),
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      expect(model.initializeResistanceCheckOptions({ resistance: 'reflexes' })).toMatchObject({
         advantage: -1,
         automaticFailure: true,
         diceMod: -1,
         expertiseMod: 2,
      });
      expect(model.initializeResistanceCheckOptions({ resistance: 'willpower' }).automaticFailure).toBe(false);
      expect(model.initializeResistanceCheckOptions({
         diceMod: 3,
         resistance: 'reflexes',
      }).diceMod).toBe(3);
   });

   it('applies ticked situations and Advantage to the Resistance Check parameters', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            checkType: 'resistance',
            key: 'Braced',
            selector: 'situation',
            value: 1,
         }),
      ]);
      /** @type {object} Reflexes-check parameters with Advantage and the situation ticked. */
      const parameters = model.getResistanceCheckParameters(createResistanceCheckOptions({
         advantage: 1,
         resistance: 'reflexes',
         situations: ['braced'],
      }));
      expect(parameters).toMatchObject({
         baseDifficulty: 4,
         diceMod: 1,
         difficulty: 3,
         resistanceDice: 4,
         totalDice: 5,
      });
   });
});
```

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run tests/unit/CharacterCheckModifiers.test.js`
Expected: FAIL — `getResistanceCheckMod` is not a function; `initializeResistanceCheckOptions` leaves `diceMod` 0.

- [ ] **Step 3: Implement Resistance-check modifiers**

Replace `initializeResistanceCheckOptions` (method and JSDoc) with:

```js
   /**
    * Populates Resistance Check Options with this Character's conditional modifiers, unless specific overrides were
    * applied. Training does not apply to Resistance Checks.
    * @param {object} options - Options for the Check.
    * @returns {ResistanceCheckOptions} The new, fully-populated Resistance Check Options.
    */
   initializeResistanceCheckOptions(options) {
      /** @type {ResistanceCheckOptions} The options, with every unset field at its default. */
      const checkOptions = createResistanceCheckOptions(options);

      // Dice mod.
      if (options.diceMod === undefined) {
         checkOptions.diceMod = this.getResistanceCheckMod('dice', checkOptions.resistance);
      }

      // Expertise mod.
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod = this.getResistanceCheckMod('expertise', checkOptions.resistance);
      }

      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getResistanceCheckMod('advantage', checkOptions.resistance);
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getResistanceCheckMod('automaticFailure', checkOptions.resistance) > 0;
      }

      return checkOptions;
   }

   /**
    * Gets the modifier for a specific aspect of a Resistance Check. A Resistance Check has no Attribute or Skill, so
    * of the `any`-check-type modifiers only the `any` selector applies; `resistance`-check-type modifiers apply
    * through the `any` selector and through the `resistance` selector keyed by the rolled Resistance.
    * @param {string} modifierType - The modifier type to check for.
    * @param {string} resistance - The Resistance being rolled (reflexes, resilience, or willpower).
    * @returns {number} The modifier to apply to this aspect of the check.
    */
   getResistanceCheckMod(modifierType, resistance) {
      /** @type {number} The summed modifier. */
      let retVal = 0;

      // If there are any conditional modifiers for this modifier type.
      /** @type {object|undefined} The cached modifiers of this type, keyed by check type. */
      const checkMods = this._getConditionalCheckModsForType(modifierType);
      if (checkMods) {

         // Get mods that apply to any check.
         if (checkMods.any?.any) {
            retVal += checkMods.any.any;
         }

         // Get mods that apply to Resistance Checks.
         /** @type {object|undefined} The `resistance`-check-type modifiers, keyed by selector. */
         const resistanceCheckMods = checkMods.resistance;
         if (resistanceCheckMods) {

            // Get mods that apply to the rolled Resistance.
            retVal += this._getConditionalCheckModsForSelectorKey(resistanceCheckMods, 'resistance', resistance);

            // Get mods that apply to any Resistance Check.
            if (resistanceCheckMods.any) {
               retVal += resistanceCheckMods.any;
            }
         }
      }

      return retVal;
   }
```

In `getResistanceCheckParameters`, directly after `const parameters = createResistanceCheckParameters(options);` add:

```js

      // Add the situations the options name (the dialog's ticks) before any total is derived.
      this._applySituationalModifiers(parameters, 'resistance', options.situations);
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/CharacterCheckModifiers.test.js`
Expected: PASS.

- [ ] **Step 5: Write the e2e spec**

Create `tests/e2e/resistance-check-modifiers.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { forceDice, resetDice } from './dice.js';
import { readNewestCheckFlags } from './checkDialog.js';

/**
 * Resistance Checks read conditional check modifiers: `any`-check penalties (Abjuration of the Arbiter's dice
 * penalty) and `resistance`-check modifiers keyed by the rolled Resistance, including Automatic Failure.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Resistance Modifiers Actor';

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
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Rebuilds the actor (Body, Mind, and Soul 4, so Reflexes and Willpower are 6) with one effect carrying the given
 * rules elements.
 * @param {object[]} rulesElement - The effect's rules elements (a uuid is generated for each).
 * @returns {Promise<void>} Resolves once the actor and effect exist.
 */
async function seedActor(rulesElement) {
   await page.evaluate(async ({ actorName, elements }) => {
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
         system: {
            attribute: {
               body: { baseValue: 4 },
               mind: { baseValue: 4 },
               soul: { baseValue: 4 },
            },
         },
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Resistance Effect',
            type: 'effect',
            system: {
               rulesElement: elements.map((element) => ({
                  ...element,
                  uuid: foundry.utils.randomID(),
               })),
            },
         },
      ]);
   }, {
      actorName: ACTOR_NAME,
      elements: rulesElement,
   });
}

/**
 * Rolls a Resistance Check without the dialog and returns the created message.
 * @param {object} options - The Resistance Check options.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The new message's id, subtype,
 * parameters, and results.
 */
async function rollResistanceCheck(options) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await page.evaluate(async ({ actorName, checkOptions }) => {
      await game.actors.getName(actorName).system.rollResistanceCheck(checkOptions);
   }, {
      actorName: ACTOR_NAME,
      checkOptions: options,
   });

   return readNewestCheckFlags(page, baseline, 'resistanceCheck');
}

test('a Resistance Check picks up an any-check dice penalty and a penalty keyed to its Resistance', async () => {
   await seedActor([
      {
         checkType: 'any',
         key: '',
         modifierType: 'dice',
         operation: 'conditionalCheckModifier',
         selector: 'any',
         skill: '',
         value: -1,
      },
      {
         checkType: 'resistance',
         key: 'reflexes',
         modifierType: 'dice',
         operation: 'conditionalCheckModifier',
         selector: 'resistance',
         skill: '',
         value: -1,
      },
   ]);

   /** @type {{reflexes: number, willpower: number}} The initialized Dice mod per Resistance. */
   const diceMods = await page.evaluate((actorName) => {
      /** @type {TitanActor} The seeded actor. */
      const actor = game.actors.getName(actorName);
      return {
         reflexes: actor.system.initializeResistanceCheckOptions({ resistance: 'reflexes' }).diceMod,
         willpower: actor.system.initializeResistanceCheckOptions({ resistance: 'willpower' }).diceMod,
      };
   }, ACTOR_NAME);
   expect(diceMods).toEqual({
      reflexes: -2,
      willpower: -1,
   });

   /** @type {{id: string, parameters: object, results: object}} The rolled Reflexes check's message. */
   const message = await rollResistanceCheck({ resistance: 'reflexes' });
   expect(message.parameters.resistanceDice).toBeGreaterThan(2);
   expect(message.parameters.diceMod).toBe(-2);
   expect(message.parameters.totalDice).toBe(message.parameters.resistanceDice - 2);
});

test('an Automatic Failure on Reflexes fails a rolled Reflexes check and reduces no damage', async () => {
   await seedActor([
      {
         checkType: 'resistance',
         key: 'reflexes',
         modifierType: 'automaticFailure',
         operation: 'conditionalCheckModifier',
         selector: 'resistance',
         skill: '',
         value: 1,
      },
   ]);
   await forceDice(page, [
      6,
      6,
      6,
      6,
      6,
      6,
   ]);
   /** @type {{id: string, parameters: object, results: object}} The rolled Reflexes check's message. */
   const message = await rollResistanceCheck({
      complexity: 1,
      damageToReduce: 3,
      resistance: 'reflexes',
   });
   expect(message.parameters.automaticFailure).toBe(true);
   expect(message.results).toMatchObject({
      damageTaken: 3,
      successes: 0,
      succeeded: false,
   });
});
```

- [ ] **Step 6: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/resistance-check-modifiers.spec.js tests/e2e/item-check-damage-reduction.spec.js tests/e2e/checks-integration.spec.js`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git status --short
git add src/document/types/actor/types/character/CharacterDataModel.js tests/unit/CharacterCheckModifiers.test.js \
   tests/e2e/resistance-check-modifiers.spec.js
git commit -F - <<'EOF'
feat(check): Resistance checks read conditional check modifiers

Resistance Checks read any/any, resistance/any, and resistance modifiers
keyed by the rolled Resistance for dice, expertise, advantage, and automatic
failure, and apply ticked situations.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 5: The check-options setting becomes never / situational / always

**Files:**
- Create: `src/helpers/utility-functions/ResolveCheckOptionsMode.js`
- Modify: `src/helpers/utility-functions/ShouldGetCheckOptions.js`, `src/system/SystemSettings.js`
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (the five `request<Type>Check` methods)
- Modify: `lang/en.json` (`SETTINGS.getCheckOptions`)
- Modify e2e (value sweep): `tests/e2e/attack-tags.spec.js`, `tests/e2e/checkDialog.js`,
  `tests/e2e/checks-dialog.spec.js`, `tests/e2e/embedded-context-check-parity.spec.js`,
  `tests/e2e/embedded-context-effects.spec.js`, `tests/e2e/embedded-context-items.spec.js`,
  `tests/e2e/interaction-dialogs.spec.js`, `tests/e2e/item-sheet-roll.spec.js`, `tests/e2e/localization.spec.js`,
  `tests/e2e/player-hud-action-menu.spec.js`
- Modify test: `tests/unit/CheckModifierLocalizationKeys.test.js`
- Create tests: `tests/unit/ShouldGetCheckOptions.test.js`, `tests/e2e/check-options-setting.spec.js`

**Interfaces:**
- Consumes: `getSituationalCheckModifiers` (Task 3), the `initialize<Type>CheckOptions` methods.
- Produces: `resolveCheckOptionsMode(value: unknown): string` (`true`/`'true'` → `always`; `never`, `situational`,
  `always` → themselves; any other value, `undefined` included → `situational`);
  `shouldGetCheckOptions(hasSituationalModifiers: boolean): boolean`. Setting `titan.getCheckOptions` is a String
  choice with default `situational`. Every `request<Type>Check` returns early on invalid options.

- [ ] **Step 1: Write the failing unit tests**

(a) Create `tests/unit/ShouldGetCheckOptions.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';
import resolveCheckOptionsMode from '~/helpers/utility-functions/ResolveCheckOptionsMode.js';
import shouldGetCheckOptions from '~/helpers/utility-functions/ShouldGetCheckOptions.js';

vi.mock('~/helpers/utility-functions/IsModifierActive.js', () => ({
   default: vi.fn(),
}));

/** @type {*} The value the stubbed `getCheckOptions` setting returns. */
let storedMode;

beforeEach(() => {
   globalThis.game = {
      settings: {
         get: () => storedMode,
      },
   };
});

afterEach(() => {
   delete globalThis.game;
   vi.mocked(isModifierActive).mockReset();
});

describe('shouldGetCheckOptions', () => {
   it.each([
      {
         mode: 'never',
         situational: false,
         modifier: false,
         dialog: false,
      },
      {
         mode: 'never',
         situational: true,
         modifier: false,
         dialog: false,
      },
      {
         mode: 'never',
         situational: false,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'never',
         situational: true,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'situational',
         situational: false,
         modifier: false,
         dialog: false,
      },
      {
         mode: 'situational',
         situational: true,
         modifier: false,
         dialog: true,
      },
      {
         mode: 'situational',
         situational: false,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'situational',
         situational: true,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'always',
         situational: false,
         modifier: false,
         dialog: true,
      },
      {
         mode: 'always',
         situational: true,
         modifier: false,
         dialog: true,
      },
      {
         mode: 'always',
         situational: false,
         modifier: true,
         dialog: false,
      },
      {
         mode: 'always',
         situational: true,
         modifier: true,
         dialog: true,
      },
   ])('$mode, situational $situational, modifier key $modifier → dialog $dialog', ({
      mode,
      situational,
      modifier,
      dialog,
   }) => {
      storedMode = mode;
      vi.mocked(isModifierActive).mockReturnValue(modifier);
      expect(shouldGetCheckOptions(situational)).toBe(dialog);
   });

   it('reads a stored Boolean true as always and a stored false as situational', () => {
      vi.mocked(isModifierActive).mockReturnValue(false);
      storedMode = true;
      expect(shouldGetCheckOptions(false)).toBe(true);
      storedMode = 'false';
      expect(shouldGetCheckOptions(false)).toBe(false);
      expect(shouldGetCheckOptions(true)).toBe(true);
   });
});

describe('resolveCheckOptionsMode', () => {
   it.each([
      {
         value: true,
         mode: 'always',
      },
      {
         value: 'true',
         mode: 'always',
      },
      {
         value: false,
         mode: 'situational',
      },
      {
         value: 'false',
         mode: 'situational',
      },
      {
         value: 'never',
         mode: 'never',
      },
      {
         value: 'situational',
         mode: 'situational',
      },
      {
         value: 'always',
         mode: 'always',
      },
      {
         value: undefined,
         mode: 'situational',
      },
      {
         value: null,
         mode: 'situational',
      },
      {
         value: '',
         mode: 'situational',
      },
      {
         value: 'sometimes',
         mode: 'situational',
      },
      {
         value: 1,
         mode: 'situational',
      },
   ])('$value resolves to $mode', ({ value, mode }) => {
      expect(resolveCheckOptionsMode(value)).toBe(mode);
   });
});
```

(b) In `tests/unit/CheckModifierLocalizationKeys.test.js`, append:

```js
/**
 * The `SETTINGS.getCheckOptions` entries the setting's name, hint, and three choices render through.
 * @type {string[]}
 */
const CHECK_OPTIONS_SETTING_KEYS = [
   'label',
   'hint',
   'never',
   'situational',
   'always',
];

describe('check-options setting localization keys', () => {
   it.each(CHECK_OPTIONS_SETTING_KEYS)('SETTINGS.getCheckOptions defines %s', (key) => {
      expect(lang.SETTINGS.getCheckOptions[key]).toBeTypeOf('string');
      expect(lang.SETTINGS.getCheckOptions[key].length).toBeGreaterThan(0);
   });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ShouldGetCheckOptions.test.js tests/unit/CheckModifierLocalizationKeys.test.js`
Expected: FAIL — cannot resolve `ResolveCheckOptionsMode.js`; `SETTINGS.getCheckOptions` lacks `never`,
`situational`, and `always`.

- [ ] **Step 3: Implement the resolver and the decision**

Create `src/helpers/utility-functions/ResolveCheckOptionsMode.js`:

```js
/**
 * The choices the `getCheckOptions` setting offers.
 * @type {readonly string[]}
 */
const CHECK_OPTIONS_MODES = Object.freeze([
   'never',
   'situational',
   'always',
]);

/**
 * Resolves the stored `getCheckOptions` value to one of its choices. Client storage can hold a Boolean for this
 * setting, and a String-typed setting returns a stored Boolean as its JSON text: `true` (or `'true'`) maps to
 * `always`, and every other value outside the three choices — `false`, `'false'`, `undefined`, or an unknown string —
 * maps to the default `situational`, so a caller always receives a valid choice.
 * @param {*} value - The stored setting value.
 * @returns {string} The check-options mode: `never`, `situational`, or `always`.
 */
export default function resolveCheckOptionsMode(value) {
   if (value === true || value === 'true') {
      return 'always';
   }

   return CHECK_OPTIONS_MODES.includes(value) ? value : 'situational';
}
```

Replace `src/helpers/utility-functions/ShouldGetCheckOptions.js` with:

```js
import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';
import resolveCheckOptionsMode from '~/helpers/utility-functions/ResolveCheckOptionsMode.js';

/**
 * Determines whether a check opens its options dialog before rolling. The `getCheckOptions` setting chooses never,
 * situational (only when a situational modifier applies to the check), or always. Holding the modifier key inverts the
 * choice, treating `situational` as "no dialog", but a check with situational modifiers always hedges toward showing
 * the dialog:
 * never — no key: no dialog; key: dialog.
 * situational — no key: dialog only if situational modifiers apply; key: dialog.
 * always — no key: dialog; key: dialog only if situational modifiers apply.
 * @param {boolean} hasSituationalModifiers - Whether any situational modifier applies to the check.
 * @returns {boolean} Whether to open the check options dialog.
 */
export default function shouldGetCheckOptions(hasSituationalModifiers) {
   /** @type {string} The resolved setting choice. */
   const mode = resolveCheckOptionsMode(game.settings.get('titan', 'getCheckOptions'));

   /** @type {boolean} Whether the modifier key is held. */
   const modifierActive = isModifierActive();

   switch (mode) {
      case 'never': {
         return modifierActive;
      }
      case 'always': {
         return modifierActive ? hasSituationalModifiers : true;
      }
      default: {
         return modifierActive || hasSituationalModifiers;
      }
   }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/ShouldGetCheckOptions.test.js`
Expected: PASS. (`CheckModifierLocalizationKeys.test.js` passes after Step 5.)

- [ ] **Step 5: Register the choice setting and rewrite stored values outside the choices**

In `src/system/SystemSettings.js` add `import resolveCheckOptionsMode from
'~/helpers/utility-functions/ResolveCheckOptionsMode.js';` after the existing imports, and replace the
`getCheckOptions` registration with:

```js
   // Get Check Options: when a check opens its options dialog before rolling.
   game.settings.register('titan', 'getCheckOptions', {
      choices: {
         never: 'SETTINGS.getCheckOptions.never',
         situational: 'SETTINGS.getCheckOptions.situational',
         always: 'SETTINGS.getCheckOptions.always',
      },
      config: true,
      default: 'situational',
      hint: 'SETTINGS.getCheckOptions.hint',
      name: 'SETTINGS.getCheckOptions.label',
      scope: 'client',
      type: String,
   });

   // A stored value outside the three choices (client storage can hold a Boolean) is rewritten to the choice it
   // resolves to, so the settings window shows a valid option.
   /** @type {*} The stored setting value, possibly a Boolean or an unknown string. */
   const storedCheckOptionsMode = game.settings.get('titan', 'getCheckOptions');

   /** @type {string} The choice the stored value resolves to. */
   const checkOptionsMode = resolveCheckOptionsMode(storedCheckOptionsMode);
   if (checkOptionsMode !== storedCheckOptionsMode) {
      game.settings.set('titan', 'getCheckOptions', checkOptionsMode);
   }
```

In `lang/en.json`, replace the `SETTINGS.getCheckOptions` object with:

```json
      "getCheckOptions": {
         "label": "Show the Check Options Dialog",
         "hint": "When to show the options dialog before rolling a Check. Hold Shift to invert this; while Shift is held, a Check with situational modifiers still shows the dialog.",
         "never": "Never",
         "situational": "When Situational Modifiers Apply",
         "always": "Always"
      },
```

- [ ] **Step 6: Decide the dialog per check in the five `request<Type>Check` methods**

Replace `requestAttributeCheck` (method and JSDoc) with:

```js
   /**
    * Requests an Attribute Check from this Character. Rolls straight to chat or opens the options dialog, as the
    * `getCheckOptions` setting, the modifier key, and the check's situational modifiers decide.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestAttributeCheck(options) {
      // Invalid options fail here, before the situational lookup reads them.
      if (!this.validateAttributeCheckOptions(options)) {
         return;
      }

      /** @type {boolean} Whether any situational modifier applies to the check. */
      const hasSituationalModifiers = this.getSituationalCheckModifiers(
         'attribute',
         { skill: this.initializeAttributeCheckOptions(options).skill },
      ).length > 0;

      // Roll straight to chat, or open the dialog for adjusting the check.
      if (!shouldGetCheckOptions(hasSituationalModifiers)) {
         await this.rollAttributeCheck(options);
      }
      else {
         this._createAttributeCheckDialog(options);
      }
   }
```

Replace `requestResistanceCheck` with the same structure using `validateResistanceCheckOptions`,
`rollResistanceCheck`, `_createResistanceCheckDialog`, the JSDoc type `ResistanceCheckOptions`, the summary
"Requests a Resistance Check from this Character.", and:

```js
      /** @type {boolean} Whether any situational modifier applies to the check. */
      const hasSituationalModifiers = this.getSituationalCheckModifiers('resistance').length > 0;
```

Replace `requestAttackCheck`, `requestCastingCheck`, and `requestItemCheck` with the same structure as
`requestAttributeCheck`, using respectively `validateAttackCheckOptions` / `initializeAttackCheckOptions` /
`'attack'` / `rollAttackCheck` / `_createAttackCheckDialog`; `validateCastingCheckOptions` /
`initializeCastingCheckOptions` / `'casting'` / `rollCastingCheck` / `_createCastingCheckDialog`; and
`validateItemCheckOptions` / `initializeItemCheckOptions` / `'item'` / `rollItemCheck` / `_createItemCheckDialog`,
with the JSDoc summary naming the check type and the options typedef matching it.

- [ ] **Step 7: Sweep the e2e specs to the new values**

Replace every `game.settings.set('titan', 'getCheckOptions', false)` with
`game.settings.set('titan', 'getCheckOptions', 'never')` and every `… true)` with `… 'always')` in these files and
lines: `tests/e2e/attack-tags.spec.js` 118 (false), 267 (true); `tests/e2e/checkDialog.js` 60 (true);
`tests/e2e/checks-dialog.spec.js` 105; `tests/e2e/embedded-context-check-parity.spec.js` 143, 162, 172;
`tests/e2e/embedded-context-effects.spec.js` 115, 138, 150; `tests/e2e/embedded-context-items.spec.js` 271, 308, 320;
`tests/e2e/interaction-dialogs.spec.js` 119 (false), 150 (true); `tests/e2e/item-sheet-roll.spec.js` 105, 120;
`tests/e2e/localization.spec.js` 142 (true), 150 (false), 165 (true), 191 (false);
`tests/e2e/player-hud-action-menu.spec.js` 41 (false).

Fix the comments these values make stale:

- `tests/e2e/attack-tags.spec.js` lines 113-115 become:
  `   // Unconditionally restore the check-options dialog gate: a mid-test failure after the gate is set to always`,
  `   // must not leak \`getCheckOptions: 'always'\` into specs that rely on the no-dialog setting (house pattern per`,
  `   // checks-dialog.spec.js).`
- `tests/e2e/checkDialog.js` line 6-7 become:
  ` * Each \`request<Type>Check\` opens its dialog when the \`titan.getCheckOptions\` setting is \`always\` (and no`,
  ` * modifier key inverts it — headless Playwright never holds one). Every dialog extends \`TitanDialog\``
- `tests/e2e/player-hud-action-menu.spec.js` line 16 becomes
  `/** @type {string} The client's getCheckOptions choice before this file forced direct rolls. */`.

Verify nothing is missed: `grep -rn "getCheckOptions', \(true\|false\)" tests/` must print nothing.

- [ ] **Step 8: Write the e2e spec**

Create `tests/e2e/check-options-setting.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { GM_USERS } from './users.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * The `getCheckOptions` choice: under the default `situational` a check opens its dialog only when a situational
 * modifier applies, and a Boolean held in client storage is rewritten to its choice when the world loads.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Check Options Actor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

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
   await page.evaluate(async () => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
   });
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('the situational setting opens the dialog only for a check with a situational modifier', async () => {
   // Seed one situational modifier, choose the situational setting, and request a check. The effect is permanent:
   // a timed effect's `disabled` follows its remaining duration, so disabling it below would not take.
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Underwater',
            type: 'effect',
            system: {
               duration: {
                  type: 'permanent',
               },
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'Underwater',
                     modifierType: 'dice',
                     operation: 'conditionalCheckModifier',
                     selector: 'situation',
                     skill: '',
                     uuid: 'e2e-check-options-underwater',
                     value: -1,
                  },
               ],
            },
         },
      ]);
      await actor.system.requestAttributeCheck({ attribute: 'body' });
   }, ACTOR_NAME);

   // With a situational modifier the dialog opens.
   /** @type {import('@playwright/test').Locator} The Attribute Check dialog window. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();
   await closeAllApps(page);
   await expect(dialog).toHaveCount(0);

   // Disable the effect: no situational modifier remains, so the same request rolls straight to chat.
   /** @type {number} The chat-message count before the second request. */
   const baseline = await page.evaluate(async (actorName) => {
      /** @type {TitanActor} The seeded actor. */
      const actor = game.actors.getName(actorName);
      await actor.effects.getName('E2E Underwater').update({ disabled: true });
      await titanWait(
         () => actor.system.getSituationalCheckModifiers('attribute', { skill: 'none' }).length === 0,
         { message: 'the situational modifier is gone' },
      );

      /** @type {number} The chat-message count before the request. */
      const size = game.messages.size;
      await actor.system.requestAttributeCheck({ attribute: 'body' });
      return size;
   }, ACTOR_NAME);
   await expect.poll(
      () => page.evaluate(
         (base) => game.messages.contents.slice(base).some((message) => message.type === 'attributeCheck'),
         baseline,
      ),
      { message: 'the check rolled straight to chat' },
   ).toBe(true);

   // The roll finished after the dialog decision, so no dialog opened for it.
   await expect(dialog).toHaveCount(0);
});

test('a stored Boolean is rewritten to its choice when the world loads', async ({ browser }) => {
   /** @type {import('@playwright/test').Page} A second client whose storage holds a Boolean for the setting. */
   const legacyPage = await browser.newPage();
   try {
      // Seed the Boolean before Foundry's scripts run on each navigation of this client.
      await legacyPage.addInitScript(() => {
         localStorage.setItem('titan.getCheckOptions', 'true');
      });
      await login(legacyPage, GM_USERS[1].name);

      /** @type {{raw: string|null, value: string}} The raw stored text and the setting's resolved value. */
      const stored = await legacyPage.evaluate(() => ({
         raw: localStorage.getItem('titan.getCheckOptions'),
         value: game.settings.get('titan', 'getCheckOptions'),
      }));
      expect(stored).toEqual({
         raw: '"always"',
         value: 'always',
      });
   }
   finally {
      await legacyPage.close();
   }
});
```

- [ ] **Step 9: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/check-options-setting.spec.js tests/e2e/attack-tags.spec.js tests/e2e/checks-dialog.spec.js tests/e2e/embedded-context-check-parity.spec.js tests/e2e/embedded-context-effects.spec.js tests/e2e/embedded-context-items.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/item-sheet-roll.spec.js tests/e2e/localization.spec.js tests/e2e/player-hud-action-menu.spec.js tests/e2e/integration-manifest.spec.js`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git branch --show-current
git status --short
git add src/helpers/utility-functions/ResolveCheckOptionsMode.js src/helpers/utility-functions/ShouldGetCheckOptions.js \
   src/system/SystemSettings.js src/document/types/actor/types/character/CharacterDataModel.js lang/en.json \
   tests/unit/ShouldGetCheckOptions.test.js tests/unit/CheckModifierLocalizationKeys.test.js \
   tests/e2e/check-options-setting.spec.js tests/e2e/attack-tags.spec.js \
   tests/e2e/checkDialog.js tests/e2e/checks-dialog.spec.js tests/e2e/embedded-context-check-parity.spec.js \
   tests/e2e/embedded-context-effects.spec.js tests/e2e/embedded-context-items.spec.js \
   tests/e2e/interaction-dialogs.spec.js tests/e2e/item-sheet-roll.spec.js tests/e2e/localization.spec.js \
   tests/e2e/player-hud-action-menu.spec.js
git commit -F - <<'EOF'
feat(settings): the check-options dialog setting is never, situational, or always

The default opens the dialog only when a situational modifier applies; the
modifier key inverts the choice but hedges toward the dialog for situational
checks; a stored true reads as always, any other value outside the choices as
situational, and such a value is rewritten at init.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 6: Check dialogs — Advantage, Automatic Failure, effective Difficulty, situational checkboxes

**Files:**
- Create: `src/check/dialog/CheckDialogAdvantageField.svelte`, `src/check/dialog/CheckDialogAutomaticFailureField.svelte`,
  `src/check/dialog/CheckDialogDifficultySummary.svelte`, `src/check/dialog/CheckDialogSituationsField.svelte`,
  `src/check/dialog/GroupSituationalModifiers.js`
- Modify: `src/check/dialog/CheckDialogShell.svelte`, `src/check/dialog/CheckDialogBase.svelte`
- Modify: `src/check/types/attribute-check/dialog/AttributeCheckDialog.js` and `AttributeCheckDialogShell.svelte`,
  `src/check/types/resistance-check/dialog/ResistanceCheckDialog.js` and `ResistanceCheckDialogShell.svelte`,
  `src/check/types/attack-check/dialog/AttackCheckDialog.js` and `AttackCheckDialogShell.svelte`,
  `src/check/types/casting-check/dialog/CastingCheckDialog.js` and `CastingCheckDialogShell.svelte`,
  `src/check/types/item-check/dialog/ItemCheckDialog.js` and `ItemCheckDialogShell.svelte`
- Modify: `lang/en.json`
- Modify test: `tests/unit/CheckModifierLocalizationKeys.test.js`
- Create tests: `tests/unit/check/group-situational-modifiers.test.js`, `tests/e2e/check-dialog-advantage.spec.js`

**Interfaces:**
- Consumes: `ADVANTAGE_LEVEL_OPTIONS`, `clampAdvantage`, `getAdvantageLabel` (Task 1); `getSituationalCheckModifiers`
  and `SituationalCheckModifier` (Task 3); `ReactiveDocument` (`src/document/reactive/ReactiveDocument.svelte.js`);
  the e2e helpers `openCheckDialog`, `setSelectField`, `setCheckbox`, `readSummary`, `clickRoll`,
  `readNewestCheckFlags` (`tests/e2e/checkDialog.js`).
- Produces: `groupSituationalModifiers(modifiers): SituationGroup[]` and
  `describeSituationalModifier(modifierType, value): string`. `CheckDialogShell` takes a `checkType` prop and sets
  contexts `'checkActor'` (a `ReactiveDocument` bridge over the rolling Actor, `undefined` without one) and
  `'checkType'`. The situational list (`CheckDialogBase`) and every shell's parameter recompute read the Actor through
  that bridge, so the dialog follows the Actor's own updates and its item and effect changes while open. Test ids:
  `check-field-advantage`, `check-field-automaticFailure`, `check-summary-difficulty` (labeled "Effective
  Difficulty", key `effectiveDifficulty`), `check-field-situations`, `situation-row-<key>`, `situation-toggle-<key>`.

- [ ] **Step 1: Write the failing unit tests**

Create `tests/unit/check/group-situational-modifiers.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import groupSituationalModifiers, {
   describeSituationalModifier,
} from '~/check/dialog/GroupSituationalModifiers.js';

beforeAll(() => {
   // localize() reads game.i18n at call time; the pass-through stand-in makes each label its LOCAL key.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
   };
});

afterAll(() => {
   delete globalThis.game;
});

describe('describeSituationalModifier', () => {
   it('names Advantage levels, Automatic Failure, and signed sums', () => {
      expect(describeSituationalModifier('advantage', -3)).toBe('LOCAL.greaterDisadvantage.text');
      expect(describeSituationalModifier('automaticFailure', 1)).toBe('LOCAL.automaticFailure.text');
      expect(describeSituationalModifier('dice', -1)).toBe('-1 LOCAL.dice.text');
      expect(describeSituationalModifier('damage', 2)).toBe('+2 LOCAL.damage.text');
   });
});

describe('groupSituationalModifiers', () => {
   it('groups modifiers by key in first-seen order with their descriptions and unique sources', () => {
      expect(groupSituationalModifiers([
         {
            key: 'underwater',
            label: 'Underwater',
            modifierType: 'dice',
            sources: ['Pool'],
            value: -1,
         },
         {
            key: 'jump',
            label: 'Jump',
            modifierType: 'automaticFailure',
            sources: ['Plate'],
            value: 1,
         },
         {
            key: 'underwater',
            label: 'Underwater',
            modifierType: 'advantage',
            sources: [
               'Pool',
               'Tide',
            ],
            value: -1,
         },
      ])).toEqual([
         {
            key: 'underwater',
            label: 'Underwater',
            modifiers: [
               '-1 LOCAL.dice.text',
               'LOCAL.disadvantage.text',
            ],
            sources: [
               'Pool',
               'Tide',
            ],
         },
         {
            key: 'jump',
            label: 'Jump',
            modifiers: ['LOCAL.automaticFailure.text'],
            sources: ['Plate'],
         },
      ]);
   });
});
```

In `tests/unit/CheckModifierLocalizationKeys.test.js`, replace the `LOCAL_KEYS` array with:

```js
const LOCAL_KEYS = [
   'advantage.text',
   'automaticFailure.text',
   'check.advantage.desc.text',
   'check.automaticFailure.desc.text',
   'check.effectiveDifficulty.desc.text',
   'disadvantage.text',
   'effectiveDifficulty.text',
   'greaterAdvantage.text',
   'greaterDisadvantage.text',
   'noAdvantage.text',
   'situationalModifiers.text',
];
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/check/group-situational-modifiers.test.js tests/unit/CheckModifierLocalizationKeys.test.js`
Expected: FAIL — cannot resolve `GroupSituationalModifiers.js`; `LOCAL` lacks the nine dialog keys.

- [ ] **Step 3: Implement the grouping helper**

Create `src/check/dialog/GroupSituationalModifiers.js`:

```js
import { getAdvantageLabel } from '~/check/ApplyAdvantage.js';
import localize from '~/helpers/utility-functions/Localize.js';
import pushUnique from '~/helpers/utility-functions/PushUnique.js';

/**
 * One checkbox in a check dialog: every situational modifier sharing a key, ticked together.
 * @typedef {object} SituationGroup
 * @property {string} key - The camel-case situation key written to `options.situations`.
 * @property {string} label - The situation's display label.
 * @property {string[]} modifiers - A localized description of each modifier the situation applies.
 * @property {string[]} sources - The names of the items and effects the situation comes from.
 */

/**
 * Describes what one situational modifier does to a check, e.g. "Greater Disadvantage" or "-1 Dice".
 * @param {string} modifierType - One of CONDITIONAL_CHECK_MODIFIER_TYPES.
 * @param {number} value - The modifier's summed value.
 * @returns {string} The localized description.
 */
export function describeSituationalModifier(modifierType, value) {
   switch (modifierType) {
      case 'advantage': {
         return localize(getAdvantageLabel(value));
      }
      case 'automaticFailure': {
         return localize('automaticFailure');
      }
      default: {
         return `${value > 0 ? '+' : ''}${value} ${localize(modifierType)}`;
      }
   }
}

/**
 * Groups a check's situational modifiers by key, one group per dialog checkbox, in first-seen order.
 * @param {SituationalCheckModifier[]} modifiers - The entries `getSituationalCheckModifiers` returned.
 * @returns {SituationGroup[]} The groups.
 */
export default function groupSituationalModifiers(modifiers) {
   /** @type {Map<string, SituationGroup>} The groups keyed by situation key. */
   const groups = new Map();
   for (const modifier of modifiers) {
      /** @type {SituationGroup|undefined} The group for this modifier's key, once started. */
      let group = groups.get(modifier.key);
      if (!group) {
         group = {
            key: modifier.key,
            label: modifier.label,
            modifiers: [],
            sources: [],
         };
         groups.set(modifier.key, group);
      }

      group.modifiers.push(describeSituationalModifier(modifier.modifierType, modifier.value));
      for (const source of modifier.sources) {
         pushUnique(group.sources, source);
      }
   }

   return [...groups.values()];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/check/group-situational-modifiers.test.js`
Expected: PASS. (`CheckModifierLocalizationKeys.test.js` passes after Step 9.)

- [ ] **Step 5: Create the dialog rows**

Create `src/check/dialog/CheckDialogAdvantageField.svelte`:

```svelte
<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ADVANTAGE_LEVEL_OPTIONS, clampAdvantage } from '~/check/ApplyAdvantage.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {object} Properties for the level select. */
   const inputProps = { options: ADVANTAGE_LEVEL_OPTIONS };
</script>

<!--Shows the summed Advantage at its clamped level; picking a level replaces the sum.-->
<CheckDialogField
   bind:value={
      () => clampAdvantage($checkOptions.advantage),
      (level) => {
         $checkOptions.advantage = level;
      }
   }
   input={Select}
   {inputProps}
   label={'advantage'}
   testId={'check-field-advantage'}
   tooltip={'check.advantage.desc'}
/>
```

Create `src/check/dialog/CheckDialogAutomaticFailureField.svelte`:

```svelte
<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.automaticFailure}
   input={CheckboxInput}
   label={'automaticFailure'}
   testId={'check-field-automaticFailure'}
   tooltip={'check.automaticFailure.desc'}
/>
```

Create `src/check/dialog/CheckDialogDifficultySummary.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import CheckDialogSummary from '~/check/dialog/CheckDialogSummary.svelte';

   /** @type {object} Reference to the Check Parameters store. */
   const checkParameters = getContext('checkParameters');

</script>

<CheckDialogSummary
   label={'effectiveDifficulty'}
   testId={'check-summary-difficulty'}
   tooltip={'check.effectiveDifficulty.desc'}
   value={$checkParameters.difficulty}
/>
```

Create `src/check/dialog/CheckDialogSituationsField.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import groupSituationalModifiers from '~/check/dialog/GroupSituationalModifiers.js';

   /**
    * @typedef {object} CheckDialogSituationsFieldProps
    * @property {SituationalCheckModifier[]} [modifiers] The situational modifiers that apply to the check.
    */

   /** @type {CheckDialogSituationsFieldProps} */
   const { modifiers = [] } = $props();

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {SituationGroup[]} One checkbox per situation key. */
   const groups = $derived(groupSituationalModifiers(modifiers));

   /**
    * Ticks or unticks a situation in the check options; the dialog recomputes the parameters from the new options.
    * @param {string} key - The camel-case situation key.
    * @param {boolean} ticked - Whether the situation applies.
    */
   function setTicked(key, ticked) {
      $checkOptions.situations = ticked ?
         [
            ...$checkOptions.situations,
            key,
         ] :
         $checkOptions.situations.filter((situation) => situation !== key);
   }
</script>

<div class="situations" data-testid="check-field-situations">
   <!--Label-->
   <div class="label">
      <Text text={'situationalModifiers'}/>
   </div>

   <!--One checkbox per situation, unticked until the user ticks it-->
   {#each groups as group (group.key)}
      <div class="situation" data-testid={`situation-row-${group.key}`}>
         <CheckboxInput
            bind:value={
               () => $checkOptions.situations.includes(group.key),
               (ticked) => setTicked(group.key, ticked)
            }
            testId={`situation-toggle-${group.key}`}
         />
         <div class="text">
            <div class="name">{group.label}</div>
            <div class="details">{`${group.modifiers.join(', ')} (${group.sources.join(', ')})`}</div>
         </div>
      </div>
   {/each}
</div>

<style lang="scss">
   .situations {
      @include flex-column;
      @include flex-group-top-left;

      width: 100%;

      .label {
         font-weight: bold;
      }

      .situation {
         @include flex-row;
         @include flex-group-left;
         @include margin-top-standard;

         width: 100%;

         --titan-input-height: 28px;

         .text {
            @include flex-column;
            @include margin-left-large;
         }

         .details {
            @include font-size-small;
         }
      }
   }
</style>
```

- [ ] **Step 6: Provide the actor and check type to every dialog row**

Replace `src/check/dialog/CheckDialogShell.svelte`'s script with:

```svelte
<script>
   import { setContext } from 'svelte';
   import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';

   /**
    * @typedef {object} CheckDialogShellProps
    * @property {import('svelte/store').Writable} [checkOptions] Store for the Check Options.
    * @property {import('svelte/store').Writable} [checkParameters] Store for the Check Parameters.
    * @property {typeof import('svelte').SvelteComponent} [shell] Svelte component to attach to this dialog.
    * @property {TitanActor} [actor] The actor that will roll the check.
    * @property {string} [checkType] The check type (attribute, resistance, attack, casting, or item), which selects the
    * situational modifiers the dialog offers.
    */

   /** @type {CheckDialogShellProps} */
   const {
      checkOptions = undefined,
      checkParameters = undefined,
      shell = undefined,
      actor = undefined,
      checkType = undefined,
   } = $props();

   // Setup context objects.
   // These captures are intentional: the stores, actor, and check type are stable for the dialog's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('checkOptions', checkOptions);
   // svelte-ignore state_referenced_locally
   setContext('checkParameters', checkParameters);

   // The Actor's reactive bridge: a reader of `.data` re-runs when the Actor, or one of its items or effects, changes,
   // so the situational list and the parameters follow the Actor while the dialog is open. Its hooks tear down when
   // the dialog unmounts.
   // svelte-ignore state_referenced_locally
   setContext('checkActor', actor ? new ReactiveDocument(actor) : undefined);
   // svelte-ignore state_referenced_locally
   setContext('checkType', checkType);
</script>
```

In each of the five `*CheckDialog.js` classes, add a `checkType` prop beside `actor: actor,` in `content.props`:
`checkType: 'attribute',` (AttributeCheckDialog), `checkType: 'resistance',` (ResistanceCheckDialog),
`checkType: 'attack',` (AttackCheckDialog), `checkType: 'casting',` (CastingCheckDialog), `checkType: 'item',`
(ItemCheckDialog).

- [ ] **Step 7: List the situational modifiers in `CheckDialogBase.svelte`**

In the script, add `import { getContext } from 'svelte';` and
`import CheckDialogSituationsField from '~/check/dialog/CheckDialogSituationsField.svelte';` to the imports, and after
`const application = getApplication();` add:

```js
   /** @type {ReactiveDocument|undefined} The reactive bridge of the Actor that will roll the check. */
   const checkActor = getContext('checkActor');

   /** @type {string|undefined} The check type, which selects the situational modifiers offered. */
   const checkType = getContext('checkType');

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /**
    * @type {SituationalCheckModifier[]} The situational modifiers that apply to the check's current Skill. Read
    * through the Actor's bridge, so the list follows the Actor's item and effect changes while the dialog is open.
    */
   const situationalModifiers = $derived(
      checkActor?.data.system.getSituationalCheckModifiers(checkType, { skill: $checkOptions.skill }) ?? [],
   );
```

In the markup, between the `{#each rows as Row}…{/each}` block and `<!--Buttons-->`, add:

```svelte
   <!--Situational Modifiers-->
   {#if situationalModifiers.length > 0}
      <div class="row">
         <CheckDialogSituationsField modifiers={situationalModifiers}/>
      </div>
   {/if}
```

- [ ] **Step 8: Add the rows to the five shells and recompute their parameters when the Actor changes**

In each shell import the three new rows:

```js
   import CheckDialogAdvantageField from '~/check/dialog/CheckDialogAdvantageField.svelte';
   import CheckDialogAutomaticFailureField from '~/check/dialog/CheckDialogAutomaticFailureField.svelte';
   import CheckDialogDifficultySummary from '~/check/dialog/CheckDialogDifficultySummary.svelte';
```

and insert `CheckDialogAdvantageField`, `CheckDialogAutomaticFailureField`, `CheckDialogDifficultySummary` (in that
order) immediately before `CheckDialogTotalDiceSummary` in the row list — `rows` in `AttributeCheckDialogShell`,
`ResistanceCheckDialogShell`, `ItemCheckDialogShell`; the `$state([...])` `rows` in `AttackCheckDialogShell`;
`baseRows` in `CastingCheckDialogShell` (its damage/healing splice index 4 is unchanged, still after Complexity).

Then make each shell's parameter recompute follow the Actor. In each of the five shells, replace the block

```js
   // Update the parameters whenever the check options change.
   $effect(() => {
      if (actor?.system.validate<Type>CheckOptions($checkOptions)) {
         $checkParameters = actor.system.get<Type>CheckParameters($checkOptions);
      }
```

with the block below, where `<Type>` is `Attribute`, `Resistance`, `Attack`, `Casting`, or `Item` to match the shell
(the `else { onCheckInvalid(); }` branch and the effect's closing `});` stay as they are):

```js
   /** @type {ReactiveDocument|undefined} The reactive bridge of the Actor that will roll the check. */
   const checkActor = getContext('checkActor');

   // Update the parameters whenever the check options or the Actor (its items and effects included) change; a
   // change that invalidates the check closes the dialog.
   $effect(() => {
      /** @type {TitanActor|undefined} The live Actor, read through its bridge so this effect tracks it. */
      const liveActor = checkActor?.data;
      if (liveActor?.system.validate<Type>CheckOptions($checkOptions)) {
         $checkParameters = liveActor.system.get<Type>CheckParameters($checkOptions);
      }
```

Each shell already imports `getContext` from `svelte`. Its `actor` prop stays: `onRoll` and `onCheckInvalid` read it.

- [ ] **Step 9: Localize the dialog labels**

In `lang/en.json` → `LOCAL`, insert alphabetically:

```json
      "check.advantage.desc.text": "Advantage lowers the Difficulty of the Check by 1, and Greater Advantage by 2, to a minimum of 2. Disadvantage raises it by 1, and Greater Disadvantage by 2, to a maximum of 6.",
      "check.automaticFailure.desc.text": "The Check fails automatically: its dice are rolled, but it achieves no Successes.",
      "check.effectiveDifficulty.desc.text": "The Difficulty of the Check after Advantage and Disadvantage.",
      "disadvantage.text": "Disadvantage",
      "effectiveDifficulty.text": "Effective Difficulty",
      "greaterAdvantage.text": "Greater Advantage",
      "greaterDisadvantage.text": "Greater Disadvantage",
      "noAdvantage.text": "None",
      "situationalModifiers.text": "Situational Modifiers",
```

- [ ] **Step 10: Write the e2e spec**

Create `tests/e2e/check-dialog-advantage.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { forceDice, resetDice } from './dice.js';
import { buildE2ERollerActorData, buildE2ERollerItemData } from '../shared/builders.js';
import {
   clickRoll,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setCheckbox,
   setSelectField,
} from './checkDialog.js';

/**
 * The check dialog's Advantage select, Automatic Failure checkbox, effective Difficulty, and situational checkboxes.
 */

/** @type {string} Name of the throwaway player actor carrying a situational modifier. */
const ACTOR_NAME = 'E2E Dialog Advantage Actor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

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
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async () => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
   });
   await deleteFixtureActor(page, ACTOR_NAME);
   await deleteFixtureActor(page, 'E2E Roller');
   await page?.close();
});

/**
 * Rebuilds the spec's actor with one "Underwater" situation (Disadvantage) and opens its Attribute Check dialog under
 * the situational setting.
 * @returns {Promise<import('@playwright/test').Locator>} The open dialog.
 */
async function openSituationalDialog() {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Deep Water',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'Underwater',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'situation',
                     skill: '',
                     uuid: 'e2e-dialog-underwater',
                     value: -1,
                  },
               ],
            },
         },
      ]);
      await actor.system.requestAttributeCheck({ attribute: 'body' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The dialog window. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();
   return dialog;
}

test('every check dialog offers Advantage, Automatic Failure, and the effective Difficulty', async () => {
   await page.evaluate(async ({ actorData, itemData }) => {
      await game.actors.getName('E2E Roller')?.delete();

      /** @type {TitanActor} The rebuilt E2E Roller. */
      const actor = await Actor.create(actorData);
      await actor.createEmbeddedDocuments('Item', itemData);
   }, {
      actorData: buildE2ERollerActorData(),
      itemData: buildE2ERollerItemData(),
   });

   for (const type of [
      'attribute',
      'resistance',
      'attack',
      'casting',
      'item',
   ]) {
      /** @type {import('@playwright/test').Locator} The open dialog of this check type. */
      const dialog = await openCheckDialog(page, type);
      await expect(dialog.getByTestId('check-field-advantage')).toBeVisible();
      await expect(dialog.getByTestId('check-field-automaticFailure')).toBeVisible();
      await expect(dialog.getByTestId('check-summary-difficulty')).toBeVisible();
      await closeAllApps(page);
   }
});

test('the Advantage select and a ticked situation change the displayed and rolled Difficulty', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openSituationalDialog();

   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');
   await expect(difficulty).toHaveText('4');

   // The situation row lists its label, what it does, and its source; its check icon tracks the tick.
   /** @type {import('@playwright/test').Locator} The Underwater situation row. */
   const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
   await expect(row).toContainText('E2E Deep Water');

   /** @type {import('@playwright/test').Locator} The row's checkbox. */
   const toggle = row.locator('[data-testid^="situation-toggle-"]');
   await toggle.click();
   await expect(row.locator('i.fa-check')).toHaveCount(1);
   await expect(difficulty).toHaveText('5');
   await toggle.click();
   await expect(row.locator('i.fa-check')).toHaveCount(0);
   await expect(difficulty).toHaveText('4');
   await toggle.click();
   await expect(difficulty).toHaveText('5');

   // Greater Advantage from the select nets +1 against the ticked Disadvantage.
   await setSelectField(dialog, 'advantage', 2);
   await expect(difficulty).toHaveText('3');
   expect(await readSummary(dialog, 'difficulty')).toBe(3);

   // The row is a flex row whose details use the small font token.
   /** @type {{detailsFontSize: string, display: string, flexDirection: string, smallFontSize: string}} Row styles. */
   const styles = await row.evaluate((element) => {
      /** @type {HTMLSpanElement} A probe resolving the small font token to computed px form. */
      const probe = document.createElement('span');
      probe.style.fontSize = 'var(--titan-font-size-small)';
      element.appendChild(probe);

      /** @type {string} The resolved small font size. */
      const smallFontSize = getComputedStyle(probe).fontSize;
      probe.remove();
      return {
         detailsFontSize: getComputedStyle(element.querySelector('.details')).fontSize,
         display: getComputedStyle(element).display,
         flexDirection: getComputedStyle(element).flexDirection,
         smallFontSize,
      };
   });
   expect(styles.display).toBe('flex');
   expect(styles.flexDirection).toBe('row');
   expect(styles.detailsFontSize).toBe(styles.smallFontSize);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters).toMatchObject({
      advantage: 1,
      baseDifficulty: 4,
      difficulty: 3,
      situations: [
         {
            key: 'underwater',
            label: 'Underwater',
         },
      ],
   });
});

test('the Automatic Failure checkbox fails the rolled check', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openSituationalDialog();
   await setCheckbox(dialog, 'automaticFailure', true);
   await forceDice(page, [6]);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.automaticFailure).toBe(true);
   expect(flags.results.successes).toBe(0);
});

test('the open dialog follows the Actor\'s effects', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openSituationalDialog();

   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');

   /** @type {import('@playwright/test').Locator} The Underwater situation row. */
   const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
   await row.locator('[data-testid^="situation-toggle-"]').click();
   await expect(difficulty).toHaveText('5');

   // Deleting the effect behind the ticked situation removes its row and its Disadvantage from the open dialog.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).effects.getName('E2E Deep Water').delete();
   }, ACTOR_NAME);
   await expect(row).toHaveCount(0);
   await expect(difficulty).toHaveText('4');

   // A new situational effect appears in the same open dialog.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Strong Current',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'Strong Current',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'situation',
                     skill: '',
                     uuid: 'e2e-dialog-strong-current',
                     value: -1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Strong Current' }))
      .toContainText('E2E Strong Current');
});
```

- [ ] **Step 11: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm run stylelint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/check-dialog-advantage.spec.js tests/e2e/checks-dialog.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/localization.spec.js tests/e2e/attack-tags.spec.js tests/e2e/check-options-setting.spec.js`
Expected: all pass (`CheckModifierLocalizationKeys.test.js` included).

- [ ] **Step 12: Commit**

```bash
git branch --show-current
git status --short
git add src/check/dialog/CheckDialogAdvantageField.svelte src/check/dialog/CheckDialogAutomaticFailureField.svelte \
   src/check/dialog/CheckDialogDifficultySummary.svelte src/check/dialog/CheckDialogSituationsField.svelte \
   src/check/dialog/GroupSituationalModifiers.js src/check/dialog/CheckDialogShell.svelte \
   src/check/dialog/CheckDialogBase.svelte \
   src/check/types/attribute-check/dialog/AttributeCheckDialog.js \
   src/check/types/attribute-check/dialog/AttributeCheckDialogShell.svelte \
   src/check/types/resistance-check/dialog/ResistanceCheckDialog.js \
   src/check/types/resistance-check/dialog/ResistanceCheckDialogShell.svelte \
   src/check/types/attack-check/dialog/AttackCheckDialog.js \
   src/check/types/attack-check/dialog/AttackCheckDialogShell.svelte \
   src/check/types/casting-check/dialog/CastingCheckDialog.js \
   src/check/types/casting-check/dialog/CastingCheckDialogShell.svelte \
   src/check/types/item-check/dialog/ItemCheckDialog.js src/check/types/item-check/dialog/ItemCheckDialogShell.svelte \
   lang/en.json tests/unit/check/group-situational-modifiers.test.js tests/unit/CheckModifierLocalizationKeys.test.js \
   tests/e2e/check-dialog-advantage.spec.js
git commit -F - <<'EOF'
feat(check-dialog): Advantage, Automatic Failure, Difficulty, and situations in dialogs

Every check dialog offers an Advantage level select, an Automatic Failure
checkbox, and the effective Difficulty, lists the check's situational
modifiers as unticked checkboxes, and follows the Actor's changes while open.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 7: Chat card tags

**Files:**
- Modify: `src/check/chat-message/CheckChatResults.svelte`
- Modify test: `tests/e2e/check-advantage.spec.js`

**Interfaces:**
- Consumes: `clampAdvantage`, `getAdvantageLabel` (Task 1); `parameters.advantage`, `automaticFailure`,
  `situations` (Task 2); lang keys from Tasks 3 and 6.
- Produces: test ids `check-chat-dc`, `check-chat-advantage`, `check-chat-automatic-failure`,
  `check-chat-situations`, `check-chat-situation`.

- [ ] **Step 1: Write the failing e2e tests**

Append to `tests/e2e/check-advantage.spec.js`:

```js
test.describe('chat card tags', () => {
   test('a Disadvantage tag sits beside the DC, is styled as a tag, and follows the stored level', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);
      await expect(card.locator('.check-chat-message')).toBeAttached();
      await expect(card.getByTestId('check-chat-dc')).toHaveText('DC 5:0');

      /** @type {import('@playwright/test').Locator} The Advantage tag. */
      const tag = card.getByTestId('check-chat-advantage');

      /** @type {string} The localized Disadvantage label. */
      const label = await page.evaluate(() => game.i18n.localize('LOCAL.disadvantage.text'));
      await expect(tag).toHaveText(label);

      // The tag's computed colors are the resolved tag tokens.
      /** @type {{background: string, color: string, tagBackground: string, tagFont: string}} Computed colors. */
      const colors = await tag.evaluate((element) => {
         /**
          * Resolves a color token through a throwaway child so the value normalizes to computed rgb() form.
          * @param {string} token - The custom property name.
          * @returns {string} The computed color.
          */
         const resolve = (token) => {
            /** @type {HTMLSpanElement} The probe carrying the token. */
            const probe = document.createElement('span');
            probe.style.color = `var(${token})`;
            element.appendChild(probe);

            /** @type {string} The resolved color. */
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
         };

         /** @type {CSSStyleDeclaration} The tag's computed style. */
         const computed = getComputedStyle(element);
         return {
            background: computed.backgroundColor,
            color: computed.color,
            tagBackground: resolve('--titan-tag-background'),
            tagFont: resolve('--titan-tag-font-color'),
         };
      });
      expect(colors.background).toBe(colors.tagBackground);
      expect(colors.color).toBe(colors.tagFont);

      // Clearing the stored Advantage removes the tag from the same card.
      await page.evaluate(async (id) => {
         /** @type {ChatMessage} The rolled check's message. */
         const chatMessage = game.messages.get(id);

         /** @type {object} A detached copy of its system data. */
         const system = chatMessage.system.toObject();
         system.parameters.advantage = 0;
         await chatMessage.update({ system });
      }, message.id);
      await expect(tag).toHaveCount(0);
   });

   test('opposing Advantage sources show no tag beside the unchanged DC', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: 1,
         }),
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);

      // The DC renders first at the unchanged Difficulty; the tag beside it is absent.
      await expect(card.getByTestId('check-chat-dc')).toHaveText('DC 4:0');
      await expect(card.getByTestId('check-chat-advantage')).toHaveCount(0);
   });

   test('an automatically failed card shows the Automatic Failure tag and no successes', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'automaticFailure',
         }),
      ]);
      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, {
         attribute: 'body',
         complexity: 1,
      });

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);

      /** @type {{automaticFailure: string, successes: string}} The localized labels. */
      const labels = await page.evaluate(() => ({
         automaticFailure: game.i18n.localize('LOCAL.automaticFailure.text'),
         successes: game.i18n.localize('LOCAL.successes.text'),
      }));
      await expect(card.getByTestId('check-chat-automatic-failure')).toHaveText(labels.automaticFailure);
      await expect(card.locator('.results')).toContainText(`0 ${labels.successes}`);
   });

   test('the card lists the ticked situations by label', async () => {
      await seedEffect(page, [
         checkModifierElement({
            key: 'Underwater',
            selector: 'situation',
            value: -1,
         }),
      ]);
      // A caller names the situation directly (resolution #11); the dialog is not involved.
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, {
         attribute: 'body',
         situations: ['underwater'],
      });
      expect(message.parameters.diceMod).toBe(-1);

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);
      await expect(card.getByTestId('check-chat-situation')).toHaveText(['Underwater']);
   });
});
```

- [ ] **Step 2: Build and run to verify they fail**

Run: `npm run build` then `npm run test:e2e -- tests/e2e/check-advantage.spec.js`
Expected: the four new tests FAIL (no `check-chat-dc`/tag test ids); earlier tests pass.

- [ ] **Step 3: Render the tags in `CheckChatResults.svelte`**

In the script add after the `Icons.js` import:

```js
   import { clampAdvantage, getAdvantageLabel } from '~/check/ApplyAdvantage.js';
```

and after `const document = getContext('document');`:

```js

   /** @type {number} The applied Advantage level, clamped to ±2. */
   const advantageLevel = $derived(clampAdvantage(document.data.system.parameters.advantage));
```

Replace the `<!--Successes-->` block with:

```svelte
   <!--Successes-->
   <div class="stat">
      <div class="border-right" data-testid="check-chat-dc">
         {`${localize('dc')} ${document.data.system.parameters.difficulty}:${
            document.data.system.parameters.complexity
         }`}
      </div>

      <!--Advantage level beside the Difficulty it changed-->
      {#if advantageLevel !== 0}
         <div class="tag advantage" data-testid="check-chat-advantage">
            {localize(getAdvantageLabel(advantageLevel))}
         </div>
      {/if}

      <div>
         {`${document.data.system.results.successes} ${localize('successes')}`}
      </div>
   </div>
```

Directly after the closing `{/if}` of the succeeded/failed block (before `<!--Expertise Remaining-->`) add:

```svelte
   <!--Automatic Failure-->
   {#if document.data.system.parameters.automaticFailure}
      <div class="stat">
         <div class="tag" data-testid="check-chat-automatic-failure">
            {localize('automaticFailure')}
         </div>
      </div>
   {/if}

   <!--Ticked situational modifiers-->
   {#if document.data.system.parameters.situations.length}
      <div class="stat situations" data-testid="check-chat-situations">
         {#each document.data.system.parameters.situations as situation (situation.key)}
            <div class="tag" data-testid="check-chat-situation">
               {situation.label}
            </div>
         {/each}
      </div>
   {/if}
```

In the style block, inside `.stat { … }` (after `&.extra { … }`), add:

```scss
         &.situations {
            flex-wrap: wrap;
            gap: var(--titan-spacing-standard);
         }

         .tag {
            @include tag;
         }

         .advantage {
            @include margin-right-large;
         }
```

- [ ] **Step 4: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm run stylelint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/check-advantage.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/chat-message-mounts.spec.js tests/e2e/localization.spec.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git branch --show-current
git status --short
git add src/check/chat-message/CheckChatResults.svelte tests/e2e/check-advantage.spec.js
git commit -F - <<'EOF'
feat(chat): Advantage, Automatic Failure, and situation tags on check cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 8: Rules-element editor

**Files:**
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetConditionalCheckModifierSettings.svelte`
- Modify: `src/document/svelte-components/select/DocumentSelect.svelte`
- Modify: `lang/en.json`
- Modify test: `tests/unit/CheckModifierLocalizationKeys.test.js`
- Create test: `tests/e2e/rules-element-check-modifier-editor.spec.js`

**Interfaces:**
- Consumes: `CHECK_TYPE_MODIFIER_TYPES`, `CONDITIONAL_CHECK_MODIFIER_TYPES` (Task 3);
  `ADVANTAGE_ELEMENT_LEVEL_OPTIONS`, `clampAdvantage` (Task 1); `SKILLS`.
- Produces: `DocumentSelect` accepts `testId` (forwarded to the `Select` combobox trigger). Editor test ids
  `ccm-modifier-type`, `ccm-check-type`, `ccm-selector`, `ccm-situation-skill`, `ccm-advantage-level`, `ccm-value`.
  The modifier-type options are filtered by the check type and the check-type options by the modifier type
  (resolution #4). The level select binds through `clampAdvantage(Number(value)) || 1`: a stored value outside the
  four levels displays as its normalized level (0 or a non-number as Advantage, ±3 as Greater) and is written only
  when the user picks a level, so `Select`'s out-of-set rewrite never fires on it. The Skill narrowing shows only for
  a non-Resistance situation (resolution #13). Spec C extends `selectorOptions.attack` with `weapon` in this file.

- [ ] **Step 1: Write the failing e2e spec**

Create `tests/e2e/rules-element-check-modifier-editor.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { selectTitanOption, titanSelectOptionValues } from './select.js';

/**
 * The conditional check modifier editor: the Advantage level select writes the signed level into `value` and never
 * rewrites a stored value it cannot show, Automatic Failure hides the value and stores 1, modifier types and check
 * types filter each other, Resistance checks offer their selectors, and a non-Resistance situation offers a Skill
 * narrowing.
 */

/** @type {string} Name of the world ability item this spec edits. */
const ITEM_NAME = 'E2E Check Modifier Editor';

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
   // Rebuild the item with one Dice +3 modifier and open its Rules Elements tab.
   await page.evaluate(async (name) => {
      await game.items.getName(name)?.delete();

      /** @type {TitanItem} The rebuilt ability. */
      const item = await Item.create({
         name,
         type: 'ability',
         system: {
            rulesElement: [
               {
                  checkType: 'any',
                  key: '',
                  modifierType: 'dice',
                  operation: 'conditionalCheckModifier',
                  selector: 'any',
                  skill: '',
                  uuid: 'e2e-ccm-editor-0',
                  value: 3,
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
   await expect(sheet().getByTestId('ccm-modifier-type')).toBeVisible();
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
 * Reads the edited element's persisted fields.
 * @returns {Promise<object>} The element's check type, key, modifier type, selector, skill, and value.
 */
function readElement() {
   return page.evaluate((name) => {
      /** @type {object} The edited rules element. */
      const element = game.items.getName(name).system.rulesElement[0];
      return {
         checkType: element.checkType,
         key: element.key,
         modifierType: element.modifierType,
         selector: element.selector,
         skill: element.skill,
         value: element.value,
      };
   }, ITEM_NAME);
}

test('the Advantage level select replaces the value and writes the signed level', async () => {
   await expect(sheet().getByTestId('ccm-value')).toBeVisible();

   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'advantage');
   await expect.poll(readElement, { message: 'switching to Advantage stores Advantage' }).toMatchObject({
      modifierType: 'advantage',
      value: 1,
   });
   await expect(sheet().getByTestId('ccm-advantage-level')).toBeVisible();
   await expect(sheet().getByTestId('ccm-value')).toHaveCount(0);

   for (const level of [
      -2,
      -1,
      2,
      1,
   ]) {
      await selectTitanOption(page, sheet().getByTestId('ccm-advantage-level'), level);
      await expect.poll(async () => (await readElement()).value, { message: `level ${level} is stored` })
         .toBe(level);
   }
});

test('Automatic Failure hides the value and stores 1', async () => {
   await expect(sheet().getByTestId('ccm-value')).toBeVisible();
   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'automaticFailure');
   await expect.poll(readElement, { message: 'Automatic Failure stores 1' }).toMatchObject({
      modifierType: 'automaticFailure',
      value: 1,
   });
   await expect(sheet().getByTestId('ccm-value')).toHaveCount(0);
   await expect(sheet().getByTestId('ccm-advantage-level')).toHaveCount(0);
});

test('a stored Advantage value outside the four levels displays normalized and is not rewritten', async () => {
   // Store an Advantage element whose value (3) no level option carries, as hand-authored data can.
   await page.evaluate(async (name) => {
      /** @type {TitanItem} The edited ability. */
      const item = game.items.getName(name);
      await item.update({
         system: {
            rulesElement: [
               {
                  ...item.system.rulesElement[0],
                  modifierType: 'advantage',
                  value: 3,
               },
            ],
         },
      });
   }, ITEM_NAME);

   /** @type {import('@playwright/test').Locator} The level select's trigger. */
   const level = sheet().getByTestId('ccm-advantage-level');
   await expect(level).toHaveAttribute('data-value', '2');
   expect((await readElement()).value).toBe(3);
});

test('Resistance checks offer their selectors and only the modifier types they read', async () => {
   // The Dice element's check types include Resistance; its modifier types are every type.
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-modifier-type'))).toEqual([
      'damage',
      'dice',
      'expertise',
      'training',
      'healing',
      'advantage',
      'automaticFailure',
   ]);

   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'resistance');
   await expect.poll(async () => (await readElement()).checkType).toBe('resistance');
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-selector'))).toEqual([
      'any',
      'resistance',
      'situation',
   ]);

   // Resistance Checks read no Damage, Training, or Healing, so the modifier-type select no longer offers them.
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-modifier-type'))).toEqual([
      'dice',
      'expertise',
      'advantage',
      'automaticFailure',
   ]);

   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'resistance');
   await expect.poll(readElement, { message: 'the Resistance selector defaults its key' }).toMatchObject({
      key: 'reflexes',
      selector: 'resistance',
   });

   // Back on any check type the Resistance selector resets, and Training is offered again.
   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'any');
   await expect.poll(readElement, { message: 'the any check type resets the selector' }).toMatchObject({
      checkType: 'any',
      selector: 'any',
   });

   // A Training element's check types drop Resistance.
   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'training');
   await expect.poll(async () => (await readElement()).modifierType).toBe('training');
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-check-type'))).toEqual([
      'any',
      'attack',
      'casting',
      'item',
   ]);
});

test('a situation takes a typed label and an optional Skill narrowing, except on Resistance checks', async () => {
   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'situation');

   /** @type {string} The localized default situation label. */
   const situationLabel = await page.evaluate(() => game.i18n.localize('LOCAL.situation.text'));
   await expect.poll(readElement, { message: 'the situation selector defaults its key and Skill' }).toMatchObject({
      key: situationLabel,
      selector: 'situation',
      skill: '',
   });

   /** @type {import('@playwright/test').Locator} The Skill narrowing select. */
   const skillSelect = sheet().getByTestId('ccm-situation-skill');
   await expect(skillSelect).toBeVisible();
   await selectTitanOption(page, skillSelect, 'athletics');
   await expect.poll(async () => (await readElement()).skill).toBe('athletics');

   // A Resistance Check has no Skill: the situation stays, the narrowing hides, and the stored Skill clears.
   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'resistance');
   await expect.poll(readElement, { message: 'a Resistance situation clears its Skill' }).toMatchObject({
      checkType: 'resistance',
      selector: 'situation',
      skill: '',
   });
   await expect(skillSelect).toHaveCount(0);

   // Back on any check type the narrowing shows again; narrow it, then leave the situation selector.
   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'any');
   await expect(skillSelect).toBeVisible();
   await selectTitanOption(page, skillSelect, 'athletics');
   await expect.poll(async () => (await readElement()).skill).toBe('athletics');

   // Leaving the situation selector hides the Skill narrowing and clears the stored Skill.
   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'any');
   await expect(skillSelect).toHaveCount(0);
   await expect.poll(async () => (await readElement()).skill).toBe('');
});
```

In `tests/unit/CheckModifierLocalizationKeys.test.js`, add `'situation.text',` to `LOCAL_KEYS` directly after
`'noAdvantage.text',` (before `'situationalModifiers.text',`).

- [ ] **Step 2: Build and run to verify they fail**

Run: `npx vitest run tests/unit/CheckModifierLocalizationKeys.test.js`, then `npm run build` and
`npm run test:e2e -- tests/e2e/rules-element-check-modifier-editor.spec.js`
Expected: FAIL — `LOCAL` lacks `situation.text`; no `ccm-*` test ids.

- [ ] **Step 3: Forward `testId` in `DocumentSelect.svelte`**

Add to the typedef:
` * @property {string} [testId] - Optional stable selector forwarded to the inner Select's combobox trigger.`,
add `testId = void 0,` to the destructured props after `onchange = void 0,`, and add `{testId}` to the `<Select>`
attributes after `{options}`.

- [ ] **Step 4: Replace `ItemSheetConditionalCheckModifierSettings.svelte`**

```svelte
<script>
   import { getContext } from 'svelte';
   import {
      CHECK_TYPE_MODIFIER_TYPES,
      CONDITIONAL_CHECK_MODIFIER_TYPES,
   } from '~/system/ConditionalCheckModifierTypes.js';
   import { ADVANTAGE_ELEMENT_LEVEL_OPTIONS, clampAdvantage } from '~/check/ApplyAdvantage.js';
   import { SKILLS } from '~/system/Skills.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';

   /**
    * @typedef {object} ItemSheetConditionalCheckModifierSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetConditionalCheckModifierSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @type {string[]} The modifier types this element's check type reads, in CONDITIONAL_CHECK_MODIFIER_TYPES order;
    * every type for `any`.
    */
   const modifierTypeOptions = $derived(CONDITIONAL_CHECK_MODIFIER_TYPES.filter(
      (modifierType) => isCheckTypeAllowed(document.data.system.rulesElement[idx].checkType, modifierType),
   ));

   /** @type {{label: string, value: string}[]} Every check type a modifier can target. */
   const allCheckTypeOptions = [
      {
         label: 'anyCheck',
         value: 'any',
      },
      {
         label: 'attackCheck',
         value: 'attack',
      },
      {
         label: 'castingCheck',
         value: 'casting',
      },
      {
         label: 'itemCheck',
         value: 'item',
      },
      {
         label: 'resistanceCheck',
         value: 'resistance',
      },
   ];

   /** @type {Record<string, string[]>} Selector options keyed by check type. */
   const selectorOptions = {
      any: [
         'any',
         'attribute',
         'skill',
         'customTrait',
         'situation',
      ],
      attack: [
         'any',
         'attribute',
         'attackTrait',
         'attackType',
         'customTrait',
         'multiAttack',
         'skill',
         'situation',
      ],
      casting: [
         'any',
         'attribute',
         'customTrait',
         'spellTradition',
         'skill',
         'situation',
      ],
      item: [
         'any',
         'attribute',
         'customTrait',
         'skill',
         'situation',
      ],
      resistance: [
         'any',
         'resistance',
         'situation',
      ],
   };

   /** @type {Array<{label: string, value: string}|string>} A situation's Skill narrowing; '' offers every Skill. */
   const situationSkillOptions = [
      {
         label: 'any',
         value: '',
      },
      ...SKILLS,
   ];

   /** @type {{label: string, value: string}[]} The check types that read this element's modifier type. */
   const checkTypeOptions = $derived(allCheckTypeOptions.filter(
      (option) => isCheckTypeAllowed(option.value, document.data.system.rulesElement[idx].modifierType),
   ));

   /**
    * Whether a check type reads a modifier type. `any` targets every check, so it allows every type. The modifier-type
    * and check-type options both filter through this, so the editor cannot build a combination no check reads.
    * @param {string} checkType - The element's check type.
    * @param {string} modifierType - The element's modifier type.
    * @returns {boolean} Whether the combination can apply to a check.
    */
   function isCheckTypeAllowed(checkType, modifierType) {
      return checkType === 'any' || CHECK_TYPE_MODIFIER_TYPES[checkType].includes(modifierType);
   }

   /**
    * Updates the value when the modifier type changes: Advantage starts at Advantage (1) and Automatic Failure stores
    * 1. The check type needs no reset, because the modifier-type options offer only types it reads.
    * @returns {void}
    */
   function onModifierTypeChanged() {
      /** @type {object} The edited element. */
      const element = document.data.system.rulesElement[idx];
      if (element.modifierType === 'advantage' || element.modifierType === 'automaticFailure') {
         element.value = 1;
      }
   }

   /**
    * Resets the selector to 'any' when the new check type does not offer it, cascading the change to the key and
    * Skill. A Resistance Check has no Skill, so a Resistance situation clears its Skill narrowing.
    * @returns {void}
    */
   function onCheckTypeChange() {
      /** @type {object} The edited element. */
      const element = document.data.system.rulesElement[idx];
      if (!selectorOptions[element.checkType].includes(element.selector)) {
         element.selector = 'any';
         onSelectorChange();
      }
      if (element.checkType === 'resistance') {
         element.skill = '';
      }
   }

   /**
    * Updates the element key to a default value when the selector changes, and clears the Skill narrowing: only a
    * situation takes one, and a newly chosen situation starts unnarrowed.
    * @returns {void}
    */
   function onSelectorChange() {
      /** @type {object} The edited element. */
      const element = document.data.system.rulesElement[idx];
      element.skill = '';
      switch (element.selector) {
         case 'attribute': {
            element.key = 'body';
            break;
         }
         case 'attackTrait': {
            element.key = 'blast';
            break;
         }
         case 'attackType': {
            element.key = 'melee';
            break;
         }
         case 'customTrait':
         case 'multiAttack': {
            element.key = '';
            break;
         }
         case 'resistance': {
            element.key = 'reflexes';
            break;
         }
         case 'situation': {
            element.key = localize('situation');
            break;
         }
         case 'skill': {
            element.key = 'arcana';
            break;
         }
         case 'spellTradition': {
            element.key = localize('any');
            break;
         }
         default: {
            break;
         }
      }
   }

   /**
    * Returns the key input component for the current selector.
    * @returns {object | undefined} The key input component, or undefined when the selector takes no key.
    */
   function getSelector() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'attackTrait': {
            return DocumentAttackTraitSelect;
         }
         case 'attackType': {
            return DocumentAttackTypeSelect;
         }
         case 'customTrait':
         case 'situation':
         case 'spellTradition': {
            return DocumentTextInput;
         }
         case 'resistance': {
            return DocumentResistanceSelect;
         }
         case 'skill': {
            return DocumentSkillSelect;
         }
         default: {
            break;
         }
      }
   }
</script>

<!--Operation Settings-->
<div class="settings">

   <!--Modifier Type-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].modifierType}
         onchange={onModifierTypeChanged}
         options={modifierTypeOptions}
         testId={'ccm-modifier-type'}
      />
   </div>

   <!--Check Type-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].checkType}
         onchange={onCheckTypeChange}
         options={checkTypeOptions}
         testId={'ccm-check-type'}
      />
   </div>

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={selectorOptions[document.data.system.rulesElement[idx].checkType]}
         testId={'ccm-selector'}
      />
   </div>

   <!--Key-->
   {#if document.data.system.rulesElement[idx].selector !== 'any'}
      <div class="field select">
         {#if getSelector()}
            {@const Selector = getSelector()}
            <Selector bind:value={document.data.system.rulesElement[idx].key}/>
         {/if}
      </div>
   {/if}

   <!--Skill narrowing: a situation may offer itself only on checks using one Skill; Resistance Checks have none.-->
   {#if document.data.system.rulesElement[idx].selector === 'situation' &&
      document.data.system.rulesElement[idx].checkType !== 'resistance'}
      <div class="field select">
         <DocumentSelect
            bind:value={
               () => document.data.system.rulesElement[idx].skill ?? '',
               (skill) => {
                  document.data.system.rulesElement[idx].skill = skill;
               }
            }
            options={situationSkillOptions}
            testId={'ccm-situation-skill'}
         />
      </div>
   {/if}

   <!--Value: Advantage stores a level, Automatic Failure stores none, every other type stores an integer.-->
   {#if document.data.system.rulesElement[idx].modifierType === 'advantage'}
      <!--The level shows normalized (0 or a non-number as Advantage, ±3 as Greater), so the select never rewrites a
         stored value it cannot show; the stored value changes only when the user picks a level.-->
      <div class="field select">
         <DocumentSelect
            bind:value={
               () => clampAdvantage(Number(document.data.system.rulesElement[idx].value)) || 1,
               (level) => {
                  document.data.system.rulesElement[idx].value = level;
               }
            }
            options={ADVANTAGE_ELEMENT_LEVEL_OPTIONS}
            testId={'ccm-advantage-level'}
         />
      </div>
   {:else if document.data.system.rulesElement[idx].modifierType !== 'automaticFailure'}
      <div class="field number">
         <DocumentIntegerInput
            bind:value={document.data.system.rulesElement[idx].value}
            testId={'ccm-value'}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }
      }
   }
</style>
```

- [ ] **Step 5: Localize the situation selector**

In `lang/en.json` → `LOCAL`, insert alphabetically: `"situation.text": "Situation",`

- [ ] **Step 6: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm run stylelint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/rules-element-check-modifier-editor.spec.js tests/e2e/rules-element-crud.spec.js tests/e2e/settings-list-reorder.spec.js tests/e2e/cross-sheet-element-copy.spec.js`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git status --short
git add src/document/types/item/sheet/rules-element/ItemSheetConditionalCheckModifierSettings.svelte \
   src/document/svelte-components/select/DocumentSelect.svelte lang/en.json \
   tests/unit/CheckModifierLocalizationKeys.test.js tests/e2e/rules-element-check-modifier-editor.spec.js
git commit -F - <<'EOF'
feat(rules-element): edit Advantage levels, Automatic Failure, Resistance checks, and situations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 9: Heavy, Encumbering, and Loud armor apply their check rules

**Files:**
- Create: `src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Modify: `lang/en.json`
- Modify test: `tests/unit/CheckModifierLocalizationKeys.test.js`
- Create tests: `tests/unit/ArmorTraitCheckModifiers.test.js`, `tests/e2e/armor-trait-situations.spec.js`

**Interfaces:**
- Consumes: `processElements` inside `_applyRulesElements` (Task 3 signature `(sourceElements, type, sourceName)`),
  `getEquippedArmor()`, `getSituationalCheckModifiers`, the dialog test ids (Task 6).
- Produces: `createArmorTraitCheckModifiers(traits: StandardTrait[]): ConditionalCheckModifierElement[]`.

- [ ] **Step 1: Write the failing unit tests**

Create `tests/unit/ArmorTraitCheckModifiers.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import createArmorTraitCheckModifiers from '~/document/types/item/types/armor/ArmorTraitCheckModifiers.js';

beforeAll(() => {
   // localize() reads game.i18n at call time; the pass-through stand-in makes each label its LOCAL key.
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
 * Builds the expected synthetic element.
 * @param {string} trait - The armor trait.
 * @param {string} modifierType - The modifier type.
 * @param {number} value - The element value.
 * @param {string} labelKey - The situation label's localization key.
 * @param {string} skill - The Skill narrowing ('' = any).
 * @returns {object} The expected element.
 */
function expected(trait, modifierType, value, labelKey, skill) {
   // The stand-in localize() returns the key, so the label is the LOCAL key itself.
   return {
      checkType: 'any',
      key: `LOCAL.${labelKey}.text`,
      modifierType,
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill,
      uuid: `armor-trait-${trait}-${labelKey}`,
      value,
   };
}

describe('createArmorTraitCheckModifiers', () => {
   it('gives Heavy Athletics Greater Disadvantage to Swim, Fly, or Climb and Automatic Failure on Jumps', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'heavy',
            value: true,
         },
      ])).toEqual([
         expected('heavy', 'advantage', -2, 'situationSwimFlyClimb', 'athletics'),
         expected('heavy', 'automaticFailure', 1, 'situationJump', 'athletics'),
      ]);
   });

   it('gives Encumbering Athletics-narrowed Disadvantage to Swim, Fly, or Climb', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'encumbering',
            value: true,
         },
      ])).toEqual([expected('encumbering', 'advantage', -1, 'situationSwimFlyClimb', 'athletics')]);
   });

   it('gives Loud Stealth-narrowed Disadvantage to remaining undetected by hearing', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'loud',
            value: true,
         },
      ])).toEqual([expected('loud', 'advantage', -1, 'situationRemainUndetectedByHearing', 'stealth')]);
   });

   it('adds nothing for armor without check traits, and orders Heavy, Encumbering, Loud', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'magical',
            value: true,
         },
      ])).toEqual([]);
      expect(createArmorTraitCheckModifiers([
         {
            name: 'loud',
            value: true,
         },
         {
            name: 'heavy',
            value: true,
         },
      ]).map((element) => element.uuid)).toEqual([
         'armor-trait-heavy-situationSwimFlyClimb',
         'armor-trait-heavy-situationJump',
         'armor-trait-loud-situationRemainUndetectedByHearing',
      ]);
   });
});
```

In `tests/unit/CheckModifierLocalizationKeys.test.js`, add these entries to `LOCAL_KEYS` directly after
`'situation.text',` (before `'situationalModifiers.text',`):

```js
   'situationJump.text',
   'situationRemainUndetectedByHearing.text',
   'situationSwimFlyClimb.text',
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ArmorTraitCheckModifiers.test.js tests/unit/CheckModifierLocalizationKeys.test.js`
Expected: FAIL — cannot resolve the module; `LOCAL` lacks the three situation labels.

- [ ] **Step 3: Implement the synthetic elements**

Create `src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`:

```js
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Builds one synthetic situational Conditional Check Modifier element for an armor trait.
 * @param {string} trait - The armor trait imposing the modifier.
 * @param {string} modifierType - The modifier type (advantage or automaticFailure).
 * @param {number} value - The Advantage level, or 1 for Automatic Failure.
 * @param {string} labelKey - The localization key of the situation label.
 * @param {string} skill - The one Skill whose checks offer the modifier ('' = any).
 * @returns {ConditionalCheckModifierElement} The synthetic element.
 */
function createSituationalElement(trait, modifierType, value, labelKey, skill) {
   return {
      checkType: 'any',
      key: localize(labelKey),
      modifierType,
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill,
      uuid: `armor-trait-${trait}-${labelKey}`,
      value,
   };
}

/**
 * Builds the situational check modifiers an equipped armor's traits impose. Source: TITAN Rules Compendium
 * (09_26_2026), lines 2765-2775. Situation keys are localized labels, so traits sharing a situation ("Swim, Fly, or
 * Climb") merge into one dialog entry whose value is their sum. Each situation is narrowed to the Skill its checks use,
 * so it is offered (and opens the dialog) only there: Jumping and Climbing are Body (Athletics) checks (lines 2300,
 * 3150), and remaining undetected is a Stealth check. The rules name no Skill for swimming or flying: narrowing them to
 * Athletics alongside climbing is a design choice, not a rules citation, made because the three share one situation.
 * Heavy's "cannot Jump" is therefore an Automatic Failure offered on Athletics checks.
 * @param {StandardTrait[]} traits - The armor's traits.
 * @returns {ConditionalCheckModifierElement[]} The synthetic elements, in trait order Heavy, Encumbering, Loud.
 */
export default function createArmorTraitCheckModifiers(traits) {
   /** @type {string[]} The names of the armor's traits. */
   const traitNames = traits.map((trait) => trait.name);

   /** @type {ConditionalCheckModifierElement[]} The synthetic elements. */
   const elements = [];
   if (traitNames.includes('heavy')) {
      elements.push(
         createSituationalElement('heavy', 'advantage', -2, 'situationSwimFlyClimb', 'athletics'),
         createSituationalElement('heavy', 'automaticFailure', 1, 'situationJump', 'athletics'),
      );
   }
   if (traitNames.includes('encumbering')) {
      elements.push(createSituationalElement('encumbering', 'advantage', -1, 'situationSwimFlyClimb', 'athletics'));
   }
   if (traitNames.includes('loud')) {
      elements.push(
         createSituationalElement('loud', 'advantage', -1, 'situationRemainUndetectedByHearing', 'stealth'),
      );
   }

   return elements;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/ArmorTraitCheckModifiers.test.js`
Expected: PASS. (`CheckModifierLocalizationKeys.test.js` passes after Step 6.)

- [ ] **Step 5: Gather the synthetic elements in `_applyRulesElements`**

In `CharacterDataModel.js` add the import
`import createArmorTraitCheckModifiers from '~/document/types/item/types/armor/ArmorTraitCheckModifiers.js';`
after the `createCharacterSystemTemplate` import. In `_applyRulesElements`, directly after the closing `});` of
`this.parent.items.forEach((item) => { … });`, add:

```js

      // The equipped armor's traits add synthetic situational check modifiers, sourced as the armor. They join the
      // gathered elements here because the conditional-check caches are built below, before _applyArmorAndShields runs.
      /** @type {TitanItem|boolean} The equipped armor, or false when none is equipped. */
      const equippedArmor = this.getEquippedArmor();
      if (equippedArmor) {
         processElements(createArmorTraitCheckModifiers(equippedArmor.system.trait), 'equipment', equippedArmor.name);
      }
```

- [ ] **Step 6: Localize the situation labels**

In `lang/en.json` → `LOCAL`, insert alphabetically:

```json
      "situationJump.text": "Jump",
      "situationRemainUndetectedByHearing.text": "Remain Undetected by Hearing",
      "situationSwimFlyClimb.text": "Swim, Fly, or Climb",
```

- [ ] **Step 7: Write the e2e spec**

Create `tests/e2e/armor-trait-situations.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { clickRoll, readNewestCheckFlags, setSelectField } from './checkDialog.js';

/**
 * Equipped Heavy, Encumbering, and Loud armor offer their check rules as situational modifiers: Heavy's Greater
 * Disadvantage to Swim, Fly, or Climb and its Jump Automatic Failure on Athletics checks only, and Loud's Disadvantage
 * to remain undetected on Stealth checks only.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Armor Trait Actor';

/** @type {string} Name of the armor item seeded for this spec. */
const ARMOR_NAME = 'E2E Trait Armor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {{jump: string, swim: string, undetected: string}} The localized situation labels. */
let labels;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   labels = await page.evaluate(() => ({
      jump: game.i18n.localize('LOCAL.situationJump.text'),
      swim: game.i18n.localize('LOCAL.situationSwimFlyClimb.text'),
      undetected: game.i18n.localize('LOCAL.situationRemainUndetectedByHearing.text'),
   }));
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
 * Rebuilds the actor wearing one armor with the given traits, under the situational dialog setting.
 * @param {string[]} traits - The armor's trait names.
 * @returns {Promise<void>} Resolves once the armor is equipped.
 */
async function seedArmoredActor(traits) {
   await page.evaluate(async ({ actorName, armorName, armorTraits }) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });

      /** @type {TitanItem[]} The created armor, alone in the array. */
      const [armor] = await actor.createEmbeddedDocuments('Item', [
         {
            name: armorName,
            type: 'armor',
            system: {
               trait: armorTraits.map((name) => ({
                  name,
                  value: true,
               })),
            },
         },
      ]);
      await actor.system.equipArmor(armor.id);
   }, {
      actorName: ACTOR_NAME,
      armorName: ARMOR_NAME,
      armorTraits: traits,
   });
}

/**
 * Requests an Athletics check for the actor and returns its open dialog.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog window.
 */
async function openAthleticsDialog() {
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).system.requestAttributeCheck({ skill: 'athletics' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The dialog window. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();
   return dialog;
}

/**
 * Locates a situation row in a dialog by its label.
 * @param {import('@playwright/test').Locator} dialog - The dialog window.
 * @param {string} label - The situation label.
 * @returns {import('@playwright/test').Locator} The row.
 */
function situationRow(dialog, label) {
   return dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: label });
}

test('Heavy armor offers Jump and Swim, Fly, or Climb only on Athletics checks', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();

   /** @type {import('@playwright/test').Locator} The Jump situation row. */
   const jump = situationRow(dialog, labels.jump);

   /** @type {import('@playwright/test').Locator} The Swim, Fly, or Climb situation row. */
   const swim = situationRow(dialog, labels.swim);
   await expect(jump).toBeVisible();
   await expect(swim).toBeVisible();

   // Swim, Fly, or Climb starts unticked: the Difficulty is the base 4.
   await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('4');

   // A Dexterity check offers neither Athletics-narrowed situation.
   await setSelectField(dialog, 'skill', 'dexterity');
   await expect(jump).toHaveCount(0);
   await expect(swim).toHaveCount(0);
});

test('ticking Swim, Fly, or Climb applies Greater Disadvantage', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();
   await situationRow(dialog, labels.swim).locator('[data-testid^="situation-toggle-"]').click();
   await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('6');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters).toMatchObject({
      advantage: -2,
      baseDifficulty: 4,
      difficulty: 6,
   });
   expect(flags.parameters.situations.map((situation) => situation.label)).toEqual([labels.swim]);
});

test('a ticked Jump does not apply once the check\'s Skill changes', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();
   await situationRow(dialog, labels.jump).locator('[data-testid^="situation-toggle-"]').click();
   await setSelectField(dialog, 'skill', 'dexterity');
   await expect(situationRow(dialog, labels.jump)).toHaveCount(0);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.automaticFailure).toBe(false);
   expect(flags.parameters.situations).toEqual([]);
});

test('Heavy and Encumbering merge into one Athletics entry, and Loud offers its own on Stealth', async () => {
   await seedArmoredActor([
      'heavy',
      'encumbering',
      'loud',
   ]);
   /** @type {{athletics: object[], stealth: object[]}} The Advantage-type situational modifiers per Skill. */
   const modifiers = await page.evaluate((actorName) => {
      /** @type {CharacterDataModel} The seeded actor's data model. */
      const system = game.actors.getName(actorName).system;

      /**
       * Lists an Attribute Check's Advantage-type situational modifiers for one Skill.
       * @param {string} skill - The check's Skill.
       * @returns {object[]} The Advantage-type entries.
       */
      const advantageOnly = (skill) => system.getSituationalCheckModifiers('attribute', { skill })
         .filter((modifier) => modifier.modifierType === 'advantage');
      return {
         athletics: advantageOnly('athletics'),
         stealth: advantageOnly('stealth'),
      };
   }, ACTOR_NAME);
   expect(modifiers.athletics).toEqual([
      expect.objectContaining({
         label: labels.swim,
         sources: [ARMOR_NAME],
         value: -3,
      }),
   ]);
   expect(modifiers.stealth).toEqual([
      expect.objectContaining({
         label: labels.undetected,
         sources: [ARMOR_NAME],
         value: -1,
      }),
   ]);
});

test('unequipping the armor removes its situational modifiers', async () => {
   await seedArmoredActor(['heavy']);
   /**
    * Counts the actor's situational modifiers on an Athletics check.
    * @returns {Promise<number>} The count.
    */
   const count = () => page.evaluate((actorName) => game.actors.getName(actorName).system
      .getSituationalCheckModifiers('attribute', { skill: 'athletics' }).length, ACTOR_NAME);
   expect(await count()).toBe(2);

   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).system.unEquipArmor();
   }, ACTOR_NAME);
   await expect.poll(count, { message: 'the armor no longer offers situations' }).toBe(0);
});
```

- [ ] **Step 8: Lint, unit, build, e2e**

Run: `npm run eslint`; `npm test`; `npm run build`;
`npm run test:e2e -- tests/e2e/armor-trait-situations.spec.js tests/e2e/armor-heavy-trait.spec.js tests/e2e/reactive-armor-shield.spec.js`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git branch --show-current
git status --short
git add src/document/types/item/types/armor/ArmorTraitCheckModifiers.js \
   src/document/types/actor/types/character/CharacterDataModel.js lang/en.json \
   tests/unit/ArmorTraitCheckModifiers.test.js tests/unit/CheckModifierLocalizationKeys.test.js \
   tests/e2e/armor-trait-situations.spec.js
git commit -F - <<'EOF'
feat(armor): Heavy, Encumbering, and Loud apply their check rules as situations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 10: Documentation and full verification

**Files:**
- Modify: `docs/TODO.md`, `docs/POST_WORK_FINDINGS.md`
- Modify: `docs/superpowers/specs/2026-09-27-advantage-disadvantage-design.md` (spec A: as-built interfaces)
- Modify: `.claude/skills/titan-codebase/references/conventions.md`, `data-flow.md`, `abstractions.md`,
  `architecture.md`
- Verify: `lang/en.json` (no new edits expected), `docs/CLOSED_BUGS.md` / `docs/OPEN_BUGS.md` per task reports

**Interfaces:**
- Consumes: everything above. Produces: documentation matching the code.

- [ ] **Step 1: Update `docs/TODO.md`**

Delete the whole bullet beginning `- Conditional check modifiers on Resistance checks.` and the whole bullet beginning
`- Heavy armor's remaining rules`. In the bullet beginning `- Conditions rework to the 2026-09-26 rules`, replace
`Open design questions: how a rules element expresses "-1/4 of base, rounded up", and that the system has no
Advantage/Disadvantage mechanic at all.` with `Open design question: how a rules element expresses "-1/4 of base,
rounded up".` In the "Compendium audit findings awaiting a rules decision" list, delete the line
`  - Abjuration of the Arbiter: the dice penalty misses Resistance checks (see the Resistance-check item above).`: its
Resistance half is fixed by Task 4, it awaits no rules decision, and its remaining description note (the GM sets the
value per target) is owned by spec C (`docs/superpowers/specs/2026-09-27-compendium-rulings-design.md`, rulings row 4).

- [ ] **Step 2: Record the armor-situation narrowing in `docs/POST_WORK_FINDINGS.md`**

Insert after the intro paragraph:

```markdown
### Armor-trait situations are narrowed to the Skill their checks use (2026-09-28)

Heavy and Encumbering's "Swim, Fly, or Climb" situation and Heavy's "Jump" are narrowed to Athletics (rules lines
2300 and 3150: jumping and climbing are Body (Athletics) checks); Loud's "Remain Undetected by Hearing" is narrowed to
Stealth. Unnarrowed, they would make every check a situational check, so under the default `getCheckOptions` choice
`situational` an armored character would open the check dialog on every roll, Resistance checks included. The
narrowing lives in `createArmorTraitCheckModifiers` (`src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`).
```

- [ ] **Step 3: Amend spec A to the as-built interfaces**

In `docs/superpowers/specs/2026-09-27-advantage-disadvantage-design.md` (resolutions #2, #3, #10, #11):

(a) In §2, directly after the bullet that ends `the stored option keeps the raw sum.`, insert:

```markdown
- Every check dialog shows the effective (post-Advantage) Difficulty as a summary labeled "Effective Difficulty"
  (`check-summary-difficulty`), so a change to the Advantage select or a ticked situation is visible before rolling;
  Attack dialogs show no other Difficulty.
```

(b) In §4, replace the bullet

```markdown
- Situational elements never apply automatically. The actor exposes
  `getSituationalCheckModifiers(checkType, { skill })` → a list of `{ key, label, modifierType, value, source }`
  entries that apply to the check type (its own type plus `any`) and, when narrowed, to the check's skill, where
  `source` is the owning item/effect name.
```

with

```markdown
- Situational elements never apply automatically. The actor exposes
  `getSituationalCheckModifiers(checkType, { skill })` → a list of `{ key, label, modifierType, value, sources }`
  entries that apply to the check type (its own type plus `any`) and, when narrowed, to the check's skill. Entries
  sharing a key and a modifier type sum across owners (Heavy and Encumbering on one armor, or armor and an effect), so
  `sources` is a `string[]` of the owning items' and effects' names.
```

(c) In §4, replace

```markdown
- Situational modifiers apply only through the dialog; a check rolled without the dialog applies none.
- The chat card lists the ticked situations by label.
```

with

```markdown
- Situational modifiers never apply automatically: a check applies only the situations its `options.situations`
  names. The check dialog is the only UI that ticks them; a caller (a macro or module) that passes `situations`
  directly has them applied like any other option it passes.
- Parameters record the applied situations as `situations: { key, label }[]`: `buildSchemaFromShape` maps an empty
  array to an `ArrayField(ObjectField)`, which rejects strings, and the label lets the card render without an actor
  lookup. The chat card lists them by label.
```

- [ ] **Step 4: Update `conventions.md`**

Replace the paragraph beginning `**Conditional check modifiers** — \`CONDITIONAL_CHECK_MODIFIER_TYPES\`` (through
`Resistance checks read\nno conditional modifiers.`) with:

```markdown
**Conditional check modifiers** — `CONDITIONAL_CHECK_MODIFIER_TYPES` (`src/system/ConditionalCheckModifierTypes.js`)
is the single list of `modifierType` values (`damage`, `dice`, `expertise`, `training`, `healing`, `advantage`,
`automaticFailure`): the rules-element editor's options and the actor cache keys. `CHECK_TYPE_MODIFIER_TYPES` maps each
check type to the modifier types it reads (an Attribute Check has no Damage; a Resistance Check has no Training); the
editor offers a check type only for those, and `getSituationalCheckModifiers` offers only those. `advantage` stores its
level (±1, ±2) in `value` and sums across sources; `automaticFailure` counts as 1 whatever its `value`
(`_getConditionalCheckModifierValue`). `CharacterDataModel.get{Attribute,Resistance,Attack,Casting,Item}CheckMod` read
the cache only through `_getConditionalCheckModsForType`, which asserts the type is in that list, and user-typed keys
(selectors in `USER_KEYED_CHECK_MODIFIER_SELECTORS`: `customTrait`, `spellTradition`, `situation`) go through
`_normalizeConditionalCheckModKey` (camel case) in both the cache builders and the lookups. Resistance checks read
checkType `any` + selector `any`, checkType `resistance` + selector `any`, and checkType `resistance` + selector
`resistance` keyed by the rolled Resistance (`getResistanceCheckMod`); `any`-type `attribute`/`skill` selectors never
apply to them, and Training never does.

**Situational check modifiers** — a `conditionalCheckModifier` with selector `situation` never applies automatically.
`_applyRulesElements` tags every gathered element with its owner's name (`sourceName`) and routes situation elements
into `rulesElementsCache.situationalCheckModifier` (`{ checkType, key, label, modifierType, skill, source, value }`)
instead of the summed cache. `getSituationalCheckModifiers(checkType, { skill })` returns the entries of the check type
plus `any`, of modifier types the check reads, narrowed by `skill` (`''` = any Skill), with one entry per key +
modifier type summed across owners (`sources`). Check options carry `situations` (camel-case keys the dialog ticks or
a caller names; nothing applies automatically); every
`get<Type>CheckParameters` adds the ticked entries on top of the options through `_applySituationalModifiers` (options
keep only always-on values, so recomputing never double-counts; a tick that no longer applies is ignored) and records
`{ key, label }` in `parameters.situations`. The equipped armor's Heavy/Encumbering/Loud traits add synthetic
situation elements (`createArmorTraitCheckModifiers`, `src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`;
Heavy's Jump Automatic Failure is narrowed to Athletics).
```

In the `**\`data-testid\` convention**` paragraph append: `The Advantage, Automatic Failure, and situation dialog rows
use \`check-field-advantage\`, \`check-field-automaticFailure\`, \`check-summary-difficulty\` (the post-Advantage
Difficulty), \`check-field-situations\`, and per situation \`situation-row-<key>\` / \`situation-toggle-<key>\`; check
cards use \`check-chat-dc\`, \`check-chat-advantage\`, \`check-chat-automatic-failure\`, \`check-chat-situations\`, and
\`check-chat-situation\`; the conditional-check-modifier editor uses \`ccm-*\` ids (\`DocumentSelect\` forwards
\`testId\`).`

- [ ] **Step 5: Update `data-flow.md`**

Replace the step-1 paragraph (from `A sheet button or macro calls \`requestAttributeCheck(options)\`` through
`otherwise it calls \`rollAttributeCheck\` directly.`) with:

```markdown
A sheet button or macro calls `requestAttributeCheck(options)` (or the equivalent for attack / resistance /
item / casting checks). The request validates the options, asks `getSituationalCheckModifiers` whether any situational
modifier applies (from the initialized options' Skill), and passes that to `shouldGetCheckOptions(
hasSituationalModifiers)`. The helper reads the `titan.getCheckOptions` choice — `never`, `situational` (default), or
`always`; `resolveCheckOptionsMode` reads a stored `true` as `always` and any other value outside the choices as
`situational`, and such a value is rewritten to its choice at init — and inverts it when the modifier key is held,
except that a check with situational modifiers always hedges toward the dialog. If the dialog is needed it creates an
`AttributeCheckDialog`; otherwise it calls `rollAttributeCheck` directly. A caller may pass `options.situations` on
either path; the named situations apply like any other option.
```

In step 2, after the sentence ending `delegates rendering\nto the type-specific shell (\`AttributeCheckDialogShell\`).`
add: `\`CheckDialogShell\` also sets \`checkType\` and \`checkActor\` (a \`ReactiveDocument\` bridge over the rolling
Actor) into context; \`CheckDialogBase\` lists the check's situational modifiers below the rows
(\`CheckDialogSituationsField\`, one unticked checkbox per key; ticking writes \`options.situations\`). The situational
list and each shell's parameter \`$effect\` read the Actor through the bridge, so the open dialog follows the Actor's
updates and its item and effect changes, and closes when a change invalidates the check. Every shell offers the
Advantage select (\`CheckDialogAdvantageField\`, which shows the raw sum clamped to ±2), the Automatic Failure
checkbox, and the Effective Difficulty summary.`

At the end of the step-3 "Parameter derivation" paragraph append: `Before the attribute-based totals,
\`_applySituationalModifiers\` adds the ticked situations. After the Difficulty is final (an Attack Check's
rating-derived one included), \`_applyCheckAdvantage\` stores it as \`baseDifficulty\` and applies
\`applyAdvantage(difficulty, advantage)\` (\`src/check/ApplyAdvantage.js\`): the net level is clamped to ±2;
Advantage lowers the Difficulty to a floor of 2, Disadvantage raises it to a ceiling of 6, and a Difficulty already
past the bound is left alone. Options initialize \`advantage\` and \`automaticFailure\` from conditional modifiers like
\`diceMod\`; Resistance Checks do so through \`getResistanceCheckMod\`.`

At the end of step 4 append: `\`calculateCheckResults\` honors \`parameters.automaticFailure\`: the dice and critical
counts stay, but successes are 0 and the check fails, so no type-specific damage or healing lands and Resistance and
opposed checks reduce no damage; recalculation re-reads the flag from the stored parameters. An automatically failed
card withholds every action that could change its outcome — the chat-log Re-roll Failures, Double Training, and Double
Expertise entries (\`src/hooks/OnGetChatLogEntryContext.js\`), the reset-Expertise button, and per-die Expertise — and
\`CheckChatMessageDie\` styles each die as a failure (a 1 as a critical failure).`

- [ ] **Step 6: Update `abstractions.md`**

Replace the rules-element table row
`| \`createConditionalCheckModifier\` | \`conditionalCheckModifier\`   | Modify a check's damage, bonus dice, etc. when a   |`
and its continuation row with:

```markdown
| `createConditionalCheckModifier` | `conditionalCheckModifier`   | Modify a check's damage, healing, dice, training,  |
|                                  |                              | expertise, Advantage (±1/±2), or force an Automatic|
|                                  |                              | Failure; selector `situation` makes it an opt-in   |
|                                  |                              | dialog checkbox (optionally narrowed to a Skill).  |
```

Replace the paragraph beginning `Equipped gear is applied outside the rules-element pipeline` with:

```markdown
Equipped gear is applied in two places. Outside the rules-element pipeline (`_applyArmorAndShields`, the `equipment`
mod buckets): the equipped shield adds its `defense` to the Defense rating, the equipped armor adds its armor value to
`mod.armor`, and an armor trait named `heavy` subtracts 1 from each speed whose base plus mods-so-far is above 0.
Inside it, `_applyRulesElements` gathers the equipped armor's trait check rules as synthetic situational
`conditionalCheckModifier` elements sourced as the armor (`createArmorTraitCheckModifiers`): Heavy → Greater
Disadvantage on "Swim, Fly, or Climb" and Automatic Failure on "Jump", both narrowed to Athletics; Encumbering →
Disadvantage on "Swim, Fly, or Climb" (Athletics); Loud → Disadvantage on "Remain Undetected by Hearing" (Stealth).
The character `mod` stats are only `armor`, `resolveRegain`, and `woundRegain` (`src/system/Mods.js`); check damage
and healing bonuses are not mods — they come only from `conditionalCheckModifier` elements with `modifierType`
`damage`/`healing`, where check type `any` + selector `any` applies to every attack, casting, and item check.
```

At the end of the Checks "**Results**" paragraph append: `\`calculateCheckResults\` honors
\`parameters.automaticFailure\` (dice and critical counts kept, 0 successes, failed), so every type-specific
calculator inherits it. \`src/check/ApplyAdvantage.js\` holds \`applyAdvantage\`, \`clampAdvantage\`,
\`getAdvantageLabel\`, and the dialog/editor level options; every parameters shape carries \`advantage\`,
\`automaticFailure\`, \`baseDifficulty\`, and \`situations\` (\`{ key, label }[]\`).`

In the `CheckChatMessageDataModel` bullet append: `Its \`migrateData(source)\` fills \`parameters.baseDifficulty\` from
\`parameters.difficulty\` when the parameters carry a Difficulty but no base Difficulty (a diff without a Difficulty is
skipped); \`advantage\`, \`automaticFailure\`, and \`situations\` take their schema initials. INVARIANT: every
parameter update carries \`baseDifficulty\` whenever it carries \`difficulty\`.`

Replace the bullet `- \`CheckChatResults.svelte\` — success/failure summary.` with
`- \`CheckChatResults.svelte\` — success/failure summary, the Advantage level tag beside the DC, the Automatic Failure
tag, and the applied situation labels; the reset-Expertise button is withheld on an automatically failed card.`

- [ ] **Step 7: Update `architecture.md`**

In the `src/check/` bullet, after `a shared dialog and chat-message shell,` insert
`the pure \`ApplyAdvantage.js\` Difficulty helper,`.

- [ ] **Step 8: Sync bug logs and localization**

Read every task report. For each bug a task fixed on the way, add an entry to `docs/CLOSED_BUGS.md` (next number,
mechanism, fix, commit) and delete it from `docs/OPEN_BUGS.md` if it was logged there. Any bug found is fixed in the
task that found it; it goes to `docs/OPEN_BUGS.md` only with the user's express authorization, recorded in that task's
report. Confirm every label added by Tasks 3, 5, 6, 8, and 9 exists in `lang/en.json` and none double-localizes by
running `npx vitest run tests/unit/CheckModifierLocalizationKeys.test.js tests/unit/LocalizationKeys.test.js` (PASS)
and the localization e2e in the full run below.

- [ ] **Step 9: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes without error.

- [ ] **Step 10: Full verification**

Run: `npm run eslint`; `npm run stylelint`; `npm test`; `npm run build`. Then run the full e2e suite with the Bash
tool's `run_in_background: true`:
`npm run test:e2e > debug/dumps/e2e-full-advantage.log 2>&1`, and when it exits read the log: `grep -c "✘"
debug/dumps/e2e-full-advantage.log` must print 0, `grep "failed" debug/dumps/e2e-full-advantage.log` must print
nothing, and the final `passed` count must equal the `Running N tests` count. Then `trash debug/dumps/e2e-full-advantage.log`.

- [ ] **Step 11: Commit**

```bash
git branch --show-current
git status --short
git add docs/TODO.md docs/POST_WORK_FINDINGS.md docs/superpowers/specs/2026-09-27-advantage-disadvantage-design.md \
   .claude/skills/titan-codebase/references/conventions.md \
   .claude/skills/titan-codebase/references/data-flow.md .claude/skills/titan-codebase/references/abstractions.md \
   .claude/skills/titan-codebase/references/architecture.md
git commit -F - <<'EOF'
docs: advantage, situational modifiers, and Resistance-check modifiers close-out

Deletes the Resistance-check and Heavy-armor TODO items, corrects the two
backlog lines they made stale, records the armor-dialog consequence, amends
spec A to the as-built interfaces, and updates the titan-codebase skill to
the current check flow.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

(Add `docs/CLOSED_BUGS.md` to `git add` when Step 8 logged a fixed bug, and `docs/OPEN_BUGS.md` when Step 8 deleted a
fixed bug from it or logged one the user expressly authorized deferring; a bug is never logged open without that
authorization.)

---

## Self-Review (run by the plan writer)

- **Spec coverage:** §1 advantage type + editor level select + reset to 1 → Tasks 3, 8. §2 `applyAdvantage` → Task 1;
  options/parameters/`baseDifficulty`/attack ordering → Task 2; dialog select → Task 6; chat tag → Task 7; chat
  shapes → Task 2. §3 `automaticFailure` type → Task 3; options/parameters/dialog checkbox → Tasks 2, 3, 6; results
  forced and recalculation → Task 2 (the card withholds outcome-changing actions, resolution #12); chat tag → Task 7.
  §4 `situation` selector, user-keyed, skill narrowing, `getSituationalCheckModifiers`, dialog checkboxes,
  parameter-time contributions, no double count, never automatic (caller-supplied keys honored, resolution #11, spec
  amended in Task 10), chat list → Tasks 3, 6, 7, 8. §4a setting, table, stored-Boolean reads, per-request lookup →
  Task 5. §5 Resistance modifiers → Task 4; editor `resistance` check type and hidden types (both filter directions)
  → Task 8. §6 armor traits → Task 9. Error handling (assert kept; messages without the new fields) → Tasks 2, 3.
  Testing list → every task's tests. Documentation → Task 10 (TODO, POST_WORK_FINDINGS, spec A as-built notes, skill).
- **Placeholders:** none; every code step carries complete code or an exact edit anchor.
- **Type consistency:** `getSituationalCheckModifiers(checkType, { skill })` → `SituationalCheckModifier` with
  `sources: string[]` (Tasks 3, 6, 9); `options.situations: string[]` vs `parameters.situations: SituationLabel[]`
  (Tasks 2, 3, 6, 7); `_applyCheckAdvantage` (Task 2) runs after `_applySituationalModifiers` (Task 3);
  `processElements(sourceElements, type, sourceName)` (Task 3) consumed by Task 9; `ADVANTAGE_LEVEL_OPTIONS` (Task 6)
  and `ADVANTAGE_ELEMENT_LEVEL_OPTIONS` + `clampAdvantage` (Task 8) from Task 1; `readNewestCheckFlags(page, baseline,
  type?)` → `{ id, type, parameters, results }` (Task 2) consumed by Tasks 4, 6, 9; context `'checkActor'` is a
  `ReactiveDocument` (Task 6) read as `checkActor?.data` by `CheckDialogBase` and the five shells;
  `CheckModifierLocalizationKeys.test.js` (Task 3) extended by Tasks 5, 6, 8, 9.
