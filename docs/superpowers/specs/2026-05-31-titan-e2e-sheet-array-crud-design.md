# TITAN E2E — Phase 3a: Sheet Array-CRUD Reactivity Design

**Date:** 2026-05-31
**Status:** Approved (brainstorm), pending implementation plan
**Builds on:** the Playwright UI layer and the existing first vertical slice
`tests/e2e/trait-add-custom.spec.js`.
**Part of:** Phase 3 (UI tier). See "Phase 3 decomposition" below.

## Goal

Prove that every sheet-driven edit of a `document.system.*` **array** (custom traits, rules elements)
both **persists** to the document AND **re-renders** the sheet. This is the exact bug class this effort
already caught once (the custom-trait in-place-mutation reactivity bug, bug #1): an in-place array
mutation before `update()` defeats `ReactiveDocument` change-detection, so the change saves but the sheet
never re-renders. Phase 3a locks in the fixed paths and hunts the flagged-but-untested ones.

## Background — the reactivity bug class

`ReactiveDocument` detects changes by reference. Mutating a live `document.system.<array>` in place
before calling `update()` makes the "current" state already equal the "new" state, so the diff sees no
change and the sheet does not re-render (even though the write persists). The remedy, established by bug
#1's fix, is to build a **fresh array** and pass that to `update()`.

Reconnaissance (read-only, 2026-05-31) classified every array-CRUD path:

| Surface | Method(s) | Path | Status |
|---|---|---|---|
| Custom trait ADD (item + effect) | `AddCustomTraitDialogShell.addTrait` | `[...customTrait, new]` | ✅ fresh array (safe) |
| Custom trait EDIT (item + effect) | `EditCustomTraitDialogShell.editTrait` | `customTrait.map(...)` | ✅ fresh array (safe) |
| Custom trait DELETE (item + effect) | `TitanItem/TitanActiveEffect.deleteCustomTrait` | `customTrait.filter(...)` | ✅ fresh array (safe) |
| Rules element ADD | `RulesElementMixin.addRulesElement` (`RulesElementMixin.js:42-53`) | `this.rulesElement.push(...)` then `update({ rulesElement: this.rulesElement })` — **mutated reference, no clone** | ⚠️ flagged, untested |
| Rules element DELETE | `RulesElementMixin.deleteRulesElement` (`:60-69`) | `this.rulesElement.splice(...)` then passes the mutated reference | ⚠️ flagged, untested |
| Inline check ADD/DELETE (item + effect) | `TitanItem.addCheck/deleteCheck` (`115/145`), `TitanActiveEffect.addCheck/deleteCheck` (`129/159`) | `push`/`splice` in place, then `structuredClone` **after** the mutation | ⚠️ flagged, untested — deferred (see Scope) |

## The two concerns

### Concern A — lock in the safe paths (custom traits)

Custom-trait add/edit/delete are already fixed (fresh arrays) but only **add-on-items** has a regression
test. Phase 3a extends `trait-add-custom.spec.js` into a `traits.spec.js` that covers **add / edit /
delete** on **both** Items and Active Effects (the effect sheet reuses the same dialog shells and
sidebar, so coverage is cheap). Each test asserts persistence AND re-render. Expected result: all PASS —
this is regression lock-in.

### Concern B — hunt the flagged path (rules elements)

Drive the rules-element editor (`ItemSheetRulesElementsTab.svelte`) through the real sheet: the "Add
Element" button (`DocumentOwnerButton` → `document.data.system.addRulesElement()`), and a per-row delete
control (`ItemSheetRulesElementSettings.svelte` → `deleteRulesElement(idx)`). The tab renders one `<li>`
per element (keyed by `element.uuid`) inside an `<ol>`, so re-render is observable as the row count.

Assert BOTH: (1) `item.system.rulesElement.length` changed, and (2) the rendered `<li>` row count
changed to match. If the in-place-mutation antipattern breaks reactivity, (1) passes but (2) fails — the
test catches the bug. **If a Concern B test fails, that is a real engine bug:** stop, invoke
`superpowers:systematic-debugging`, and fix it with the documented remedy (build a fresh array — e.g.
`update({ system: { rulesElement: [...this.rulesElement, newElement] } })` for add, `.filter(...)` for
delete) in `RulesElementMixin.js`. Do not loosen the assertion. Route the fix through the
`titan-svelte-dev` subagent. Add a regression note to the `titan-codebase` skill.

## Test mechanism (shared)

A single behavioral shape, reused across both concerns:

1. Log in as `E2E GM 1`; rebuild a clean fixture document (item or effect) from a builder payload; render
   its sheet; let the Svelte mount settle.
2. Read the baseline: the persisted array length AND the rendered row/tag count.
3. Drive the real UI control (sidebar button → dialog → commit, or tag edit/delete, or rules-element
   add/delete).
4. Assert BOTH the persisted array AND the rendered DOM changed consistently (count delta, and for
   edit, the changed name appears and the old one does not).
5. Assert no uncaught `pageerror` fired during the interaction.

The re-render assertion (step 4's DOM half) is what distinguishes this from a pure persistence test and is
what catches the reactivity bug.

## `testId` enabler (bounded)

Current selectors lean on dialog CSS classes, localized button text, and FontAwesome icon classes
(`EditDeleteTag.svelte` edit/delete buttons carry only `aria-label`/icon classes; the dialog shells'
`TextInput`/`Button` accept `testId` but don't set it; `TextAreaInput` lacks a `testId` prop entirely).
Add `data-testid` only where these tests need a stable hook — no big-bang pass:

- The custom-trait dialog shells' name `TextInput` and the Add/Apply/Cancel `Button`s.
- `EditDeleteTag.svelte`'s edit and delete controls (so trait edit/delete select reliably, not by icon).
- The rules-element tab's "Add Element" button and each row's delete control.
- Add the missing `testId` prop to `TextAreaInput.svelte` (parity with the other input wrappers), even
  though these tests may not drive the description field.

All `.svelte` edits route through the `titan-svelte-dev` subagent and update the `titan-codebase` skill.

## Reuse

`login` (`tests/e2e/fixtures.js`), the builder pattern (`tests/shared/builders.js` — add
`buildTraitFixtureItemData`/`-EffectData` and a `buildRulesElementHostItemData` if needed, or reuse
existing minimal `{ name, type }` payloads + `addRulesElement` to seed rows). Selectors confirmed in
recon: dialog classes `titan-add-custom-item-trait-dialog` / `titan-edit-custom-trait-dialog`; sidebar
label "Add Custom Trait"; dialog buttons "Add Trait" / "Apply Edits" / "Cancel"; rules-element tab "Add
Element" (label key `addRulesElement`).

## File layout

```
tests/e2e/
  traits.spec.js          # Concern A — custom-trait add/edit/delete, items + effects
                          #   (absorbs and deletes trait-add-custom.spec.js)
  rules-element-crud.spec.js   # Concern B — rules-element add/delete reactivity (bug hunt)
tests/shared/
  builders.js             # extend with trait/rules-element host fixtures as needed
```

## Expected outcomes

- Concern A: all green (regression lock-in across the six flows).
- Concern B: green if the clone/fix already covers it; otherwise the row-count assertion fails on the
  buggy path → fix `RulesElementMixin` with a fresh array → green. Either way the behavior is now
  protected.

## Phase 3 decomposition (context)

Phase 3 (UI tier) splits into three independently-runnable sub-phases:

- **3a — sheet array-CRUD reactivity (THIS spec):** custom-trait dialogs (lock-in) + rules-element CRUD
  (bug hunt). No new infra; highest fidelity; absorbs the existing trait test.
- **3b — component tier:** a registry-backed Svelte "probe harness" that mounts each reusable base
  primitive (`Button`, `TextInput`, `NumberInput`/`IntegerInput`, `CheckboxInput`, `Select`,
  `ToggleButton`, `TextAreaInput`) once with `bind:value` and asserts its mechanism (persist / toggle /
  select). Net-new harness; deferred so the higher-fidelity slices land first.
- **3c — integration manifests:** per-sheet `{ selector, action, expectedDocPath, expectedValue }`
  manifests driving real sheet instances; grows by adding rows + `testId` anchors.

## Scope — explicitly out of 3a (YAGNI)

- The **component tier** and **integration manifests** (3b / 3c above).
- **Inline-check add/delete reactivity** (`addCheck`/`deleteCheck`, items + effects, lines 115/145/129/159)
  — the same bug class, but its sheet editor surface was not mapped in this recon. Fast-follow: map the
  inline-check editor UI, then cover it with the same persist+re-render mechanism (and apply the same
  fresh-array remedy if it fails). Recorded in the backlog rather than expanding 3a now.
- Annotating every sheet instance with `testId` (only the controls these tests touch).
