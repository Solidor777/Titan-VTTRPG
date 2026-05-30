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
`AttributeCheckDialog` extends `TitanDialog` (a `foundry.applications.api.ApplicationV2`); it passes
`content: { class: CheckDialogShell, props: { shell, actor, checkOptions: writable(...),
checkParameters: writable(...) } }`. On first render `TitanDialog._replaceHTML` mounts `CheckDialogShell`
with Svelte 5 `mount()`. `CheckDialogShell` sets the two stores into Svelte context and delegates rendering
to the type-specific shell (`AttributeCheckDialogShell`). The inner shell recomputes the displayed totals
from `actor.system.getAttributeCheckParameters($checkOptions)` whenever the options change. When the Roll
button fires, the inner shell calls `actor.system.rollAttributeCheck($checkOptions)` directly on the actor's
data model, and the dialog closes.

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
Foundry fires `renderChatMessageHTML` (v13+) after inserting the message HTML. The hook checks
`message.flags.titan.type` against the frozen `TITAN_CHAT_MESSAGE_TYPES` set; if it matches, it builds a
`new ReactiveDocument(message)` bridge and mounts `ChatMessageShell.svelte`
(src/document/types/chat-message/ChatMessageShell.svelte) into the `.message-content` element via Svelte 5
`mount()`, passing the bridge as the `documentStore` prop (a name retained from the old API — it is the
`ReactiveDocument` bridge, not a Svelte store). The mount handle and bridge are stored on
`message._svelteComponent = { handle, bridge }` for teardown in `OnPreDeleteChatMessage.js`. The shell sets
the bridge into context as `'document'` and `selectComponent()` looks up the correct component for the type
(e.g. `AttributeCheckChatMessage`), which is then rendered via `{@const}` (not `<svelte:component>`).

**7. Check chat component — e.g. `AttributeCheckChatMessage.svelte`**
(src/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte)
Reads `document.data.flags.titan.results` and `document.data.flags.titan.parameters` from the `document`
context bridge. Composes the
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
`TitanDocumentSheet` extends Foundry v14 `DocumentSheetV2`. Its constructor calls
`super(foundry.utils.mergeObject(options, { document: sheetDocument }))` (DocumentSheetV2 exposes the
document via the read-only `this.document` getter), then builds `this.#bridge = new ReactiveDocument(
sheetDocument)` and `this.applicationState = this._createReactiveState()`. The inner shell component is
supplied by the per-type subclass on `this.options.svelte.props.shell` (a plain ApplicationV2 options object —
the `svelte` key is a naming holdover, not TyphonJS middleware).

Subclass constructors extend this chain:
`TitanPlayerSheet` → `TitanCharacterSheet` → `TitanActorSheet` → `TitanDocumentSheet`.
`TitanPlayerSheet` sets `props.shell = PlayerSheetShell` so `DocumentSheetShell` knows which inner
component to render.

**2. Reactive UI state — `CharacterSheetState` (src/document/types/actor/types/character/sheet/
CharacterSheetState.js)**
`TitanCharacterSheet._createReactiveState()` calls `createCharacterSheetState(actor)`, which returns a
plain Svelte `writable` store augmented with `postAddItem` / `preDeleteItem` methods (still a store, not a
rune). It is passed into the Svelte tree as the `applicationState` prop and made available to all children
via `setContext('applicationState', applicationState)` inside `DocumentSheetShell.svelte`.

**3. Mount — `_replaceHTML` → `DocumentSheetShell.svelte`**
On first render (`options.isFirstRender`), `TitanDocumentSheet._replaceHTML` calls Svelte 5 `mount(
DocumentSheetShell, { target: content, props: { document: this.#bridge, applicationState, shell } })` and
stores the handle. Subsequent ApplicationV2 renders do not re-mount the Svelte tree — reactivity is driven by the
`ReactiveDocument` bridge, not the render cycle. `DocumentSheetShell` sets `document` (the bridge) and
`applicationState` into context, then renders the shell via `{#if shell}{@const Shell = shell}<Shell />{/if}`.

**4. Sheet body — e.g. `CharacterSheetBase.svelte`**
Reads the bridge with `const document = getContext('document')`, gates rendering behind
`{#if document.data}`, and composes the sidebar and body (`CharacterSheetSidebar`, `CharacterSheetTabs`).
Sub-components likewise call `getContext` and read `document.data.*`.

**5. ReactiveDocument reactivity**
`ReactiveDocument.data` registers a `createSubscriber()` reader and returns the live Foundry document. Any
Foundry update (`document.data.update(...)`) — or an embedded item/effect CRUD operation — fires the hooks
the subscriber registered (`update<DocumentName>`, `create/update/deleteItem`,
`create/update/deleteActiveEffect`), invalidating every reactive reader so `document.data.*` references and
`$derived` blocks re-run and the UI re-renders. Hooks tear down automatically when the sheet unmounts.

**6. Teardown — `_onClose`**
`TitanDocumentSheet._onClose` calls `super._onClose(options)`, `unmount(this.#mountHandle, { outro: true })`,
and `this.#bridge?.destroy()` (a no-op — the subscriber already removed its hooks on unmount).

**7. User edits flowing back to the document — two patterns**

*Document-bound inputs* (src/document/svelte-components/input/):
Components like `DocumentIntegerInput.svelte` and `DocumentBoundEditorInput.svelte` use `bind:value` to
mirror the `document.data.system.*` field, then call `refreshSystemDocument(document.data, disabled)`
(src/helpers/utility-functions/RefreshSystemDocumentData.js) on `change` / `keyup`. That helper guards on
`!disabled && document?.isOwner`, then runs
`document.update({ system: structuredClone(document.system), flags: structuredClone(document.flags) })`,
writing the entire mutated system blob back to Foundry in one call.

*Direct document.update calls* (e.g. `CharacterSheetCommodity.svelte`, `CharacterSheetEffect.svelte`):
Some sheet rows hold a local reference to an embedded document and call
`doc.update({ system: { fieldName: newValue } })` directly on `change`, bypassing the snapshot helper.
`CharacterSheetCommodity` holds a `TitanItem`; `CharacterSheetEffect` holds an effect-subtype
`TitanActiveEffect` and writes its duration via `effect.update(...)`.

---

## Migration system

**Where it lives:** `src/helpers/migration/`
- `MigrateWorld.js` — orchestration functions `worldNeedsMigration()` and `migrateWorld()`.
- `actor/` — `ActorMigrations.js`, `CharacterMigrations.js`, `PlayerMigrations.js`, `NpcMigrations.js`.
- `item/` — one file per item type (`WeaponMigrations.js`, `SpellMigrations.js`, etc.).
- `ConfirmMigrateWorldDialog.js` — prompt dialog that calls `migrateWorld` on confirm.
- `ConvertEffectItemsToActiveEffects.js` — one-shot, idempotent converter that turns legacy `effect`-type Items into
  native `effect`-subtype Active Effects. It is fully decoupled from `migrateWorld()` (which is purely the
  version-chain migrator) and is awaited directly from `onceReady` for the GM, unconditionally, before the
  version-chain step.

**What triggers it — `onceReady` (src/hooks/OnceReady.js)**
Registered with `Hooks.once('ready', onceReady)` in `src/index.js`. On the `ready` hook, for the GM only:
1. It first `await`s `convertEffectItemsToActiveEffects()` unconditionally — the one-shot effect converter always
   runs on load, independent of migration mode and the version chain (the converter self-guards on GM and is
   idempotent).
2. It then reads the `titan.migrationMode` system setting and gates only the version chain:
   - `'prompt'` mode AND `worldNeedsMigration()` is `true` → renders a `ConfirmMigrateWorldDialog` which calls
     `migrateWorld()` on GM confirmation (deferring the version chain to the prompt).
   - Otherwise (`'automatic'` mode, or `'prompt'` with no pending version migration) → awaits `migrateWorld()`
     directly.

**Effect Item → Active Effect conversion — `convertEffectItemsToActiveEffects`**
GM-only. Iterates `game.actors` and the actors of unlinked tokens across `game.scenes`, calling `convertActor` on
each. For each `effect`-type Item, `convertActor` builds AE creation data via `buildEffectData` (native
`name`/`img`/`description`, `disabled` mapped as `duration.type === 'permanent' ? !active : false`, deep-cloned
`system.rulesElement`/`duration`/`check`/`customTrait`); it creates the replacement AEs first, then batch-deletes the
source Items, then batch-deletes any stale cosmetic "mirror" AEs (base subtype, `flags.titan.type === 'effect'`) last
(create-before-delete, so no effect data is lost if creation fails). The migrated `duration.initiative` is carried
through, so `TitanActiveEffect._preCreate` does not override combat initiative.
`buildEffectData` does NOT set `showIcon` or the Visual Active Effects flag — `_preCreate` seeds those. Each actor's
conversion is wrapped in its own try/catch (`convertActorIsolated`), so a failure on one actor is logged and the
remaining actors still process. Idempotent once no `effect` Items remain. Compendium-packed actors are NOT converted.

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
`document.data.flags.titan` and displays the relevant changed resources or effect names. Revert report
components include buttons (`ReportConfirmApplyDamageButton`, `ReportConfirmResolveRegainButton`) allowing
owners to confirm/re-apply the changes, which call the appropriate `actor.system.*` method and update the
chat document flags to reflect the new resource state.
