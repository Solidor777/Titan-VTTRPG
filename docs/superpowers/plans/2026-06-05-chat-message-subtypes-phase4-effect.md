# Chat Message Subtypes — Phase 4 (Effect + Legacy Path Deletion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the last legacy chat type (`effect`) into a first-class self-rendering `ChatMessage` subtype and delete the legacy render path (`OnRenderChatMessageHTML.js` + `ChatMessageShell.svelte`) with zero behavior loss.

**Architecture:** A new `createEffectSystemTemplate()` shape is the single source for both the live `TitanActiveEffectDataModel` schema (refactored, follow-up-B style, gated by a byte-exact golden master) and the new `EffectChatMessageDataModel` snapshot schema. The producer `TitanActiveEffect.sendToChat()` gains a `buildChatMessageData()` byte-parallel to `TitanItem`'s. The legacy hook's dark-mode-`'all'` branch relocates into `TitanChatMessage.renderHTML` before both legacy files are deleted.

**Tech Stack:** Foundry v14 DataModels, Svelte 5 (runes), Vitest (unit), Playwright (e2e), Vite 8 build.

**Spec:** `docs/superpowers/specs/2026-06-05-chat-message-subtypes-phase4-effect-design.md`

**Project rules that bind every task:**
- Route all `.js`/`.svelte` work to the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.
- Code style: 120-char wrap, 3-space indent, typed single-line comments on variables, multi-line JSDoc on functions, multi-line `{}` for all conditionals.
- Unit runner is **`npm test`** (there is NO `test:unit` script); filter positionally: `npm test -- <pattern>`. E2E: `npm run test:e2e` (~15 min, run in background; `npm run test:e2e -- <file>` for one file). Always `npm run build` before e2e.
- `git add` explicit paths only — NEVER stage `packs/`, `.claude/settings.local.json`, or `.claude/scheduled_tasks.lock`.
- The e2e world is `:30000`, world-launch-gated, and needs a **server RESTART** after the `system.json` `documentTypes` change (Task 2) before the e2e run (Task 5) — the USER must relaunch; ask them.

---

## Task 1: Effect system template + AE DataModel refactor, gated by a golden master

The follow-up-B recipe: freeze a byte-exact fingerprint of the CURRENT hand-built
`TitanActiveEffectDataModel` schema FIRST, then refactor the schema to build from the new shape
template, and prove the fingerprint is unchanged.

**Files:**
- Create: `tests/unit/EffectSchemaEquivalence.test.js`
- Create: `src/document/types/active-effect/EffectSystemTemplate.js`
- Modify: `src/document/types/active-effect/TitanActiveEffectDataModel.js:27-59` (`_defineDocumentSchema`)

- [ ] **Step 1: Write the golden-master test for the CURRENT AE schema**

Create `tests/unit/EffectSchemaEquivalence.test.js`. The harness mirrors
`tests/unit/ItemDataModelSchemaEquivalence.test.js` (mock fields installed in `beforeAll`, dynamic
import, fingerprint walk that omits array-element initials because **ArrayField element initial is
inert** — Foundry populates arrays from the array's own initial). Two additions over the item
harness: a `MockDataField` (the AE `changes` field uses `createDataField`, which constructs
`foundry.data.fields.DataField` — not mocked in the item suite) and an `ActiveEffect` global
stand-in is NOT needed (the data-model module imports only field helpers, templates, and
`RulesElementMixin`; it never touches the `ActiveEffect` document class).

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Golden-master gate for the effect schemas. Phase 4 refactors TitanActiveEffectDataModel to build
// its duration/check/customTrait fields from the new createEffectSystemTemplate() shape (via
// buildSchemaFromShape) and adds EffectChatMessageDataModel, whose snapshot schema builds from the
// same template. This suite freezes a byte-exact fingerprint of the LIVE Active Effect schema
// (DATA-INTEGRITY SENSITIVE: effects persist in worlds) authored from the CURRENT hand-built code,
// so the refactor can be proven to leave the persisted data shape unchanged, and pins the chat
// snapshot schema the same way. The fingerprint omits array-element initials by design: an array
// element's initial is inert (Foundry populates the array from the array's own initial, never the
// element's), so the hand-built element factories (e.g. createObjectField(() =>
// createItemCheckTemplate())) and the shape-built bare createObjectField() elements compare equal.
// The harness mirrors ItemDataModelSchemaEquivalence.test.js, adding a DataField stand-in (the AE
// changes field uses createDataField). Dynamic import is permitted in tests (the no-dynamic-import
// rule governs the shipping bundle only).

/**
 * Minimal stand-in for a Foundry DataField that records the options it was constructed with, so the
 * fingerprint can read the declared required/nullable/initial/integer the create*Field helpers pass.
 */
class MockField {
   /**
    * Stores the field options.
    * @param {object} options - The field configuration (e.g. initial, nullable, integer).
    */
   constructor(options = {}) {
      /** @type {object} The field configuration. */
      this.options = options;
   }
}

/** Stand-in for DataField, a distinct subclass so the produced field type can be asserted. */
class MockDataField extends MockField {}

/** Stand-in for StringField, a distinct subclass so the produced field type can be asserted. */
class MockStringField extends MockField {}

/** Stand-in for NumberField, a distinct subclass so the produced field type can be asserted. */
class MockNumberField extends MockField {}

/** Stand-in for BooleanField, a distinct subclass so the produced field type can be asserted. */
class MockBooleanField extends MockField {}

/** Stand-in for ObjectField, a distinct subclass so the produced field type can be asserted. */
class MockObjectField extends MockField {}

/** Stand-in for ArrayField that captures its element field as the first constructor argument. */
class MockArrayField extends MockField {
   /**
    * Stores the element field and options.
    * @param {MockField} element - The field describing each array element.
    * @param {object} options - The array field configuration.
    */
   constructor(element, options = {}) {
      super(options);
      /** @type {MockField} The element field. */
      this.element = element;
   }
}

/** Stand-in for SchemaField that captures its sub-fields map as the first constructor argument. */
class MockSchemaField extends MockField {
   /**
    * Stores the sub-fields map and options.
    * @param {object} fields - The map of sub-field name to MockField.
    * @param {object} options - The schema field configuration.
    */
   constructor(fields, options = {}) {
      super(options);
      /** @type {object} The map of sub-field name to MockField. */
      this.fields = fields;
   }
}

/** Stand-in for TypeDataModel so the data-model classes can be declared and their statics invoked. */
class MockTypeDataModel {}

/** @type {object} Holds the dynamically imported effect DataModel classes keyed by a stable name. */
const models = {};

/**
 * Maps a mock field instance to the stable kind string recorded in a fingerprint.
 * @param {MockField} field - The mock field to classify.
 * @returns {string} The stable kind string (e.g. 'StringField', 'ArrayField').
 */
function kindOf(field) {
   // The mock class names map one-to-one onto the Foundry field kinds; strip the 'Mock' prefix.
   return field.constructor.name.replace(/^Mock/, '');
}

/**
 * Deep-serializes a resolved initial value into a plain, JSON-comparable form. A function initial is
 * called first, then its result is serialized; everything else is structurally cloned.
 * @param {*} initial - The resolved initial value (possibly a factory function, object, array, or scalar).
 * @returns {*} A plain, deterministic, deep-comparable copy of the initial.
 */
function serializeInitial(initial) {
   // Resolve a factory-function initial to its produced value before serializing.
   const resolved = typeof initial === 'function' ? initial() : initial;

   // Undefined survives structuredClone but not JSON; normalize it explicitly.
   if (resolved === undefined) {
      return undefined;
   }
   return structuredClone(resolved);
}

/**
 * Recursively serializes a mock field into a plain, deterministic, comparable object so two schema
 * builds can be deep-equality compared. Records kind, required, nullable, and (only when present)
 * integer for every field. ArrayField additionally records its resolved array initial and recurses
 * into its element WITHOUT the element's own initial (an array element's initial is inert — Foundry
 * populates the array from the array's own initial, never the element's — so comparing it would create
 * false divergences). SchemaField recurses into each sub-field with the full fingerprint. Scalar
 * leaves and non-array-element object fields record their resolved initial.
 * @param {MockField} field - The mock field to fingerprint.
 * @param {boolean} [omitInitial] - When true, omit this field's own initial (used for array elements).
 * @returns {object} A stable, key-sorted fingerprint of the field.
 */
function fingerprint(field, omitInitial = false) {
   /** @type {object} The accumulated fingerprint for this field. */
   const record = {
      kind: kindOf(field),
      required: field.options.required ?? false,
      nullable: field.options.nullable ?? false,
   };

   // Record integer enforcement only when the field declares it (number fields only).
   if (field.options.integer !== undefined) {
      record.integer = field.options.integer;
   }

   // ArrayField: record its resolved array initial (deep) and recurse into its element without initial.
   if (field instanceof MockArrayField) {
      if (!omitInitial) {
         record.initial = serializeInitial(field.options.initial);
      }
      record.element = fingerprint(field.element, true);
      return sortObjectKeys(record);
   }

   // SchemaField: recurse into each sub-field with the full fingerprint (including initial).
   if (field instanceof MockSchemaField) {
      /** @type {object} The fingerprints of each sub-field keyed by sub-field name. */
      const fields = {};
      for (const [name, subField] of Object.entries(field.fields)) {
         fields[name] = fingerprint(subField);
      }
      record.fields = sortObjectKeys(fields);
      return sortObjectKeys(record);
   }

   // Scalar leaves and non-array-element object fields: record the resolved initial.
   if (!omitInitial) {
      record.initial = serializeInitial(field.options.initial);
   }
   return sortObjectKeys(record);
}

/**
 * Returns a shallow copy of an object with its keys sorted, so deep-equality comparison is order
 * independent. Nested values are assumed already sorted by the recursive fingerprint walk.
 * @param {object} object - The object whose keys to sort.
 * @returns {object} A new object with the same entries in sorted-key order.
 */
function sortObjectKeys(object) {
   /** @type {object} The key-sorted copy. */
   const sorted = {};
   for (const key of Object.keys(object).sort()) {
      sorted[key] = object[key];
   }
   return sorted;
}

/**
 * Fingerprints an entire schema field map (the object returned by _defineDocumentSchema()).
 * @param {object} schema - The map of field name to mock field.
 * @returns {object} A stable, key-sorted fingerprint of every field in the schema.
 */
function fingerprintSchema(schema) {
   /** @type {object} The fingerprints of each top-level field keyed by field name. */
   const result = {};
   for (const [name, field] of Object.entries(schema)) {
      result[name] = fingerprint(field);
   }
   return sortObjectKeys(result);
}

/**
 * Recursively key-sorts a golden fingerprint so it compares equal to the key-sorted output of
 * fingerprintSchema, regardless of the order the golden literal was authored in.
 * @param {*} value - The golden value (object, array, or scalar) to sort.
 * @returns {*} The deeply key-sorted copy.
 */
function sortFingerprint(value) {
   // Arrays keep their order; recurse into entries (array element initials are order-significant).
   if (Array.isArray(value)) {
      return value.map((entry) => sortFingerprint(entry));
   }

   // Plain objects are key-sorted with their values recursively sorted.
   if (value && typeof value === 'object') {
      /** @type {object} The key-sorted copy. */
      const sorted = {};
      for (const key of Object.keys(value).sort()) {
         sorted[key] = sortFingerprint(value[key]);
      }
      return sorted;
   }

   // Scalars pass through unchanged.
   return value;
}

beforeAll(async () => {
   // The create*Field helpers and shape templates may call localize() (game.i18n) when a schema is
   // built; provide a pass-through i18n and an inert settings.get.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
      settings: {
         get: () => undefined,
      },
   };

   // Install the TypeDataModel and data-field stand-ins before importing the data models.
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;
   globalThis.foundry.data = {
      fields: {
         DataField: MockDataField,
         StringField: MockStringField,
         NumberField: MockNumberField,
         BooleanField: MockBooleanField,
         ObjectField: MockObjectField,
         ArrayField: MockArrayField,
         SchemaField: MockSchemaField,
      },
   };

   // Some transitive modules destructure foundry.applications.api.ApplicationV2 at import time.
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };

   // Dynamically import the live Active Effect data model against the installed stand-ins.
   models.effect = (
      await import('~/document/types/active-effect/TitanActiveEffectDataModel.js')
   ).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.foundry.applications;
   delete globalThis.game;
});

/**
 * Builds a fingerprint of a leaf ObjectField array element (the empty-array fallback element shared
 * by check/customTrait/rulesElement). Array elements omit their own initial.
 * @returns {object} The fingerprint of an ObjectField array element.
 */
function objectElement() {
   return {
      kind: 'ObjectField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of an empty-initial array field whose element is an ObjectField —
 * the shared shape of check, customTrait, and rulesElement.
 * @returns {object} The fingerprint of an empty ObjectField array field.
 */
function emptyObjectArray() {
   return {
      element: objectElement(),
      initial: [],
      kind: 'ArrayField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a non-integer NumberField with a numeric initial — the shape of
 * documentVersion produced by createNumberField (no integer enforcement).
 * @param {number} initial - The numeric initial value.
 * @returns {object} The fingerprint of a non-integer NumberField.
 */
function numberField(initial) {
   return {
      initial,
      kind: 'NumberField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of an integer-enforced NumberField — the shape produced by
 * createIntegerField (integer: true).
 * @param {number} initial - The numeric initial value.
 * @returns {object} The fingerprint of an integer NumberField.
 */
function integerField(initial) {
   return {
      initial,
      integer: true,
      kind: 'NumberField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a required, non-nullable StringField.
 * @param {string} initial - The string initial value.
 * @returns {object} The fingerprint of a StringField.
 */
function stringField(initial) {
   return {
      initial,
      kind: 'StringField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a required, non-nullable DataField — the shape produced by
 * createDataField (the permissive value field inside the AE changes element).
 * @param {*} initial - The initial value.
 * @returns {object} The fingerprint of a DataField.
 */
function dataField(initial) {
   return {
      initial,
      kind: 'DataField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of the custom Titan duration SchemaField — the shape shared by the
 * live Active Effect schema and the effect chat-message snapshot schema (both sourced from
 * createEffectSystemTemplate()). createSchemaField passes no options, so required defaults to false.
 * @returns {object} The fingerprint of the duration SchemaField.
 */
function durationField() {
   return {
      fields: {
         custom: stringField(''),
         initiative: integerField(1),
         remaining: integerField(1),
         type: stringField('turnStart'),
      },
      kind: 'SchemaField',
      nullable: false,
      required: false,
   };
}

/**
 * The committed golden fingerprint of the LIVE Titan Active Effect ('effect' subtype) schema, frozen
 * from the hand-built code BEFORE the shape-template refactor. Any divergence after the refactor
 * signals a change to the persisted Active Effect data shape. The changes field is hand-built in the
 * data model (the Foundry v14 verifier requires an ArrayField of a typed SchemaField, which a shape
 * cannot express) and is expected to remain byte-identical.
 * @type {object}
 */
const EFFECT_DATA_MODEL_GOLDEN = {
   changes: {
      element: {
         fields: {
            key: stringField(''),
            mode: integerField(0),
            phase: stringField(''),
            priority: integerField(0),
            type: stringField(''),
            value: dataField(''),
         },
         kind: 'SchemaField',
         nullable: false,
         required: false,
      },
      initial: [],
      kind: 'ArrayField',
      nullable: false,
      required: true,
   },
   check: emptyObjectArray(),
   customTrait: emptyObjectArray(),
   documentVersion: numberField(0),
   duration: durationField(),
   rulesElement: emptyObjectArray(),
};

describe('effect schema characterization (golden master)', () => {
   it('the live TitanActiveEffectDataModel schema fingerprint matches the committed golden', () => {
      // Fingerprint the live schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models.effect._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(EFFECT_DATA_MODEL_GOLDEN));
   });
});
```

- [ ] **Step 2: Run the test to verify it PASSES against the current hand-built schema**

Run: `npm test -- EffectSchemaEquivalence`
Expected: PASS (1 test). This characterizes the CURRENT schema. If it fails, the golden literal was
authored wrong — fix the literal by reading
`src/document/types/active-effect/TitanActiveEffectDataModel.js:27-59` and
`src/helpers/utility-functions/Create*.js` (do NOT touch the schema code to make the golden pass).
Likely culprits: `documentVersion` initial (read `TitanDataModel.latestVersion`; the item golden
froze it at `0`) or an option-default mismatch.

- [ ] **Step 3: Commit the characterization**

```bash
git add tests/unit/EffectSchemaEquivalence.test.js
git commit -m "test(effect): golden-master characterization of the live Active Effect schema"
```

- [ ] **Step 4: Create the effect system shape template**

Create `src/document/types/active-effect/EffectSystemTemplate.js`:

```js
/**
 * Creates the canonical plain-object shape of a Titan Active Effect's `system` data (the 'effect'
 * subtype), mirroring the shape-built portion of `TitanActiveEffectDataModel._defineDocumentSchema()`:
 * the custom Titan duration, the item-check array, and the custom-trait array. The `changes` field is
 * NOT part of this shape — the Foundry v14 ActiveEffect verifier requires it as an ArrayField of a
 * typed SchemaField, which a shape cannot express, so it stays hand-built in the data model.
 *
 * Checks and custom traits are heterogeneous object bags, so the shape mirrors them with EMPTY arrays
 * (mapping to ArrayField(ObjectField), matching the data model). Plain data only, so it is shared by
 * the live Active Effect data model and the effect chat-message snapshot schema.
 * @returns {object} The effect `system` shape template.
 */
export default function createEffectSystemTemplate() {
   return {
      // Duration: the duration type, remaining turns, captured initiative, and custom description.
      duration: {
         type: 'turnStart',
         remaining: 1,
         initiative: 1,
         custom: '',
      },

      // Checks: an empty array maps to ArrayField(ObjectField), matching the data model.
      check: [],

      // Custom Traits: an empty array maps to ArrayField(ObjectField), matching the data model.
      customTrait: [],
   };
}
```

- [ ] **Step 5: Refactor `TitanActiveEffectDataModel._defineDocumentSchema()` to build from the template**

In `src/document/types/active-effect/TitanActiveEffectDataModel.js`, replace the hand-built
`duration`/`check`/`customTrait` blocks (lines 30-42) with the shape build, keep `changes`
hand-built, and reconcile imports. The schema method becomes:

```js
   /**
    * Defines the data schema for Titan Active Effect documents. The duration, check, and customTrait
    * fields are generated from the canonical effect shape template (the single source shared with the
    * effect chat-message snapshot schema); the changes field stays hand-built because the Foundry v14
    * verifier requires an ArrayField of a typed SchemaField, which a shape cannot express.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Duration, Checks, and Custom Traits, generated from the canonical effect shape template.
      Object.assign(schema, buildSchemaFromShape(createEffectSystemTemplate()));

      // Changes.
      // Foundry v14 requires every ActiveEffect type data model to define `changes` as an ArrayField whose
      // element is a SchemaField defining a numeric `priority` and string `type`/`phase` (see
      // Game##verifyActiveEffectModels). We keep our own permissive change shape — without core's restrictive
      // `type` validator or `blank: false` constraints — and supply those required fields so the verifier passes.
      schema.changes = createArrayField(createSchemaField({
         key: createStringField(),
         value: createDataField(''),
         mode: createIntegerField(0),
         priority: createIntegerField(0),
         type: createStringField(),
         phase: createStringField(),
      }));

      return schema;
   }
```

Import reconciliation at the top of the file:
- REMOVE (now unused): `createObjectField`, `createItemCheckTemplate`, `createCustomItemTraitTemplate`.
- KEEP (still used by `changes`): `createSchemaField`, `createStringField`, `createIntegerField`,
  `createArrayField`, `createDataField`.
- ADD:

```js
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEffectSystemTemplate from '~/document/types/active-effect/EffectSystemTemplate.js';
```

Nothing else in the file changes (`isExpired`, `isActive`, `isCombatEffect`,
`_getInitialDocumentData`, `getRollData` untouched).

- [ ] **Step 6: Run the golden master to prove byte-equivalence**

Run: `npm test -- EffectSchemaEquivalence`
Expected: PASS. This is the data-integrity gate: the refactored schema fingerprints identically to
the frozen hand-built golden. If it fails, the refactor changed the persisted shape — fix the
refactor (or the template), never the golden.

- [ ] **Step 7: Run the full unit suite**

Run: `npm test`
Expected: ALL PASS (154 + 1 new). The condition subtype, rules elements, and migrations all exercise
the AE data model transitively.

- [ ] **Step 8: Commit**

```bash
git add src/document/types/active-effect/EffectSystemTemplate.js src/document/types/active-effect/TitanActiveEffectDataModel.js
git commit -m "refactor(effect): build the Active Effect schema from createEffectSystemTemplate (golden-master gated)"
```

---

## Task 2: `EffectChatMessageDataModel` + golden master + registration

**Files:**
- Create: `src/document/types/active-effect/chat-message/EffectChatMessageDataModel.js`
- Modify: `tests/unit/EffectSchemaEquivalence.test.js` (add the chat golden + test)
- Modify: `src/hooks/OnceInit.js` (import + `CONFIG.ChatMessage.dataModels` entry, map at lines 118-144)
- Modify: `system.json` (`documentTypes.ChatMessage`, map at lines 41-67)
- Modify: `lang/en.json` (`TYPES.ChatMessage`, map at lines 925-951)

- [ ] **Step 1: Extend the golden-master test with the chat snapshot schema**

In `tests/unit/EffectSchemaEquivalence.test.js`:

(a) In `beforeAll`, after the `models.effect` import, add:

```js
   // Dynamically import the effect chat-message snapshot data model against the same stand-ins.
   models.effectChat = (
      await import('~/document/types/active-effect/chat-message/EffectChatMessageDataModel.js')
   ).default;
```

(b) After `EFFECT_DATA_MODEL_GOLDEN`, add the chat golden:

```js
/**
 * The committed golden fingerprint of the effect chat-message snapshot schema: the effect system
 * shape (duration/check/customTrait), the rules-element fragment, and the snapshot-only string
 * fields (description from the native ActiveEffect field; name and img as label metadata). Authored
 * from the shape templates (NOT derived from the schema, to avoid circularity).
 * @type {object}
 */
const EFFECT_CHAT_GOLDEN = {
   check: emptyObjectArray(),
   customTrait: emptyObjectArray(),
   description: stringField(''),
   documentVersion: numberField(0),
   duration: durationField(),
   img: stringField(''),
   name: stringField(''),
   rulesElement: emptyObjectArray(),
};
```

(c) In the `describe` block, add:

```js
   it('the EffectChatMessageDataModel snapshot schema fingerprint matches the committed golden', () => {
      // Fingerprint the chat snapshot schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models.effectChat._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(EFFECT_CHAT_GOLDEN));
   });
```

- [ ] **Step 2: Run the test to verify it FAILS (module does not exist)**

Run: `npm test -- EffectSchemaEquivalence`
Expected: FAIL — the dynamic import of `EffectChatMessageDataModel.js` cannot resolve.

- [ ] **Step 3: Create `EffectChatMessageDataModel`**

Create `src/document/types/active-effect/chat-message/EffectChatMessageDataModel.js` (the pattern is
`AbilityChatMessageDataModel.js`, but extending the universal chat base — the effect snapshot is not
an item system):

```js
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEffectSystemTemplate from '~/document/types/active-effect/EffectSystemTemplate.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';
import EffectChatMessage from '~/document/types/active-effect/chat-message/EffectChatMessage.svelte';

/**
 * Data model for effect chat messages. Its schema mirrors the effect's prepared roll-data snapshot:
 * the effect `system` shape (generated from the shared `createEffectSystemTemplate()` via
 * `buildSchemaFromShape`, the same single source the live Active Effect data model builds from), the
 * rules-element fragment, the native description, and the label metadata the card needs that is NOT
 * part of the effect's `system` (the effect's `name` and `img`). The card reads
 * `document.data.system.X` exactly as the legacy card read the flags payload root.
 * @extends {TitanChatMessageDataModel}
 */
export default class EffectChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the document schema for effect chat messages: the shared effect system shape, the
    * rules-element fragment, the native description, and the snapshotted name and image.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape({
            ...createEffectSystemTemplate(),
            ...createRulesElementTemplate(),
            description: '',
            name: '',
            img: '',
         }),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return EffectChatMessage;
   }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- EffectSchemaEquivalence`
Expected: PASS (2 tests).

- [ ] **Step 5: Register the subtype**

(a) `src/hooks/OnceInit.js` — add the import alongside the other `*ChatMessageDataModel` imports:

```js
import EffectChatMessageDataModel from '~/document/types/active-effect/chat-message/EffectChatMessageDataModel.js';
```

and add the key to `CONFIG.ChatMessage.dataModels` after `commodity:` (line 130), before the report
block:

```js
      effect: EffectChatMessageDataModel,
```

(b) `system.json` — in `documentTypes.ChatMessage`, after `"commodity": {},` (line 53):

```json
         "effect": {},
```

(c) `lang/en.json` — in `TYPES.ChatMessage`, after `"commodity": "Commodity",` (line 937):

```json
         "effect": "Effect",
```

- [ ] **Step 6: Build to prove the shipping bundle compiles**

Run: `npm run build`
Expected: clean build, no errors.

- [ ] **Step 7: Run the full unit suite**

Run: `npm test`
Expected: ALL PASS.

- [ ] **Step 8: Commit**

```bash
git add src/document/types/active-effect/chat-message/EffectChatMessageDataModel.js tests/unit/EffectSchemaEquivalence.test.js src/hooks/OnceInit.js system.json lang/en.json
git commit -m "feat(chat): register the effect chat-message subtype with a shape-built snapshot schema"
```

---

## Task 3: Producer migration — `buildChatMessageData()` + `sendToChat()` rewrite

**Files:**
- Create: `tests/unit/EffectBuildChatMessageData.test.js`
- Modify: `src/document/types/active-effect/TitanActiveEffect.js:188-222` (`sendToChat`)

- [ ] **Step 1: Write the failing producer test**

Create `tests/unit/EffectBuildChatMessageData.test.js` (the pattern is
`tests/unit/BuildChatMessageData.test.js`; `TitanActiveEffect` extends the global `ActiveEffect`
document class and its module graph pulls in dialog classes that destructure
`foundry.applications.api.ApplicationV2` at import time):

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// TitanActiveEffect extends the global ActiveEffect document class, and its module graph pulls in
// dialog classes that destructure foundry.applications.api.ApplicationV2 at import time. The shared
// test setup does not provide those globals, so this suite installs minimal stand-ins before
// dynamically importing TitanActiveEffect, then exercises the pure buildChatMessageData() method via
// the prototype (no document construction needed). Dynamic import is permitted in tests (the
// no-dynamic-import rule governs the shipping bundle only).

/** @type {Function} Holds the dynamically imported TitanActiveEffect class. */
let TitanActiveEffect;

beforeAll(async () => {
   // Stand-in for the global Foundry ActiveEffect document class TitanActiveEffect extends.
   globalThis.ActiveEffect = class {};

   // Stand-in for foundry.applications.api.ApplicationV2, destructured by the dialog modules at import.
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };

   TitanActiveEffect = (await import('~/document/types/active-effect/TitanActiveEffect.js')).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.ActiveEffect;
   delete globalThis.foundry.applications;
});

/**
 * Builds a stub TitanActiveEffect exposing only what buildChatMessageData() reads: the document's
 * getRollData() output (the prepared snapshot, with document-level id/name/img/type plus the
 * prepared system fields and the native description).
 * @param {object} rollData - The object the stubbed getRollData() returns.
 * @returns {object} A stub bound as `this` for buildChatMessageData().
 */
function makeStubEffect(rollData) {
   return {
      getRollData: () => rollData,
   };
}

describe('TitanActiveEffect#buildChatMessageData', () => {
   it('returns { type: effect, system } with the prepared snapshot fields plus name and img', () => {
      // An effect roll-data snapshot: document-level keys plus the prepared effect system fields.
      const rollData = {
         id: 'fx123',
         name: 'Blessing',
         img: 'icons/effect.webp',
         type: 'effect',
         rulesElement: [],
         description: '<p>Blessed.</p>',
         duration: {
            type: 'turnStart',
            remaining: 3,
            initiative: 12,
            custom: '',
         },
         check: [
            {
               label: 'Blessing Check',
               attribute: 'body',
            },
         ],
         customTrait: [
            {
               name: 'Holy',
               description: 'Radiant.',
            },
         ],
      };
      const result = TitanActiveEffect.prototype.buildChatMessageData.call(makeStubEffect(rollData));

      // Top-level shape: the type selects the chat-message subtype, the rest lives under system.
      expect(result.type).toBe('effect');
      expect(Object.keys(result)).toEqual([
         'type',
         'system',
      ]);

      // The prepared snapshot fields survive at system.X (path parity with the legacy flags root).
      expect(result.system.description).toBe('<p>Blessed.</p>');
      expect(result.system.duration).toEqual(rollData.duration);
      expect(result.system.check).toEqual(rollData.check);
      expect(result.system.customTrait).toEqual(rollData.customTrait);
      expect(result.system.rulesElement).toEqual([]);

      // name and img are folded into system as label metadata.
      expect(result.system.name).toBe('Blessing');
      expect(result.system.img).toBe('icons/effect.webp');

      // The document-level id and type are dropped from system (carried by the chat document itself).
      expect(result.system.id).toBeUndefined();
      expect(result.system.type).toBeUndefined();
   });

   it('hardcodes the effect chat subtype even when the roll data reports another document subtype', () => {
      // A condition's roll data reports type 'condition' — not a registered chat subtype. The chat
      // type must be forced to 'effect', matching the legacy producer's forced type flag.
      const rollData = {
         id: 'cond1',
         name: 'Stunned',
         img: 'icons/stunned.webp',
         type: 'condition',
         rulesElement: [],
      };
      const result = TitanActiveEffect.prototype.buildChatMessageData.call(makeStubEffect(rollData));

      expect(result.type).toBe('effect');
      expect(result.system.name).toBe('Stunned');
      expect(result.system.type).toBeUndefined();
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- EffectBuildChatMessageData`
Expected: FAIL — `buildChatMessageData` is not a function on `TitanActiveEffect.prototype`.

- [ ] **Step 3: Implement `buildChatMessageData()` and rewrite `sendToChat()`**

In `src/document/types/active-effect/TitanActiveEffect.js`, replace the current `sendToChat()`
(lines 188-222) with the pair below (byte-parallel to `TitanItem.js:46-86`). The redundant
`description: this.description` is dropped — the data model's `getRollData()` already appends the
native description.

```js
   /**
    * Builds the chat-message data for this effect's chat card. The chat subtype is ALWAYS 'effect'
    * (matching the legacy forced type flag; a condition's own subtype is not a registered chat
    * subtype), and the prepared roll-data snapshot becomes `message.system`; the document-level `id`
    * and `type` are dropped (the chat document carries its own `id`, and `type` is returned at the
    * top level to select the chat-message subtype). Pure and side-effect free so it is unit-testable
    * without `ChatMessage.create`.
    * @returns {object} The chat message data `{ type, system }`, where `type` selects the
    * chat-message subtype and `system` is the prepared effect snapshot plus `name` and `img`.
    */
   buildChatMessageData() {
      // The prepared roll data: the document-level id/name/img/type plus the prepared system fields.
      const rollData = this.getRollData();

      // Separate the document-level keys from the prepared system fields.
      const { id, type, name, img, ...systemData } = rollData;

      return {
         type: 'effect',
         system: {
            ...systemData,
            name,
            img,
         },
      };
   }

   /**
    * Creates a Chat Message containing this effect's data and sends it to chat as a first-class
    * chat-message subtype (`type` + `system`), preserving the speaker, style, sound, and roll mode.
    * @returns {Promise<ChatMessage>} The newly created Chat Message.
    */
   async sendToChat() {
      /** @type {Actor|undefined} - The owning actor, used for the chat speaker when available. */
      const actor = this.parent?.documentName === 'Actor' ? this.parent : void 0;

      // Build the typed chat-message payload (type + prepared system snapshot).
      const messageData = this.buildChatMessageData();

      // Create and post the message.
      return ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               ...messageData,
               user: game.user.id,
               speaker: actor?.getSpeaker() ?? ChatMessage.getSpeaker(),
               style: CONST.CHAT_MESSAGE_STYLES.OTHER,
               sound: CONFIG.sounds.notification,
               classes: ['titan'],
            },
            game.settings.get('core', 'rollMode'),
         ),
      );
   }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- EffectBuildChatMessageData`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/EffectBuildChatMessageData.test.js src/document/types/active-effect/TitanActiveEffect.js
git commit -m "feat(chat): effect sendToChat emits the typed effect subtype via buildChatMessageData"
```

---

## Task 4: Card sweep, dark-mode relocation, legacy path deletion

**Files:**
- Modify: `src/document/types/active-effect/chat-message/EffectChatMessage.svelte:12`
- Modify: `src/document/types/chat-message/ChatMessage.js:24-31` (`renderHTML`)
- Modify: `src/index.js:10,23`
- Delete: `src/hooks/OnRenderChatMessageHTML.js`
- Delete: `src/document/types/chat-message/ChatMessageShell.svelte`

- [ ] **Step 1: Repoint the effect card to the typed system snapshot**

In `src/document/types/active-effect/chat-message/EffectChatMessage.svelte`, change line 12 (and its
comment) from:

```js
   /** @type {object} The titan flags data for the item. */
   const item = document.data.flags.titan;
```

to:

```js
   /** @type {object} The chat-message system snapshot for the effect. */
   const item = document.data.system;
```

Nothing else in the file changes — `ItemChatMessageShell`, `ItemChatChecks`, `EffectChatStats`, and
`RichText` are prop-fed and already serve the migrated item cards.

- [ ] **Step 2: Relocate the dark-mode-`'all'` branch into `TitanChatMessage.renderHTML`**

In `src/document/types/chat-message/ChatMessage.js`, the legacy hook's `else` branch (apply
`titan-dark-mode` to NON-TITAN messages when the setting is `'all'`) moves into the non-TITAN early
return. Replace lines 28-31:

```js
      // Non-TITAN messages render unchanged.
      if (!(this.system instanceof TitanChatMessageDataModel)) {
         return html;
      }
```

with:

```js
      // Non-TITAN messages render unchanged, except dark mode applies to every message when the
      // setting is 'all' (previously handled by the deleted legacy renderChatMessageHTML hook).
      if (!(this.system instanceof TitanChatMessageDataModel)) {
         if (darkModeChatMessages() === 'all') {
            html.classList.add('titan-dark-mode');
         }
         return html;
      }
```

(`darkModeChatMessages` is already imported in this file at line 5.) Also update the class JSDoc
sentence "all other messages render unchanged" to mention the dark-mode-`'all'` class, e.g.:
"all other messages render unchanged apart from the dark-mode-`'all'` styling class."

- [ ] **Step 3: Delete the legacy render path**

```bash
git rm src/hooks/OnRenderChatMessageHTML.js src/document/types/chat-message/ChatMessageShell.svelte
```

In `src/index.js`, remove line 10:

```js
import onRenderChatMessageHTML from '~/hooks/OnRenderChatMessageHTML.js';
```

and line 23:

```js
Hooks.on('renderChatMessageHTML', onRenderChatMessageHTML);
```

`OnPreDeleteChatMessage.js` stays untouched (its `message?._teardownComponent?.()` reads the same
`_svelteComponent` slot `TitanChatMessage` populates).

- [ ] **Step 4: Run the grep gates**

```bash
git grep -n "OnRenderChatMessageHTML" -- src
git grep -n "ChatMessageShell" -- src
git grep -n "flags\.titan" -- src
```

Expected:
- `OnRenderChatMessageHTML`: ZERO hits.
- `ChatMessageShell`: hits ONLY for `ItemChatMessageShell` / `*ReportChatMessageShell` (different
  components); zero hits for the deleted `~/document/types/chat-message/ChatMessageShell.svelte`.
- `flags\.titan`: hits ONLY in the legitimate document-flag users — `src/system/Macros.js`,
  `src/system/Conditions.js` (comment), `src/helpers/migration/ConvertEffectItemsToActiveEffects.js`
  (comment), `src/document/types/actor/types/character/CharacterDataModel.js:~5160` (condition
  description flag), and `src/document/types/item/TitanItem.js` (`_preCreate` uuid flag). ZERO hits
  in `src/hooks/`, `src/document/types/active-effect/chat-message/`, or any chat-message component.

If any unexpected hit appears, STOP and fix it (this gate is the sweep-completeness proof).

- [ ] **Step 5: Build and run the full unit suite**

Run: `npm run build`
Expected: clean build (proves no dangling imports of the deleted files).

Run: `npm test`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add src/document/types/active-effect/chat-message/EffectChatMessage.svelte src/document/types/chat-message/ChatMessage.js src/index.js
git commit -m "feat(chat): delete the legacy chat render path; dark-mode-all relocates to renderHTML"
```

(The `git rm` from Step 3 is already staged.)

---

## Task 5: E2E — effect card + dark-mode regression

**Files:**
- Create: `tests/e2e/effect-chat-card.spec.js`

**Precondition (USER ACTION):** `system.json` changed in Task 2, so the e2e world must be RESTARTED
(server relaunch, not browser refresh) on a freshly built `dist/` — a stale world rejects
`ChatMessage.create({type: 'effect'})` as an invalid type. Run `npm run build` first, then ask the
user to relaunch the world at `:30000` before running anything in this task.

- [ ] **Step 1: Write the e2e spec**

Create `tests/e2e/effect-chat-card.spec.js`. Patterns: file-shared page (`item-cards.spec.js`),
inline check template + token control (`effect-checks.spec.js`, `effect-hud.spec.js:37-67` — the
card's check button rolls for CONTROLLED character tokens via `getControlledCharacters()`, so the
fixture controls a token).

```js
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/**
 * Effect chat cards are first-class `ChatMessage` subtypes (Phase 4). `effect.sendToChat()` creates a
 * message whose `type` is 'effect' and whose `system` is the effect's prepared roll-data snapshot
 * (duration/check/customTrait/rulesElement/description plus `name`/`img`); the message self-renders
 * via `TitanChatMessage#renderHTML`. This spec asserts the posted subtype, the rendered card content
 * (name, description, custom trait), and that the card's embedded check button rolls an itemCheck
 * through the controlled character. It also locks in the dark-mode-'all' relocation: with the
 * legacy hook deleted, non-TITAN messages must still receive the titan-dark-mode class from
 * TitanChatMessage#renderHTML when the setting is 'all'.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

// The fixture actor (with a controlled token) and its single seeded effect.
const ACTOR_NAME = 'E2E Effect Card Actor';
const EFFECT_NAME = 'E2E Card Effect';
const EFFECT_DESCRIPTION = '<p>Effect card description body.</p>';
const TRAIT_NAME = 'E2E Card Trait';
const CHECK_LABEL = 'E2E Effect Card Check';

test.describe('effect chat-message subtype card', () => {
   // Build the actor with a controlled token (the card's check button rolls for controlled character
   // tokens) and one effect carrying a description, a custom trait, and a complete check[] entry.
   test.beforeEach(async () => {
      await page.evaluate(async ({ actorName, effectName, effectDescription, traitName, checkLabel }) => {
         // Remove any stale fixture so each run starts clean.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // Create the actor and place a token for it on the active scene.
         const actor = await Actor.create({ name: actorName, type: 'player' });
         const scene = game.scenes.active ?? (await Scene.create({ name: 'E2E Effect Card Scene', active: true }));
         const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
            await actor.getTokenDocument({ x: 100, y: 100 }),
         ]);

         // Poll until the placeable is drawn on the canvas, then control it. A fixed delay races canvas
         // readiness and can no-op when the placeable is not yet drawn.
         await new Promise((resolve) => {
            /** @type {number} The remaining poll attempts before giving up. */
            let attempts = 50;

            /** @type {number} The interval handle used to poll for the placeable. */
            const handle = setInterval(() => {
               attempts -= 1;
               if (tokenDoc.object || attempts <= 0) {
                  clearInterval(handle);
                  resolve();
               }
            }, 50);
         });
         tokenDoc.object?.control({ releaseOthers: true });

         // One effect with a description, a custom trait, and a single COMPLETE check[] entry. The
         // check object mirrors createItemCheckTemplate() (src/check/types/item-check/
         // ItemCheckTemplate.js) — the template module is not importable in the browser context, so
         // the full default object is inlined; omitting fields like opposedCheck makes
         // getItemCheckParameters throw.
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               description: effectDescription,
               system: {
                  customTrait: [
                     {
                        name: traitName,
                        description: 'Trait for the effect card e2e.',
                        uuid: 'e2ecafd0-e2ec-4afd-8afd-e2ecafd0e2ec',
                     },
                  ],
                  check: [
                     {
                        attribute: 'body',
                        complexity: 1,
                        damageReducedBy: 'none',
                        difficulty: 4,
                        initialValue: 1,
                        isDamage: false,
                        isHealing: false,
                        label: checkLabel,
                        opposedCheck: {
                           attribute: 'body',
                           enabled: false,
                           skill: 'athletics',
                        },
                        resistanceCheck: 'none',
                        resolveCost: 0,
                        scaling: true,
                        skill: 'arcana',
                        uuid: 'e2ecafd1-e2ec-4afd-8afd-e2ecafd1e2ec',
                     },
                  ],
               },
            },
         ]);
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
         effectDescription: EFFECT_DESCRIPTION,
         traitName: TRAIT_NAME,
         checkLabel: CHECK_LABEL,
      });
   });

   test('sendToChat posts an effect subtype whose card renders and whose check button rolls', async () => {
      // Post the effect's chat card and report the new message's id and subtype.
      const result = await page.evaluate(async ({ actorName, effectName }) => {
         const actor = game.actors.getName(actorName);
         const effect = actor.effects.find((e) => e.name === effectName);

         // Snapshot the message count so the post can be awaited deterministically.
         const before = game.messages.size;
         const message = await effect.sendToChat();
         await titanWait(() => game.messages.size > before, { message: 'new chat message' });

         return {
            before,
            after: game.messages.size,
            messageId: message?.id,
            messageType: message?.type,
         };
      }, { actorName: ACTOR_NAME, effectName: EFFECT_NAME });

      // A new message must have been created with the effect subtype.
      expect(result.after, 'message count should increase after sendToChat').toBeGreaterThan(result.before);
      expect(result.messageId, 'posted message id').toBeTruthy();
      expect(result.messageType, 'message subtype is effect').toBe('effect');

      // The mounted effect card must be present and visible in the rendered chat log.
      const card = page.locator(`.message[data-message-id="${result.messageId}"] .item-chat-message`).first();
      await expect(card, 'mounted effect card is visible').toBeVisible();

      // The snapshot name, description, and custom trait must render on the card.
      await expect(card.getByText(EFFECT_NAME, { exact: false }), 'card displays the effect name').toBeVisible();
      await expect(
         card.getByText('Effect card description body.', { exact: false }),
         'card displays the effect description',
      ).toBeVisible();
      await expect(card.getByText(TRAIT_NAME, { exact: false }), 'card displays the custom trait').toBeVisible();

      // Click the embedded check button and await the resulting itemCheck message (the button rolls
      // through the controlled character token).
      const beforeRoll = await page.evaluate(() => game.messages.size);
      await card.getByRole('button').filter({ hasText: CHECK_LABEL }).first().click();
      await expect
         .poll(
            () => page.evaluate((count) => {
               const newest = game.messages.contents[game.messages.size - 1];
               return game.messages.size > count ? newest?.type : undefined;
            }, beforeRoll),
            { message: 'check click posts an itemCheck message' },
         )
         .toBe('itemCheck');

      // No uncaught errors may have fired during the card lifecycle.
      expect(errors, `uncaught errors during effect card lifecycle:\n${errors.join('\n')}`).toEqual([]);
   });

   test('dark mode "all" classes non-TITAN messages; "systemOnly" does not', async () => {
      // Render a plain (non-TITAN) message under each dark-mode setting and report the classes the
      // chat-log element received from TitanChatMessage#renderHTML (the relocated legacy-hook branch).
      const observed = await page.evaluate(async () => {
         /** @type {string} The original setting value, restored after the probe. */
         const original = game.settings.get('titan', 'darkModeChatMessages');

         /**
          * Posts a plain chat message under the given dark-mode setting and reads back the rendered
          * chat-log element's relevant classes.
          * @param {string} settingValue - The darkModeChatMessages value to probe under.
          * @returns {Promise<object>} The observed { darkMode, titan } class flags.
          */
         async function probe(settingValue) {
            await game.settings.set('titan', 'darkModeChatMessages', settingValue);
            const message = await ChatMessage.create({ content: `Dark-mode probe ${settingValue}` });
            await titanWait(
               () => !!globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`),
               { message: 'plain message rendered' },
            );
            const li = globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`);
            return {
               darkMode: !!li?.classList.contains('titan-dark-mode'),
               titan: !!li?.classList.contains('titan'),
            };
         }

         const all = await probe('all');
         const systemOnly = await probe('systemOnly');

         // Restore the original setting so later tests see the world default.
         await game.settings.set('titan', 'darkModeChatMessages', original);

         return { all, systemOnly };
      });

      // 'all' must class plain messages with titan-dark-mode (without the titan system class).
      expect(observed.all.darkMode, 'dark mode all classes a plain message').toBe(true);
      expect(observed.all.titan, 'plain message never gets the titan class').toBe(false);

      // 'systemOnly' must leave plain messages unclassed.
      expect(observed.systemOnly.darkMode, 'systemOnly leaves a plain message unclassed').toBe(false);

      expect(errors, `uncaught errors during dark-mode probe:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Build and request the world relaunch**

Run: `npm run build`
Expected: clean build.

Then ASK THE USER to relaunch the e2e world at `:30000` (server restart — the `documentTypes`
manifest change from Task 2 is baked at world load). Do not proceed until confirmed.

- [ ] **Step 3: Run the new spec**

Run: `npm run test:e2e -- effect-chat-card`
Expected: 2 PASS. If `ChatMessage.create` rejects `type: 'effect'` as invalid, the world was not
restarted — re-request the relaunch.

- [ ] **Step 4: Run the FULL e2e suite (background, ~15 min)**

Run: `npm run test:e2e`
Expected: ALL PASS (380 + 2 new; the legacy-hook deletion must not regress any other chat spec —
checks, item cards, reports, context menu, dark-mode-sensitive specs).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/effect-chat-card.spec.js
git commit -m "test(chat): e2e for the effect subtype card, check roll, and dark-mode-all relocation"
```

---

## Task 6: Docs + titan-codebase skill

**Files:**
- Modify: `docs/TODO.md`
- Modify: `.claude/skills/titan-codebase/SKILL.md` (+ `references/*.md` as grep finds)

- [ ] **Step 1: Update `docs/TODO.md`**

Read `docs/TODO.md`. Apply:
- Mark the chat-message-subtypes effort (Phase 4 / the roadmap item) DONE — delete the item per the
  project rule (completed items are deleted, not checked off).
- Delete the ChatMessageShell dead-entries cleanup note (resolved by the file's deletion).
- Leave #13 (`effectsExpiredReport` e2e trigger) and the NPC `overkillDamage` note untouched — both
  are explicitly out of scope.

- [ ] **Step 2: Update the `titan-codebase` skill**

```bash
git grep -n "OnRenderChatMessageHTML\|ChatMessageShell\|flags.titan" -- .claude/skills/titan-codebase
```

For every hit, update to the post-Phase-4 reality:
- `SKILL.md` "High-level architecture": the sentence "Only the `effect` chat card still travels in
  `flags.titan` and renders through the legacy `OnRenderChatMessageHTML` hook + `ChatMessageShell.svelte`
  (Phase 4 will retire both)." becomes a statement that ALL chat messages (checks, item cards, the 13
  reports, and the effect card) are first-class self-rendering subtypes and the legacy hook/shell are
  deleted. Mention that `TitanActiveEffectDataModel` and `EffectChatMessageDataModel` build from the
  shared `createEffectSystemTemplate()` shape.
- `references/*.md`: correct any legacy-render-path or `flags.titan`-chat-payload statements the grep
  surfaces (architecture/abstractions/data-flow/conventions). Do not restate style rules; keep entries
  durable, verified, concise.

- [ ] **Step 3: Commit**

```bash
git add docs/TODO.md .claude/skills/titan-codebase
git commit -m "docs(chat): Phase 4 done — chat subtypes complete; skill reflects the deleted legacy path"
```

---

## Completion checklist (for the final holistic review)

- [ ] Golden master proves the live AE schema is byte-identical pre/post refactor.
- [ ] `npm test` green (expect 158: 154 + 2 schema goldens + 2 producer).
- [ ] Full `npm run test:e2e` green (382 expected).
- [ ] Grep gates from Task 4 Step 4 all clean.
- [ ] `npm run build` clean; `dist/` carries no reference to the deleted files.
- [ ] Docs + skill updated (Task 6).
