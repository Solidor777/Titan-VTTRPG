# Data & Control Flow

## A check, end to end

The full path from user intent to actor mutation:

**1. Trigger — `CharacterDataModel` (src/document/types/actor/types/character/CharacterDataModel.js)**
A sheet button or macro calls `requestAttributeCheck(options)` (or the equivalent for attack / resistance /
item / casting checks). This method calls the `shouldGetCheckOptions()` helper, which reads the
`titan.getCheckOptions` setting (and inverts it when a modifier key is held). If the setting requires
user confirmation it creates an `AttributeCheckDialog`; otherwise it calls `rollAttributeCheck` directly.

**2. Dialog (optional) — `AttributeCheckDialog` + `CheckDialogShell.svelte` +
`AttributeCheckDialogShell.svelte`**
(src/check/types/attribute-check/dialog/AttributeCheckDialog.js,
src/check/dialog/CheckDialogShell.svelte,
src/check/types/attribute-check/dialog/AttributeCheckDialogShell.svelte)
`AttributeCheckDialog` extends `TitanDialog`; it passes two `writable` stores (`checkOptions`,
`checkParameters`) as props to `CheckDialogShell.svelte`, which sets them into Svelte context and delegates
rendering to the type-specific shell (`AttributeCheckDialogShell`). The inner shell runs a reactive block
(`$:`) that calls `actor.system.getAttributeCheckParameters($checkOptions)` on every options change to keep
the displayed totals live. When the Roll button fires, the inner shell calls
`actor.system.rollAttributeCheck($checkOptions)` directly on the actor's data model, and the dialog closes.

**3. Parameters & check instantiation — `CharacterDataModel.rollAttributeCheck`**
`rollAttributeCheck` is the entry point for the actual roll. It validates the options, calls
`initializeAttributeCheckOptions` to apply defaults, calls `getAttributeCheckParameters` to produce the
typed `CheckParameters` object, constructs `new AttributeCheck(checkParameters)`, collects any narrative
messages via `_getAttributeCheckMessages`, then delegates to `_rollCheck`. (The dialog factory
`_createAttributeCheckDialog` is invoked earlier by `requestAttributeCheck` only when user confirmation of
options is needed; once the dialog's Roll button fires, it hands off directly to `rollAttributeCheck`.)

**4. Roll & evaluate — `TitanCheck.evaluateCheck` (src/check/Check.js)**
`_rollCheck` optionally spends Resolve via `_expendCheckResolve`, then calls `check.sendToChat()`.
`sendToChat` calls `evaluateCheck()` if needed. `evaluateCheck` calls `rollCheckDice(totalDice)`
(src/helpers/utility-functions/RollCheckDice.js) to get dice results, runs `_applyExpertise`, then calls
`_calculateResults` which delegates to `calculateCheckResults` (src/check/CheckResults.js) (or the
type-specific override, e.g. `calculateAttributeCheckResults` via `AttributeCheck._calculateResults`).
The resulting `CheckResults` object is stored on `check.results`.

**5. Chat message creation — `TitanCheck.sendToChat`**
Builds a `messageData` object containing `{ type, parameters, results, failuresReRolled, message }` and
calls `ChatMessage.create({ flags: { titan: messageData }, ... })`. All check data travels in
`flags.titan`.

**6. Chat render — `onRenderChatMessageHTML` hook (src/hooks/OnRenderChatMessageHTML.js)**
Foundry fires `renderChatMessageHTML` after inserting the message HTML. The hook checks
`message.flags.titan.type`; if it is a known Titan type, it wraps the document in a `TJSDocument` store and
mounts `ChatMessageShell.svelte` (src/document/types/chat-message/ChatMessageShell.svelte) into the
`.message-content` element. The shell sets the store into context as `'document'` and calls
`selectComponent()` to look up the correct component for the type (e.g. `AttributeCheckChatMessage`), then
renders it via `<svelte:component this={...}/>`.

**7. Check chat component — e.g. `AttributeCheckChatMessage.svelte`**
(src/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte)
Reads `$document.flags.titan.results` and `$document.flags.titan.parameters` from context. Composes the
header, dice display (`CheckChatMessageDice.svelte`), results (`CheckChatResults.svelte`), and — when
relevant — action buttons.

**8. Apply/confirm buttons mutate actor state**
Two button patterns coexist:
- **GM damage buttons** (`ChatMessageDamageButtons.svelte`, src/document/types/chat-message/components/
  buttons/ChatMessageDamageButtons.svelte): call `applyDamageToTargets(damage, options)` which calls
  `actor.system.applyDamage(...)` on each targeted actor immediately; no confirmed flag is set on the chat
  document.
- **Report confirm buttons** (`ReportConfirmApplyDamageButton.svelte`, src/document/types/chat-message/
  report/components/ReportConfirmApplyDamageButton.svelte): owned-actor flow. Calls
  `actor.system.applyDamage(total, { ignoreArmor: true, report: false })`, then updates the chat message's
  `flags.titan` to mark the damage confirmed and persist the new resource values.

---

## Sheet render lifecycle

**1. Application construction — `TitanDocumentSheet` → subclass chain**
(src/document/sheet/TitanDocumentSheet.js)
`TitanDocumentSheet` extends TyphonJS `SvelteApplication`. In its constructor it calls `super(options)` with
`svelte: { class: DocumentSheetShell, target: document.body, props: { document: null, applicationState: null } }`.
It then wraps the raw Foundry document in `new TJSDocument(document, { delete: this.close.bind(this) })` and
stores it in `options.svelte.props.document`. It also calls `_createReactiveState()` (overridden in
`TitanCharacterSheet`) and stores the result in `options.svelte.props.applicationState`.

Subclass constructors extend this chain:
`TitanPlayerSheet` → `TitanCharacterSheet` → `TitanActorSheet` → `TitanDocumentSheet`.
`TitanPlayerSheet` adds `props.shell = PlayerSheetShell` to the svelte options so the
`DocumentSheetShell` knows which inner component to render.

**2. Reactive state — `CharacterSheetState` (src/document/types/actor/types/character/sheet/
CharacterSheetState.js)**
`TitanCharacterSheet._createReactiveState()` calls `createCharacterSheetState(actor)` which returns a plain
Svelte `writable` store augmented with `postAddItem` / `preDeleteItem` methods. The store is passed into the
Svelte tree as the `applicationState` prop and made available to all children via
`setContext('applicationState', applicationState)` inside `DocumentSheetShell.svelte`.

**3. Mount — `DocumentSheetShell.svelte` (src/document/sheet/DocumentSheetShell.svelte)**
TyphonJS instantiates this as the root component. It receives `document` (the `TJSDocument` store) and
`applicationState` and calls `setContext('document', document)` / `setContext('applicationState',
applicationState)` so every child component in the tree can read them via `getContext`. It wraps everything
in `<ApplicationShell>` (TyphonJS runtime component that manages the window chrome) and renders
`<svelte:component this={shell}/>` where `shell` is the type-specific sheet component.

**4. Sheet body — e.g. `CharacterSheetBase.svelte`**
Reads `$document` from context, gates all rendering behind `{#if $document}`, and composes the sidebar and
body (`CharacterSheetSidebar`, `CharacterSheetTabs`). Tab/sidebar sub-components also call `getContext` to
access the same `document` and `applicationState` stores.

**5. TJSDocument reactivity**
`TJSDocument` is a TyphonJS wrapper around a Foundry document. Any time Foundry updates the document (via
`document.update(...)`) the `TJSDocument` store notifies all Svelte subscribers automatically, causing
reactive blocks and `$document` references to re-evaluate and the UI to re-render.

**6. Subscription for title update**
`TitanDocumentSheet.render()` subscribes to the `TJSDocument` store via `document.subscribe(
_onDocumentUpdated)`, which keeps `this.reactive.title` in sync with the document name. On `close()`, it
unsubscribes.

**7. User edits flowing back to the document — two patterns**

*Document-bound inputs* (src/document/svelte-components/input/):
Components like `DocumentIntegerInput.svelte` and `DocumentBoundEditorInput.svelte` use `bind:value` to
mirror the `$document.system.*` field, then call `refreshSystemDocument($document, disabled)`
(src/helpers/utility-functions/RefreshSystemDocumentData.js) on `change` / `keyup`. That helper runs
`document.update({ system: structuredClone(document.system), flags: structuredClone(document.flags) })`,
writing the entire mutated system blob back to Foundry in one call.

*Direct item.update calls* (e.g. `CharacterSheetCommodity.svelte`, `CharacterSheetEffect.svelte`):
Some sheet rows hold a local reference to an embedded `TitanItem` and call
`item.update({ system: { fieldName: newValue } })` directly on `change`, bypassing the snapshot helper.

---

## Migration system

**Where it lives:** `src/helpers/migration/`
- `MigrateWorld.js` — orchestration functions `worldNeedsMigration()` and `migrateWorld()`.
- `actor/` — `ActorMigrations.js`, `CharacterMigrations.js`, `PlayerMigrations.js`, `NpcMigrations.js`.
- `item/` — one file per item type (`WeaponMigrations.js`, `SpellMigrations.js`, etc.).
- `ConfirmMigrateWorldDialog.js` — prompt dialog that calls `migrateWorld` on confirm.

**What triggers it — `onceReady` (src/hooks/OnceReady.js)**
Registered with `Hooks.once('ready', onceReady)` in `src/index.js`. On the `ready` hook, if
`game.user.isGM` and `worldNeedsMigration()` returns `true`, the system reads the `titan.migrationMode`
system setting:
- `'automatic'` → calls `migrateWorld()` immediately.
- `'prompt'` → renders a `ConfirmMigrateWorldDialog` which calls `migrateWorld()` on GM confirmation.

**Version comparison — `documentNeedsMigration`**
Each document stores its current schema version in `system.documentVersion` (a numeric field defined in
`TitanDataModel._defineDocumentSchema` using `createNumberField(this.latestVersion)`). The migration check
compares `document.system.documentVersion` against the highest `version` number found across all levels of
that document type's migration chain. If any document in `game.actors` or `game.items` (including embedded
items on actors) is behind the chain's latest version, `worldNeedsMigration()` returns `true`.

**Migration chains**
`ACTOR_MIGRATION_CHAINS` and `ITEM_MIGRATION_CHAINS` in `MigrateWorld.js` map actor/item type strings (e.g.
`'player'`, `'weapon'`) to an ordered array of arrays (levels). For a player actor the chain is
`[actorMigrations, characterMigrations, playerMigrations]`. For each pending version, `migrateDocument`
runs the `migrate(document, updateData)` function from every matching entry across all levels in order
(base → specific), accumulating changes in `updateData`. After all pending versions are applied without
error, it calls `document.update({ 'system.documentVersion': migratedVersion, ...updateData })` in a
single write.

**Adding a migration step**
Add a `{ version: N, migrate(doc, data) { ...; return data; } }` entry to the appropriate migration array
(e.g. `WeaponMigrations.js`). The `version` value must be a decimal number higher than all existing entries
in the same chain level. The `migrate` function receives the live document and the accumulated update
object; it must return the updated object. Entries must be in ascending version order within each level.

---

## Combat & turn flow

**1. Advance — `TitanCombat.nextTurn` (src/document/types/combat/TitanCombat.js)**
`TitanCombat` extends Foundry's `Combat`. `nextTurn()` stores `this.combatant` as `previousCombatant`,
calls `super.nextTurn()` to advance Foundry's turn pointer, then calls
`game.titan.socketManager.triggerSocketHook('combatNextTurn', currentCombatant, previousCombatant, this)`.

**2. Socket broadcast — `SocketManager` (src/helpers/SocketManager.js)**
`triggerSocketHook` immediately fires `Hooks.callAll(id, ...args)` locally, then emits the same message on
the `system.titan` socket so all other connected clients also call `Hooks.callAll`. This ensures every
client processes turn effects, regardless of who clicked the next-turn button.

**3. Hook handler — `onCombatNextTurn` (src/hooks/OnCombatNextTurn.js)**
Registered with `Hooks.on('combatNextTurn', onCombatNextTurn)` in `src/index.js`. The handler:
  a. Computes `isNewRound = currentInitiative > previousInitiative`.
  b. For every character combatant in the combat, calls
     `actor.system.onInitiativeAdvanced(currentInitiative, previousInitiative, isNewRound)` — decrements
     the `remaining` counter on effects whose `duration.type === 'initiative'` and whose
     `duration.initiative` value falls within the applicable filter window; expired effects are
     flagged/removed per settings; a whispered `effectsExpiredReport` chat message is sent to owners if
     anything expired.
  c. Calls `previousCharacter.system.onTurnEnd()` on the combatant leaving their turn — decrements
     duration on `turnEnd`-type effects, calculates Fast Healing / Persistent Damage, updates the actor,
     and sends a whispered `turnEndReport` chat message to owners if there is anything to report.
  d. Calls `currentCharacter.system.onTurnStart()` on the incoming combatant — optionally opens the
     actor's sheet (respecting the GM `autoOpenCharacterSheetsGM` setting), increments duration on
     `turnStart`-type effects, calculates Fast Healing / Resolve Regain, updates the actor, and sends a
     whispered `turnStartReport` chat message.

**4. Turn reports — `_whisperOwners` / `ChatMessage.create`**
All turn reports are created via `CharacterDataModel._whisperOwners(reportData, userId, playSound)`. The
method calls `ChatMessage.create` with `whisper: getOwners(actor)` and `flags: { titan: reportData }`.
The `reportData.type` string (e.g. `'turnStartReport'`, `'turnEndReport'`, `'effectsExpiredReport'`) is
used by `ChatMessageShell.svelte` to select the correct report component from the `chatComponents` map in
`selectComponent()`. Report messages are visible only to document owners plus the GM.

**5. Revert — `TitanCombat.previousTurn` / `onCombatPreviousTurn`**
Each revert handler is the inverse of its forward counterpart (see the turn-start/turn-end steps above).
`previousTurn()` mirrors `nextTurn()` — stores the displaced combatant, calls `super.previousTurn()`, then
emits `'combatPreviousTurn'` via socket. The `onCombatPreviousTurn` hook handler calls:
  - `actor.system.onInitiativeReverted(...)` on every character combatant — increments the `remaining`
    counter on the same effects `onInitiativeAdvanced` decremented.
  - `restoredCharacter.system.onTurnEndReverted()` — increments `turnEnd` effect durations and reverts
    healing/damage computed during `onTurnEnd`; sends a `turnEndRevertReport` chat message.
  - `displacedCharacter.system.onTurnStartReverted()` — increments `turnStart` effect durations and
    reverts Fast Healing, Persistent Damage, and Resolve Regain; sends a `turnStartRevertReport` chat
    message.

**Report chat components** (see `abstractions.md` → Chat messages & reports for the full component list):
All turn reports are whispered to document owners only. Each report component reads from
`$document.flags.titan` and displays the relevant changed resources or effect names. Revert report
components include buttons (`ReportConfirmApplyDamageButton`, `ReportConfirmResolveRegainButton`) allowing
owners to confirm/re-apply the changes, which call the appropriate `actor.system.*` method and update the
chat document flags to reflect the new resource state.
