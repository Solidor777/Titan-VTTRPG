# Phase 3d Reactive-Sweep — Candidate Worklist (Stage A audit output)

**Date:** 2026-05-31. **Source spec:** `2026-05-31-titan-e2e-3d-reactive-sweep-design.md`.
**Source plan:** `../plans/2026-05-31-titan-e2e-3d-reactive-sweep.md`.

Candidates for the Svelte 5 stale-until-remount antipattern: a row component reads `<prop>.system.x` off a
**passed Document prop** instead of through `document.data.<collection>.get(<prop>._id)?.system.x`. Each row
is triaged in Stage B by a behavioral red-first test (`status` → `fixed` or `not-a-bug`).

**Prop-source confirmed:** character-sheet item rows receive `item` iterated from `document.data.items`
keyed by `item._id` (`CharacterSheetItemList.svelte` / `CharacterSheetMultiItemList.svelte`); effect rows
receive `effect` iterated from `document.data.effects` keyed by `effect.id` (`CharacterSheetEffectList.svelte`).
**Fix form:** `const reactiveX = $derived(document.data.<collection>.get(<prop>._id)); ... reactiveX?.system.<path>`.

**Execution granularity:** fix **per component**, one subagent each: write red test(s) for the component's
drivable display features, confirm RED, route reads through the reactive store, confirm GREEN. Handlers keep
using the raw prop (they run at call time, already correct). `status` values: `pending` / `fixed` / `not-a-bug`.

**CANONICAL FIX RECIPE (validated on the `CharacterSheetAbility` anchor — see decision gate below):**
- Use **per-leaf primitive `$derived`**: `const rarity = $derived(document.data.<collection>.get(<id>)?.system.rarity)`,
  one per displayed value (matches the bug-#8 effect-toggle precedent and house style).
- **DO NOT** use `const reactiveItem = $derived(document.data.<collection>.get(<id>))` and then read
  `reactiveItem?.system.x` — **this is silently NON-reactive.** `document.data.items.get(id)` returns the
  SAME `TitanItem` instance across `update()` (`sameItemRef: true`, empirically probed), so the `$derived`'s
  `===` equality check short-circuits and never notifies; only deriving a CHANGING leaf (a primitive, or
  `.system` whose ref DOES change) propagates.
- **Permitted exception:** components with many (~6+) display reads off one embedded doc may use a
  **function accessor** `const reactiveItem = () => document.data.<collection>.get(<id>)` read inline as
  `reactiveItem()?.system.x` (reactive because the read happens in markup through `document.data` each
  render). `CharacterSheetAbility` uses this (8 reads). Keep guards: `reactiveItem()?.system.customTrait ?? []`.

**DECISION GATE RESULT (anchor `CharacterSheetAbility`, commit `0efaf9b6`): RED CONFIRMED** — item-row prop
reads DO go stale on in-place `update()`. The sweep premise holds; fan out to the remaining components.

## SWEEP COMPLETE — all 12 row components fixed (every candidate RED-confirmed then GREEN)

| component(s) | commit | regression spec |
|---|---|---|
| `CharacterSheetAbility` (anchor, function-accessor) | `0efaf9b6` | `reactive-ability.spec.js` |
| `CharacterSheetCommodity`, `CharacterSheetEquipment` | `eb680405` | `reactive-inventory-basic.spec.js` |
| `CharacterSheetArmor`+`ArmorStats`, `CharacterSheetShield`+`ShieldStats` | `9d29b843` | `reactive-armor-shield.spec.js` |
| `CharacterSheetWeapon`+`WeaponAttack`+`WeaponAttacks`+`MultiAttackButton` | `6d5d5092` | `reactive-weapon.spec.js` |
| `CharacterSheetSpell` + `CharacterSheetItemTradition` | `338c2dd3` | `reactive-spell.spec.js` |
| `CharacterSheetEffect` (display reads) | `e1e21a1a` | `reactive-effect-rows.spec.js` |
| style follow-up (`let`→`const` on `$derived`) | (review) | — |

Final comprehensive review: **APPROVED** (after the `let`→`const` fix). No object-derive anti-pattern, no
missed display reads, all `{#each}` guarded `?? []`, scope clean.

### Deferred / follow-up (NOT done in this sweep)

- **Effect duration INPUTS** (`CharacterSheetEffect` `IntegerInput`/`IntegerIncrementInput`, two-way
  `bind:value={effect.system.duration.initiative|remaining}`) — left two-way. Their displayed value does NOT
  reflect an external in-place `update()` while mounted, because the inputs own a local `$bindable` copy and
  `IntegerIncrementInput`'s increment buttons mutate the bound value with no `onchange`-value. Making them
  reactive requires refactoring the shared `IntegerIncrementInput`/`NumberInput` primitives to a one-way
  `value` + commit-with-value API — a cascading change across many sheets → its own spec + user approval.
  The pure-display DurationTag/isExpired/description/customTrait on the same row ARE fixed.
- **`CharacterSheetItemTradition.svelte` is dead code** — rendered nowhere in `src/` (the spell row's tradition
  display lives in `CharacterSheetSpell`'s footer). Fixed for correctness anyway; candidate for deletion in a
  later cleanup pass.

(Originally-assumed not-a-bug, now corrected:)
- **item/effect `expanded` toggle** — turned out to be a REAL bug (separate root cause); see the bug log above.

**`can change in place?`** — `yes` = value can change while the row stays mounted (real bug if it goes
stale). `maybe` = the value is a collection (traits/checks/aspects/attacks) typically edited via the entry's
own sheet, which re-mounts the list and masks staleness; the shared per-component derived fixes these for
free, so they need no separate test (record `not-a-bug` for the in-place test unless a red can be produced).

---

## Effect rows  (collection: `document.data.effects`, key `effect.id`)

### `CharacterSheetEffect.svelte`  — owning sheet: Character → Effects tab
**Note:** the duration inputs use two-way `bind:value={effect.system.duration.*}` + `onchange → effect.update()`.
A `$derived` is not two-way bindable, so the duration INPUT needs a one-way value (derived) + commit-on-change,
not a straight bind. This is the one judgment-heavy component → use Opus.

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | effect | effect.system.duration.type | yes | edit duration type on effect sheet / change while mounted |
| pending | effect | effect.system.duration.remaining | yes | combat tick or duration input while mounted |
| pending | effect | effect.system.duration.initiative | yes | edit initiative duration while mounted |
| pending | effect | effect.system.duration.custom | yes | edit custom duration label while mounted |
| pending | effect | effect.system.isExpired | yes | drive remaining→0 / edit on sheet while mounted |
| pending | effect | effect.description | yes | edit effect description on its own sheet while mounted |
| pending | effect | effect.system.check.length | maybe | checks edited on effect sheet (re-mounts) |
| pending | effect | effect.system.customTrait | maybe | traits edited on effect sheet (re-mounts) |

---

## Inventory / ability / spell / weapon-attack rows  (collection: `document.data.items`, key `item._id`)

### `ability/CharacterSheetAbility.svelte`  — Character → Abilities tab  *(reads verified against source)* — **FIXED (anchor, commit `0efaf9b6`; function-accessor shape; regression `tests/e2e/reactive-ability.spec.js`)**

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.rarity | yes | edit rarity on ability sheet while mounted |
| pending | item | item.system.action | yes | toggle action on ability sheet while mounted |
| pending | item | item.system.reaction | yes | toggle reaction while mounted |
| pending | item | item.system.passive | yes | toggle passive while mounted |
| pending | item | item.system.xpCost | yes | edit XP cost while mounted |
| pending | item | item.system.description | yes | edit description while mounted |
| pending | item | item.system.check.length | maybe | checks edited on sheet (re-mounts) |
| pending | item | item.system.customTrait | maybe | traits edited on sheet (re-mounts) |

### `armor/CharacterSheetArmor.svelte` + `armor/CharacterSheetArmorStats.svelte`  — Inventory tab

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.armor.value | yes | edit armor value on sheet while mounted |
| pending | item | item.system.armor.max | yes | edit armor max while mounted |
| pending | item | item.system.rarity | yes | edit rarity while mounted |
| pending | item | item.system.value | yes | edit value while mounted |
| pending | item | item.system.description | yes | edit description while mounted |
| pending | item | item.system.trait | maybe | traits edited on sheet (re-mounts) |
| pending | item | item.system.customTrait | maybe | custom traits edited (re-mounts) |

### `commodity/CharacterSheetCommodity.svelte`  — Inventory tab

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.quantity | yes | increment quantity input while mounted |
| pending | item | item.system.rarity | yes | edit rarity while mounted |
| pending | item | item.system.value | yes | edit value while mounted |
| pending | item | item.system.description | yes | edit description while mounted |
| pending | item | item.system.check.length | maybe | checks edited (re-mounts) |
| pending | item | item.system.customTrait | maybe | custom traits edited (re-mounts) |

### `equipment/CharacterSheetEquipment.svelte`  — Inventory tab

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.equipped | yes | toggle equipped via button while mounted |
| pending | item | item.system.rarity | yes | edit rarity while mounted |
| pending | item | item.system.value | yes | edit value while mounted |
| pending | item | item.system.description | yes | edit description while mounted |
| pending | item | item.system.check.length | maybe | checks edited (re-mounts) |
| pending | item | item.system.customTrait | maybe | custom traits edited (re-mounts) |

### `shield/CharacterSheetShield.svelte` + `shield/CharacterSheetShieldStats.svelte`  — Inventory tab

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.defense | yes | edit defense on sheet while mounted |
| pending | item | item.system.rarity | yes | edit rarity while mounted |
| pending | item | item.system.value | yes | edit value while mounted |
| pending | item | item.system.description | yes | edit description while mounted |
| pending | item | item.system.trait | maybe | traits edited (re-mounts) |
| pending | item | item.system.customTrait | maybe | custom traits edited (re-mounts) |

### `spell/CharacterSheetSpell.svelte`  — Spells tab

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.aspect | yes | enable/disable aspect on spell sheet while mounted |
| pending | item | item.system.rarity | yes | edit rarity while mounted |
| pending | item | item.system.tradition | yes | edit tradition while mounted |
| pending | item | item.system.xpCost | yes | edit XP cost while mounted |
| pending | item | item.system.description | yes | edit description while mounted |
| pending | item | item.system.customAspect | maybe | custom aspects edited (re-mounts) |
| pending | item | item.system.check.length | maybe | checks edited (re-mounts) |
| pending | item | item.system.customTrait | maybe | custom traits edited (re-mounts) |

### `weapon/CharacterSheetWeapon.svelte` + `CharacterSheetWeaponAttack.svelte` + `CharacterSheetWeaponMultiAttackButton.svelte`  — Inventory tab

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.equipped | yes | toggle equipped via button while mounted |
| pending | item | item.system.attackNotes | yes | edit attack notes while mounted |
| pending | item | item.system.rarity | yes | edit rarity while mounted |
| pending | item | item.system.value | yes | edit value while mounted |
| pending | item | item.system.description | yes | edit description while mounted |
| pending | item | item.system.attack[attackIdx] | yes | edit attack details on sheet while mounted |
| pending | item | item.system.multiAttack | yes | toggle multi-attack via button while mounted |
| pending | item | item.system.attack.length | maybe | attacks edited (re-mounts) |
| pending | item | item.system.check.length | maybe | checks edited (re-mounts) |
| pending | item | item.system.customTrait | maybe | custom traits edited (re-mounts) |

### `CharacterSheetItemTradition.svelte`  — shared item-row tradition tag

| status | prop | read expression | can change in place? | drive |
|--------|------|-----------------|----------------------|-------|
| pending | item | item.system.tradition | yes | edit tradition on item sheet while mounted |

---

## Excluded — verified NOT the antipattern (no action)

- **All Header / Sidebar components** (`CharacterSheetAttribute`, `CharacterSheetResistance`,
  `CharacterSheetMod`, `CharacterSheetResource`, `CharacterSheetRating`, `CharacterSheetSpeed`,
  `CharacterSheetSkill`): the audit initially tabled these, but they read through
  `document.data.system.<collection>[key]` where the prop is a **string key**, not an embedded document —
  i.e. they are ALREADY routed through `document.data` and are correctly reactive. (The audit's own notes
  confirm this.) Not candidates.
- **`CharacterSheetEffectToggleActiveButton.svelte`** — already fixed (bug #8); the gold-standard pattern.
- **Chat-message / report components** — render-once roll snapshots, out of scope.
## Bugs found during the sweep (distinct root cause from the `document.data` antipattern)

- **item/effect `expanded` toggle — REAL BUG, FIXED** (commit `5ed6ce3b`; review fixes `7790d241`). NOT the
  `document.data` antipattern and NOT benign local state as first assumed: expansion state lives in the
  `applicationState` `writable` store under `tabs.<tab>.isExpanded` (plain `{}`), but each tab passed the
  inner object DOWN as an `isExpandedMap` prop and the leaf bound `bind:isExpanded={isExpandedMap[id]}`.
  Mutating a plain object member is not a `$appState.x = v` assignment, so Svelte emitted no `appState.set()`
  → nothing re-rendered → expand was dead on all 4 list tabs (effects/abilities/spells/inventory). Fixed by
  **re-rooting the bind at `$appState`** in the 3 list components (`CharacterSheetEffectList` static path;
  `CharacterSheetItemList` / `CharacterSheetMultiItemList` via a new `tabKey` string prop +
  `$appState.tabs[tabKey].isExpanded[id]`), with the 4 tabs passing `tabKey`. Confirmed Svelte DOES emit the
  store-write for dynamic-keyed `$appState` assignments. Regression: `tests/e2e/reactive-expanded-toggle.spec.js`
  (4 tests, all 3 list components incl. spells).
- **Spells-tab filter input cross-wired — REAL BUG, FIXED** (commit `a509a771`). Found by the expand-fix code
  review. `CharacterSheetSpellsTab` bound its filter `TextInput` to `$appState.tabs.abilities.filter` while
  the list reads `tabs.spells.filter` — so the spells filter box did nothing (and silently mutated the
  abilities filter). One-line fix + regression `tests/e2e/spells-filter.spec.js`.

## Audit notes

- ~62 candidate display reads across **12 character-sheet row components** (effect + 11 item-row files),
  plus the per-component `maybe` collection reads swept for free by the shared derived.
- Anchor cases confirmed present: `CharacterSheetEffect.svelte` `effect.system.isExpired` /
  `effect.system.duration.type` / `effect.description`.
- Anchor exclusion confirmed: the already-fixed toggle button is NOT listed.
- `CharacterSheetAbility.svelte` read expressions were verified line-by-line against source; its siblings
  follow the identical pattern and will be confirmed by the red-first test in each component's Stage B task.
