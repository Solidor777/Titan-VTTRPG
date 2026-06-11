# Roll Checks From Item Sheets — Design

## Summary

Let a user roll an item's checks directly from the item sheet — both from the
sidebar and from the editing settings panels — whenever the item is embedded on
an actor the user owns (or the user is a GM). The roll uses the existing condensed
check button and the existing actor roll path, so behavior is identical to rolling
the same check from the character sheet. When the item is not rollable by the
current user (a world/compendium item, or an owned item the user neither owns nor
GMs), the sheet displays exactly as it does today, with no button.

This covers all three check surfaces:

- **Item checks** (ability, armor, equipment, shield, and any item with a `check`
  array) — sidebar + check settings tab.
- **Attacks** (weapon) — sidebar + attack settings tab.
- **Casting check** (spell) — sidebar + casting check tab.

## Goals

- A condensed, clickable roll button on the item sheet that rolls the configured
  check for the owning actor.
- The button targets the specific sidebar row it sits on (per-check / per-attack
  index), not just the first check.
- Visible only when the current user can roll for the owning actor; otherwise the
  current static display is unchanged.
- One shared set of condensed buttons drives both the character sheet and the item
  sheet — no parallel button implementations.

## Non-goals

- No new check mechanics, dialog changes, or chat-card changes. The roll path is
  the existing `request{Item,Attack,Casting}Check` flow.
- No rolling from world/compendium item sheets (there is no actor to roll for).
- No change to how checks are configured/edited.

## Background — current state

- The character sheet rolls condensed checks through three components under
  `src/document/types/actor/types/character/sheet/items/`:
  - `CharacterSheetCondensedItemCheckButton.svelte`
  - `CharacterSheetCondensedAttackCheckButton.svelte`
  - `spell/CharacterSheetCondensedCastingCheckButton.svelte`

  Each reads the **roller** from the `sheetDocument` context (the actor bridge) and
  the **item id** from the `document` context (the embedded item bridge), resolves
  parameters via `sheetDocument.data.system.get{Item,Attack,Casting}CheckParameters(...)`,
  and rolls via `sheetDocument.data.system.request{...}Check({ itemId })`. They
  render the shared `CondensedCheckButton.svelte`.

- `CondensedCheckButton` rolls through `DocumentOwnerAttributeButton`, which already
  disables the button when `!document.data?.isOwner`.

- The actor roll options support a row index that defaults to `0`:
  `ItemCheckOptions.checkIdx` and `AttackCheckOptions.attackIdx`. Casting is a single
  check with no index.

- Every sheet mounts through the shared `src/document/sheet/DocumentSheetShell.svelte`,
  which sets the `document`, `applicationState`, and `sheetDocument` contexts. This is
  the single place where "who rolls" can be resolved for every sheet.

- The item sheet's three sidebar surfaces and three settings panels:
  - Sidebar: `src/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte`,
    `src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte`,
    `src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte`.
    All three render the shared `src/document/svelte-components/check/SidebarCheck.svelte`,
    whose header shows a name row plus an "attribute (skill) • DC" **info line**.
  - Settings: `src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte`,
    `src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte`,
    `src/document/types/item/types/spell/sheet/SpellSheetCastingCheckTab.svelte`.

## Design

### 1. Roller resolution — the `rollActor` context

Add a pure helper that resolves the actor that should perform checks for a given
sheet document, and wire it into the shared shell.

- **Helper:** `resolveRollActor(document)` → a `ReactiveDocument` for the rolling
  actor, or `undefined`.
  - Lives at `src/document/reactive/ResolveRollActor.js` (pure function; unit-testable).
  - Input is the sheet's top-level `ReactiveDocument` bridge (`document`).
  - Rules, on the underlying live `document.doc`:
    - The document is an **Actor** of a character type (has the
      `request{...}Check` methods, i.e. a `CharacterDataModel`) → return the same
      bridge (`document`).
    - The document is an **Item** that is embedded (`doc.isEmbedded`), whose
      `doc.parent` is a character actor, and `doc.isOwner` is `true` → return a
      `new ReactiveDocument(doc.parent)`.
    - Otherwise → return `undefined`.
  - `doc.isOwner` already encodes "owns the parent actor OR is GM" for an embedded
    item, satisfying the visibility rule.

- **Shell wiring:** in `DocumentSheetShell.svelte`, after the existing
  `setContext` calls, resolve once and expose it:

  ```js
  // The actor that rolls checks for this sheet, or undefined when the sheet is not
  // roll-capable for the current user (world/compendium item, non-owner, or a
  // document type that does not roll checks).
  const rollActor = resolveRollActor(document);
  setContext('rollActor', rollActor);
  ```

  The capture is once-per-mount, matching the existing `document`/`sheetDocument`
  captures; an item's parent does not change while its sheet is open.

`rollActor` being present is the single source of truth for "show the roll button."
On an item sheet it is present exactly when the item is rollable by the current user.

### 2. Shared condensed buttons (relocate + generalize)

Move the three character-sheet condensed buttons into the shared check component
directory and generalize them:

- New locations under `src/document/svelte-components/check/`:
  - `CondensedItemCheckButton.svelte`
  - `CondensedAttackCheckButton.svelte`
  - `CondensedCastingCheckButton.svelte`

- Generalizations applied to each:
  - Read the roller from `getContext('rollActor')` instead of `sheetDocument`.
  - Read the item id from `getContext('document')` (`document.doc._id`) — unchanged
    source, but now correct on both sheets (embedded item bridge on the character
    sheet; the sheet's own item on the item sheet).
  - Accept an optional `idx` prop (default `0`). Item/attack buttons pass it as
    `checkIdx` / `attackIdx` in the options object; the casting button ignores it
    (single check).
  - Guard parameter resolution on `rollActor` being defined (in addition to the
    existing "has at least one check/attack" guard) so the component is inert if
    ever rendered without a roller.

- Update the six character-sheet importers to the new paths (no behavioral change;
  on the character sheet `rollActor` resolves to the actor itself):
  - Item check button: `…/items/ability/CharacterSheetAbility.svelte`,
    `…/items/armor/CharacterSheetArmor.svelte`,
    `…/items/equipment/CharacterSheetEquipment.svelte`,
    `…/items/shield/CharacterSheetShield.svelte`.
  - Casting button: `…/items/spell/CharacterSheetSpell.svelte`.
  - Attack button: `…/items/weapon/CharacterSheetWeapon.svelte`.

The old `CharacterSheetCondensed*CheckButton.svelte` files are removed after the
move.

### 3. Sidebar — button replaces the info line, gated

Add an optional snippet to the shared `SidebarCheck.svelte`:

- New prop: `rollButton` (an optional `Snippet`).
- When `rollButton` is provided, render it in place of the existing `.info` line;
  otherwise render the info line as today. The name row, toggle, and details panel
  are unchanged in both cases.

Each sidebar surface passes the snippet **only when `rollActor` is present**:

- `ItemSheetSidebarCheck.svelte` — read `getContext('rollActor')`; when present,
  pass a `rollButton` snippet rendering `CondensedItemCheckButton` with `idx={idx}`.
- `WeaponSheetSidebarAttacks.svelte` — same, rendering `CondensedAttackCheckButton`
  with `idx={idx}` for each attack row.
- `SpellSheetSidebarCastingCheck.svelte` — same, rendering
  `CondensedCastingCheckButton` (no index).

The condensed button conveys the attribute by color and shows the numeric stats
(DC:complexity, dice, expertise, resolve cost); the attribute/skill text remains
available via the button's existing rich tooltip. When `rollActor` is absent, the
"attribute (skill) • DC" info line shows exactly as it does now.

### 4. Settings panels — top roll-preview row, gated

In each editing panel, render the matching condensed button as the first row inside
the expandable content, **only when `rollActor` is present**:

- `ItemSheetCheckSettings.svelte` → `CondensedItemCheckButton` with `idx={idx}`,
  above the attribute/skill row.
- `WeaponSheetAttackSettings.svelte` → `CondensedAttackCheckButton` with `idx={idx}`.
- `SpellSheetCastingCheckTab.svelte` → `CondensedCastingCheckButton`.

This is a live preview/roll of the check as configured; it reuses the same component
and updates reactively as the fields are edited.

### 5. Behavior

Clicking a button calls the existing actor path:
`rollActor.data.system.request{Item,Attack,Casting}Check({ itemId, checkIdx|attackIdx })`.
Per the existing `shouldGetCheckOptions()` setting, this either opens the check
dialog for options or rolls straight to chat — identical to the character sheet, for
both player- and NPC-owned items.

## Component / data flow

```
DocumentSheetShell
  ├─ setContext('document' | 'sheetDocument' | 'applicationState')
  └─ setContext('rollActor', resolveRollActor(document))   // actor | parent-actor bridge | undefined
        │
        ├─ item sidebar surface ──(rollActor?)──> SidebarCheck rollButton snippet ──> Condensed*CheckButton(idx)
        └─ item settings panel  ──(rollActor?)──> top row Condensed*CheckButton(idx)
                                                        │
                                                        └─ rollActor.data.system.request*Check({ itemId, idx })
```

## Error handling / edge cases

- **World / compendium item:** `resolveRollActor` → `undefined`; no button anywhere;
  sidebar shows the info line; settings show no roll row.
- **Owned item, non-owner player:** `doc.isOwner` is `false` → `undefined` → no button.
- **GM, another player's owned item:** `doc.isOwner` is `true` for a GM → button shows.
- **Non-character parent** (if any actor type lacks the roll methods): `resolveRollActor`
  → `undefined`; no button.
- **Defense in depth:** `DocumentOwnerAttributeButton`'s existing `isOwner` disable
  guard remains, so even a mis-wired render cannot roll without ownership.

## Testing

- **Unit (`ResolveRollActor`):** actor (character) → self; owned item as owner →
  parent bridge; owned item as non-owner → `undefined`; world item → `undefined`;
  GM on a non-owned-by-default item → parent bridge; non-character parent →
  `undefined`.
- **E2E:**
  - As an actor owner: item, weapon, and spell sheets show a working roll button in
    both the sidebar (in place of the info line) and the settings panel; clicking
    produces the expected chat card / dialog.
  - Per-row targeting: a weapon/item with two checks rolls the correct one from each
    row.
  - As a non-owning player: no button on any surface; the old info line shows.
  - As GM: button shows on another player's owned item.

## Files touched

New:
- `src/document/reactive/ResolveRollActor.js`
- `src/document/svelte-components/check/CondensedItemCheckButton.svelte` (moved)
- `src/document/svelte-components/check/CondensedAttackCheckButton.svelte` (moved)
- `src/document/svelte-components/check/CondensedCastingCheckButton.svelte` (moved)

Removed:
- `src/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte`
- `src/document/types/actor/types/character/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte`
- `src/document/types/actor/types/character/sheet/items/spell/CharacterSheetCondensedCastingCheckButton.svelte`

Edited:
- `src/document/sheet/DocumentSheetShell.svelte` — resolve + provide `rollActor`.
- `src/document/svelte-components/check/SidebarCheck.svelte` — optional `rollButton` snippet.
- Sidebar surfaces: `ItemSheetSidebarCheck.svelte`, `WeaponSheetSidebarAttacks.svelte`,
  `SpellSheetSidebarCastingCheck.svelte`.
- Settings panels: `ItemSheetCheckSettings.svelte`, `WeaponSheetAttackSettings.svelte`,
  `SpellSheetCastingCheckTab.svelte`.
- Six character-sheet importers (new button paths): `CharacterSheetAbility`,
  `CharacterSheetArmor`, `CharacterSheetEquipment`, `CharacterSheetShield`,
  `CharacterSheetSpell`, `CharacterSheetWeapon`.

## Documentation updates (required final step)

- Update the `titan-codebase` skill to reflect the shared condensed buttons' new
  location and the `rollActor` context (current state, not changelog).
- Log any deferred follow-ups to `docs/TODO.md`; no open bug is created by this work.
