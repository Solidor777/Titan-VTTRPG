# Core Abstractions & How They Relate

## Documents & data models

Foundry document classes hold the document lifecycle (create/update/delete hooks, embedded-document
management). Data model classes hold the schema, field validation, and derived-data logic.

**Actor side**

- `TitanActor` (`src/document/types/actor/TitanActor.js`) extends Foundry's `Actor`. Adds
  `addItem`, `deleteItem`, `addActiveEffect`, `getItemsOfType`, and `getSpeaker`. On creation it
  assigns a system UUID (stored in `flags.titan.uuid`) and delegates prototype-token initialization
  and post-add/delete callbacks to the data model.
- `TitanActorDataModel` (`src/document/types/actor/TitanActorDataModel.js`) extends
  `TitanDataModel`. Base class for all actor data models; adds `onPreCreate` (which calls
  `_getInitialPrototypeTokenData`), and the `postAddItem` / `preDeleteItem` / `postDeleteItem`
  lifecycle hooks that subclasses override.
- `CharacterDataModel` (`src/document/types/actor/types/character/CharacterDataModel.js`) extends
  `TitanActorDataModel`. The primary character model: owns check-rolling methods (attribute,
  attack, casting, item, resistance), resource management (stamina, wounds, resolve), rest/regen
  automation, and effect-duration tracking.
- `PlayerDataModel` (`src/document/types/actor/types/character/types/player/PlayerDataModel.js`)
  extends `CharacterDataModel`. Adds XP tracking and an `inspiration` flag.
- `NPCDataModel` (`src/document/types/actor/types/character/types/npc/NPCDataModel.js`) extends
  `CharacterDataModel`. Adds `role` (minion / etc.) and overrides `applyDamage` to handle
  one-hit kills and overkill damage for minions.

**Data model base**

- `TitanDataModel` (`src/document/data-model/TitanDataModel.js`) extends
  `foundry.abstract.TypeDataModel`. Provides a frozen `#components` map (each component is
  instantiated once from `_prototypeComponents`), a `documentVersion` field, schema composition
  via `defineSchema` + `_defineDocumentSchema`, component-aware `migrateData`, and a
  `prepareDerivedData` pass that iterates components.

**Item side**

- `TitanItem` (`src/document/types/item/TitanItem.js`) extends Foundry's `Item`. Adds
  `sendToChat`, custom-trait management, and the `isMarkedForDeletion` guard flag.
- `TitanItemDataModel` (`src/document/types/item/TitanItemDataModel.js`) extends `TitanDataModel`.
  Adds `description`, a `check` array (item check templates), and a `customTrait` array.
- `RulesElementItemDataModel` (`src/document/types/item/RulesElementItemDataModel.js`) extends
  `TitanItemDataModel`. Adds a `rulesElement` array; exposes `addRulesElement` and
  `deleteRulesElement`. Item types that carry rules elements extend this class.
- Concrete item data models and which base they extend:
  - `AbilityDataModel` — `RulesElementItemDataModel` (adds xpCost, rarity)
  - `ArmorDataModel` — `RulesElementItemDataModel` (adds armor value, traits)
  - `EffectDataModel` — `RulesElementItemDataModel` (adds duration, turn tracking)
  - `EquipmentDataModel` — `RulesElementItemDataModel` (adds quantity, bulk, equip state)
  - `ShieldDataModel` — `RulesElementItemDataModel` (adds defense bonus, traits)
  - `WeaponDataModel` — `RulesElementItemDataModel` (adds attacks array, weapon traits)
  - `CommodityDataModel` — `TitanItemDataModel` (quantity/value only, no rules elements)
  - `SpellDataModel` — `TitanItemDataModel` (aspects, custom aspects; no rules elements)


## Checks

A "check" is the full pipeline for a dice roll: building parameters, rolling dice, applying
expertise, and computing type-specific results.

**Base class**

- `TitanCheck` (`src/check/Check.js`) — named `TitanCheck` in source (file is `Check.js`).
  Constructor stores a `CheckParameters` object. `evaluateCheck()` calls `rollCheckDice`,
  `_applyExpertise`, then `_calculateResults`. Subclasses override `_calculateResults` (and
  optionally `_applyExpertise`) for type-specific logic.

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

`CheckResults` (`src/check/CheckResults.js`) is a plain-object typedef and a factory function
(`calculateCheckResults`) that counts successes, critical successes/failures, and extra successes
from sorted dice and parameters. Each check type's `calculate<Name>CheckResults` function extends
the base output. `recalculateCheckResults` (`src/check/chat-message/RecalculateCheckResults.js`)
re-runs the appropriate calculator from stored chat-message data.


## Chat messages & reports

**Document**

- `TitanChatMessage` (`src/document/types/chat-message/ChatMessage.js`) extends Foundry's
  `ChatMessage`. Currently a thin subclass; system data is stored in `flags.titan` and read by
  Svelte components.

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
| `createMulBaseElement`           | `mulBase`                    | Multiply the base value of a stat.                 |
| `createConditionalCheckModifier` | `conditionalCheckModifier`   | Modify a check's damage, bonus dice, etc. when a   |
|                                  |                              | condition (attribute, trait, etc.) is met.         |
| `createConditionalRatingModifier`| `conditionalRatingModifier`  | Modify accuracy, melee, or defense conditionally.  |
| `createFastHealingElement`       | `fastHealing`                | Heal the character at turn start or end.           |
| `createPersistentDamageElement`  | `persistentDamage`           | Damage the character at turn start or end.         |
| `createRollMessageElement`       | `rollMessage`                | Display a message when a matching check is rolled. |
| `createTurnMessageElement`       | `turnMessage`                | Display a message at the character's turn start/end|

Items that can carry rules elements: Ability, Armor, Effect, Equipment, Shield, Weapon (all
extend `RulesElementItemDataModel`). Commodity and Spell do not.

`CharacterDataModel.prepareDerivedData` iterates the actor's owned items, reads each item's
`rulesElement` array, and applies the elements to the character's derived stats.


## Sheets

All sheets follow the same three-layer pattern: a JS application class, a Svelte shell component,
and one or more inner Svelte component trees.

**Base layer**

- `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`) extends
  `SvelteApplication` (TyphonJS). Wraps the document in a `TJSDocument` reactive store,
  mounts `DocumentSheetShell.svelte` as the root Svelte component, injects the document and
  `applicationState` stores via Svelte context, and applies dark-mode class handling.
- `DocumentSheetShell.svelte` — the `ApplicationShell` wrapper; it receives `document`,
  `applicationState`, and a `shell` prop, then mounts the shell with `<svelte:component>`.

**Actor sheets**

- `TitanActorSheet` (`src/document/types/actor/sheet/TitanActorSheet.js`) extends
  `TitanDocumentSheet`. Adds token linking/unlinking header buttons and actor-level item lifecycle
  callbacks (`postAddItem`, `preDeleteItem`, `postDeleteItem`).
- `TitanCharacterSheet` (`src/document/types/actor/types/character/sheet/CharacterSheet.js`)
  extends `TitanActorSheet`. Adds the `CharacterSheetState` reactive store and character-specific
  add/delete item handling.
- `TitanPlayerSheet` (`src/document/types/actor/types/character/types/player/PlayerSheet.js`)
  extends `TitanCharacterSheet`. Mounts `PlayerSheetShell.svelte` → `CharacterSheetBase.svelte`
  with a `PlayerSheetHeader.svelte` header slot.
- `TitanNPCSheet` (`src/document/types/actor/types/character/types/npc/NPCSheet.js`) extends
  `TitanCharacterSheet`. Mounts `NPCSheetShell.svelte`.

**Item sheets**

- `TitanItemSheet` (`src/document/types/item/sheet/TitanItemSheet.js`) extends
  `TitanDocumentSheet`. Adds send-to-chat and import buttons; provides
  `RulesElementItemSheetState` for items that carry rules elements.
- Per-type item sheets all extend `TitanItemSheet`: `TitanWeaponSheet`, `TitanArmorSheet`,
  `TitanSpellSheet`, `TitanShieldSheet`, `TitanAbilitySheet`, `TitanEquipmentSheet`,
  `TitanCommoditySheet`, `TitanEffectSheet`. Each mounts its own `*SheetShell.svelte`.


## Shared helpers

**`ActionQueue`** (`src/helpers/ActionQueue.js`)

A serial task queue. Because Foundry actor updates are asynchronous and can race, components
enqueue callbacks with a unique `key`; duplicate-key entries are deduplicated. Used by
`EffectDataModel` and other automation paths to sequence updates safely.

**`SocketManager`** (`src/helpers/SocketManager.js`)

Listens on `system.titan` via `game.socket`. Received messages are dispatched as Foundry Hooks
(`Hooks.callAll`). `triggerSocketHook(id, ...args)` fires the hook locally and emits it to all
clients — the primary mechanism for cross-client automation (e.g., a player-owned actor applying
damage on the GM's behalf).

**`utility-functions/`** (`src/helpers/utility-functions/`)

Standalone pure or near-pure functions imported individually throughout the codebase. Grouped by
domain:
- Schema field factories: `CreateStringField`, `CreateIntegerField`, `CreateNumberField`,
  `CreateBooleanField`, `CreateArrayField`, `CreateObjectField`, `CreateSchemaField`.
- Token / actor queries: `GetControlledTokens`, `GetTargetedTokens`, `GetControlledCharacters`,
  `GetTargetedCharacters`, `GetBestPlayerOwner`, `GetBestCharactersToUpdate`,
  `IsCurrentUserBestOwner`.
- Apply/revert automation: `ApplyDamageToTargets`, `ApplyHealingToTargets`,
  `ApplyRendToTargets`, `ApplyRepairsToTarget`.
- Label / tooltip builders: `CreateCheckLabel`, `CreateAttributeCheckLabel`,
  `CreateModifiableStatTooltip`, `GetAttributeCheckParametersTooltip`,
  `GetItemCheckParametersTooltip`, `GetResistanceCheckParametersTooltip`.
- Settings accessors: each system setting has its own getter module (e.g., `GetSetting`,
  `ShouldGetCheckOptions`, `ShouldConfirmDeletingItems`).
- String helpers: `Camelize`, `Capitalize`, `FormatString`, `Localize`, `Paragraphize`.
- Misc: `GenerateUUID`, `RollCheckDice`, `Log`, `Assert`, `Delay`, `Clamp`, `DeepFreeze`.

**`svelte-components/`** (`src/helpers/svelte-components/`)

Reusable Svelte UI primitives consumed by sheet and chat-message components. Categories:
- **Buttons**: `Button`, `IconButton`, `IconLabelButton`, `MiniButton`, `MiniIconButton`,
  `ToggleButton`, `ToggleOptionButton`, `AttributeButton`, `ResistanceButton`,
  `ResistanceCheckButton`, `SpendResolveButton`, `ExpandButton`, `CondensedCheckButton`,
  `ItemCheckButton`, `ImageButton`.
- **Inputs**: `TextInput`, `TextAreaInput`, `NumberInput`, `IntegerInput`,
  `IntegerIncrementInput`, `CheckboxInput`, `ImagePicker`, `LabeledTextInput`, `AttributeInput`,
  `ResistanceInput`, `RarityInput`, `TopFilter`, and a set of `Select` components for every
  selectable field type.
- **Labels**: `Label`, `TextLabel`, `IconLabel`, `ModifiedValueLabel`,
  `ModifiableStatValueLabel`.
- **Tags**: `Tag`, `TraitTag`, `ValueTag`, `LabelTag`, `RarityTag`, `AttributeTag`,
  `ResistanceTag`, `AttributeCheckTag`, `StatTag`, `IconStatTag`, `IconTag`, `DurationTag`,
  `OpposedCheckTag`, `EditDeleteTag`, `ResistedByTag`, `TagContainer`, spell-aspect tags, and
  effect-state tags.
- **Layout**: `Tabs`, `ScrollingContainer`, `BorderedColumnList`, `FilteredList`,
  `LabeledElement`, `Meter`, `RichText`, `Text`.

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

`TitanDocumentSheet` (extending TyphonJS `SvelteApplication`) wraps the document in a
`TJSDocument` store and mounts `DocumentSheetShell.svelte`, making the document reactively
available to the entire sheet component tree via Svelte context. Sheet subclasses supply their
own shell Svelte component (e.g., `PlayerSheetShell.svelte`) and an `applicationState` store for
UI-only state (open tabs, expanded sections) that does not need to be persisted.

`ActionQueue` serializes async mutations within `EffectDataModel` and other automation paths so
that concurrent Foundry updates do not interleave. `SocketManager` bridges client boundaries,
forwarding automation triggers as Hooks so non-owner clients can request owner-side operations.
