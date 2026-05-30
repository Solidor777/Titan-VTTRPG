# Effects → TitanActiveEffect Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `effect` Item type with a native `TitanActiveEffect` document (typed `system` data model carrying `rulesElement[]` + TITAN custom duration), migrate existing data, remove the `effect` Item type, and ship an empty native ActiveEffect compendium for reuse.

**Architecture:** A new `TitanActiveEffect extends ActiveEffect` becomes `CONFIG.ActiveEffect.documentClass`; a new `TitanActiveEffectDataModel extends TitanDataModel` registers as the `effect` ActiveEffect subtype. The custom rules-element engine and the custom initiative/turn duration machinery are unchanged — only their *source* changes from `actor.items` (type `effect`) to `actor.effects` (subtype `effect`). Foundry's native AE display (token icons, drag-drop) is used; native `disabled` replaces the custom `active` field. Conditions automatically become instances of the new document class (representational unification only; their mechanics stay in `_applyConditions`).

**Tech Stack:** Foundry VTT v14, pure Svelte 5 (runes) mounted into ApplicationV2, Vite 5. No automated test harness — verification is `npm run build`, `npm run eslint`, `npm run stylelint`, and in-game smoke tests.

**Spec:** `docs/superpowers/specs/2026-05-30-titan-active-effects-conversion-design.md`

---

## Conventions for every task

- **Delegate JS/Svelte work to the `titan-svelte-dev` subagent** (per project `.claude/CLAUDE.md`). It loads the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills and follows the project code-style rules (typed JSDoc, 120-col wrap, etc.).
- **Verification gate for code tasks:** run `npm run build` (must succeed), `npm run eslint` (no new errors), and `npm run stylelint` for any `.svelte` change (no new errors). Then the per-task **in-game smoke test**.
- **In-game testing** uses the dev Foundry world that loads this system; reload (F5) after a build.
- **Commit after each task** with the message shown. Work on the `development` branch.
- Use the `~/` Vite alias for intra-project imports; mirror the field-factory helpers already used (`createStringField`, `createIntegerField`, `createBooleanField`, `createSchemaField`, `createArrayField`, `createObjectField`).

---

## File Structure (created / modified)

**Created**
- `src/document/types/item/rules-element/RulesElementMixin.js` — shared `rulesElement[]` schema + `addRulesElement`/`deleteRulesElement`, applied to any `TitanDataModel` subclass.
- `src/document/types/active-effect/TitanActiveEffect.js` — `ActiveEffect` document subclass (`sendToChat`, `_preCreate` initial-data wiring).
- `src/document/types/active-effect/TitanActiveEffectDataModel.js` — typed `system` data model (`rulesElement[]`, `duration`, `check[]`, `customTrait[]`, computed getters).
- `src/document/types/active-effect/sheet/TitanActiveEffectSheet.js` — AE sheet (extends `TitanDocumentSheet`).
- `src/document/types/active-effect/sheet/ActiveEffectSheetShell.svelte`, `ActiveEffectSheetHeader.svelte`, `ActiveEffectSheetTabs.svelte` — ported from the effect item sheet tree.
- `src/helpers/migration/ConvertEffectItemsToActiveEffects.js` — one-shot converter.
- `packs/effects/` — empty compendium directory (LevelDB pack created by Foundry on first write; the manifest entry is what matters).

**Modified**
- `src/document/types/item/RulesElementItemDataModel.js` — use the new mixin (no behavior change).
- `src/hooks/OnceInit.js` — register AE document class, data model, and sheet; later remove `effect` item registrations.
- `system.json` — add `documentTypes.ActiveEffect.effect`; add the compendium `packs` entry; later remove `documentTypes.Item.effect`.
- `src/document/types/actor/types/character/CharacterDataModel.js` — repoint derived-stat, duration/combat, query, and report paths from `actor.items` (type `effect`) to `actor.effects` (subtype `effect`); `toggleEffectActive` → native `disabled`.
- `src/document/types/actor/types/character/sheet/tabs/CharacterSheetEffectsTab.svelte` — create button + list source.
- `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte` — read/edit AE; toggle `disabled`.
- `src/helpers/migration/MigrateWorld.js` — invoke the converter.
- `.claude/skills/titan-codebase/references/*.md` — reflect the new state.
- `docs/superpowers/BACKLOG.md` — cross-check parked items.

**Removed (Task 11)**
- `src/document/types/item/types/effect/` (EffectDataModel + sheet tree). The item chat-message components (`EffectChatMessage.svelte`, `EffectChatStats.svelte`) move to the AE folder if still used by `sendToChat`.

---

## Task 1: Extract the shared rules-element mixin

**Files:**
- Create: `src/document/types/item/rules-element/RulesElementMixin.js`
- Modify: `src/document/types/item/RulesElementItemDataModel.js`

- [ ] **Step 1: Create the mixin**

```js
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Mixin that adds a Rules Elements array and its mutators to any TitanDataModel subclass.
 * @param {typeof foundry.abstract.TypeDataModel} BaseClass - The data model class to extend.
 * @returns {typeof foundry.abstract.TypeDataModel} The extended class with rules-element support.
 */
export default function RulesElementMixin(BaseClass) {
   return class RulesElementDataModel extends BaseClass {
      /**
       * Adds the Rules Elements array to the document schema.
       * @returns {object} The document schema.
       * @override
       * @protected
       */
      static _defineDocumentSchema() {
         const schema = super._defineDocumentSchema();
         schema.rulesElement = createArrayField(createObjectField());

         return schema;
      }

      /**
       * Adds the Rules Elements to the Roll Data.
       * @returns {object} The Roll Data.
       * @override
       */
      getRollData() {
         const retVal = super.getRollData();
         retVal.rulesElement = structuredClone(this.rulesElement);

         return retVal;
      }

      /**
       * Adds a new Rules Element to this document.
       * @returns {Promise<void>}
       */
      async addRulesElement() {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            /** @type {object} - A new default Flat Modifier rules element. */
            const newElement = createFlatModifierElement();
            this.rulesElement.push(newElement);
            await this.parent.update({
               system: {
                  rulesElement: this.rulesElement,
               },
            });
         }
      }

      /**
       * Removes a Rules Element from this document.
       * @param {number} idx - The index of the Rules Element in the Rules Elements array.
       * @returns {Promise<void>}
       */
      async deleteRulesElement(idx) {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            this.rulesElement.splice(idx, 1);
            await this.parent.update({
               system: {
                  rulesElement: this.parent.system.rulesElement,
               },
            });
         }
      }
   };
}
```

- [ ] **Step 2: Refactor `RulesElementItemDataModel` to use the mixin**

Replace the entire body of `src/document/types/item/RulesElementItemDataModel.js` with:

```js
import TitanItemDataModel from '~/document/types/item/TitanItemDataModel.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';

/**
 * Data model with extra functionality for items that can contain Rules Elements.
 * @extends {TitanItemDataModel}
 */
export default class RulesElementItemDataModel extends RulesElementMixin(TitanItemDataModel) {
}
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run eslint`
Expected: build succeeds; no new eslint errors.

- [ ] **Step 4: In-game smoke test**

Reload the world. Open an Ability item (a `RulesElementItemDataModel` type), add and remove a rules element on its Rules Elements tab. Confirm it still works exactly as before.

- [ ] **Step 5: Commit**

```bash
git add src/document/types/item/rules-element/RulesElementMixin.js src/document/types/item/RulesElementItemDataModel.js
git commit -m "refactor(rules-element): extract shared RulesElementMixin"
```

---

## Task 2: Create `TitanActiveEffectDataModel`

**Files:**
- Create: `src/document/types/active-effect/TitanActiveEffectDataModel.js`

- [ ] **Step 1: Write the data model**

The schema ports the duration fields from `EffectDataModel._defineDocumentSchema` (current lines 64–69), adds `check[]`/`customTrait[]` (mirroring `TitanItemDataModel`), and gains `rulesElement[]` from the mixin. It does **not** define `active` (native `disabled` is used) or `description` (native `ActiveEffect.description` is used). Computed getters port from `EffectDataModel` (`isExpired`, `isCombatEffect`), and `isActive` becomes `!this.parent.disabled`.

```js
import TitanDataModel from '~/document/data-model/TitanDataModel.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import createCustomItemTraitTemplate from '~/document/types/item/CustomItemTrait.js';

/**
 * The typed system data model for Titan Active Effects (subtype 'effect').
 * Carries the Rules Elements, the custom Titan duration, item-check templates, and custom traits.
 * Active/inactive state is the native ActiveEffect.disabled field; the rich description is the native
 * ActiveEffect.description field.
 * @extends {TitanDataModel}
 * @property {TitanActiveEffect} parent - The Active Effect that owns this data model.
 */
export default class TitanActiveEffectDataModel extends RulesElementMixin(TitanDataModel) {
   /**
    * Defines the data schema for Titan Active Effect documents.
    * @returns {object} The document schema.
    * @override
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Duration.
      schema.duration = createSchemaField({
         type: createStringField('turnStart'),
         remaining: createIntegerField(1),
         initiative: createIntegerField(1),
         custom: createStringField(),
      });

      // Checks.
      schema.check = createArrayField(createObjectField(() => createItemCheckTemplate()));

      // Custom Traits.
      schema.customTrait = createArrayField(createObjectField(() => createCustomItemTraitTemplate()));

      return schema;
   }

   /**
    * Whether this effect's duration has expired. Permanent effects never expire.
    * @returns {boolean} Whether this effect's duration has expired.
    */
   get isExpired() {
      return this.duration.type !== 'permanent' && this.duration.remaining <= 0;
   }

   /**
    * Whether this effect is currently active. Permanent effects can be toggled via the native disabled
    * flag; non-permanent effects are always active.
    * @returns {boolean} Whether this effect is currently active.
    */
   get isActive() {
      return !this.parent.disabled || this.duration.type !== 'permanent';
   }

   /**
    * Whether this effect is a Combat Effect. Permanent and custom-duration effects are not Combat Effects.
    * @returns {boolean} Whether this effect is a Combat Effect.
    */
   get isCombatEffect() {
      return this.duration.type !== 'permanent' && this.duration.type !== 'custom';
   }

   /**
    * Captures the owning actor's active-combat initiative onto a new effect, if applicable.
    * Ported from EffectDataModel._getInitialDocumentData.
    * @param {object} data - The initial document data.
    * @returns {object | undefined} Initial data overrides, or undefined if none.
    * @override
    * @protected
    */
   _getInitialDocumentData(data) {
      let retVal = super._getInitialDocumentData(data);

      // The AE's parent is the ActiveEffect; its parent is the owning Actor.
      const actor = this.parent?.parent;
      if (actor && actor.documentName === 'Actor' && !actor.pack && actor.id &&
         typeof data?.system?.duration?.initiative !== 'number') {
         const initiative = actor.getFirstActiveCombat()?.initiative;
         if (initiative !== null && initiative !== undefined) {
            retVal ??= {};
            retVal.system ??= {};
            retVal.system.duration ??= {};
            retVal.system.duration.initiative = initiative;
         }
      }

      return retVal;
   }

   /**
    * Returns the roll data for this effect.
    * @returns {object} The roll data.
    * @override
    */
   getRollData() {
      const retVal = super.getRollData();
      retVal.duration = structuredClone(this.duration);
      retVal.check = structuredClone(this.check);
      retVal.customTrait = structuredClone(this.customTrait);

      return retVal;
   }
}
```

- [ ] **Step 2: Build + lint**

Run: `npm run build && npm run eslint`
Expected: build succeeds; no new eslint errors. (Not yet registered, so no runtime effect.)

- [ ] **Step 3: Commit**

```bash
git add src/document/types/active-effect/TitanActiveEffectDataModel.js
git commit -m "feat(active-effect): add TitanActiveEffectDataModel"
```

---

## Task 3: Create `TitanActiveEffect` document class + register it

**Files:**
- Create: `src/document/types/active-effect/TitanActiveEffect.js`
- Modify: `src/hooks/OnceInit.js`
- Modify: `system.json`

- [ ] **Step 1: Write the document class**

Mirror `TitanItem`'s creation lifecycle so `this.system.onPreCreate(data)` runs (it calls `updateSource` for initial data). Inspect `src/document/types/item/TitanItem.js` `_preCreate` and replicate the same wiring. Port `sendToChat` from `TitanItem.sendToChat` (it packages `getRollData()` into `flags.titan` and calls `ChatMessage.create`; keep the `flags.titan.type = 'effect'` routing).

```js
/**
 * The Titan ActiveEffect document class. Backs both Titan effects (subtype 'effect') and conditions
 * (default subtype + flags.titan.type === 'condition').
 * @extends {ActiveEffect}
 */
export default class TitanActiveEffect extends foundry.documents.ActiveEffect {
   /**
    * Runs the data model's initial-data hook before creation.
    * @param {object} data - The initial creation data.
    * @param {object} options - The creation options.
    * @param {User} user - The requesting user.
    * @returns {Promise<boolean | void>}
    * @override
    * @protected
    */
   async _preCreate(data, options, user) {
      const allowed = await super._preCreate(data, options, user);
      if (allowed === false) {
         return false;
      }

      // Run the data model's initial-data hook for the 'effect' subtype.
      if (typeof this.system?.onPreCreate === 'function') {
         this.system.onPreCreate(data);
      }
   }

   /**
    * Sends this effect to chat. Ported from TitanItem.sendToChat — package getRollData() into
    * flags.titan with type 'effect' and create a ChatMessage. Mirror the exact flag shape used by
    * the existing effect chat-message components so EffectChatMessage.svelte renders unchanged.
    * @returns {Promise<ChatMessage>} The created chat message.
    */
   async sendToChat() {
      // IMPLEMENTER: mirror TitanItem.sendToChat, substituting this AE's getRollData()/name/img and
      // setting flags.titan.type = 'effect'. Verify against the existing item sendToChat shape.
   }
}
```

> IMPLEMENTER NOTE: replace the `sendToChat` placeholder body with the concrete port from `TitanItem.sendToChat`. Acceptance: a `type:'effect'` AE produces a chat card identical to the current effect item's "send to chat" card.

- [ ] **Step 2: Register in `OnceInit.js`**

After the `CONFIG.Item` block and before `CONFIG.ChatMessage` (around current line 80), add:

```js
   // Configure Active Effects.
   CONFIG.ActiveEffect.documentClass = TitanActiveEffect;
   CONFIG.ActiveEffect.dataModels = {
      effect: TitanActiveEffectDataModel,
   };
```

Add imports at the top of `OnceInit.js`:

```js
import TitanActiveEffect from '~/document/types/active-effect/TitanActiveEffect.js';
import TitanActiveEffectDataModel from '~/document/types/active-effect/TitanActiveEffectDataModel.js';
```

Leave `CONFIG.ActiveEffect.legacyTransferral = false` (line 84) as-is.

- [ ] **Step 3: Declare the subtype in `system.json`**

Add an `ActiveEffect` key to `documentTypes` (sibling of `Actor`/`Item`):

```json
   "documentTypes": {
      "Actor": { "player": {}, "npc": {} },
      "ActiveEffect": { "effect": {} },
      "ChatMessage": { "testChat": {} },
      "Item": {
         "ability": {}, "armor": {}, "commodity": {}, "effect": {},
         "equipment": {}, "shield": {}, "spell": {}, "weapon": {}
      }
   },
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run eslint`
Expected: build succeeds; no new errors.

- [ ] **Step 5: In-game smoke test**

Reload. In the console on a test actor:
```js
await actor.createEmbeddedDocuments('ActiveEffect', [{ name: 'Test', type: 'effect' }]);
```
Confirm: the AE is created, `effect.type === 'effect'`, `effect.system.duration` exists with defaults, and opening it shows the default `ActiveEffectConfig` sheet (custom sheet comes in Task 4). Confirm existing conditions still create/toggle normally (Token HUD).

- [ ] **Step 6: Commit**

```bash
git add src/document/types/active-effect/TitanActiveEffect.js src/hooks/OnceInit.js system.json
git commit -m "feat(active-effect): register TitanActiveEffect document + effect subtype"
```

---

## Task 4: Active Effect sheet (Svelte)

**Files:**
- Create: `src/document/types/active-effect/sheet/TitanActiveEffectSheet.js`
- Create: `src/document/types/active-effect/sheet/ActiveEffectSheetShell.svelte`
- Create: `src/document/types/active-effect/sheet/ActiveEffectSheetHeader.svelte`
- Create: `src/document/types/active-effect/sheet/ActiveEffectSheetTabs.svelte`
- Modify: `src/hooks/OnceInit.js`

**Delegate to `titan-svelte-dev`.** Port the existing effect item sheet tree:
`src/document/types/item/types/effect/sheet/{EffectSheet.js,EffectSheetShell.svelte,EffectSheetHeader.svelte,EffectSheetTabs.svelte}`.

- [ ] **Step 1: Sheet class** — `TitanActiveEffectSheet extends TitanDocumentSheet` (the base is document-agnostic: it builds a `ReactiveDocument` bridge and mounts `DocumentSheetShell`). Pass `{ svelte: { props: { shell: ActiveEffectSheetShell } } }` and add class `titan-active-effect-sheet`, mirroring `TitanEffectSheet`. It must also provide the rules-element editing UI state that `TitanItemSheet` currently exposes (`RulesElementItemSheetState`) — reuse that state object (move it somewhere shareable if needed) so the Rules Elements tab works for the AE.

- [ ] **Step 2: Shell/Header/Tabs** — Port the three Svelte components. Changes from the item versions:
  - Bind to the native description via the AE field instead of `system.description` (the Description tab edits `ActiveEffect.description`).
  - Duration header reads/writes `document.data.system.duration.*` (unchanged shape).
  - The active toggle (for permanent effects) writes native `disabled` (see Task 8 for the toggle helper), not `system.active`.
  - Keep the three tabs: Description, Checks, Rules Elements.

- [ ] **Step 3: Register the sheet in `OnceInit.js`** — after the Items sheet registrations:

```js
   foundry.applications.apps.DocumentSheetConfig.registerSheet(
      foundry.documents.ActiveEffect, 'titan', TitanActiveEffectSheet, {
         types: ['effect'],
         makeDefault: true,
         label: localize('defaultEffectSheet'),
      },
   );
```

Add import: `import TitanActiveEffectSheet from '~/document/types/active-effect/sheet/TitanActiveEffectSheet.js';`
(IMPLEMENTER: confirm the exact v14 registration API via the `foundry-applications` skill; the class path is `foundry.applications.apps.DocumentSheetConfig`.)

- [ ] **Step 4: Build + lint** — `npm run build && npm run eslint && npm run stylelint "src/**/*.{css,svelte}"`. No new errors.

- [ ] **Step 5: In-game smoke test** — Reload. Open the `type:'effect'` AE from Task 3. Confirm the custom sheet opens with Description/Checks/Rules Elements tabs and the duration header; edit the description, add a rules element, change the duration type — all persist.

- [ ] **Step 6: Commit**

```bash
git add src/document/types/active-effect/sheet src/hooks/OnceInit.js
git commit -m "feat(active-effect): add Svelte sheet for effect Active Effects"
```

---

## Task 5: Derived-stat rules-element processing reads effects

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (`_applyRulesElements` / `processItemElements`, ≈698–838)

**Delegate to `titan-svelte-dev`.** This task is **additive** — keep the existing item `effect` case so un-migrated worlds keep working until Task 9.

- [ ] **Step 1:** In `_applyRulesElements`, after the loop that processes owned items, add a loop over `this.parent.effects` selecting effects of subtype `effect` that are not disabled, and feed their `system.rulesElement` into the same processing path used today, tagged with type `'effect'`:

```js
// Apply Rules Elements from Active Effects of subtype 'effect'.
for (const effect of this.parent.effects) {
   if (effect.type === 'effect' && !effect.disabled) {
      processElements(structuredClone(effect.system.rulesElement), 'effect');
   }
}
```

> IMPLEMENTER: match the exact name/signature of the inner element-collection function (`processItemElements` clones `item.system.rulesElement` and tags `.type`). Factor the element-array tagging into a small helper if needed so both items and effects share it. Acceptance: a rules element authored on an effect AE modifies the actor's derived stats identically to the same element on an effect item.

- [ ] **Step 2: Build + lint** — `npm run build && npm run eslint`. No new errors.

- [ ] **Step 3: In-game smoke test** — On a test actor, create a `type:'effect'` AE with a `flatModifier` rules element (e.g. +1 body). Confirm the derived attribute increases. Disable the AE (native disabled) → the bonus is removed. Existing effect *items* still apply too.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js
git commit -m "feat(active-effect): apply effect AE rules elements to derived stats"
```

---

## Task 6: Duration / combat machinery reads effects

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`

**Delegate to `titan-svelte-dev`.** Repoint these methods from `this.parent.items` (`item.type === 'effect'`) to `this.parent.effects` (`effect.type === 'effect'`). The algorithms are unchanged; only the source collection, the `.update(...)` target (now the AE), and deletion (`effect.delete()` instead of `deleteItem`) change. Keep `toggleEffectActive` working by toggling the native `disabled` flag.

Methods/getters to repoint (approximate current lines):
- `getExpiredEffectItems` (543) and `getSortedEffectItems` (552)
- `onInitiativeAdvanced` (4838) / `onInitiativeReverted` (5216)
- `onTurnStart` (4929) / `onTurnEnd` (5091) and reverts (5266 / 5315)
- `_decreaseTurnEffectDuration` (5162) / `_increaseTurnEffectDuration` (5188)
- `_processExpiredEffects` (5452): `this.parent.deleteItem(effect.id)` → `effect.delete()`
- `removeCombatEffects` (4665): filter `this.parent.effects` where `effect.type === 'effect' && effect.system.isCombatEffect`
- `requestRemoveExpiredEffects` (4619) / `removeExpiredEffects` (4642)
- `toggleEffectActive` (5920): `effect.update({ disabled: !effect.disabled })` on the AE

> NOTE: the duration mutations write `effect.update({ system: { duration: { remaining } } })` on the AE — identical shape to today. Foundry's native duration registry never tracks these effects (their duration lives in `system`, not native `duration.units`), so there is no expiry conflict.

> ADDITIVE-WINDOW NOTE: leave the equivalent item-effect handling in place for now; un-migrated item effects keep working until Task 9. After migration there are no item effects; Task 11 removes the item code paths.

- [ ] **Step 1:** Make the repoints above.
- [ ] **Step 2: Build + lint** — `npm run build && npm run eslint`. No new errors.
- [ ] **Step 3: In-game smoke test** — On a test actor in combat: create `turnStart`, `turnEnd`, and `initiative` effect AEs with `remaining = 2`. Advance and rewind turns/initiative; confirm `remaining` decrements/increments correctly and expiry fires per the `autoDecreaseEffectDuration` / `autoRemoveExpiredEffects` settings. Short rest removes combat-effect AEs. Toggle a permanent effect AE active/inactive via its row.
- [ ] **Step 4: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js
git commit -m "feat(active-effect): drive duration/combat/expiry from effect AEs"
```

---

## Task 7: Reports + send-to-chat read effects

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (`_getEffectReportData` 5359, `_getTurnEffectReportData` 5380, `_getInitiativeEffectReportData` 5402, `_getCustomEffectReportData` 5425)

**Delegate to `titan-svelte-dev`.**

- [ ] **Step 1:** Repoint the four report-data builders to read from effect AEs: `effect.name`, `effect.img`, native `effect.description` (was `system.description`), and `effect.system.duration.*`. The output POJO shapes are unchanged, so the report Svelte components (`ChatMessageEffectsTags`, turn-start/turn-end/effects-expired shells, remove-expired button/message) need **no** changes.
- [ ] **Step 2:** Confirm `TitanActiveEffect.sendToChat` (Task 3) routes through `OnRenderChatMessageHTML.js` / `ChatMessageShell.svelte` (`flags.titan.type === 'effect'`) and renders via the existing `EffectChatMessage.svelte`. If those components read `system.description`, update them to read the serialized native description from the message flags.
- [ ] **Step 3: Build + lint** — `npm run build && npm run eslint && npm run stylelint "src/**/*.{css,svelte}"`. No new errors.
- [ ] **Step 4: In-game smoke test** — Advance a turn for an actor with active effect AEs; confirm the turn-start/turn-end chat reports list the effects with correct names/descriptions/remaining. Send an effect AE to chat; confirm the card renders.
- [ ] **Step 5: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js src/document/types/chat-message src/document/types/active-effect
git commit -m "feat(active-effect): build turn reports and chat cards from effect AEs"
```

---

## Task 8: Character sheet Effects tab + row

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/tabs/CharacterSheetEffectsTab.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte`

**Delegate to `titan-svelte-dev`.**

- [ ] **Step 1:** In `CharacterSheetEffectsTab.svelte`, change the create button from `document.data.createItemFromType('effect')` to create an effect AE on the actor:

```js
onclick={() => {
   document.data.createEmbeddedDocuments('ActiveEffect', [{
      name: localize('newEffect'),
      type: 'effect',
   }]);
}}
```

Change the list source from owned items to effect AEs: the `CharacterSheetItemList`/filter currently filters `item.type === 'effect'`; point it at the actor's effects collection filtered to `effect.type === 'effect'` (use the existing reactive `document.data` accessor for `effects`). Keep the "Remove Expired Effects" button calling `document.data.system.requestRemoveExpiredEffects()`.

> IMPLEMENTER: verify `ReactiveDocument` exposes the embedded `effects` collection reactively (it already wraps `items`/`effects`; confirm in `src/document/reactive/ReactiveDocument.svelte.js`). If a dedicated list component is needed for AEs, mirror `CharacterSheetItemList`.

- [ ] **Step 2:** In `CharacterSheetEffect.svelte`, read/write the AE: duration edits via `effect.update({ system: { duration: {...} } })`; the active toggle (permanent effects) via `document.data.system.toggleEffectActive(effect.id)` (now flips `disabled`). Add a drag handle (`draggable` + `dragstart` setting `effect.toDragData()`) so effects can be dragged actor→actor.

- [ ] **Step 3: Build + lint** — `npm run build && npm run eslint && npm run stylelint "src/**/*.{css,svelte}"`. No new errors.

- [ ] **Step 4: In-game smoke test** — On the character sheet Effects tab: create a new effect (appears as an AE), edit its duration, toggle a permanent one, delete it. Drag an effect from one actor's sheet onto another actor's sheet (drop handler `TitanActorSheet.js:144–152` already resolves AEs) — confirm a copy is created. Confirm the effect icon shows on the token.

- [ ] **Step 5: Commit**

```bash
git add src/document/types/actor/types/character/sheet
git commit -m "feat(active-effect): manage effects as AEs on the character sheet"
```

---

## Task 9: One-shot migration (effect items → effect AEs)

**Files:**
- Create: `src/helpers/migration/ConvertEffectItemsToActiveEffects.js`
- Modify: `src/helpers/migration/MigrateWorld.js`

**Delegate to `titan-svelte-dev`.** The existing version-chain migration cannot convert document types, so this is a dedicated converter.

- [ ] **Step 1: Write the converter**

```js
import log from '~/helpers/utility-functions/Log.js';

/**
 * Builds the ActiveEffect creation data for a converted effect item.
 * @param {TitanItem} item - The source effect item.
 * @returns {object} The ActiveEffect creation data.
 */
function buildEffectData(item) {
   const system = item.system;

   return {
      name: item.name,
      img: item.img,
      type: 'effect',
      description: system.description ?? '',
      disabled: system.duration?.type === 'permanent' ? !system.active : false,
      showIcon: foundry.documents.ActiveEffect.SHOW_ICON?.ALWAYS ?? 0,
      system: {
         rulesElement: structuredClone(system.rulesElement ?? []),
         duration: structuredClone(system.duration ?? {}),
         check: structuredClone(system.check ?? []),
         customTrait: structuredClone(system.customTrait ?? []),
      },
   };
}

/**
 * Converts every effect Item on an actor to an equivalent effect Active Effect, and removes any
 * stale mirror Active Effects (the old cosmetic shadow AEs, type 'base' with flags.titan.type 'effect').
 * @param {TitanActor} actor - The actor to convert.
 * @returns {Promise<void>}
 */
async function convertActor(actor) {
   // Delete stale mirror AEs (old shadow effects, not the new typed effects).
   const staleIds = actor.effects
      .filter((e) => e.type !== 'effect' && e.flags?.titan?.type === 'effect')
      .map((e) => e.id);
   if (staleIds.length > 0) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', staleIds);
   }

   // Convert effect items.
   const effectItems = actor.items.filter((i) => i.type === 'effect');
   if (effectItems.length === 0) {
      return;
   }
   const createData = effectItems.map(buildEffectData);
   await actor.createEmbeddedDocuments('ActiveEffect', createData);
   await actor.deleteEmbeddedDocuments('Item', effectItems.map((i) => i.id));
}

/**
 * Converts all effect Items in the world (actors + their unlinked token actors) to effect Active Effects.
 * Idempotent: once no effect items remain, it is a no-op.
 * @returns {Promise<void>}
 */
export default async function convertEffectItemsToActiveEffects() {
   if (!game.user.isGM) {
      return;
   }

   log('Converting effect items to Active Effects.');

   for (const actor of game.actors) {
      await convertActor(actor);
   }

   // Unlinked/synthetic token actors on the active scenes.
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (!token.actorLink && token.actor) {
            await convertActor(token.actor);
         }
      }
   }

   log('Effect item conversion complete.');
}
```

> IMPLEMENTER: confirm the `SHOW_ICON.ALWAYS` constant access on `ActiveEffect` (verify in the v14 source — it is on the document class). If unavailable as a static, use the numeric value verified from `common/documents/active-effect.mjs`.

- [ ] **Step 2: Invoke from `migrateWorld`**

In `MigrateWorld.js`, import the converter and call it inside `migrateWorld()` (before the version-chain loops). Also ensure it runs even when no version migration is pending — gate it on the presence of any effect items:

```js
import convertEffectItemsToActiveEffects from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';
```

```js
export async function migrateWorld() {
   if (!game.user.isGM) {
      return;
   }

   // One-shot conversion of legacy effect items to Active Effects.
   await convertEffectItemsToActiveEffects();

   if (!worldNeedsMigration()) {
      return;
   }
   // ... existing version-chain migration ...
}
```

> NOTE: `OnceReady.js` already calls the world-migration entry point; verify it calls `migrateWorld()` (not just `worldNeedsMigration()`), so the converter runs at ready time. Adjust the ready hook if needed so the converter always runs.

- [ ] **Step 3: Build + lint** — `npm run build && npm run eslint`. No new errors.

- [ ] **Step 4: In-game test on a COPY world** — Make a backup copy of a world that has effect items on actors. Load it with this build. Confirm: each effect item becomes an equivalent `type:'effect'` AE (same name/img/rules elements/duration), the derived stats are unchanged, the original items are gone, and no stale mirror AEs remain. Reload again → converter is a no-op (no duplicates).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/migration/ConvertEffectItemsToActiveEffects.js src/helpers/migration/MigrateWorld.js src/hooks/OnceReady.js
git commit -m "feat(migration): convert legacy effect items to Active Effects"
```

---

## Task 10: Known-limitation note — compendium-packed actors

**Files:**
- Modify: `docs/superpowers/specs/2026-05-30-titan-active-effects-conversion-design.md` (already notes this) and `docs/superpowers/BACKLOG.md`

- [ ] **Step 1:** The converter handles world actors and unlinked token actors but not actors inside compendium packs. Add a short BACKLOG note: "Convert effect items inside compendium-packed actors" (re-run the converter over unlocked actor packs). Keep this out of scope for the spec.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/BACKLOG.md
git commit -m "docs(backlog): note compendium-packed actor effect conversion"
```

---

## Task 11: Remove the `effect` Item type

**Files:**
- Delete: `src/document/types/item/types/effect/EffectDataModel.js` and the `sheet/` tree.
- Modify: `src/hooks/OnceInit.js` (remove effect item import, dataModel entry, sheet registration).
- Modify: `system.json` (remove `documentTypes.Item.effect`).
- Modify: `src/hooks/OnHotbarDrop.js` (remove the `case 'effect'` block, ≈70–79).
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (remove the now-dead item `effect` branches added/kept in Tasks 5–6).
- Modify/move: `src/document/types/item/types/effect/chat-message/` components if still used by `sendToChat` — move them under `src/document/types/active-effect/chat-message/` and fix imports; otherwise delete.
- Modify: `src/helpers/migration/item/EffectMigrations.js` + `MigrateWorld.js` `ITEM_MIGRATION_CHAINS.effect` — remove the `effect` item migration chain entry (the item type no longer exists).

**Delegate to `titan-svelte-dev`.** Do this only after Task 9 is verified, so no live world still depends on effect items.

- [ ] **Step 1:** Remove the item `effect` registrations/imports in `OnceInit.js` (lines 8, 25, 73, 124–130).
- [ ] **Step 2:** Remove `documentTypes.Item.effect` from `system.json`.
- [ ] **Step 3:** Remove the dead item `effect` branches in `CharacterDataModel` left from the additive Tasks 5–6 (the rules-element item `case 'effect'` and any item-based duration/query/report fallbacks). The AE paths are now the only paths.
- [ ] **Step 4:** Remove the hotbar `effect` case; move/delete the effect chat-message components; remove the `effect` entry from `ITEM_MIGRATION_CHAINS` and delete `EffectMigrations.js` import if unused.
- [ ] **Step 5:** Delete `src/document/types/item/types/effect/` (minus any moved chat-message components).
- [ ] **Step 6: Build + lint** — `npm run build && npm run eslint && npm run stylelint "src/**/*.{css,svelte}"`. Grep for stragglers: `rg "types/effect|'effect'|EffectDataModel|TitanEffectSheet" src` and resolve any referencing the *item* type (effect AEs legitimately use `'effect'` as the AE subtype — keep those).
- [ ] **Step 7: In-game smoke test** — Reload a converted world. Effects work end-to-end as AEs (create/edit/duration/combat/reports/drag/token icon). Creating a new Item shows no "effect" type. Conditions still work.
- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(effect): remove the effect Item type (now Active Effects only)"
```

---

## Task 12: Compendium pack for reusable effects

**Files:**
- Modify: `system.json` (add `packs`)
- Create: `packs/effects/` (Foundry creates the LevelDB on first write)

- [ ] **Step 1:** Add a top-level `packs` array to `system.json`:

```json
   "packs": [
      {
         "name": "effects",
         "label": "TITAN Effects",
         "path": "packs/effects",
         "type": "ActiveEffect",
         "system": "titan",
         "ownership": { "PLAYER": "OBSERVER", "ASSISTANT": "OWNER" }
      }
   ],
```

- [ ] **Step 2: Build** — `npm run build`. Reload Foundry.
- [ ] **Step 3: In-game smoke test** — Confirm a "TITAN Effects" compendium of type Active Effect appears under the Compendium sidebar tab. Unlock it, drag an effect AE from an actor into the pack, then drag it from the pack onto a different actor — confirm a working effect is created.
- [ ] **Step 4: Commit**

```bash
git add system.json packs/.gitkeep
git commit -m "feat(active-effect): add empty TITAN Effects compendium pack"
```

---

## Task 13: Update the `titan-codebase` skill + backlog

**Files:**
- Modify: `.claude/skills/titan-codebase/references/abstractions.md`, `architecture.md`, `data-flow.md`, `conventions.md` (as applicable)
- Modify: `docs/superpowers/BACKLOG.md`

**Delegate to `titan-svelte-dev`** (it knows the codebase-skill currency rule).

- [ ] **Step 1:** Update the skill to describe the new state ("what is", not a changelog):
  - ActiveEffect now has a Titan document class (`TitanActiveEffect`) + typed data model (`TitanActiveEffectDataModel`, subtype `effect`) carrying `rulesElement[]` + custom duration; conditions are instances of the same document class.
  - The `effect` Item type and its mirror-AE/`ActionQueue` sync are gone.
  - `RulesElementMixin` is the shared rules-element schema (used by item rules-element models and the AE model).
  - Derived stats, duration/combat, reports, and the character Effects tab read `actor.effects` (subtype `effect`).
  - `system.json` declares `documentTypes.ActiveEffect.effect` and the `effects` compendium pack.
- [ ] **Step 2:** Update `BACKLOG.md`: confirm condition-conversion still parked; custom sidebar tab + native VAE panel listed; add the compendium-packed-actor conversion note (Task 10).
- [ ] **Step 3: Commit**

```bash
git add .claude/skills/titan-codebase docs/superpowers/BACKLOG.md
git commit -m "docs(skill): update titan-codebase for Active Effects conversion"
```

---

## Self-Review (completed)

- **Spec coverage:** documents/data model (T2/T3), shared rules-element schema (T1), `disabled` over `active` (T2/T6/T8), `showIcon=ALWAYS` (T9 create data; new-effect creation sets it via the data model default — IMPLEMENTER ensure new AEs created on the sheet also set `showIcon` ALWAYS, e.g. in `_preCreate`), derived stats (T5), duration/combat (T6), reports + sendToChat (T7), sheet (T4), character tab + drag (T8), migration (T9), item-type removal (T11), compendium (T12), VAE flag kept (note: T7/T4 — IMPLEMENTER keep setting `flags['visual-active-effects.data.content']` on effect AEs as the item code did), skill upkeep (T13). Conditions remain representational-only (unchanged mechanics).
- **Placeholder scan:** Two intentional IMPLEMENTER notes remain where exact Foundry API/port shape must be confirmed against the live source via the foundry skills (`sendToChat` port in T3; sheet registration API in T4). These are flagged, not silent gaps.
- **Type/name consistency:** `TitanActiveEffect`, `TitanActiveEffectDataModel`, `TitanActiveEffectSheet`, `RulesElementMixin`, subtype string `'effect'`, and `effect.system.duration.{type,remaining,initiative,custom}` are used consistently across tasks.

> FOLLOW-UP for IMPLEMENTER: ensure new effect AEs always get `showIcon = ALWAYS` and the kept `visual-active-effects` description flag — wire both in `TitanActiveEffect._preCreate` (or the data model initial-data) so every creation path (sheet button, drag, migration) is covered, not just migration.
