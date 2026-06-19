# Numeric Input Math Evaluation — Design

**Date:** 2026-06-18
**Status:** Approved, ready for implementation plan

## Goal

Let users type basic math into integer/number inputs. Entering `10+5` and pressing
Enter (or clicking off) commits `15`. Evaluation respects the input's existing `min`,
`max`, `maxDigits`, and `isInteger` constraints.

## Decisions (user-confirmed)

- **Math scope:** `+ - * /`, parentheses, decimals, unary minus, standard precedence.
- **Relative delta:** an expression that *starts with* an operator (`+ - * /`) applies to
  the field's current value (`+5` on a field of `12` → `17`; `*2` → `24`; `-3` → `9`). A
  leading digit or `(` is a literal expression (`10+5` → `15`; `(4+2)*5` → `30`).
- **Bespoke inputs deferred:** `HudAmountDialogShell.svelte`,
  `PlayerHudSettingsShell.svelte`, `ThemeEditorShell.svelte` use their own raw
  `<input type="number">` and are out of scope; logged to `docs/TODO.md`.

## Architecture

All numeric fields route through one component, `NumberInput.svelte`
(`src/helpers/svelte-components/input/`). Its wrappers — `IntegerInput`,
`DocumentNumberInput`, `DocumentIntegerInput`, `IntegerIncrementInput`,
`DocumentIntegerIncrementInput`, `AttributeInput`, `ResistanceInput`, etc. — inherit the
behavior automatically.

A new pure utility owns parsing/evaluation so the logic is unit-testable in isolation and
the component stays thin:

`src/helpers/utility-functions/EvaluateMathExpression.js`

### `evaluateMathExpression(expression, { currentValue }) → number | null`

- Clean-room **shunting-yard**: tokenize → convert to RPN → evaluate. No `eval`, no
  `Function`, no dependency (satisfies the no-dynamic / clean-room rules in
  `.claude/CLAUDE.md`).
- Tokens: number literals (incl. decimals), `+ - * / ( )`, unary minus.
- **Relative delta:** if the trimmed expression's first non-space char is one of
  `+ - * /`, prepend `String(currentValue)` before tokenizing. Leading `(` or digit is a
  literal expression.
- Returns `null` for any malformed input: stray characters, unbalanced parentheses, empty
  expression, or a non-finite result (e.g. division by zero). The caller reverts on `null`.

## `NumberInput.svelte` changes

- **Element type:** `type="number"` → `type="text"`. Native number fields physically
  reject `*`, `/`, and bare operators, so text is required. `inputmode` stays text.
- **Keypress filter (`filterInput`):** relaxed to allow `0-9 . + - * / ( )` and
  whitespace; still blocks letters and other junk.
- **Timing (preserves current behavior):**
  - On `keyup`: if the raw string is a plain number (`/^-?\d*\.?\d*$/`), parse live exactly
    as today — keeps `DocumentNumberInput`'s live per-keystroke document writes working.
    If the string contains any operator or paren, do nothing until commit.
  - On `change` (fires on blur and on Enter): evaluate the full expression. This is the
    "press Enter or click off" commit path.
- **On evaluation result:**
  - `null` → revert the display string to the committed `value` (mirrors the current
    NaN-revert in `handleChange`).
  - number → apply the clamp sequence below, set `value`, fire `onchange?.()`.

### Clamp order (unchanged sequence, now fed by the evaluator)

1. `isInteger` → `Math.round(result)`.
2. `min` (if not `false`) → `Math.max`.
3. `max` (if not `false`) → `Math.min`.
4. `maxDigits` (if not `false`) → existing string-length truncation.

## Migration & impact

- Two e2e specs locate these fields with `input[type="number"]` and break on the type
  change. Update them to a stable selector that survives the change:
  - `tests/e2e/reactive-inventory-basic.spec.js` (`input[type="number"]` at ~L156)
  - `tests/e2e/reactive-effect-rows.spec.js`
- No SCSS change required: `@include input`, `--titan-input-text-alignment`, the
  `.max-digits` width rule, and `--titan-max-digits` all apply to a text input unchanged.

## Testing

- **Unit** (`EvaluateMathExpression`): precedence, parentheses, decimals, unary minus, the
  four relative deltas, integer rounding, and malformed-input → `null` cases.
- **E2E** (one focused spec): type `10+5` into a sheet numeric field, press Enter, assert
  `15`; and a relative `+5` case.

## Documentation (required final step)

- Update the `titan-codebase` skill: note the `EvaluateMathExpression` utility and that
  `NumberInput` is now a text input supporting math expressions.
- `docs/TODO.md`: log the deferred bespoke inputs (HUD amount dialog as the most plausible
  future opt-in; settings/theme inputs).
