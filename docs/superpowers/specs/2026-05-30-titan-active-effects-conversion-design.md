# Spec: Convert Effect Items → TitanActiveEffect

- **Date:** 2026-05-30
- **Status:** Draft (awaiting review)
- **Scope:** Replace the `effect` Item type with a native `TitanActiveEffect`
  document backed by a typed system data model. Migrate existing data and remove
  the `effect` Item type. Ship a native ActiveEffect compendium for reuse.
- **Out of scope (parked in `../BACKLOG.md`):** converting Conditions to rules
  elements; a custom sidebar-tab effect directory; a native
  visual-active-effects-style panel.

---

## 1. Background & motivation

Today an "Effect" is a Foundry **Item** (`type: 'effect'`,
`EffectDataModel extends RulesElementItemDataModel`). The item's `rulesElement[]`
array does the real mechanical work, read by `CharacterDataModel`. Separately,
each effect item maintains a **mirror `ActiveEffect`** purely for token-icon
display and the third-party `visual-active-effects` module
(`EffectDataModel._updateActiveEffects`, lines 171–275, plus the whole
`ActionQueue`). Conditions are already native ActiveEffects
(`flags.titan.type === 'condition'`).

This dual representation is the problem. The mirror-sync subsystem (~200 lines
across `_updateActiveEffects` + `ActionQueue`) runs on every derived-data cycle
and contains several confirmed defects:

- The duplicate-cleanup loop is dead code: `effect.length` on a single document,
  and `await effect.delete` without `()` (`EffectDataModel.js:270–271`).
- It writes `duration.turns`, a field the schema never defines
  (`EffectDataModel.js:186`).
- The `visual-active-effects` dirty-check uses bracket access on a dotted key, so
  it re-writes that flag every cycle (`EffectDataModel.js:259`).

(An audit also flagged `this.parent.addActiveEffect` at `EffectDataModel.js:178`
as calling an actor-only method on the Item; the maintainer has confirmed the
create path nonetheless works in-game, so the exact current behavior is not
relied upon here — the subsystem is being removed regardless.)

### Goals (all confirmed)

1. Kill the dual representation and its sync code.
2. Unify Effects and Conditions as the same document type/collection.
3. Use native ActiveEffect display (token icons, effects panel, drag-drop).
4. Better authoring: single-use effects on the actor, actor→actor drag, and a
   reusable compendium library.

### Feasibility (verified against the v14 source)

- `ActiveEffect` has `hasTypeData: true` (`common/documents/active-effect.mjs:28`)
  → a typed `system` data model is supported.
- `ActiveEffect` is a valid `COMPENDIUM_DOCUMENT_TYPE`
  (`common/constants.mjs:414`) → a compendium library is supported.
- `ActiveEffect` is **not** a `WORLD_DOCUMENT_TYPE` (`constants.mjs:393–408`) and
  the world-collection init list is hardcoded (`Game#initializeDocuments`,
  `foundry.mjs:204871`) with a guard that throws on mismatch; the server vends
  world data per hardcoded type (`dist/packages/world.mjs`). → A native
  top-level "Effects" sidebar tab is **not** achievable without forking the
  engine. Rejected; the reusable library is delivered via a compendium instead.
- Native AE `duration` (`rounds`/`turns`/`seconds`, enum `units`) **cannot**
  express TITAN's model: the `initiative` (per-initiative-count) type has no
  native analog, and `custom` free-text is invalid in the enum `units` field.
  → TITAN duration stays custom in `system.duration`; the native duration
  registry never tracks our effects, so there is no expiry conflict.

---

## 2. Key decisions

| Decision | Choice |
|---|---|
| Direction | Convert to native ActiveEffects |
| `effect` Item type | Migrate existing data and **remove** the item type in this spec |
| Reusable library | Native **ActiveEffect compendium pack** (custom sidebar tab → BACKLOG) |
| Active state | Drop custom `system.active`; use native `ActiveEffect.disabled` |
| Token icons | `showIcon = ALWAYS` (permanent + timed effects both display) |
| visual-active-effects flag | Keep setting it (trivial; preserves module support) until a native panel exists (→ BACKLOG) |
| Compendium content | Ship the pack **empty** for now |
| Conditions | Become instances of `TitanActiveEffect` (representational unification only); mechanics stay in `_applyConditions` (conversion → BACKLOG) |

---

## 3. Architecture

### 3.1 Documents

- **`TitanActiveEffect extends ActiveEffect`** → `CONFIG.ActiveEffect.documentClass`.
  - Ports `sendToChat` from the item (Foundry has no native AE send-to-chat).
  - Hosts initiative-capture-on-create (ported from
    `EffectDataModel._getInitialDocumentData`, lines 84–106): when created on an
    actor in active combat, seed `system.duration.initiative` from
    `actor.getFirstActiveCombat()?.initiative`.
  - Conditions automatically become instances of this class (no extra work);
    they keep `flags.titan.type === 'condition'`.

- **`TitanActiveEffectDataModel extends TitanDataModel`** →
  `CONFIG.ActiveEffect.dataModels.effect`, subtype `effect` declared in
  `system.json` `documentTypes.ActiveEffect`.
  - Schema: `rulesElement[]`, `duration { type, remaining, initiative, custom }`,
    `check[]`, `customTrait[]`, `documentVersion`.
  - **No** `active` field (native `disabled` is used). **No** `description`
    field (native `ActiveEffect.description` HTMLField is used).
  - Computed getters ported from `EffectDataModel`: `isExpired`,
    `isCombatEffect`. `isActive` becomes `!parent.disabled`.

### 3.2 Shared rules-element schema (DRY)

`rulesElement[]` + `addRulesElement` / `deleteRulesElement` currently live on
`RulesElementItemDataModel` (an *item* model). Extract the schema field and the
two methods into a shared helper/mixin consumed by both
`RulesElementItemDataModel` and `TitanActiveEffectDataModel`, so there is a
single definition.

### 3.3 Registration (`OnceInit.js`)

- `CONFIG.ActiveEffect.documentClass = TitanActiveEffect`.
- `CONFIG.ActiveEffect.dataModels.effect = TitanActiveEffectDataModel`.
- Register `TitanActiveEffectSheet` for ActiveEffect subtype `effect` via
  `DocumentSheetConfig.registerSheet`.
- Remove the `effect` Item dataModel + sheet registrations.
- Leave `CONFIG.ActiveEffect.legacyTransferral = false` as-is (effects live on
  the actor directly now).

### 3.4 `system.json`

- Add `documentTypes.ActiveEffect.effect`.
- Remove `documentTypes.Item.effect`.
- Add a `packs` entry: an `ActiveEffect`-type compendium (empty).

---

## 4. Touch-point plan (repoint `actor.items`→`actor.effects`)

All evidence cited from
`src/document/types/actor/types/character/CharacterDataModel.js` unless noted.

### Derived stats
- `_applyRulesElements` / `processItemElements` (≈698–838): the `case 'effect'`
  branch reads owned items; replace with iterating `actor.effects` of subtype
  `effect` where `!disabled`, processing `system.rulesElement` tagged `effect`.
  Remove the item `effect` case.

### Queries
- `getExpiredEffectItems` (543–545) → filter `actor.effects` (subtype `effect`,
  `system.isExpired`). Rename to reflect AEs.
- `getSortedEffectItems` (552–561) → same source change; sort unchanged.
- `getConditions` (534–536) unchanged (already reads `actor.effects`).

### Duration & combat (algorithms unchanged; source repoint only)
- `onInitiativeAdvanced` (≈4838) / `onInitiativeReverted` (≈5216).
- `onTurnStart` (≈4929) / `onTurnEnd` (≈5091) and their reverts (≈5266 / 5315).
- `_decreaseTurnEffectDuration` / `_increaseTurnEffectDuration` (≈5162 / 5188).
- `_processExpiredEffects` (≈5452): `deleteItem` → `effect.delete()`.
- `removeCombatEffects` (≈4665): filter `actor.effects` (subtype `effect`,
  `system.isCombatEffect`) instead of the implicit `items` duck-type.
- `requestRemoveExpiredEffects` / `removeExpiredEffects` (≈4619 / 4642).
- `shortRest` / `longRest` (≈4748 / 4784) delegate unchanged.
- `toggleEffectActive` (≈5920) → toggle native `disabled`.
- Combat hooks `OnCombatNextTurn.js` / `OnCombatPreviousTurn.js`: no change
  (they call actor system methods).

### Reports
- `_getEffectReportData` / `_getTurnEffectReportData` /
  `_getInitiativeEffectReportData` / `_getCustomEffectReportData` (≈5359–5441):
  read `name` / `img` / native `description` / `system.duration.*` off the AE
  (note: description moves from `system.description` to native
  `ActiveEffect.description`). Output POJO shapes unchanged.
- All report Svelte components (`ChatMessageEffectsTags`, the turn-start/turn-end
  /effects-expired report shells, the remove-expired button/message): **no
  change** (they read serialized `flags.titan.effects.*`).
- `OnRenderChatMessageHTML.js` / `ChatMessageShell.svelte`: keep the `effect`
  chat-message type; `sendToChat` now lives on the AE.

### Sheets
- Replace `EffectSheet.js` + `EffectSheetShell/Header/Tabs` with a
  `TitanActiveEffectSheet` (ApplicationV2 + Svelte) mounting the same
  Description / Checks / RulesElements tabs and the duration header. Use the
  pure-Svelte-5 mount pattern per `foundry-svelte`.
- `CharacterSheetEffectsTab.svelte`: create button →
  `actor.createEmbeddedDocuments('ActiveEffect', [{ type: 'effect', ... }])`;
  list filter → `actor.effects` subtype `effect`.
- `CharacterSheetEffect.svelte`: duration edits → `effect.update(...)`;
  toggle-active → native `disabled`.

### Drag-drop
- Add a `toDragData` drag handle on effect rows.
- The actor-sheet drop handler already resolves AEs via
  `ActiveEffect.implementation.fromDropData` (`TitanActorSheet.js:144–152`),
  covering actor→actor and compendium→actor. Verify it creates the embedded AE
  on drop.

### Hotbar
- Remove the `case 'effect'` in `OnHotbarDrop.js` (Foundry doesn't drag AEs to
  the hotbar). Minor capability drop; noted.

---

## 5. Migration

A world migration step (in `src/helpers/migration/`, wired through
`MigrateWorld.js`):

1. For each actor (world actors and unlinked/synthetic token actors): find
   `items` of `type === 'effect'`.
2. For each, create an `ActiveEffect` (subtype `effect`) with:
   - `name`, `img` from the item;
   - `description` from `system.description`;
   - `system.rulesElement`, `system.duration`, `system.check`,
     `system.customTrait` copied across;
   - `disabled = !(<old active logic>)`;
   - `statuses` / `flags.titan` set for display; `showIcon = ALWAYS`.
   - Order: **create the AE, then delete the item** (avoid a derived-data flash).
3. Delete any stale mirror AEs (`flags.titan.type === 'effect'`) to prevent
   duplicates.

**Known limitation:** `MigrateWorld.js` does not currently iterate compendium
packs, so effect items inside compendium-packed actors are not auto-migrated.
Call this out in the migration notes (and BACKLOG if needed).

After migration, removing the `effect` Item type is safe: delete
`EffectDataModel`, the effect item sheet tree, the `OnceInit` item
registrations, the `system.json` `documentTypes.Item.effect` entry, and the
hotbar case.

---

## 6. Testing / verification (manual, in-game)

1. Create a single-use effect directly on an actor; confirm its rules elements
   modify the derived stats.
2. Advance/rewind combat: `turnStart` / `turnEnd` / `initiative` durations
   decrement/increment correctly; expiry + auto-remove behave per settings.
3. Short/long rest removes combat effects and restores state.
4. Drag an effect actor→actor; drag an effect from the compendium→actor.
5. Token shows the effect icon (`showIcon = ALWAYS`); combat tracker shows it.
6. Conditions still apply and toggle via the Token HUD.
7. Run the migration against a copy of an existing world; confirm effect items
   become equivalent AEs with no stat changes and no leftover items/ghost AEs.

---

## 7. Documentation upkeep

- Update the `titan-codebase` skill (`.claude/skills/titan-codebase/`) to
  describe the new state: ActiveEffect document/data-model, effect subtype,
  removal of the `effect` Item type, and the repointed derived/duration/report
  paths. (Per project CLAUDE.md, this is part of executing the plan.)
- Update `../BACKLOG.md`: un-park item-type removal (done here), keep
  condition-conversion parked, add custom-sidebar-tab and native-VAE items.
