# Design: Fully Retire a11y Suppressions + Localize All aria-labels

**Date:** 2026-05-30
**Status:** Approved (design) — pending spec review
**Related:** `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md` (this completes the
"accepted debt" a11y items from that tracker).

## Problem

The Svelte 5 migration left two documented a11y debts:

- `EditDeleteTag.svelte` renders its edit/delete icons as `<a role="button" tabindex="0">` with no
  `href` and no text content, suppressing `a11y-missing-attribute` and `a11y-missing-content`.
- `IconButton.svelte` is a generic icon-only `<button>` whose accessible name is optional, so it
  suppresses `a11y_consider_explicit_label`.

Separately, every `aria-label` currently in the codebase is a hardcoded English string, inconsistent
with the project convention of routing user-facing text through `localize()`.

**Goal:** Remove every a11y `svelte-ignore` in those two components, give every icon-only control a
localized accessible name, and route all `aria-label`s through `localize()` — **with zero visual
change to any element.**

## Hard constraint

No visual change. The only element that changes type is `EditDeleteTag`'s icons (`<a>` → `<button>`),
which carries the only real visual-regression risk; it must render pixel-identically and is gated on
in-Foundry visual verification.

## Verified facts (from code/lang audit)

- **`IconButton` reach.** Directly used at ~15 sites (expand/collapse chevrons, delete, reset), and
  transitively via two wrappers that must forward a label:
  - `DocumentOwnerIconButton.svelte` — consumers include `CharacterSheetPortrait.svelte` (4: long
    rest, short rest, remove combat effects, spend resolve), `CharacterSheetItemDeleteButton.svelte`
    (already passes `tooltip={localize('deleteItem')}`), `ItemSheetRulesElementSettings.svelte`
    (delete). The plan will grep the complete consumer list.
  - `MiniIconButton.svelte` — consumer `IntegerIncrementInput.svelte` (2: increment, decrement).
  - `CheckChatResetExpertiseButton.svelte` — passes `icon`/`onclick` only.
- **`EditDeleteTag` reach.** Only 2 consumers (`WeaponSheetAttackCustomTraitTag.svelte`,
  `ItemSheetCustomTraitTag.svelte`); both already pass `editTooltip`/`deleteTooltip`.
- **`localize()` contract.** `localize('x')` → `game.i18n.localize('LOCAL.x.text')`. `lang/en.json`
  is a flat map under `"LOCAL"` of `"<key>.text": "Value"` entries.
- **Existing keys to reuse (do NOT re-add):** `sendToChat.text` (483), `editTrait.text` (232),
  `deleteTrait.text` (207), `deleteItem.text`. (The earlier worry that `editTrait`/`deleteTrait`
  were missing was wrong — they exist; no "bonus" fix needed.)
- **Existing aria-labels (all hardcoded English), to localize:** `EditDeleteTag` (Edit, Delete),
  `IconButton` (`{label}` — dynamic, fine), `ExpandButton` (`Collapse`/`Expand`),
  `ActorSheetEditTokenButton` (Edit Token), `ActorSheetImportActorButton` (Import Actor to World),
  `ActorSheetToggleLinkedTokenButton` (Toggle Token Link), `ActorSheetUnlinkTokenButton`
  (Unlink Token), `ActorSheetUnlinkedTokenButton` (Token Unlinked), `ItemSheetSendToChatButton`
  (Send to Chat), `ItemSheetImportItemButton` (Import Item to World).

## Approach (chosen)

**Approach A** for `EditDeleteTag`: convert the icons to real `<button type="button">`, drop
`role`/`tabindex`/`onkeypress` (native to button), and add a scoped chrome reset that inherits
sizing/color but **deliberately leaves `font-family` untouched** so the FontAwesome glyph still
renders. Rejected alternatives: keeping `<a>` (can't satisfy anchor-only a11y rules), or the
`<button><i class={icon}></i></button>` child-icon form (bigger diff; reserved as fallback if visual
verification shows drift).

For `IconButton`: make `label` a required-by-convention prop and remove its suppression; supply a
localized label at every path that reaches it. For aria-labels generally: route through `localize()`,
adding concise `lang/en.json` keys.

## Changes

### A. `lang/en.json` — add label keys

Add concise `"<key>.text": "Value"` entries (alphabetically placed, matching existing format).
**Reuse** existing keys where present (`sendToChat`, `deleteItem`); add the rest. Candidate set
(plan will grep each to reuse-or-add): `collapse`, `delete`, `edit`, `editToken`, `expand`,
`importActor`, `importItem`, `increment`, `decrement`, `longRest`, `shortRest`,
`removeCombatEffects`, `spendResolve`, `resetExpertise`, `toggleTokenLink`, `tokenUnlinked`,
`unlinkToken`, `deleteRulesElement`. Each value is the current hardcoded English (e.g.
`"unlinkToken.text": "Unlink Token"`).

### B. `EditDeleteTag.svelte` (Approach A)

For each of the two icon controls:
- `<a class={EDIT_ICON|DELETE_ICON} role="button" tabindex="0" onclick=… onkeypress=… use:tooltipAction=…>`
  → `<button type="button" class={EDIT_ICON|DELETE_ICON} aria-label={localize('edit'|'delete')}
  onclick=… use:tooltipAction=…>`.
- Remove `role`, `tabindex`, `onkeypress`, and all three `svelte-ignore` lines.
- Add a scoped style reset for these buttons:
  `appearance: none; background: none; border: none; margin: 0; padding: 0; color: inherit;
  font-size: inherit; font-weight: inherit; line-height: inherit; cursor: pointer;`
  (No `font-family` — the FA class owns the glyph font.)
- `.tag` flex layout and `:not(:first-child) { separator-left }` continue to target the children, so
  spacing/separators are unchanged.

### C. `IconButton.svelte` + label propagation

- `IconButton.svelte`: change `label` from optional (`= void 0`) to required (no default; JSDoc marks
  it required), keep `aria-label={label}`, remove the `a11y_consider_explicit_label` ignore.
- `DocumentOwnerIconButton.svelte` and `MiniIconButton.svelte`: add `label` to their props/typedef
  and forward `{label}` to `IconButton`.
- `CheckChatResetExpertiseButton.svelte`: pass `label={localize('resetExpertise')}`.
- Every direct `IconButton` site and every wrapper consumer: pass `label={localize('…')}` using the
  semantically correct key (expand/collapse chevrons → `expand`/`collapse`; delete → `delete` or the
  more specific existing key such as `deleteItem`; rest buttons → `longRest`/`shortRest`/etc.;
  steppers → `increment`/`decrement`). The plan enumerates each exact site via grep so none is missed.

### D. Localize standalone aria-labels

Replace hardcoded English aria-labels with `localize('…')`:
- `ExpandButton.svelte`: `aria-label={expanded ? localize('collapse') : localize('expand')}`.
- `ActorSheetEditTokenButton` → `localize('editToken')`; `ActorSheetImportActorButton` →
  `localize('importActor')`; `ActorSheetToggleLinkedTokenButton` → `localize('toggleTokenLink')`;
  `ActorSheetUnlinkTokenButton` → `localize('unlinkToken')`; `ActorSheetUnlinkedTokenButton` →
  `localize('tokenUnlinked')`.
- `ItemSheetSendToChatButton` → `localize('sendToChat')` (reuse existing key);
  `ItemSheetImportItemButton` → `localize('importItem')`.

Each of these files imports `localize` from `~/helpers/utility-functions/Localize.js` if not already.

## Verification (the zero-visual-change gate)

1. **ESLint** on all touched files: the removed a11y ignores must NOT re-fire (proves real
   labels/semantics), and no new errors. Pre-existing unrelated JSDoc warnings are acceptable.
2. **Stylelint** clean.
3. **Grep gates:**
   - No `svelte-ignore a11y` remains in `EditDeleteTag.svelte` or `IconButton.svelte`.
   - No `aria-label="…"` string literal remains anywhere in `src/` (every `aria-label` is
     `{localize(...)}` or `{expr ? localize(...) : localize(...)}` or `{label}`).
   - Every `localize('key')` introduced has a matching `"key.text"` in `lang/en.json`.
4. **Visual check in Foundry (required):** open an item/weapon sheet showing a custom-trait tag
   (exercises `EditDeleteTag` buttons) plus a sheet with expand/collapse + delete icon buttons and
   the +/- stepper; confirm pixel-identical to pre-change. Driven via the `verify`/`run` skill or a
   before/after for the user to eyeball. If `EditDeleteTag` shows any drift, switch it to the
   `<button><i class={icon}></i></button>` fallback and re-verify.

## Scope / commits

Per-task commits on `development`, grouped: (1) lang keys, (2) `EditDeleteTag`, (3) `IconButton` +
wrappers + all consumer labels, (4) standalone aria-label localization, (5) verification. After the
work, check off the EditDeleteTag and IconButton items in the
`2026-05-29-svelte5-remaining-fixups.md` "Accepted debt" section (move them to done / note resolved).

## Out of scope

- No behavioral/runtime change beyond a11y attributes and i18n.
- No restyling, no element changes other than `EditDeleteTag`'s `<a>`→`<button>`.
- The `state_referenced_locally` and `missing-declaration` suppressions (unrelated to a11y) stay as
  documented accepted debt.
- `foundry-vtt-types` v13→v14 (separate brainstorm/spec).
