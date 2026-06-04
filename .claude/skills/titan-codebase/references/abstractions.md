# Core Abstractions & How They Relate

## Documents & data models

Foundry document classes hold the document lifecycle (create/update/delete hooks, embedded-document
management). Data model classes hold the schema, field validation, and derived-data logic.

**Actor side**

- `TitanActor` (`src/document/types/actor/TitanActor.js`) extends Foundry's `Actor`. Adds
  `addItem`, `deleteItem`, `addActiveEffect`, `getItemsOfType`, `getSpeaker`, and `getCombatant`
  (returns this actor's Combatant in the active combat via `game.combat?.getCombatantByActor(this.id)`,
  whose `.initiative` is the source for effect initiative capture). On creation it
  assigns a system UUID (stored in `flags.titan.uuid`) and delegates prototype-token initialization
  and post-add/delete callbacks to the data model.
- `TitanActorDataModel` (`src/document/types/actor/TitanActorDataModel.js`) extends
  `TitanDataModel`. Base class for all actor data models; adds `onPreCreate` (which calls
  `_getInitialPrototypeTokenData`), and the `postAddItem` / `preDeleteItem` / `postDeleteItem`
  lifecycle hooks that subclasses override.
- `CharacterDataModel` (`src/document/types/actor/types/character/CharacterDataModel.js`) extends
  `TitanActorDataModel`. The primary character model; coordinates check rolling, resource
  management, rest/regen automation, and effect-duration tracking. The duration/combat/expiry
  methods (`getExpiredEffects`, `getSortedEffects`, `onInitiativeAdvanced`/`Reverted`,
  `onTurnStart`/`End` and their reverts, `_decreaseTurnEffectDuration`/`_increaseTurnEffectDuration`,
  `_processExpiredEffects`, `removeCombatEffects`, `requestRemoveExpiredEffects`, `removeExpiredEffects`,
  `toggleEffectActive`) read effect-subtype Active Effects from `this.parent.effects` (filtered by
  `effect.type === 'effect'`, which excludes conditions), mutate `effect.system.duration.remaining` via
  `effect.update(...)`, flip native `disabled` for the active toggle, and batch-delete expired/combat
  effects via `this.parent.deleteEmbeddedDocuments('ActiveEffect', ids)`. The four report-data builders
  (`_getEffectReportData`, `_getTurnEffectReportData`, `_getInitiativeEffectReportData`,
  `_getCustomEffectReportData`) read effect AEs (including the native `description`) into the turn/expiry
  report payloads.
- `PlayerDataModel` (`src/document/types/actor/types/character/types/player/PlayerDataModel.js`)
  extends `CharacterDataModel`. Adds XP tracking and an `inspiration` flag.
- `NPCDataModel` (`src/document/types/actor/types/character/types/npc/NPCDataModel.js`) extends
  `CharacterDataModel`. Adds `role` (minion / etc.), adds a `type` subfield to the inherited `bio`
  SchemaField via `schema.bio.extendFields({ type })` (assigning `schema.bio.type` directly does not
  register a real subfield), and overrides `applyDamage` to handle one-hit kills and overkill damage
  for minions.

**Data model base**

- `TitanDataModel` (`src/document/data-model/TitanDataModel.js`) extends
  `foundry.abstract.TypeDataModel`. Provides a frozen `#components` map (each component is
  instantiated once from `_prototypeComponents`), a `documentVersion` field, schema composition
  via `defineSchema` + `_defineDocumentSchema`, component-aware `migrateData`, and a
  `prepareDerivedData` pass that iterates components.

**Item side**

- `TitanItem` (`src/document/types/item/TitanItem.js`) extends Foundry's `Item`. Adds
  `buildChatMessageData` (pure: returns `{ type, system }` from the prepared system snapshot —
  `system.getRollData()` minus document-level `id`/`type`, plus `name`/`img` as label metadata),
  `sendToChat` (sends that `type` + `system` as a first-class chat-message subtype, NOT `flags.titan`),
  custom-trait management, and the `isMarkedForDeletion` guard flag.
- `TitanItemDataModel` (`src/document/types/item/TitanItemDataModel.js`) extends `TitanDataModel`.
  Adds `description`, a `check` array (item check templates), and a `customTrait` array. Its
  `getRollData()` override returns `description`, `check`, and `customTrait` on top of the base
  document-level keys; because the chat snapshot is sourced from `getRollData()` (via
  `buildChatMessageData`), any system field a chat card reads MUST be returned here or it falls back
  to the schema initial and the card hides it.
- **Shared item-system shape templates** (plain-data, framework-agnostic, reusable by both the chat
  data models and a future item-DataModel refactor): `createItemSystemTemplate()`
  (`src/document/types/item/ItemSystemTemplate.js`) is the DRY base fragment (description, one
  representative check, one representative custom trait); `createRulesElementTemplate()`
  (`src/document/types/item/rules-element/RulesElementTemplate.js`) is the rules-element fragment
  (empty array → `ArrayField(ObjectField)`). Each type has `create<Type>SystemTemplate()`
  (`.../types/<type>/<Type>SystemTemplate.js`) that spreads those fragments and adds its
  type-specific fields, faithfully mirroring the corresponding `<Type>DataModel` schema.
- `RulesElementItemDataModel` (`src/document/types/item/RulesElementItemDataModel.js`) extends
  `TitanItemDataModel`. Adds a `rulesElement` array; exposes `addRulesElement` and
  `deleteRulesElement`. Item types that carry rules elements extend this class.
- Concrete item data models and which base they extend:
  - `AbilityDataModel` — `RulesElementItemDataModel` (adds xpCost, rarity)
  - `ArmorDataModel` — `RulesElementItemDataModel` (adds rarity, value, armor value schema, traits)
  - `EquipmentDataModel` — `RulesElementItemDataModel` (adds rarity, value, equipped state)
  - `ShieldDataModel` — `RulesElementItemDataModel` (adds rarity, value, defense bonus, traits)
  - `WeaponDataModel` — `RulesElementItemDataModel` (adds attacks array, weapon traits)
  - `CommodityDataModel` — `TitanItemDataModel` (rarity, value, quantity; no rules elements)
  - `SpellDataModel` — `TitanItemDataModel` (aspects, custom aspects; no rules elements)

**Active Effect side**

- `TitanActiveEffect` (`src/document/types/active-effect/TitanActiveEffect.js`) extends
  `foundry.documents.ActiveEffect`. Registered as `CONFIG.ActiveEffect.documentClass`. Conditions are the
  native `condition` subtype (`CONFIG.ActiveEffect.dataModels.condition = ConditionDataModel`, declared in
  `system.json` `documentTypes.ActiveEffect`); effects are the `effect` subtype. Its `_preCreate` /
  `_preUpdate` overrides guard their work on `this.type === 'effect'`
  so conditions and other subtypes are unaffected: `_preCreate` runs `this.system.onPreCreate(data)`,
  forces `showIcon` to `CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS` (2), and seeds
  `flags['visual-active-effects'].data.content` with the enriched native `description`; `_preUpdate`
  re-syncs that flag whenever `description` changes. Enrichment uses
  `foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { secrets: true })` (v14 async API).
  `sendToChat` spreads `getRollData()` flat into `flags.titan`, then sets `type: 'effect'` and
  `description`. This puts `check`, `customTrait`, and `duration` at the `flags.titan` root, where both
  the effect chat components and the item-check roll path resolve them. (Effect chat messages are still
  on the legacy `flags.titan` hook path; items have since moved to first-class `type`+`system`
  chat-message subtypes via `TitanItem.buildChatMessageData` — the effect conversion is a later phase.)
  The class also carries check and custom-trait mutators with the same bodies as `TitanItem` (`addCheck`
  / `deleteCheck` / `addCustomTrait` / `editCustomTrait` / `deleteCustomTrait`), ported inline (not via a
  shared mixin); they operate on `system.check` / `system.customTrait` via `this.update(...)`, notify the
  sheet through `this.sheet.postAddCheck()` / `preDeleteCheck(idx)`, and reuse the item
  `AddCustomTraitDialog` / `EditCustomTraitDialog` (passed `this`). They are invoked by the reused item
  Checks tab and Custom-Traits sidebar via `document.data.*`. Effect chat components
  (`EffectChatMessage.svelte`, `EffectChatStats.svelte`) live in
  `src/document/types/active-effect/chat-message/`; `ChatMessageShell.svelte` maps the `effect` chat-card
  type to `EffectChatMessage`.
- `TitanActiveEffectDataModel` (`src/document/types/active-effect/TitanActiveEffectDataModel.js`)
  extends `RulesElementMixin(TitanDataModel)`. Registered as `CONFIG.ActiveEffect.dataModels.effect`.
  Beyond the mixin's `rulesElement` array, its schema adds a custom `duration` ({ type, remaining,
  initiative, custom }), a `check` array, a `customTrait` array, and a `changes` ArrayField whose
  element is a `SchemaField` ({ key, value, mode, priority, type, phase }) — Foundry v14's
  `Game##verifyActiveEffectModels` requires every ActiveEffect type data model to define `changes` as
  an ArrayField of SchemaField exposing a numeric `priority` and string `type`/`phase`; TITAN keeps a
  permissive shape (no core `type` validator) while satisfying that verifier. It provides `isExpired` /
  `isActive` (`!parent?.disabled`, for all duration types) / `isCombatEffect` getters and
  `_getInitialDocumentData` (captures the owning actor's active-combat initiative via
  `actor.getCombatant()?.initiative`). Active/inactive
  state is the native `disabled` field (the universal gate); rich text is the native `description`
  field. The `effect` ActiveEffect subtype is declared in `system.json`
  `documentTypes.ActiveEffect.effect`. `getRollData()` returns `{ description (native AE field),
  duration, check, customTrait, ... }` — `description` is included so an effect check rolled through
  the shared item-check engine populates the chat card's description like an item does.
- `ConditionDataModel` (`src/document/types/active-effect/ConditionDataModel.js`) extends
  `RulesElementMixin(TitanDataModel)`. Registered as `CONFIG.ActiveEffect.dataModels.condition`; the
  `condition` ActiveEffect subtype is declared in `system.json` `documentTypes.ActiveEffect.condition`.
  Beyond the mixin's `rulesElement` array it adds only the v14-mandated permissive `changes` ArrayField
  (the `Game##verifyActiveEffectModels` shape — `{ key, value, mode, priority, type, phase }`); unlike
  `TitanActiveEffectDataModel` it carries no `duration`, `check`, or `customTrait`. Condition definitions
  (and their seeded `rulesElement` arrays) come from `buildConditionDefinitions()` in
  `src/system/Conditions.js`, pushed onto `CONFIG.statusEffects` by `setupConditions()`; toggling a
  status effect on a token instantiates this subtype, and its mechanics derive through
  `CharacterDataModel._applyRulesElements` like any other rules element.
- Effect rows render inline check buttons via `CharacterSheetEffectChecks` /
  `CharacterSheetEffectCheck` (`src/document/types/actor/types/character/sheet/items/effect/`), mirrors
  of the item `CharacterSheetItemChecks` / `CharacterSheetItemCheck`. They reuse the **item-check
  engine** with no effect-specific path: each resolves `document.data.effects.get(effectId)` and calls
  `getItemCheckParameters` / `requestItemCheck` with `{ itemRollData: effect.getRollData(), checkIdx }`.
  The engine's `validateItemCheckOptions` / `initializeItemCheckOptions` / `getItemCheckParameters` all
  branch on `options.itemRollData` and skip `actor.items.get(id)` when it is supplied (and
  `createItemCheckOptions` preserves `itemRollData` through the chain), so the same path serves items,
  the effect chat card, and effect sheet rows. `itemRollData` uses the literal `false` as its
  absent-sentinel (`createItemCheckOptions` defaults it to `false`), so all three resolutions must
  fall back to the item lookup **truthily** (`options.itemRollData || …` / a `?` ternary), never with
  `??` — `??` treats the `false` sentinel as present and skips the lookup, which made the item
  options dialog self-close until the validate path was corrected.


## Checks

A "check" is the full pipeline for a dice roll: building parameters, rolling dice, applying
expertise, and computing type-specific results.

**Base class**

- `TitanCheck` (`src/check/Check.js`) — constructor stores a `CheckParameters` object.
  `evaluateCheck()` calls `rollCheckDice`, `_applyExpertise`, then `_calculateResults`. Subclasses
  override `_calculateResults` (and optionally `_applyExpertise`) for type-specific logic.

**Subtypes** (all extend `TitanCheck`; each lives in `src/check/types/<name>/`):

- `AttributeCheck` — a standard attribute or skill roll. Results type: `AttributeCheckResults`.
- `ResistanceCheck` — rolling to resist an effect. Results type: `ResistanceCheckResults`.
- `AttackCheck` — weapon attack roll; overrides `_applyExpertise` to push dice toward 6 when
  cleave or rend are active. Adds `damage` to results. Results type: `AttackCheckResults`.
- `CastingCheck` — spellcasting roll. Results type: `CastingCheckResults`.
- `ItemCheck` — roll triggered by an item's embedded check template. Results type:
  `ItemCheckResults`.

**Parameters and options**

Each check type has a companion factory function: `createAttackCheckParameters`,
`createAttributeCheckParameters`, etc. (in `src/check/types/<name>/`), plus a corresponding
`create<Name>CheckOptions` factory. Parameters are plain objects (`CheckParameters` typedef and
per-type extensions). Dialogs (`AttackCheckDialog`, `AttributeCheckDialog`, etc.) collect user
options before constructing parameters.

**Results**

The `CheckResults` typedef (`src/check/CheckResults.js`) describes the result shape;
`calculateCheckResults` is the factory that builds it, counting successes, critical
successes/failures, and extra successes from sorted dice and parameters. Each check type's
`calculate<Name>CheckResults` function extends the base output. `recalculateCheckResults`
(`src/check/chat-message/RecalculateCheckResults.js`) re-runs the appropriate calculator from
stored chat-message data.


## Chat messages & reports

**Document**

- `TitanChatMessage` (`src/document/types/chat-message/ChatMessage.js`) extends Foundry's
  `ChatMessage`. Overrides `renderHTML(options)`: when `this.system instanceof TitanChatMessageDataModel`,
  calls `super.renderHTML(options)` for the standard card chrome, applies TITAN styling classes, tears down
  any prior mount via `_teardownComponent()`, then mounts `ChatMessageContent.svelte` into the
  `.message-content` div, storing the handle and bridge on `_svelteComponent = { handle, bridge }`.
  Non-subtyped messages return the chrome unchanged. `_teardownComponent()` is a shared cleanup method
  called both on re-render (within `renderHTML`) and on delete (from `OnPreDeleteChatMessage`).

**Chat message data models** (Phase 1 — not yet registered)

A `TitanDataModel` hierarchy for first-class chat message subtypes is being built in parallel with
the existing `flags.titan` approach. Registration and activation happen in a later phase.

- `TitanChatMessageDataModel` (`src/document/types/chat-message/ChatMessageDataModel.js`) extends
  `TitanDataModel`. Universal base for all TITAN chat message type data models; declares the
  abstract `get component()` getter that concrete subtypes must override to return the Svelte
  component class used to render the message content.
- `CheckChatMessageDataModel` (`src/check/chat-message/CheckChatMessageDataModel.js`) extends
  `TitanChatMessageDataModel`. Shared schema for all check chat message subtypes: adds `parameters`
  (ObjectField), `results` (ObjectField), `failuresReRolled` (BooleanField, default `false`), and
  `message` (ArrayField of StringField).
- Five leaf models, each colocated with its Svelte component under
  `src/check/types/<name>/chat-message/`, each implementing `get component()`:
  - `AttributeCheckChatMessageDataModel` → `AttributeCheckChatMessage.svelte`
  - `ResistanceCheckChatMessageDataModel` → `ResistanceCheckChatMessage.svelte`
  - `AttackCheckChatMessageDataModel` → `AttackCheckChatMessage.svelte`
  - `CastingCheckChatMessageDataModel` → `CastingCheckChatMessage.svelte`
  - `ItemCheckChatMessageDataModel` → `ItemCheckChatMessage.svelte`
- `ItemChatMessageDataModel` (`src/document/types/item/chat-message/ItemChatMessageDataModel.js`)
  extends `TitanChatMessageDataModel`. Family base for item chat-card subtypes: schema is generated
  from `createItemSystemTemplate()` via `buildSchemaFromShape` (so `system.description`/`check`/
  `customTrait` mirror the item) plus `name`/`img` label fields; `get component()` stays abstract.
- Seven leaf models, colocated with their Svelte component under
  `src/document/types/item/types/<type>/chat-message/<Type>ChatMessageDataModel.js`; each builds its
  full per-type schema via `{ ...super._defineDocumentSchema(), ...buildSchemaFromShape(create<Type>SystemTemplate()) }`
  and returns its `.svelte` from `get component()`: `weapon`, `armor`, `spell`, `ability`
  (component file `AbilityChatMesssage.svelte`, 3 s's), `shield`, `equipment`, `commodity`. Registered
  in `OnceInit.js` `CONFIG.ChatMessage.dataModels` + `system.json` `documentTypes.ChatMessage` +
  `lang/en.json` `TYPES.ChatMessage`. The item chat *components* read the flat snapshot at
  `document.data.system.X` (path parity with the item sheet) — they self-render via
  `TitanChatMessage#renderHTML`. (Restart-gated: subtype registration happens at world load.)

**Svelte shell**

`ChatMessageShell.svelte` is the root Svelte component mounted for every Titan chat message.
It selects the correct inner component based on the message type flag.

**Check chat-message components** (`src/check/chat-message/`)

Svelte components that render an evaluated check in chat:
- `CheckChatMessages.svelte` — outer frame.
- `CheckChatMessageDice.svelte` / `CheckChatMessageDie.svelte` — dice grid.
- `CheckChatResults.svelte` — success/failure summary.
- `CheckChatMessageItemHeader.svelte` — item name/image header.
- `CheckChatResetExpertiseButton.svelte` / `CheckChatScalingAspects.svelte` — interactive
  controls for casting/item checks.

**Report components** (`src/document/types/chat-message/report/`)

Reports are structured summaries of automation outcomes (damage taken, healing, rest, effects
expiring, etc.). Shared scaffolding:
- `ReportChatMessageBase.svelte`, `ReportChatMessageHeader.svelte`, `ReportHeader.svelte`.
- `ReportConfirmApplyDamageButton.svelte` / `ReportConfirmResolveRegainButton.svelte` — GM-side
  confirmation buttons that commit pending automation.

Named report shells (each in its own subdirectory under `report/types/`): `DamageReport`,
`HealingReport`, `RendReport`, `RepairsReport`, `SpendResolveReport`, `LongRestReport`,
`ShortRestReport`, `TurnStartReport`, `TurnEndReport`, `TurnStartRevertReport`,
`TurnEndRevertReport`, `RemoveCombatEffectsReport`, `EffectsExpiredReport`.

**Shared chat-message components** (`src/document/types/chat-message/components/`)

Reusable building blocks: resource displays (`ChatMessageArmor`, `ChatMessageStamina`,
`ChatMessageResolve`, `ChatMessageWounds`, `ChatMessageResource`), tag rows
(`ChatMessageEffectsTags`, `ChatMessageFastHealingTag`, `ChatMessagePersistentDamageTag`, etc.),
and action buttons (`ChatMessageDamageButtons`, `ChatMessageHealingButton`,
`ChatMessageOpposedAttributeCheckButton`, `ChatMessageResourceModButton`, and others for
fast-healing/persistent-damage/resolve regain apply/revert).


## Rules elements

A rules element is a plain object stored in the `rulesElement` array of a
`RulesElementItemDataModel`. It has an `operation` string that identifies the type, a `uuid` for
stable identity across type changes, and type-specific selector/key/value fields. Factory
functions in `src/document/types/item/rules-element/` create default instances:

| Factory function / file          | `operation` value            | Effect                                             |
|----------------------------------|------------------------------|----------------------------------------------------|
| `createFlatModifierElement`      | `flatModifier`               | Add a flat bonus/penalty to an attribute, rating,  |
|                                  |                              | training, expertise, resistance, or mod stat.      |
| `createMulBaseElement`           | `mulBase`                    | Multiply the base value of a stat; carries an      |
|                                  |                              | `up`/`down` `rounding` field for the scaled base.  |
| `createMulSumElement`            | `mulSum`                     | Multiply a stat's post-additive running total      |
|                                  |                              | (base plus all mod buckets); rounding-directional. |
| `createSetSumElement`            | `setSum`                     | Force a stat's post-additive running total to a    |
|                                  |                              | value via `mode` (`set`/`min`/`max`).              |
| `createConditionalCheckModifier` | `conditionalCheckModifier`   | Modify a check's damage, bonus dice, etc. when a   |
|                                  |                              | condition (attribute, trait, etc.) is met.         |
| `createConditionalRatingModifier`| `conditionalRatingModifier`  | Modify accuracy, melee, or defense conditionally.  |
| `createFastHealingElement`       | `fastHealing`                | Heal the character at turn start or end.           |
| `createPersistentDamageElement`  | `persistentDamage`           | Damage the character at turn start or end.         |
| `createRollMessageElement`       | `rollMessage`                | Display a message when a matching check is rolled. |
| `createTurnMessageElement`       | `turnMessage`                | Display a message at the character's turn start/end|

The shared `rulesElement` array plus its `addRulesElement` / `deleteRulesElement` mutators come from
`RulesElementMixin` (`src/document/types/item/rules-element/RulesElementMixin.js`), used by both
`RulesElementItemDataModel` and `TitanActiveEffectDataModel`. Items that carry rules elements: Ability,
Armor, Equipment, Shield, Weapon (all extend `RulesElementItemDataModel`); Commodity and Spell do not.
Effect Active Effects carry rules elements via the same mixin on `TitanActiveEffectDataModel`, not as an
item type.

`CharacterDataModel._applyRulesElements` (called from `prepareDerivedData`) applies rules elements from
three sources: every owned item's `rulesElement` array, a pass over the actor's `effect`-subtype Active
Effects (tagged `'effect'`), and a sibling pass over the actor's `condition`-subtype Active Effects (tagged
`'condition'`); both Active-Effect passes skip `disabled` effects and require a non-empty `system.rulesElement`.
Condition mechanics are derived entirely through this pipeline — the seeded `system.rulesElement` on each
mechanically-active condition (see `Conditions.js`) feeds the same `flatModifier`/`mulSum`/`setSum` appliers,
and each stat-mod bucket carries a `condition` entry (alongside `equipment`/`effect`/`ability`). There is no
hardcoded condition `switch`; the old `_applyConditions` method was retired. All feed the character's derived
stats. Before bucketing, `_expandAllKeyElements` rewrites every element whose `key === 'all'`
into one element per concrete key under its selector (keys resolved by `_getSelectorKeys`, which maps
`training`/`expertise` to `Object.keys(this.skill)` and otherwise reads `Object.keys(this[selector])`); an
`'all'` selector that resolves to no keys is dropped with a `warn`. Any operation carrying a key supports
`'all'` at the engine level (`flatModifier`/`mulSum`/`setSum` are the additive/sum ops that use it), but the
settings UI only exposes the `'all'` option (`allowAll` on the key select) for `mulSum` and `setSum`.

It then sorts the expanded elements into per-operation arrays and invokes per-op appliers in a fixed order:
the additive appliers (`_applyMulBaseElements`, then `_applyFlatModifierElements`) run first, then the
post-additive sum sub-phase (`_applyMulSumElements`, then `_applySetSumElements`) so the running total (base
plus every mod bucket) the sum ops read is already complete. `_applyMulBaseElements` rounds its (possibly
fractional) base contribution per element via `roundDirectional(baseValue * (value - 1), rounding)`. Both sum
appliers recompute the running total per element before computing a corrective delta (`computeMulSumDelta` /
`computeSetSumDelta`) and writing it into the element's source mod bucket, so multiple sum ops on the same
stat compound in order. Each applier records what it wrote under a same-named key on `rulesElementsCache`.


## Sheets

All sheets follow the same three-layer pattern: a JS application class, a Svelte shell component,
and one or more inner Svelte component trees.

**Base layer**

- `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`) extends Foundry v14
  `DocumentSheetV2`. Foundry v14 constructs document sheets as `new cls({ document })` (a single
  options object), while TITAN subclasses pass the document positionally — `resolveDocumentSheetArguments`
  (`src/helpers/utility-functions/ResolveDocumentSheetArguments.js`) normalizes both forms, and the
  document is assigned onto the options object (never `mergeObject`-ed in, which would recurse into the
  document's read-only collections). In its constructor it builds a `ReactiveDocument` bridge around the
  document (`this.#bridge`) and the UI-only `applicationState` store (`_createReactiveState()`); applies
  default + dark-mode classes; and on first render (`_replaceHTML`, `options.isFirstRender`) mounts
  `DocumentSheetShell.svelte` via Svelte 5 `mount()`, passing `{ document: bridge, applicationState,
  shell }` as props. `_onClose` calls `unmount(handle, { outro: true })`.
- `DocumentSheetShell.svelte` — receives `{ document, applicationState, shell }` as `$props()`, sets
  `document` (the `ReactiveDocument` bridge) and `applicationState` into Svelte context, and renders
  the type-specific shell via `{#if shell}{@const Shell = shell}<Shell />{/if}` (not
  `<svelte:component>`).

**Actor sheets**

- `TitanActorSheet` (`src/document/types/actor/sheet/TitanActorSheet.js`) extends
  `TitanDocumentSheet`. Declares `static DEFAULT_OPTIONS = { position: { width: 750 } }` to widen
  the sheet (AppV2 deep-merges this onto the base 700-wide value). Overrides `_getHeaderControls()`
  to add native AppV2 header controls (see conventions.md): an Edit Token control (`_onEditToken`,
  gated by `game.user.isGM || (actor.isOwner && game.user.can('TOKEN_CONFIGURE'))`), a dynamic
  link/unlink control built by `_getTokenLinkControl(token)` (directory actor → toggle prototype
  `actorLink` via `_onToggleTokenLink`; placed linked token → irreversible unlink via
  `_onUnlinkToken`; placed unlinked token → informational no-op), and a compendium Import control
  (`_onImportActor`, GM-only when `actor.pack`). Also provides actor-level item lifecycle callbacks
  (`postAddItem`, `preDeleteItem`, `postDeleteItem`).
- `TitanCharacterSheet` (`src/document/types/actor/types/character/sheet/CharacterSheet.js`)
  extends `TitanActorSheet`. Adds the `CharacterSheetState` reactive store and character-specific
  add/delete item handling.
- `TitanPlayerSheet` (`src/document/types/actor/types/character/types/player/PlayerSheet.js`)
  extends `TitanCharacterSheet`. Mounts `PlayerSheetShell.svelte` → `CharacterSheetBase.svelte`
  with a `PlayerSheetHeader.svelte` header slot.
- `TitanNPCSheet` (`src/document/types/actor/types/character/types/npc/NPCSheet.js`) extends
  `TitanCharacterSheet`. Mounts `NPCSheetShell.svelte`.
- Effects tab (`CharacterSheetEffectsTab.svelte`) creates, lists, and drags effect **Active
  Effects** (not items), backed by its own `tabs.effects` slot in `CharacterSheetState` (filter,
  filter options, per-effect expanded map, scroll position). Its create button calls
  `document.data.createEmbeddedDocuments('ActiveEffect', [{ name, type: 'effect' }])`. It uses a
  dedicated `CharacterSheetEffectList.svelte` (sibling of the item-only `CharacterSheetItemList`)
  that iterates `document.data.effects` filtered to `type === 'effect'`, handles actor→actor drag-out
  via the effect's native `toDragData()`, and renders each via `CharacterSheetEffect.svelte`.
  `CharacterSheetEffect` takes an `effect` prop, reuses the generic `CharacterSheetItem` shell, and
  exposes a `CharacterSheetEffectToggleActiveButton.svelte` (active = `effect.system.isActive`,
  toggled via `document.data.system.toggleEffectActive(effect.id)`) shown for all duration types.
  Its delete button routes through `document.data.system.requestEffectDeletion(effect.id)`, which —
  gated by the `confirmDeletingEffects` client setting (default true, Shift inverts, via
  `ShouldConfirmDeletingEffects`) — either shows `ConfirmDeleteEffectDialog` or immediately calls
  `safeDeleteEffect` (owner-gated `deleteEmbeddedDocuments('ActiveEffect', …)`). This mirrors the
  item path (`requestItemDeletion`/`safeDeleteItem`/`ConfirmDeleteItemDialog`/`confirmDeletingItems`).

**Item sheets**

- `TitanItemSheet` (`src/document/types/item/sheet/TitanItemSheet.js`) extends
  `TitanDocumentSheet`. Declares `static DEFAULT_OPTIONS = { position: { height: 650 } }` to set
  a fixed sheet height (AppV2 deep-merges this onto the base `auto` value). Overrides
  `_getHeaderControls()` to add a Send to Chat control (`item.sendToChat()`) and a compendium Import
  control (`_onImportItem`, only when `item.pack`). Provides `RulesElementItemSheetState` for items
  that carry rules elements.
- Per-type item sheets all extend `TitanItemSheet`: `TitanWeaponSheet`, `TitanArmorSheet`,
  `TitanSpellSheet`, `TitanShieldSheet`, `TitanAbilitySheet`, `TitanEquipmentSheet`,
  `TitanCommoditySheet`. Each mounts its own `*SheetShell.svelte`.

**Active Effect sheet**

- `TitanActiveEffectSheet` (`src/document/types/active-effect/sheet/TitanActiveEffectSheet.js`)
  extends `TitanDocumentSheet` directly (NOT `TitanItemSheet`, to avoid item-only send-to-chat/import
  header controls). Reuses `createRulesElementItemSheetState` (document-agnostic) and exposes
  `postAddCheck`/`preDeleteCheck`. Registered as the default sheet for `ActiveEffect` subtype
  `effect` via `foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.ActiveEffect, …)`
  in `OnceInit.js`. Mounts `ActiveEffectSheetShell.svelte`, which composes the generic
  `ItemSheetBase` + `ItemSheetSidebar` with `ActiveEffectSheetHeader` (duration controls plus a
  native-`disabled` active toggle for permanent effects) and `ActiveEffectSheetTabs` (Description /
  Checks / Rules Elements). The Description tab (`ActiveEffectSheetDescriptionTab.svelte`) edits the
  NATIVE `description` field, persisting via `document.data.update({ description })`; the Checks and
  Rules Elements tabs reuse the item `ItemSheet*` components unchanged.

**Effect Tray sidebar tab**

- `TitanEffectTrayTab` (`src/sidebar/TitanEffectTrayTab.js`) extends
  `foundry.applications.sidebar.AbstractSidebarTab` (an `ApplicationV2`) and mounts a Svelte tray the same way
  sheets mount shells (imperative `mount()`/`unmount()` in `_replaceHTML`/`_onClose`, gated on
  `options.isFirstRender`). It has NO backing document; instead it builds an `EffectTrayState` and sets it into
  Svelte context as `'trayState'`. Registered additively in `OnceInit.js` (`Sidebar.TABS.titanEffects` +
  `CONFIG.ui.titanEffects`); core instantiates `ui.titanEffects` and handles the tab strip / activation / popout.
- `EffectTrayState` (`src/sidebar/tray/EffectTrayState.svelte.js`) is a Svelte 5 runes class holding `compendiums`,
  `selectedPackId`, `effects`, `folders`, `filter`, `expandedFolders`, and `isLocked` (a reactive `$state` mirror of
  `pack.locked`). `getEffectCompendiums()` (`src/sidebar/tray/GetEffectCompendiums.js`) lists visible
  `ActiveEffect`-type packs (system/TITAN first, then alphabetical). `refresh()` loads `pack.getDocuments()` (TITAN/
  system packs filtered to `type==='effect'`; user packs show all), sets `isLocked = !!pack.locked` before the await
  (or resets it to `true` in the no-pack guard), with a post-await stale-selection guard. The last-selected pack
  persists in the per-user `effectTrayLastPack` client setting. The state registers create/update/delete hooks for
  both `ActiveEffect` and `Folder`, refreshing only when `document.pack === selectedPackId`; `destroy()` (called from
  the tab's `_onClose`) removes them. `isOwner` getter = `pack.getUserLevel(game.user) >= OWNER`. `canEdit` getter =
  `!this.isLocked && this.isOwner` (reads the reactive mirror, so the UI reacts when the lock flips). `toggleLock()`
  calls `await pack.configure({ locked: !pack.locked })` then updates the mirror; owner-gated. `requestDeleteEffect()`
  prompts via `ConfirmationDialog` then calls `effect.delete()` on confirm; `canEdit`-gated.
- `buildEffectRowContextMenu(trayState)` (`src/sidebar/tray/EffectRowContextMenu.js`) returns the six
  right-click `ContextMenuEntry` objects for an effect-tray row. Entry shape: `{ label, icon, visible(), onClick() }`.
  Apply and Open are always visible; Rename, Duplicate, and Delete are gated on `trayState.canEdit`; Move to Folder
  is gated on `canEdit && !!selectedPack?.folders`. The Move-to-Folder `onClick` lazy-loads `MoveEffectToFolderDialog`
  via a dynamic `import()` so this module stays importable in unit tests without stubbing
  `foundry.applications.api`. `resolveEffect(target, trayState)` (module-private) looks up the effect by reading
  `data-effect-id` off the closest ancestor element.
- UI: `EffectTrayShell` → `EffectTray` (hosts the drag-in stash drop zone; attaches a Foundry `ContextMenu` to the
  tray root via the `effectContextMenu` action, delegating on `[data-effect-id]` rows with `buildEffectRowContextMenu`)
  → `EffectTrayHeader` (compendium `Select` dropdown, GM/owner-only lock toggle calling `toggleLock()`, owner-gated
  New / New Folder, and an actor-sheet-style labelled **Filter** row bound to `trayState.filter`) + `EffectTrayList`
  (folder-grouped or flat; folder headers carry owner-gated inline-rename mirroring the row, plus collapse toggle,
  count, delete) of `EffectTrayRow` (icon, inline-rename, drag-out via `effect.toDragData()`, and a single
  always-visible **Apply** button). **Left-click on a row opens the effect sheet**, debounced 250 ms so it does not
  collide with double-click-to-rename; the row listens for a `titan-effect-rename` CustomEvent so the context menu's
  Rename entry drives the inline rename. Open / Duplicate / Delete / Rename / Move-to-Folder live in the right-click
  context menu; **Move to Folder** opens `MoveEffectToFolderDialog` (`src/sidebar/tray/MoveEffectToFolderDialog.js` +
  `MoveEffectToFolderDialogShell.svelte`), a folder-picker that calls `trayState.moveEffectToFolder`. Apply uses
  `applyEffectToTargets()`
  (`src/helpers/utility-functions/ApplyEffectToTargets.js`) → copies `effect.toObject()` onto each
  `getBestCharactersToUpdate()` target the user owns. Stash-in resolves the drop via
  `getDocumentClass('ActiveEffect').fromDropData(...)` and creates a copy in the selected pack (guarding against
  re-stashing an effect already in that pack). The system ships one empty `effects` compendium (scratch); seeding a
  standard-effects pack + pack-build pipeline is deferred (backlog #2 sub-project B).
- **Shared-targeting upgrade:** `getBestCharactersToUpdate()` (`src/helpers/utility-functions/`) was upgraded for
  this feature (used by damage/healing too): the prior primary order is preserved and fallbacks are appended — GM:
  targeted → controlled → focused-sheet actor; player: controlled → assigned (`game.user.character`) →
  focused-sheet actor (`GetFocusedCharacterSheetActor.js`, reads `ui.activeWindow`), de-duplicated by id.


## Shared helpers

**`ActionQueue`** (`src/helpers/ActionQueue.js`)

A serial task queue. Because Foundry actor updates are asynchronous and can race, callers may
enqueue callbacks with a unique `key`; duplicate-key entries are deduplicated. A queue is lazily
created on each actor (`this.parent.actionQueue`) during `CharacterDataModel.prepareDerivedData`
when the current user is the best owner, but no path in `src/` currently calls `enqueue` — the
effect-duration automation now mutates `actor.effects` directly via `effect.update(...)` /
`deleteEmbeddedDocuments` rather than through the queue. The infrastructure remains available for
sequencing future racy mutations.

**`SocketManager`** (`src/helpers/SocketManager.js`)

Listens on `system.titan` via `game.socket`. Received messages are dispatched as Foundry Hooks
(`Hooks.callAll`). `triggerSocketHook(id, ...args)` fires the hook locally and emits it to all
clients — the primary mechanism for cross-client automation (e.g., a player-owned actor applying
damage on the GM's behalf).

**`utility-functions/`** (`src/helpers/utility-functions/`)

Standalone pure or near-pure functions imported individually throughout the codebase. Grouped by
domain:
- **Schema field factories** — thin wrappers around Foundry field constructors for consistent
  schema definitions (e.g., `CreateStringField`, `CreateIntegerField`). `BuildSchemaFromShape.js`
  (`buildSchemaFromShape(shape)`) recursively converts a plain-object shape template into a schema
  field map by value type — `string`/`boolean` → the matching `create*Field` seeded with the
  representative value; `number` → `createIntegerField` (the helper ASSUMES integer — the system has no
  non-integer schema fields except the base `documentVersion`, defined directly in `TitanDataModel`, not
  template-generated; float support is deliberately YAGNI); array → `createArrayField`
  whose element schema is derived from the first
  element (empty array → object element field), plain object → a `SchemaField` (recursing), and
  `null`/`undefined` → a nullable object field; it composes the `create*Field`/`createSchemaField`
  helpers so a data model can be defined from a canonical shape.
- **Token / actor queries** — resolve the best owner or target set for a given operation
  (e.g., `GetBestPlayerOwner`, `IsCurrentUserBestOwner`).
- **Apply/revert automation** — entry points for applying or reverting damage, healing, rend, and
  repairs to one or more targets (e.g., `ApplyDamageToTargets`).
- **Label / tooltip builders** — construct localised display strings and modifier breakdowns for
  checks and stats (e.g., `CreateCheckLabel`, `CreateModifiableStatTooltip`).
- **Settings accessors** — each system setting has its own getter module (e.g., `GetSetting`,
  `ShouldGetCheckOptions`).
- **String helpers** — general-purpose text formatting (`Localize`, `Capitalize`, and others).
- **Async / retry** — `Delay.js` (`delay(ms)`) returns a Promise that resolves after a fixed
  millisecond wait. `RetryResolve.js` (`retryResolve(resolveFn, { attempts, delayMs })`) repeatedly
  invokes a synchronous resolver until it returns a truthy value or the attempt budget is exhausted,
  then returns the truthy result or `null`; default budget is 5 attempts at 50 ms each. First attempt
  is immediate (no leading delay), so the success path has no wall-clock cost.
- **Rules-element math** — pure delta helpers for the multiplicative/sum appliers: `RoundDirectional.js`
  (`roundDirectional(value, rounding)` ceils on `'up'`, floors otherwise), `ComputeMulSumDelta.js`
  (`computeMulSumDelta(total, value, rounding)` returns `roundDirectional(total * value, rounding) - total`,
  or `0` when `total <= 0` so a zero stat is never pushed negative), and `ComputeSetSumDelta.js`
  (`computeSetSumDelta(total, value, mode)` returns the delta forcing the total to `value` under `set`, raising
  it under `min`, or capping it under `max`).
- **Misc** — small utilities used across layers (`GenerateUUID`, `Log`, `Assert`, `Clamp`, and
  others).

**`svelte-components/`** (`src/helpers/svelte-components/`)

Reusable Svelte UI primitives consumed by sheet and chat-message components. Categories:
- **Buttons** — clickable controls ranging from full icon-label buttons to compact mini variants
  and domain-specific actions (e.g., `Button`, `IconLabelButton`, `ToggleButton`, and others).
- **Inputs** — bound form controls for text, numbers, checkboxes, images, and domain-specific
  fields such as attributes and resistances (e.g., `TextInput`, `IntegerIncrementInput`,
  `CheckboxInput`, and others).
- **Labels** — read-only display elements, including modified-value variants that show stat
  breakdowns (e.g., `TextLabel`, `ModifiableStatValueLabel`, and others).
- **Tags** — compact inline badges for traits, ratings, durations, and check metadata
  (e.g., `TraitTag`, `DurationTag`, `TagContainer`, and others).
- **Layout** — structural primitives: tab containers, scrolling wrappers, filtered lists, meters,
  and rich-text renderers (e.g., `Tabs`, `FilteredList`, `Meter`, and others).

**`svelte-actions/`** (`src/helpers/svelte-actions/`)

Svelte `use:` actions: `TooltipAction` (tippy.js tooltip on any element) and `PreventDefault`
(blocks default browser event). `AutoScroll` scrolls a container to the bottom on content change.


## How they wire together

An item's data model (e.g., `WeaponDataModel`) stores a `rulesElement` array of plain-object
rules elements alongside its `check` array of item check templates. When a `TitanActor`
prepares derived data, `CharacterDataModel.prepareDerivedData` walks every owned item and applies
each rules element to the character's stats, building the final computed values (attributes,
ratings, resistances, mods).

When a character performs a check, `CharacterDataModel` reads those derived stats, constructs a
parameters object (via a `create<Type>CheckParameters` factory), optionally opens a dialog for
user options, then instantiates the appropriate `TitanCheck` subclass and calls `evaluateCheck`.
The resulting `CheckResults` (or subtype) and parameters are packaged into `flags.titan` and
passed to `ChatMessage.create`.

The newly created `ChatMessage` is handled by `TitanChatMessage`. In the chat window,
`ChatMessageShell.svelte` reads the message type flag from `flags.titan` and mounts the correct
Svelte component tree — either a check display (using the `src/check/chat-message/` components)
or a report shell (from `src/document/types/chat-message/report/types/`). Report shells include
confirm/apply buttons that call back into `CharacterDataModel` methods (via `SocketManager` when
the acting user is not the document owner) to commit automation outcomes such as damage or
healing.

`TitanDocumentSheet` (extending Foundry v14 `DocumentSheetV2`) wraps the document in a
`ReactiveDocument` bridge and mounts `DocumentSheetShell.svelte` with Svelte 5 `mount()`, making the
document reactively available to the entire sheet component tree via Svelte context (children read
`document.data.*`). Sheet subclasses supply their own shell Svelte component (e.g.,
`PlayerSheetShell.svelte`) and an `applicationState` store for UI-only state (open tabs, expanded
sections) that does not need to be persisted.

`ActionQueue` is a serial task queue lazily created per actor for sequencing racy async mutations;
it is currently initialized but unused (no `enqueue` callers remain). `SocketManager` bridges client
boundaries, forwarding automation triggers as Hooks so non-owner clients can request owner-side
operations.
