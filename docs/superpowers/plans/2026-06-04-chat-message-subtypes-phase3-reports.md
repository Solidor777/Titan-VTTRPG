# Chat Message Subtypes — Phase 3 (Reports) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Route all `.js`/`.svelte` work through the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, `foundry-svelte` skills loaded (per project CLAUDE.md).

**Goal:** Convert the 13 TITAN "report" chat messages from `flags.titan` payloads into first-class Foundry v14 `ChatMessage` subtypes with typed `system` payloads that self-render, mirroring the Phase 2 item-card conversion.

**Architecture:** A thin `ReportChatMessageDataModel` family base (extends the existing `TitanChatMessageDataModel`, which owns `renderHTML`/mount/teardown and the `get component()` contract) with 13 leaf DataModels. Each leaf builds its typed `system` schema from a co-located zero-value shape factory via the existing `buildSchemaFromShape` helper. All 13 builders funnel through `CharacterDataModel._whisperOwners`, so the `flags.titan` → `{ type, system }` cutover is a single producer change; report Svelte components are swept `document.data.flags.titan.X` → `document.data.system.X`.

**Tech Stack:** Foundry VTT v14 (`ChatMessage` subtypes, `DataModel`, `CONFIG.ChatMessage.dataModels`, manifest `documentTypes`), pure Svelte 5 (runes) mounted into ApplicationV2, Vite 8 build to repo root, Vitest (unit) + Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-06-04-chat-message-subtypes-phase3-reports-design.md`

---

## Typing rules (apply uniformly across all leaf shapes)

These rules preserve exact render parity (components use `{#if X}` presence guards) and are derived from `src/helpers/utility-functions/BuildSchemaFromShape.js`:

1. **Always-present scalars → typed, seeded with a zero value.** `number → 0` (becomes integer-enforced `NumberField`), `boolean → false`, `string → ''`. Presence guards like `if (damageTaken)` stay correct because `0`/`false`/`''` are falsy, exactly as "absent" was.
2. **Conditionally-present OBJECT compounds → `null` in the shape** → `buildSchemaFromShape` yields a nullable `ObjectField(null)` (initial `null`). This keeps `if (wounds)` / `if (tags)` / `if (fastHealing)` guards correct (a typed non-null `SchemaField` would have a truthy `{...}` initial and always pass the guard — a parity break). The component still reads sub-fields (`wounds.value`, `fastHealing.total`, `fastHealing.equipment`) off the opaque object.
3. **Conditionally-present ARRAY compounds (`message`, `conditions`) → explicit `ArrayField`, NOT a shape entry.** Foundry's `ObjectField` rejects arrays (`foundry.utils.getType([]) === 'Array'`), so a `null`-in-shape `ObjectField` cannot hold them. Define these as real `ArrayField`s on the leaf schema (after the `buildSchemaFromShape` spread) with `initial: []`, and change their push-guard from `if (X)` to `if (X?.length)` during the sweep (empty array = absent).
4. **`actorName` / `actorImg` come from the family base**, never from a leaf shape.

Helper signatures (already in the codebase, confirm before use):
- `createStringField(initial)` → `StringField`
- `createNumberField(initial)` / `createIntegerField(initial)` → numeric field
- `createBooleanField(initial)` → `BooleanField`
- `createObjectField(initial)` → `ObjectField` (`createObjectField(null)` = nullable, initial `null`)
- `createArrayField(elementField, initial)` → `ArrayField`
- `buildSchemaFromShape(shape)` → field map

---

## File Structure

**New DataModels** (colocated with their components under `src/document/types/chat-message/report/`):
- `report/ReportChatMessageDataModel.js` — family base (`actorName`, `actorImg`).
- `report/types/<name>/<T>ReportChatMessageDataModel.js` — 13 leaves.
- `report/types/<name>/<T>ReportShape.js` — 13 colocated shape factories (single source for schema + golden master).

**New tests:**
- `tests/unit/ReportChatMessageSchemaEquivalence.test.js` — byte-exact golden master of all 13 report schemas.
- `tests/unit/report/<T>ReportChatMessageDataModel.test.js` — per-leaf `get component()` + `renderHTML()` smoke (optional, grouped).
- `tests/e2e/report-cards.spec.js` — per-report render + revert regression + apply-confirm flow.

**Modified:**
- `src/hooks/OnceInit.js` — import + register 13 report DataModels.
- `system.json` — 13 `documentTypes.ChatMessage` keys.
- `lang/en.json` — 13 `TYPES.ChatMessage` labels.
- `src/hooks/OnRenderChatMessageHTML.js` — trim 11 report keys (leave `effect`).
- `src/document/types/actor/types/character/CharacterDataModel.js` — `_whisperOwners` split (one method).
- Report Svelte components (sweep) — `report/types/**`, `report/components/ReportChatMessageBase.svelte` + `ReportChatMessageHeader.svelte`, `chat-message/components/resources/{ChatMessageStamina,ChatMessageWounds,ChatMessageResolve,ChatMessageArmor,ChatMessageRichTextMessages}.svelte`, `chat-message/components/buttons/ChatMessageApply{FastHealing,PersistentDamage,ResolveRegain}Button.svelte`.

**Deleted (confirmed dead — never imported):**
- `report/components/ReportConfirmApplyDamageButton.svelte`
- `report/components/ReportConfirmResolveRegainButton.svelte`
- `report/components/ReportHeader.svelte`

---

## Per-report shape factories (reference data for the leaf tasks)

`actorName`/`actorImg` are inherited from the base and are NOT in these shapes. Arrays (`message`, `conditions`) are added as explicit `ArrayField`s in the leaf DataModel, noted per report. Producer field sources cited as `CharacterDataModel.js` line numbers.

| # | Subtype key | `create<T>ReportShape()` returns | Explicit array fields |
|---|---|---|---|
| 1 | `damageReport` | `{ damageTaken: 0, damageResisted: 0, staminaLost: 0, woundsSuffered: 0, ignoredArmor: false, stamina: null, wounds: null, tags: null }` | — |
| 2 | `healingReport` | `{ staminaRestored: 0, stamina: null, wounds: null }` | — |
| 3 | `spendResolveReport` | `{ resolveSpent: 0, resolveShortage: 0, resolve: null }` | — |
| 4 | `rendReport` | `{ armorImg: '', armorName: '', armorLost: 0, armor: null }` | — |
| 5 | `repairsReport` | `{ armorImg: '', armorName: '', armorRepaired: 0, armor: null }` | — |
| 6 | `removeCombatEffectsReport` | `{}` | — |
| 7 | `shortRestReport` | `{}` | — |
| 8 | `longRestReport` | `{ woundsHealed: 0, wounds: null }` | — |
| 9 | `turnStartReport` | `{ expiredEffectsRemoved: false, effects: null, fastHealing: null, persistentDamage: null, resolveRegain: null, stamina: null, wounds: null, resolve: null }` | `message`, `conditions` |
| 10 | `turnEndReport` | `{ expiredEffectsRemoved: false, effects: null, fastHealing: null, persistentDamage: null, stamina: null, wounds: null }` | `message` |
| 11 | `turnStartRevertReport` | `{ fastHealingRevert: null, persistentDamageRevert: null, resolveRegainRevert: null, stamina: null, wounds: null, resolve: null }` | — |
| 12 | `turnEndRevertReport` | `{ fastHealingRevert: null, persistentDamageRevert: null, stamina: null, wounds: null }` | — |
| 13 | `effectsExpiredReport` | `{ expiredEffectsRemoved: false, effects: null }` | — |

**`message` element type:** the producer assigns `reportData.message = structuredClone(rulesElementsCache.turnMessage.<selector>)` (CharacterDataModel.js:5103, 5221) and `ChatMessageRichTextMessages.svelte` does `{#each ...message as message}` rendering each entry as rich text. The leaf task MUST read the cache value to confirm whether entries are strings or objects, then define `message` as `createArrayField(createStringField(), [])` (strings) or `createArrayField(createObjectField(), [])` (objects). Default to `createStringField()` unless the cache shows objects.

**`conditions` element:** `{ label, img, description }` objects (CharacterDataModel.js:5153-5159) → `createArrayField(createObjectField(), [])`.

---

## Task 1: Report family base + golden-master harness

**Files:**
- Create: `src/document/types/chat-message/report/ReportChatMessageDataModel.js`
- Create: `tests/unit/ReportChatMessageSchemaEquivalence.test.js`
- Reference: `src/document/types/item/chat-message/ItemChatMessageDataModel.js` (Phase 2 family base), `src/document/types/chat-message/ChatMessageDataModel.js` (universal base), `tests/unit/ItemDataModelSchemaEquivalence.test.js` (golden-master pattern).

- [ ] **Step 1: Read the references.** Open `ItemChatMessageDataModel.js`, `ChatMessageDataModel.js`, and `ItemDataModelSchemaEquivalence.test.js` to match the exact `_defineDocumentSchema` convention, the `createStringField` import path, and the golden-master assertion style.

- [ ] **Step 2: Write the family base.**

```js
// src/document/types/chat-message/report/ReportChatMessageDataModel.js
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Shared base data model for every TITAN report chat message (damage, healing, rest, turn-start/end,
 * etc.). Holds the fields common to all reports; concrete report subtypes extend this and add their own
 * typed system fields built from a co-located shape factory.
 * @augments TitanChatMessageDataModel
 */
export default class ReportChatMessageDataModel extends TitanChatMessageDataModel {

   /**
    * Defines the schema fields shared by all report chat messages.
    * @returns {object} The schema field map for the report family base.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),

         // The display name of the actor the report concerns.
         actorName: createStringField(''),

         // The display image of the actor the report concerns.
         actorImg: createStringField(''),
      };
   }
}
```

- [ ] **Step 3: Write the golden-master harness.** A data-driven test that, for each registered report leaf, instantiates `CONFIG.ChatMessage.dataModels[key].schema` and asserts the field map matches a hand-authored expectation (field constructor name + nullability). Start with an empty `EXPECTED` map and a guard that every key in `EXPECTED` is registered; each later task adds its entry.

```js
// tests/unit/ReportChatMessageSchemaEquivalence.test.js
import { describe, it, expect } from 'vitest';
import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';

/**
 * Hand-authored expectation of each report leaf's schema. For each subtype key, maps every top-level
 * system field to a descriptor: { type: <constructor name>, nullable?: boolean }. Authored by reading
 * the producer + shape factory (NOT derived from the schema, to avoid circularity). Leaf tasks append.
 * @type {Record<string, Record<string, {type: string, nullable?: boolean}>>}
 */
const EXPECTED = {
   // Populated by Tasks 2a-2e. Base fields actorName/actorImg are asserted via the base below.
};

describe('Report chat-message schema equivalence (golden master)', () => {
   it('the family base defines actorName and actorImg as StringFields', () => {
      const schema = new ReportChatMessageDataModel({}, { strict: false }).schema;
      expect(schema.fields.actorName.constructor.name).toBe('StringField');
      expect(schema.fields.actorImg.constructor.name).toBe('StringField');
   });

   for (const [key, fields] of Object.entries(EXPECTED)) {
      it(`${key} schema matches the golden master`, () => {
         const schema = new CONFIG.ChatMessage.dataModels[key]({}, { strict: false }).schema;
         // Every expected field exists with the expected type + nullability.
         for (const [name, descriptor] of Object.entries(fields)) {
            const field = schema.fields[name];
            expect(field, `missing field ${name}`).toBeTruthy();
            expect(field.constructor.name, `${key}.${name} type`).toBe(descriptor.type);
            if (descriptor.nullable !== undefined) {
               expect(Boolean(field.options?.nullable ?? field.nullable), `${key}.${name} nullable`)
                  .toBe(descriptor.nullable);
            }
         }
         // No unexpected extra system fields (excluding the base actorName/actorImg/documentVersion).
         const ignore = new Set(['actorName', 'actorImg', 'documentVersion']);
         const extra = Object.keys(schema.fields).filter((f) => !ignore.has(f) && !(f in fields));
         expect(extra, `unexpected extra fields on ${key}`).toEqual([]);
      });
   }
});
```

> NOTE: confirm `CONFIG.ChatMessage.dataModels` is available in the unit-test environment. If the unit env does not boot Foundry config, import each leaf DataModel directly instead of via `CONFIG` (mirror whatever `ItemDataModelSchemaEquivalence.test.js` does — match that harness exactly).

- [ ] **Step 4: Run the unit test.**

Run: `npm run test:unit -- ReportChatMessageSchemaEquivalence`
Expected: PASS (base-only assertion green; `EXPECTED` empty so the loop is a no-op).

- [ ] **Step 5: Build to verify no import errors.**

Run: `npm run build`
Expected: build succeeds; no new shipping dynamic imports (the base is statically imported only in tests so far).

- [ ] **Step 6: Commit.**

```bash
git add src/document/types/chat-message/report/ReportChatMessageDataModel.js tests/unit/ReportChatMessageSchemaEquivalence.test.js
git commit -m "feat(chat): report chat-message family base + schema golden-master harness"
```

---

## Task 2a: Flat resource report leaves (damage, healing, spendResolve, longRest)

Create four leaves. Each follows the identical shape: a `*Shape.js` factory + a `*ReportChatMessageDataModel.js` that spreads the base schema and the shape, plus a `get component()` returning the existing `.svelte`. Register all four and add their golden-master entries. **They are inert this task** — the producer still emits `flags.titan` and the legacy hook still renders them, so render is unaffected; only the unit golden master exercises the new schemas.

**Files (damage example; repeat the structure for healing/spendResolve/longRest with their shapes from the table):**
- Create: `src/document/types/chat-message/report/types/damage/DamageReportShape.js`
- Create: `src/document/types/chat-message/report/types/damage/DamageReportChatMessageDataModel.js`
- Modify: `src/hooks/OnceInit.js`, `system.json`, `lang/en.json`
- Modify: `tests/unit/ReportChatMessageSchemaEquivalence.test.js`

- [ ] **Step 1: Write the damage shape factory.**

```js
// src/document/types/chat-message/report/types/damage/DamageReportShape.js
/**
 * Builds the canonical zero-value shape of a damage report's system payload. Single source feeding both
 * the DamageReportChatMessageDataModel schema and the schema golden-master test. Conditionally-present
 * objects are null (yielding nullable ObjectFields so the card's presence guards stay correct).
 * @returns {object} The damage report system shape.
 */
export default function createDamageReportShape() {
   return {
      damageTaken: 0,
      damageResisted: 0,
      staminaLost: 0,
      woundsSuffered: 0,
      ignoredArmor: false,
      stamina: null,
      wounds: null,
      tags: null,
   };
}
```

- [ ] **Step 2: Write the damage leaf DataModel.**

```js
// src/document/types/chat-message/report/types/damage/DamageReportChatMessageDataModel.js
import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createDamageReportShape from '~/document/types/chat-message/report/types/damage/DamageReportShape.js';
import DamageReportChatMessage
   from '~/document/types/chat-message/report/types/damage/DamageReportChatMessageShell.svelte';

/**
 * Data model for the damage report chat message.
 * @augments ReportChatMessageDataModel
 */
export default class DamageReportChatMessageDataModel extends ReportChatMessageDataModel {

   /**
    * Defines the typed system schema for a damage report, built from the shared shape factory.
    * @returns {object} The damage report schema field map.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createDamageReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message.
    * @returns {object} The damage report chat-message Svelte component.
    */
   get component() {
      return DamageReportChatMessage;
   }
}
```

- [ ] **Step 3: Create the healing, spendResolve, and longRest leaves the same way**, using `createHealingReportShape`/`createSpendResolveReportShape`/`createLongRestReportShape` (shapes from the table) and their existing components (`HealingReportChatMessageShell.svelte`, `SpendResolveReportChatMessageShell.svelte`, `LongRestReportChatMessage.svelte`). Each shape factory and DataModel is its own complete file mirroring Steps 1-2 — write them out in full, do not abbreviate.

- [ ] **Step 4: Register the four leaves in `OnceInit.js`.** Add imports next to the item DataModel imports (after line ~44) and the four keys to `CONFIG.ChatMessage.dataModels` (after the item keys, line ~117):

```js
// imports
import DamageReportChatMessageDataModel from '~/document/types/chat-message/report/types/damage/DamageReportChatMessageDataModel.js';
import HealingReportChatMessageDataModel from '~/document/types/chat-message/report/types/healing/HealingReportChatMessageDataModel.js';
import SpendResolveReportChatMessageDataModel from '~/document/types/chat-message/report/types/spend-resolve/SpendResolveReportChatMessageDataModel.js';
import LongRestReportChatMessageDataModel from '~/document/types/chat-message/report/types/long-rest/LongRestReportChatMessageDataModel.js';

// CONFIG.ChatMessage.dataModels = { ...existing,
   damageReport: DamageReportChatMessageDataModel,
   healingReport: HealingReportChatMessageDataModel,
   spendResolveReport: SpendResolveReportChatMessageDataModel,
   longRestReport: LongRestReportChatMessageDataModel,
// };
```

- [ ] **Step 5: Register the four keys in `system.json`** under `documentTypes.ChatMessage` (empty objects):

```json
"damageReport": {},
"healingReport": {},
"spendResolveReport": {},
"longRestReport": {}
```

- [ ] **Step 6: Add the four labels to `lang/en.json`** under `TYPES.ChatMessage`:

```json
"damageReport": "Damage Report",
"healingReport": "Healing Report",
"spendResolveReport": "Spend Resolve Report",
"longRestReport": "Long Rest Report"
```

- [ ] **Step 7: Add golden-master entries** for the four leaves to `EXPECTED` in `ReportChatMessageSchemaEquivalence.test.js`. Hand-author from the shapes (NOT from the schema):

```js
damageReport: {
   damageTaken: { type: 'NumberField' }, damageResisted: { type: 'NumberField' },
   staminaLost: { type: 'NumberField' }, woundsSuffered: { type: 'NumberField' },
   ignoredArmor: { type: 'BooleanField' },
   stamina: { type: 'ObjectField', nullable: true }, wounds: { type: 'ObjectField', nullable: true },
   tags: { type: 'ObjectField', nullable: true },
},
healingReport: {
   staminaRestored: { type: 'NumberField' },
   stamina: { type: 'ObjectField', nullable: true }, wounds: { type: 'ObjectField', nullable: true },
},
spendResolveReport: {
   resolveSpent: { type: 'NumberField' }, resolveShortage: { type: 'NumberField' },
   resolve: { type: 'ObjectField', nullable: true },
},
longRestReport: {
   woundsHealed: { type: 'NumberField' },
   wounds: { type: 'ObjectField', nullable: true },
},
```

> If `createNumberField`/`createIntegerField` produces a class whose `constructor.name` is `NumberField`, use `'NumberField'`; if integer fields report a different name, match the actual name. Confirm by logging one field's `constructor.name` once.

- [ ] **Step 8: Run the unit test (restart caveat does NOT apply to unit tests).**

Run: `npm run test:unit -- ReportChatMessageSchemaEquivalence`
Expected: PASS for all four new entries; the "no unexpected extra fields" guard catches a missing field in any shape.

- [ ] **Step 9: Build.** Run: `npm run build` — Expected: success.

- [ ] **Step 10: Commit.**

```bash
git add src/document/types/chat-message/report/types/{damage,healing,spend-resolve,long-rest} src/hooks/OnceInit.js system.json lang/en.json tests/unit/ReportChatMessageSchemaEquivalence.test.js
git commit -m "feat(chat): damage/healing/spendResolve/longRest report subtypes (inert)"
```

---

## Task 2b: Armor report leaves (rend, repairs)

Same structure as 2a. Shapes from the table (`createRendReportShape`, `createRepairsReportShape`). Components: `RendReportChatMessageShell.svelte`, `RepairsReportChatMessageShell.svelte`.

- [ ] **Step 1:** Create `report/types/rend/RendReportShape.js` returning `{ armorImg: '', armorName: '', armorLost: 0, armor: null }` and `report/types/repairs/RepairsReportShape.js` returning `{ armorImg: '', armorName: '', armorRepaired: 0, armor: null }` (full file bodies mirroring Task 2a Step 1).
- [ ] **Step 2:** Create `RendReportChatMessageDataModel.js` and `RepairsReportChatMessageDataModel.js` (mirror Task 2a Step 2, swapping shape factory + component import).
- [ ] **Step 3:** Register in `OnceInit.js` (`rendReport`, `repairsReport`), `system.json`, `lang/en.json` (`"Rend Report"`, `"Repairs Report"`).
- [ ] **Step 4:** Add golden-master entries:

```js
rendReport: {
   armorImg: { type: 'StringField' }, armorName: { type: 'StringField' },
   armorLost: { type: 'NumberField' }, armor: { type: 'ObjectField', nullable: true },
},
repairsReport: {
   armorImg: { type: 'StringField' }, armorName: { type: 'StringField' },
   armorRepaired: { type: 'NumberField' }, armor: { type: 'ObjectField', nullable: true },
},
```

- [ ] **Step 5:** `npm run test:unit -- ReportChatMessageSchemaEquivalence` → PASS. `npm run build` → success.
- [ ] **Step 6:** Commit `feat(chat): rend/repairs report subtypes (inert)`.

---

## Task 2c: Header-only report leaves (removeCombatEffects, shortRest)

These have empty shapes (only the base `actorName`/`actorImg`). Components: `RemoveCombatEffectsReportChatMessage.svelte`, `ShortRestReportChatMessage.svelte`.

- [ ] **Step 1:** Create `report/types/remove-combat-effects/RemoveCombatEffectsReportShape.js` and `report/types/short-rest-report/ShortRestReportShape.js`, each `export default function createXShape() { return {}; }`. (A shape factory is kept even when empty, for uniformity and a single source the golden master references.)
- [ ] **Step 2:** Create the two DataModels (mirror 2a Step 2; `...buildSchemaFromShape(createXShape())` is a no-op spread but kept for consistency).
- [ ] **Step 3:** Register `removeCombatEffectsReport`, `shortRestReport` in `OnceInit.js`, `system.json`, `lang/en.json` (`"Remove Combat Effects Report"`, `"Short Rest Report"`).
- [ ] **Step 4:** Add golden-master entries with empty field maps:

```js
removeCombatEffectsReport: {},
shortRestReport: {},
```

(The "no unexpected extra fields" guard asserts these leaves have only base fields.)

- [ ] **Step 5:** `npm run test:unit -- ReportChatMessageSchemaEquivalence` → PASS. `npm run build` → success.
- [ ] **Step 6:** Commit `feat(chat): removeCombatEffects/shortRest report subtypes (inert)`.

---

## Task 2d: Turn report leaves (turnStart, turnEnd)

The two complex leaves. Shapes from the table; plus explicit `ArrayField`s for `message` (both) and `conditions` (turnStart only).

**Files:**
- Create: `report/types/turn-start/TurnStartReportShape.js`, `TurnStartReportChatMessageDataModel.js`
- Create: `report/types/turn-end/TurnEndReportShape.js`, `TurnEndReportChatMessageDataModel.js`
- Modify: `OnceInit.js`, `system.json`, `lang/en.json`, the golden-master test.

- [ ] **Step 1: Confirm the `message` element type.** Read `CharacterDataModel.js` around the `rulesElementsCache.turnMessage` assignment and `ChatMessageRichTextMessages.svelte`. Decide `createStringField()` vs `createObjectField()` element. Record the decision in a code comment.

- [ ] **Step 2: Write `TurnStartReportShape.js`:**

```js
// src/document/types/chat-message/report/types/turn-start/TurnStartReportShape.js
/**
 * Builds the canonical zero-value shape of a turn-start report's OBJECT system fields. The array fields
 * (message, conditions) are added as explicit ArrayFields on the data model, not here, because Foundry's
 * ObjectField cannot hold an array. All conditionally-present objects are null (nullable ObjectFields) so
 * the card's presence guards stay correct; fastHealing/persistentDamage stay opaque to preserve their
 * variable per-source keys (equipment/ability/effect) read by the apply-button tooltip.
 * @returns {object} The turn-start report object-field shape.
 */
export default function createTurnStartReportShape() {
   return {
      expiredEffectsRemoved: false,
      effects: null,
      fastHealing: null,
      persistentDamage: null,
      resolveRegain: null,
      stamina: null,
      wounds: null,
      resolve: null,
   };
}
```

- [ ] **Step 3: Write `TurnStartReportChatMessageDataModel.js`** (adds the explicit array fields after the shape spread):

```js
// src/document/types/chat-message/report/types/turn-start/TurnStartReportChatMessageDataModel.js
import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createTurnStartReportShape
   from '~/document/types/chat-message/report/types/turn-start/TurnStartReportShape.js';
import TurnStartReportChatMessage
   from '~/document/types/chat-message/report/types/turn-start/TurnStartReportChatMessage.svelte';

/**
 * Data model for the turn-start report chat message.
 * @augments ReportChatMessageDataModel
 */
export default class TurnStartReportChatMessageDataModel extends ReportChatMessageDataModel {

   /**
    * Defines the typed system schema for a turn-start report. Object fields come from the shape factory;
    * the array fields (message, conditions) are explicit because ObjectField cannot hold an array.
    * @returns {object} The turn-start report schema field map.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createTurnStartReportShape()),

         // Turn-start rich-text messages (rendered per entry by ChatMessageRichTextMessages).
         message: createArrayField(createStringField(), []),

         // Active conditions snapshot ({ label, img, description } per entry).
         conditions: createArrayField(createObjectField(), []),
      };
   }

   /**
    * The Svelte component used to render this chat message.
    * @returns {object} The turn-start report chat-message Svelte component.
    */
   get component() {
      return TurnStartReportChatMessage;
   }
}
```

(Use the element field chosen in Step 1 for `message`.)

- [ ] **Step 4: Write the turn-end leaf** with `createTurnEndReportShape()` returning `{ expiredEffectsRemoved: false, effects: null, fastHealing: null, persistentDamage: null, stamina: null, wounds: null }` and an explicit `message: createArrayField(...)` (no `conditions`). Component `TurnEndReportChatMessage.svelte`.

- [ ] **Step 5:** Register `turnStartReport`, `turnEndReport` in `OnceInit.js`, `system.json`, `lang/en.json` (`"Turn Start Report"`, `"Turn End Report"`).

- [ ] **Step 6: Add golden-master entries:**

```js
turnStartReport: {
   expiredEffectsRemoved: { type: 'BooleanField' },
   effects: { type: 'ObjectField', nullable: true },
   fastHealing: { type: 'ObjectField', nullable: true },
   persistentDamage: { type: 'ObjectField', nullable: true },
   resolveRegain: { type: 'ObjectField', nullable: true },
   stamina: { type: 'ObjectField', nullable: true },
   wounds: { type: 'ObjectField', nullable: true },
   resolve: { type: 'ObjectField', nullable: true },
   message: { type: 'ArrayField' },
   conditions: { type: 'ArrayField' },
},
turnEndReport: {
   expiredEffectsRemoved: { type: 'BooleanField' },
   effects: { type: 'ObjectField', nullable: true },
   fastHealing: { type: 'ObjectField', nullable: true },
   persistentDamage: { type: 'ObjectField', nullable: true },
   stamina: { type: 'ObjectField', nullable: true },
   wounds: { type: 'ObjectField', nullable: true },
   message: { type: 'ArrayField' },
},
```

- [ ] **Step 7:** `npm run test:unit -- ReportChatMessageSchemaEquivalence` → PASS. `npm run build` → success.
- [ ] **Step 8:** Commit `feat(chat): turnStart/turnEnd report subtypes (inert)`.

---

## Task 2e: Revert + expired report leaves (turnStartRevert, turnEndRevert, effectsExpired)

Shapes from the table. Components: `TurnStartRevertReportChatMessage.svelte`, `TurnEndRevertReportChatMessage.svelte`, `EffectsExpiredReportChatMessage.svelte`.

- [ ] **Step 1:** Create the three shape factories:
  - `createTurnStartRevertReportShape()` → `{ fastHealingRevert: null, persistentDamageRevert: null, resolveRegainRevert: null, stamina: null, wounds: null, resolve: null }`
  - `createTurnEndRevertReportShape()` → `{ fastHealingRevert: null, persistentDamageRevert: null, stamina: null, wounds: null }`
  - `createEffectsExpiredReportShape()` → `{ expiredEffectsRemoved: false, effects: null }`
- [ ] **Step 2:** Create the three DataModels (mirror 2a Step 2; no explicit array fields needed).
- [ ] **Step 3:** Register `turnStartRevertReport`, `turnEndRevertReport`, `effectsExpiredReport` in `OnceInit.js`, `system.json`, `lang/en.json` (`"Turn Start Revert Report"`, `"Turn End Revert Report"`, `"Effects Expired Report"`).
- [ ] **Step 4:** Add golden-master entries:

```js
turnStartRevertReport: {
   fastHealingRevert: { type: 'ObjectField', nullable: true },
   persistentDamageRevert: { type: 'ObjectField', nullable: true },
   resolveRegainRevert: { type: 'ObjectField', nullable: true },
   stamina: { type: 'ObjectField', nullable: true },
   wounds: { type: 'ObjectField', nullable: true },
   resolve: { type: 'ObjectField', nullable: true },
},
turnEndRevertReport: {
   fastHealingRevert: { type: 'ObjectField', nullable: true },
   persistentDamageRevert: { type: 'ObjectField', nullable: true },
   stamina: { type: 'ObjectField', nullable: true },
   wounds: { type: 'ObjectField', nullable: true },
},
effectsExpiredReport: {
   expiredEffectsRemoved: { type: 'BooleanField' },
   effects: { type: 'ObjectField', nullable: true },
},
```

- [ ] **Step 5:** `npm run test:unit -- ReportChatMessageSchemaEquivalence` → PASS (all 13 leaves now covered). `npm run build` → success.
- [ ] **Step 6:** Commit `feat(chat): revert + effectsExpired report subtypes (inert)`.

---

## Task 3: Delete the three dead report components

**Files:**
- Delete: `src/document/types/chat-message/report/components/ReportConfirmApplyDamageButton.svelte`
- Delete: `src/document/types/chat-message/report/components/ReportConfirmResolveRegainButton.svelte`
- Delete: `src/document/types/chat-message/report/components/ReportHeader.svelte`

- [ ] **Step 1: Re-verify they are dead.**

Run: `git grep -n "ReportConfirmApplyDamageButton\|ReportConfirmResolveRegainButton\|ReportHeader\b" -- src`
Expected: only self-references inside the three files themselves (no `import` from any other file). If any external import exists, STOP and report — they are not dead.

- [ ] **Step 2: Delete the three files.**

```bash
git rm src/document/types/chat-message/report/components/ReportConfirmApplyDamageButton.svelte \
       src/document/types/chat-message/report/components/ReportConfirmResolveRegainButton.svelte \
       src/document/types/chat-message/report/components/ReportHeader.svelte
```

- [ ] **Step 3: Build.** Run: `npm run build` — Expected: success (nothing imported them).

- [ ] **Step 4: Commit.**

```bash
git commit -m "chore(chat): delete dead report components (ReportConfirmApplyDamageButton/ResolveRegain/ReportHeader)"
```

---

## Task 4: Producer cutover + component sweep + legacy trim (ATOMIC)

This is the single switch that activates the report subtypes. It MUST land as one coherent change: after it, new report messages carry `{ type, system }` and self-render through the new DataModels (legacy hook skips them via its `instanceof` guard), and every report component reads `system.X`.

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (`_whisperOwners`, ~line 5918)
- Modify: `src/hooks/OnRenderChatMessageHTML.js` (trim the set, ~lines 20-33)
- Modify (sweep): all report components + shared resource/button components (lists below)

- [ ] **Step 1: Split `_whisperOwners`** to put `type` at the message root and the rest under `system`:

```js
async _whisperOwners(messageData, userId, playSound = true) {
   // Split the discriminator to the message root and the payload into the typed system data.
   const { type, ...system } = messageData;

   // Initialize message.
   const message = {
      type,
      system,
      user: userId,
      speaker: this.parent.getSpeaker(),
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      whisper: getOwners(this.parent),
   };

   // Add sound if appropriate.
   if (playSound) {
      message.sound = CONFIG.sounds.notification;
   }

   await ChatMessage.create(message);
}
```

- [ ] **Step 2: Sweep the leaf report components** — `git grep -n "flags\.titan" -- src/document/types/chat-message/report` and replace every `document.data.flags.titan.X` with `document.data.system.X`. The exact files/sites (from the inventory):
  - `report/types/damage/DamageReportChatMessageShell.svelte` (lines 27,29,30,34,39,43,44,47,54,60,63,68)
  - `report/types/damage/DamageReportChatMessageHeader.svelte` (17,18,24,32,33)
  - `report/types/healing/HealingReportChatMessageShell.svelte` (19), `.../HealingReportChatMessageHeader.svelte` (11,17,18)
  - `report/types/spend-resolve/SpendResolveReportChatMessageShell.svelte` (19,20), `.../SpendResolveReportChatMessageHeader.svelte` (12,15,21,22)
  - `report/types/rend/RendReportChatMessageShell.svelte` (18), `.../RendReportChatMessageHeader.svelte` (12,13,18,19,29,32, **41 — see Step 4 rend bug**)
  - `report/types/repairs/RepairsReportChatMessageShell.svelte`, `.../RepairsReportChatMessageHeader.svelte` (12,13,18,19,25)
  - `report/types/long-rest/LongRestReportChatMessage.svelte` (26,27), `.../LongRestReportChatMessageHeader.svelte` (17,18)
  - `report/types/remove-combat-effects/RemoveCombatEffectsReportChatMessageHeader.svelte` (17,18)
  - `report/types/short-rest-report/ShortRestReportChatMessageHeader.svelte` (17,18)
  - `report/types/effects-expired/EffectsExpiredReportChatMessage.svelte` (30), `.../EffectsExpiredReportChatMessageHeader.svelte` (14,15)
  - `report/types/turn-start/TurnStartReportChatMessage.svelte` (40,45,50,55,62,73,76,87,90,101,104,115), `.../TurnStartReportChatMessageHeader.svelte` (14,15)
  - `report/types/turn-end/TurnEndReportChatMessage.svelte` (36,41,46,56,67,70,81,84,95), `.../TurnEndReportChatMessageHeader.svelte` (14,15)
  - `report/types/turn-start-revert/TurnStartRevertReportChatMessage.svelte` (32,37,42,47,50,61,64,75,78), `.../TurnStartRevertReportChatMessageHeader.svelte` (14,15)
  - `report/types/turn-end-revert/TurnEndRevertReportChatMessage.svelte` (27,32,37,40,51,54), `.../TurnEndRevertReportChatMessageHeader.svelte` (14,15)
  - `report/components/ReportChatMessageBase.svelte` and `report/components/ReportChatMessageHeader.svelte` — grep these too; sweep any `flags.titan` and verify they otherwise read props.

- [ ] **Step 3: Sweep the shared resource + button components** (report-only, confirmed):
  - `chat-message/components/resources/ChatMessageStamina.svelte` (14,15), `ChatMessageWounds.svelte` (14,15), `ChatMessageResolve.svelte` (14,15), `ChatMessageArmor.svelte` (14,15), `ChatMessageRichTextMessages.svelte` (10).
  - `chat-message/components/buttons/ChatMessageApplyFastHealingButton.svelte` (22,23,27,28,32,33,54,62,63), `ChatMessageApplyPersistentDamageButton.svelte` (same shape), `ChatMessageApplyResolveRegainButton.svelte` (same shape). For the WRITE in each (`document.data.update({ flags: { titan: {...} } })`), change `flags: { titan: {...} }` to `system: {...}`. Example (fast healing):

```js
await document.data.update({
   system: {
      fastHealing: { confirmed: true },
      stamina: { value: actor.system.resource.stamina.value },
   },
});
```

> `fastHealing`/`persistentDamage` are nullable `ObjectField`s. A partial update `{ system: { fastHealing: { confirmed: true } } }` is expected to deep-merge into the stored object (preserving `total` + the source keys) via Foundry's source merge. The e2e in Task 5 VERIFIES this (asserts `confirmed === true` AND `total` still present). If the merge replaces instead of merges, fall back to cloning the current object: `const fh = { ...document.data.system.fastHealing, confirmed: true };` then write `{ system: { fastHealing: fh } }`.

- [ ] **Step 4: Fix the rend bug.** In `RendReportChatMessageHeader.svelte:41`, the read is `document.data.flags.titan.rend` — a field no producer emits. Repoint it to `document.data.system.armorLost` (the actual rend amount). Confirm against the surrounding markup that `armorLost` is the intended value; if the context shows it wants something else, report before changing.

- [ ] **Step 5: Fix the array presence guards.** In `TurnStartReportChatMessage.svelte` and `TurnEndReportChatMessage.svelte`, wherever a `message` array drives a push/`{#if}` guard (`if (document.data.system.message)` after the sweep), change it to `if (document.data.system.message?.length)`. Same for `conditions` in `TurnStartReportChatMessage.svelte` if it is presence-guarded. (Empty `ArrayField` initial `[]` is truthy; `?.length` restores "absent" semantics.) Leave `{#each ...message}` bodies unchanged.

- [ ] **Step 6: Trim the legacy hook set.** In `OnRenderChatMessageHTML.js`, remove the 11 report keys from `TITAN_CHAT_MESSAGE_TYPES`, leaving only `'effect'` (Phase 4). Update the doc comment to note reports are now first-class subtypes. Do NOT delete the hook or `ChatMessageShell.svelte` (they still serve `effect`).

- [ ] **Step 7: Verify the sweep is complete.**

Run: `git grep -n "flags\.titan" -- src/document/types/chat-message/report src/document/types/chat-message/components/resources src/document/types/chat-message/components/buttons`
Expected: ZERO matches. (Any remaining match is an unswept site.)

- [ ] **Step 8: Build.** Run: `npm run build` — Expected: success; confirm `dist/` is regenerated (e2e needs current `dist/`).

- [ ] **Step 9: Commit.**

```bash
git add -A
git commit -m "feat(chat): cut reports over to system subtypes (producer split + component sweep + legacy trim); fix rend + array guards"
```

---

## Task 5: E2E coverage + full suite

**Files:**
- Create: `tests/e2e/report-cards.spec.js`
- Reference: `tests/e2e/item-cards.spec.js` (Phase 2 pattern), `tests/e2e/world.js` (shared-world harness), `tests/e2e/checkDialog.js`/`fixtures.js`.

- [ ] **Step 1: Write `report-cards.spec.js`** using the shared-world harness (module-scoped `page`, `beforeAll(login)` / `afterEach(closeAllApps + errors reset)` / `afterAll(page.close)` — copy the exact pattern from `item-cards.spec.js`). Cover, for each report, that triggering it creates a message whose `type === '<leaf>'` and whose card content renders. Trigger paths (run inside `page.evaluate` against a controlled actor):
  - damage/healing/spendResolve/rend/repairs: call the actor `system.applyDamage` / `applyHealing` / `spendResolve` / `applyRend` / `applyRepairs` with `{ report: true }`.
  - shortRest/longRest/removeCombatEffects: call `system.shortRest()` / `longRest()` / `removeCombatEffects()`.
  - turnStart/turnEnd: drive a combat turn (reuse the combat-driving helper from the existing turn-effect specs) OR call `system.onTurnStart()` / `onTurnEnd()` directly on an actor seeded with a fast-healing/persistent-damage rules element so the report has content.
  - **turnStartRevert/turnEndRevert (regression):** call `system.onTurnStartReverted()` / `onTurnEndReverted()` on the same seeded actor; assert `message.type === 'turnStartRevertReport'`/`'turnEndRevertReport'` AND the card renders non-empty content (these rendered BLANK before Phase 3).
  - effectsExpired: advance initiative past an effect's expiry (reuse the effects-expired trigger from existing specs) or call the producing path directly.
  Assert `message.type` via `game.messages.contents.at(-1).type` (poll with `expect.poll`, no fixed sleep — match the project's "no fixed sleeps" convention), and assert the rendered `<li.message>` `.message-content` is non-empty.

- [ ] **Step 2: Add the apply-confirm flow case.** Seed an actor with a fast-healing rules element and `autoApplyFastHealing = 'showButton'`; produce a `turnStartReport`; click the fast-healing apply button in the card; assert (a) the actor's stamina increased, (b) `message.system.fastHealing.confirmed === true`, and (c) `message.system.fastHealing.total` is still present (verifies the ObjectField partial-merge from Task 4 Step 3).

- [ ] **Step 3: Rebuild + run the report e2e.**

Run: `npm run build` then `npm run test:e2e -- report-cards`
Expected: all report cases PASS. (E2E is world-launch-gated — the world must be running. If a Foundry restart is needed for the new `documentTypes` to register, restart the world first.)

- [ ] **Step 4: Run the full unit suite.**

Run: `npm run test:unit`
Expected: all green (golden master + existing).

- [ ] **Step 5: Run the full e2e suite.**

Run: `npm run test:e2e`
Expected: all green at parity (no other spec asserts on report `flags.titan.type`; if any does, update it to `message.type`).

- [ ] **Step 6: Commit.**

```bash
git add tests/e2e/report-cards.spec.js
git commit -m "test(chat): e2e for 13 report subtypes + revert-render regression + apply-confirm flow"
```

---

## Task 6: Docs + skill self-update

**Files:**
- Modify: `docs/TODO.md` (mark Phase 3 done in the chat-subtypes section), `docs/OPEN_BUGS.md` (record the rend bug fix + the revert-blank fix if not already logged).
- Modify: `.claude/skills/titan-codebase/references/*.md` (reflect the report subtypes as current state).

- [ ] **Step 1: Update `docs/TODO.md`.** In the "Chat message subtypes" section, mark Phase 3 (reports ×13) DONE with the branch/commit, and update the trailing note to "Phase 4 (effect + delete the legacy hook/`ChatMessageShell.svelte`) remains."
- [ ] **Step 2: Update `docs/OPEN_BUGS.md`** if the rend-field bug or the blank revert-reports were open/uncatalogued — record them as fixed by Phase 3.
- [ ] **Step 3: Update the `titan-codebase` skill** (`references/abstractions.md` / `data-flow.md`) so the chat-message section states reports are first-class subtypes (only `effect` remains on the legacy hook). Describe the CURRENT state, not a changelog.
- [ ] **Step 4: Commit.**

```bash
git add docs/TODO.md docs/OPEN_BUGS.md .claude/skills/titan-codebase
git commit -m "docs(chat): Phase 3 reports done — TODO/OPEN_BUGS + titan-codebase skill"
```

---

## Final integration

- [ ] Full `npm run test:unit` + `npm run test:e2e` green (user-gated for e2e).
- [ ] `git grep -n "flags\.titan" -- src/document/types/chat-message/report` → zero.
- [ ] Use `superpowers:finishing-a-development-branch` to present merge/PR options for `feat/chat-subtypes-phase3-reports`.

---

## Self-review notes (plan vs spec)

- **Spec coverage:** all 13 subtypes (Tasks 1-2e), producer split (Task 4 Step 1), component sweep (Task 4 Steps 2-3), registration/manifest/lang (Tasks 2a-2e), revert-report free fix (Task 5 Step 1 regression), golden master (Task 1 + 2a-2e), e2e (Task 5), legacy boundary preserved (Task 4 Step 6 — hook/shell kept for `effect`). Covered.
- **Refinement vs spec:** the spec illustratively typed resource/confirm-offer sub-objects as `SchemaField`s; the plan uses **nullable `ObjectField`** for ALL conditionally-present compounds because the components use object-presence guards (`if (wounds)`) that a non-null `SchemaField` initial would break. This is a deliberate parity-preserving refinement, consistent with the spec's hybrid/"bounded scope" policy. Tightening specific resources to typed `{value,max}` (with `?.max` guard rewrites) is a clean future follow-up, not Phase 3.
- **Dead code:** the spec's "apply-damage confirm flow" assumed `ReportConfirmApplyDamageButton`; investigation found it dead (never imported) and `damageApplied` never produced. The real apply flow is the fast-healing/persistent-damage/resolve-regain buttons (Task 4 Step 3 + Task 5 Step 2). Dead components deleted in Task 3.
- **Type consistency:** `create<T>ReportShape()` factory names, `<T>ReportChatMessageDataModel` class names, and the subtype keys are used identically across Tasks 2a-2e, OnceInit registration, system.json, lang, and the golden master.
