# Drag-drop polish, list reordering, and cross-sheet element copy

**Date:** 2026-06-11
**Status:** Design (awaiting review)

## Summary

Three related improvements to drag-and-drop in the TITAN sheets:

1. **Visual upgrade.** Replace the faint `.drag-hovered` background tint (the "barely
   visible" current feedback) with an **insertion line + visible grip handle** on every
   draggable list row.
2. **Reorder within item-settings tabs.** Add drag-to-reorder for the four plain-array
   element lists: `rulesElement`, `check`, `attack`, `customAspect` — each in its own
   settings tab. Also add drag-to-reorder for the character-sheet **effect** list (items
   already reorder).
3. **Cross-sheet copy.** Drag an element from one open sheet onto another sheet's matching
   tab: rules elements item→item, checks item→item, attacks weapon→weapon, custom aspects
   spell→spell. **Copy** semantics (the source keeps its element; the dropped copy gets a
   fresh `uuid`), **same-kind type-gating**, inserted **at the indicated drop position**.

## Decisions (locked with user)

- **Indicator:** insertion line (glowing accent bar at the drop boundary) **plus** an
  always-visible grip handle that lights up on hover. The grip both advertises
  draggability and lets a row be grabbed without fighting text selection inside the
  settings-row inputs.
- **Grip everywhere:** character-sheet item rows, character-sheet effect rows, and the
  four settings-list rows all get the grip.
- **Cross-sheet semantics:** **copy** (source retained), fresh `uuid` minted on the copy.
- **Type-gating:** a list only accepts its own element kind. `rulesElement` → any item
  with a rules tab; `check` → any item with a checks tab; `attack` → weapon attack tab
  only; `customAspect` → spell aspect tab only.
- **Mutator API:** **per-kind methods** mirroring the existing `addX`/`deleteX`
  convention: `moveX(fromIdx, toIdx)` and `insertX(elementData, atIdx)`.
- **Drag packaging:** **Svelte actions** (`use:draggableRow` / `use:reorderDropZone`)
  plus a shared `DragHandle.svelte`. Each existing tab keeps its own markup and filtering;
  it just adopts the actions.
- **Effect list:** add true sort-based reordering with the full insertion line (scope
  expansion approved), in addition to the grip.

## Current state (verified against code)

- **Character-sheet item list** (`.../character/sheet/items/CharacterSheetItemList.svelte`,
  and `CharacterSheetMultiItemList.svelte`): rows are `draggable`, drag payload is the
  item's Foundry `toDragData()`. Drop/reorder is handled at the sheet level by
  `TitanActorSheet._onDrop → _onSortItem` via `SortingHelpers.performIntegerSort` +
  `updateEmbeddedDocuments('Item', …)`. Only visual feedback today is
  `.drag-hovered { background: var(--titan-highlighted-background) }`.
- **Character-sheet effect list** (`CharacterSheetEffectList.svelte`): rows are
  `draggable` with the effect's `toDragData()` — **drag-out only**, no reorder path
  exists. List is sorted by `effect.sort`.
- **Four settings lists**, each a plain object array under `system.<field>` whose elements
  carry a `uuid` (used as the `{#each}` key):
  - `rulesElement` — `ItemSheetRulesElementsTab.svelte`; mutators `addRulesElement` /
    `deleteRulesElement(idx)` on the **data model** (`RulesElementMixin`).
  - `check` — `ItemSheetChecksTab.svelte` (via shared `FiltereedList`); mutators
    `addCheck` / `deleteCheck(idx)` on the **Item document** (`TitanItem`); array is
    `system.check`.
  - `attack` — `WeaponSheetAttacksTab.svelte`; mutators `addAttack` / `deleteAttack(idx)`
    on `WeaponDataModel`.
  - `customAspect` — `SpellSheetCustomAspectsTab.svelte`; mutators `addCustomAspect` /
    `deleteCustomAspect(idx)` on `SpellDataModel`.
- **Element factories** mint `uuid: options?.uuid ?? generateUUID()`
  (`~/helpers/utility-functions/GenerateUUID.js`), so a copy = clone + fresh uuid.
- **Per-row UI state:** only **checks** keep index-keyed parallel expansion arrays —
  `tabs.checks.isExpanded[]` and `sidebar.checks.isExpanded[]`, maintained by
  `postAddCheck()` / `preDeleteCheck(idx)` in `TitanItemSheetState.js`. The other three
  lists have no parallel expansion arrays (rows key by `uuid`, always expanded).

## Architecture

### 1. Shared visual + drag mechanics (new)

New directory `src/helpers/svelte-components/drag-reorder/` (final location confirmed at
plan time):

- **`DragHandle.svelte`** — the ⋮⋮ grip. Pure visual affordance (no own drag logic);
  hover-lit; carries a `data-drag-handle` marker the `draggableRow` action keys on so only
  a grab that starts on the handle initiates the drag.
- **`DragReorderActions.svelte.js`** — two Svelte actions:
  - `use:draggableRow={{ index, getPayload }}` — wires `dragstart`/`dragend` on the row,
    sets the drag payload, and only engages when the press began on the row's
    `[data-drag-handle]`.
  - `use:reorderDropZone={{ accepts, onReorder, onDrop }}` — owns `dragenter`/`dragover`/
    `drop`/`dragleave` for the list container, computes the insertion index from pointer-Y
    vs each row's midpoint, exposes the current `dropIndex`/edge for the insertion-line
    render, and dispatches to `onReorder(from, to)` (same source) or
    `onDrop(payload, at)` (foreign source). Rejects payloads failing `accepts(payload)`
    (no line shown).
- **Insertion-line styling** — a shared SCSS partial / mixin rendering the glowing accent
  bar at the active boundary. Removes the old `.drag-hovered` background rule.

### 2. Two payload families

- **Foundry-document drags (items, effects).** Payload stays the document's
  `toDragData()`. Reorder commits by updating the `sort` field via
  `performIntegerSort` + `updateEmbeddedDocuments`. Cross-sheet/external drops (create
  on another actor, from compendium, etc.) continue to flow through the existing Foundry
  `DragDrop` path on `TitanActorSheet`. The native list `drop` calls `stopPropagation()`
  **only** when it handles an intra-actor reorder, so the sheet-level Foundry handler is
  bypassed for reorders but still receives genuine external drops.
  - **Effects** gain a new reorder: same `performIntegerSort` approach as items, committed
    with `updateEmbeddedDocuments('ActiveEffect', …)`.
  - **Risk to verify live:** the native-drop / Foundry-`DragDrop` coexistence (event
    ordering, `stopPropagation` reaching Foundry's listener). Replicate in the running
    client before claiming done (project "Verify Failure" rule).
- **Plain-array element drags (rulesElement / check / attack / customAspect).** Custom
  JSON payload on `dataTransfer` (`text/plain`):
  ```json
  { "titanElementDrag": true, "kind": "rulesElement",
    "sourceDocUuid": "<Item.uuid>", "sourceIdx": 2, "element": { …, "uuid": "…" } }
  ```
  The `titanElementDrag` marker keeps these from being mistaken for Foundry Item/Effect
  drops and vice-versa. Entirely intra-Svelte; no Foundry `DragDrop` plumbing.

### 3. Per-kind data mutators (new, mirroring `addX`/`deleteX`)

Each on the same class as that kind's existing `addX`/`deleteX`:

- `moveX(fromIdx, toIdx)` — remove-at-from, insert-at-to on `system.<field>`, then
  `update({ system: { <field>: array } })`. Owner-gated via `assert(parent.isOwner …)`.
- `insertX(elementData, atIdx)` — clone `elementData`, mint a fresh `uuid`, splice in at
  `atIdx`, then update.

| Kind | Class | Field | Methods |
|---|---|---|---|
| rulesElement | `RulesElementMixin` (data model) | `system.rulesElement` | `moveRulesElement`, `insertRulesElement` |
| check | `TitanItem` (document) | `system.check` | `moveCheck`, `insertCheck` |
| attack | `WeaponDataModel` | `system.attack` | `moveAttack`, `insertAttack` |
| customAspect | `SpellDataModel` | `system.customAspect` | `moveCustomAspect`, `insertCustomAspect` |

**Check UI-state lockstep.** `moveCheck` and `insertCheck` must also reorder/splice the
parallel `tabs.checks.isExpanded` and `sidebar.checks.isExpanded` arrays so expansion
state tracks the row. Add sheet-state methods alongside `postAddCheck`/`preDeleteCheck`
(e.g. `postMoveCheck(from, to)` and `postInsertCheck(at)`), invoked from the sheet the
same way `postAddCheck`/`preDeleteCheck` already are. The other three kinds need no
UI-state sync.

### 4. Tab wiring

Each of the four settings tabs:

- Wraps its existing `<li>` rows with `use:draggableRow` and adds `<DragHandle/>` at the
  row's leading edge (in the row settings component's header `.row`, beside the existing
  delete button).
- Adds `use:reorderDropZone` to the `<ol>` with:
  - `accepts = (p) => p.titanElementDrag && p.kind === '<thisKind>'`
  - `onReorder = (from, to) => document…move<Kind>(from, to)`
  - `onDrop = (payload, at) => document…insert<Kind>(payload.element, at)`
- Keyed `{#each}` by `uuid` + `animate:flip` for a smooth settle.
- Note the filtered lists (`check`, `customAspect`) iterate a filtered index set; the
  reorder/insert indices must map back to the **unfiltered** array index. When a filter is
  active, dropping maps to the nearest unfiltered neighbour's index. (Edge handling
  detailed in the plan.)

Character-sheet **item** and **effect** lists adopt `<DragHandle/>` + the insertion-line
visual and `use:reorderDropZone` with a Foundry-document `onReorder` that runs
`performIntegerSort`. Items keep the existing external-drop path; effects get the new
reorder commit.

## Testing

- **Unit:**
  - `moveX`/`insertX` for each kind: array order after move; fresh `uuid` on insert
    (≠ source uuid); owner gating.
  - Check `isExpanded` lockstep: `moveCheck`/`insertCheck` keep both `isExpanded` arrays
    aligned to the check array.
- **E2E:**
  - Reorder within each of the four settings tabs (assert new order persists).
  - Cross-sheet copy for each kind: source row still present, target gains a row with a
    new uuid, dropped at the indicated position; mismatched-kind drop is rejected (no
    insert).
  - Effect reorder on the character sheet; item reorder still works.
  - Insertion line appears (presence→absence assertion per the project e2e convention).

## Documentation (required final step)

- Update the `titan-codebase` skill references (`conventions.md` /
  `abstractions.md`) to record the shared drag-reorder actions, `DragHandle`, the
  per-kind `moveX`/`insertX` mutators, and the check `isExpanded` lockstep.
- Delete completed items from `docs/TODO.md` / `docs/OPEN_BUGS.md` as applicable; log any
  newly discovered deferrals or bugs per project rules.

## Out of scope

- Reordering across different element kinds or incompatible item types.
- Multi-select drag.
- Reordering items/effects by anything other than the existing `sort` field.
- Dragging whole items/effects between sheets (already handled by Foundry).
