# Rules-element selector `onchange` forwarding — design (backlog #1a)

**Date:** 2026-06-01
**Status:** Approved — ready to plan
**Backlog item:** `docs/TODO.md` #1a ("Rules-element settings: `onSelectorChange` never fires")

## Problem

The per-operation rules-element settings components pass a change handler to
`DocumentSelect` for their **selector** dropdown:

```svelte
<DocumentSelect
   bind:value={document.data.system.rulesElement[idx].selector}
   onchange={onSelectorChange}
   options={selectorOptions}
/>
```

`onSelectorChange` is meant to reset the element's `key` to a sensible default
for the newly chosen selector (e.g. `attribute` → `body`, `resource` → `resolve`)
and then persist.

It never runs. `DocumentSelect` does not declare or forward an `onchange` prop —
it hardcodes the inner `Select`'s `onchange` to its own
`refreshSystemDocument(...)`:

```svelte
<!-- DocumentSelect.svelte (current) -->
<Select
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {options}
   {tooltip}
/>
```

Because the inner `<select>`'s `bind:value` + `onchange` already handle the
change event, the consumer's `onchange={onSelectorChange}` is silently dropped.

### What actually breaks (narrow)

`refreshSystemDocument` itself **works**: changing the selector persists the new
value and re-renders the sheet (via `ReactiveDocument`'s `createSubscriber` →
Foundry `updateItem` hook → subscriber invalidation; the `structuredClone` in
`refreshSystemDocument` yields fresh references so change-detection fires). The
*only* lost behavior is the curated default-key reset:

- ✅ Selector change persists.
- ✅ Key always ends up **valid** — `Select.svelte`'s clamp `$effect` snaps an
  out-of-range key to the first option.
- ❌ Key lands on the **first** option instead of the **curated** default,
  because `onSelectorChange` never fires.

So this is a UX-polish defect (a slightly-wrong default key after switching
selector), not a functional break or crash.

### Secondary latent bug — the owner-guard

Every affected handler guards on the wrong object:

```js
if (assert(document?.isOwner, 'Cannot modify document %s if not owner.', document?.name)) { ... }
```

`document` here is the **`ReactiveDocument` bridge**, which exposes only
`.data` / `.doc` / `.destroy()` — it has **no** `isOwner` or `name`. So the
assert evaluates `undefined`, which would fire a red UI error toast
("Cannot modify document undefined if not owner.") and skip the body. The real
owner flag lives on `document.data.isOwner`.

This is dead today (the handler never runs), but **fixing the forwarding would
surface it** as a spurious error toast for legitimate owners. The two must be
addressed together.

## Affected components (six)

All wire a change handler through `DocumentSelect`'s ignored `onchange`, and all
carry the same broken `document?.isOwner` guard:

| Component | Handler(s) |
|-----------|-----------|
| `ItemSheetFlatModifierSettings.svelte` | `onSelectorChange` |
| `ItemSheetMulSumSettings.svelte` | `onSelectorChange` |
| `ItemSheetMulBaseSettings.svelte` | `onSelectorChange` |
| `ItemSheetSetSumSettings.svelte` | `onSelectorChange` |
| `ItemSheetConditionalRatingModifierSettings.svelte` | `onRatingChange` → `onSelectorChange` |
| `ItemSheetRollMessageSettings.svelte` | `onCheckTypeChange` → `onSelectorChange` |

Paths: `src/document/types/item/sheet/rules-element/`.

## Approach — Option B (centralize persistence + retire the guard)

### Change 1 — `DocumentSelect.svelte`: forward + compose

Add an optional `onchange` prop. Run the consumer callback **first** (as a pure
in-memory mutation), then always persist:

```svelte
/** @type {DocumentSelectProps} */
let {
   value = $bindable(void 0),
   options = void 0,
   disabled = false,
   tooltip = void 0,
   onchange = void 0,
} = $props();
...
<Select
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => {
      onchange?.();
      refreshSystemDocument(document.data, disabled);
   }}
   {options}
   {tooltip}
/>
```

- Add `onchange` to the `DocumentSelectProps` `@typedef`.
- Consumers that pass `onchange`: mutate-then-persist with **one** `update()`.
- Consumers that don't (the majority): unaffected — `onchange?.()` is a no-op
  and `refreshSystemDocument` runs exactly as before.
- Ordering is load-bearing: the consumer mutation must run **before**
  `refreshSystemDocument` clones `document.system`, so the new key is included
  in the persisted payload and is already valid when the new key-select mounts
  (its clamp `$effect` then leaves it alone).

### Change 2 — the six handlers become pure key-setters

In each of the six components, the change handler(s):

- **Delete** the `assert(document?.isOwner, …)` guard wrapper entirely.
- **Delete** the trailing `document.data.update({ system: structuredClone(...) })`.
- **Keep** only the `switch` that sets the sensible-default `key` (mutating the
  live document in memory via `document.data.system.rulesElement[idx].key = ...`,
  or the local `element` alias where one exists).

Owner-gating and persistence now live solely in:
- `DocumentSelect` disabling itself for non-owners
  (`disabled || !document.data?.isOwner`), and
- `refreshSystemDocument`, which guards `!disabled && document?.isOwner` on the
  **real doc** it is handed (`refreshSystemDocument(document.data, ...)`).

`onRatingChange` / `onCheckTypeChange` continue to call `onSelectorChange` as
part of their pure mutation — still correct, still a single persist driven by
`DocumentSelect`.

This deletes the broken-guard bug class rather than patching the same wrong line
in six files.

## Testing — path A (one representative UI case)

Add one UI-driven Playwright case to `tests/e2e/rules-element-crud.spec.js`
(reusing its weapon + rules-element-tab harness):

1. Add a `flatModifier` rules element via the tab's add button.
2. Change its **selector** dropdown to a value whose curated default key is
   **not** that key-select's first option — verified at write time by inspecting
   the option order (candidate: `resource` → `resolve`; if `resolve` happens to
   be the first resource option, pick another discriminating pair such as
   `rating` → `awareness`).
3. Assert:
   - `game.items.getName(ITEM_NAME).system.rulesElement[0].key === '<curated default>'`
     — proves the curated reset ran, not merely the clamp's first-option
     fallback.
   - No error notification surfaced (`.notification.error` absent) — proves the
     retired owner-guard no longer toasts.

One representative case is sufficient: all six components share the single
`DocumentSelect` forwarding mechanism; the per-operation default-key *maps* are
pre-existing and unchanged by this work.

## Risk / blast radius

- **Low.** `DocumentSelect`'s behavior is unchanged for the many consumers that
  do not pass `onchange`. Only the six handlers change, and they become strictly
  simpler (guard + update removed).
- The one intended behavior change: switching a rules-element selector now lands
  on the curated default key instead of the first option.
- No data migration. No engine/computation changes — this is sheet-UI wiring.

## Out of scope

- The per-operation default-key maps themselves (unchanged).
- Any other `DocumentSelect` consumer.
- The broader `document?.isOwner`-vs-`document.data?.isOwner` audit elsewhere in
  the codebase (only the six rules-element handlers are touched here).
