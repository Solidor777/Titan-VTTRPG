# Pack Effect-Item Conversion + Invalid-Document Repair — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Per project CLAUDE.md, all `.js` implementation work is routed to the `titan-svelte-dev` subagent with `svelte-5`,
> `foundry-vtt`, and `foundry-svelte` skills loaded.

**Goal:** Make the legacy effect-Item converter see invalid (unregistered-subtype) items via raw `_source` discovery,
and extend it to convert actors inside world Actor compendium packs (index-gated, auto-unlock/restore).

**Architecture:** All shipping changes live in `src/helpers/migration/ConvertEffectItemsToActiveEffects.js`. Discovery
moves from `actor.items` (blind to invalid documents) to `actor._source.items` (sees everything). A new pack path
appends to the module's default every-load function: world Actor packs are scanned via a summary index projection
(`pack.getIndex({ fields: ['items'] })` — per-item index fields only, no document construction); only packs that
actually carry legacy items get unlocked, converted, and restored. Replacement AEs carry a
`flags.titan.convertedFromItem` provenance stamp and `convertActor` skips already-converted sources, making the
create step idempotent under retry (user-approved design delta from the buddy check). Spec: `docs/superpowers/specs/2026-06-06-pack-effect-item-conversion-design.md`.

**Tech Stack:** Foundry v14 client API (CompendiumCollection, embedded-document CRUD), Vitest (unit), Playwright (e2e).

**Verified ground truth (buddy-checked by two independent reviewers, 2026-06-06):**
- Unregistered-subtype documents throw in `DocumentTypeField._validateType` and land in
  `EmbeddedCollection#invalidDocumentIds`, excluded from `actor.items` iteration (v14
  `common/data/fields.mjs:4186`, `common/abstract/embedded-collection.mjs:152-216`).
- Deleting invalid embedded documents by id works: the client backend resolves deletion targets with
  `collection.get(id, {strict: true, invalid: true})` (v14 `client/data/client-backend.mjs:403`).
- `TitanItem` defines no `_preDelete`/`_onDelete`. HOWEVER, deletion builds a temp doc (`getInvalid` →
  `fromSource`) whose `_safePrepareData` runs `TitanItem.prepareDerivedData` against a plain-object `system` — a
  caught TypeError logged as one red `Failed data preparation` error per legacy item. Stale worlds ALSO already
  emit one red `Failed to initialize Item … "effect" is not a valid type` per legacy item on every load. Both
  classes are EXPECTED on the conversion load and absent on the next — brief the manual verifier (Task 6).
- `pack.getIndex({ fields: ['items'] })` does NOT return raw item sources: the server projects each embedded item
  to the Item `compendiumIndexFields` + `_id` — `{ _id, name, img, type, sort, folder }`, **no `system`** — with no
  validation, so invalid-typed (`effect`) entries ARE included and `type` IS readable (all the gate needs). The
  scan retains these summary arrays in each pack's client index for the session, and they go stale after
  conversion — harmless here, a trap for future same-session index consumers.
- Raw source carries every field `buildEffectData` reads, but WITHOUT schema casting: template-era source
  (verified at `2edf6262^:template.json`) persisted `active` as a STRING and may lack `check`/`customTrait`.
  `buildEffectData` therefore normalizes `active` defensively (defense-in-depth: the one verified template-era
  value `"active": "true"` happens to convert outcome-identically, and the era's toggle wrote booleans — no actual
  misconversion case exists in this repo's history).
- The unit setup (`tests/setup.js`) provides `foundry.utils.mergeObject` but NOT `foundry.utils.deepClone` and no
  `ui` global — the new suite installs scoped stand-ins (established pattern, see
  `tests/unit/EffectBuildChatMessageData.test.js`).

---

### Task 0: Branch

**Files:** none

- [ ] **Step 1: Create the feature branch**

```powershell
git -C C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan checkout -b feat/pack-effect-item-conversion
```

Expected: `Switched to a new branch 'feat/pack-effect-item-conversion'`.

---

### Task 1: Raw-source contract tests for `buildEffectData` (characterization)

`buildEffectData` already reads only raw-source-shaped fields, so these tests pass against current code. They lock
the raw-source contract BEFORE `convertActor` starts handing the function raw entries, and they are the file's
shared scaffolding (stand-ins + fixtures) for Tasks 2-3.

**Import staging (buddy-check finding):** the file imports ONLY symbols that exist at each task — Task 1 imports
`buildEffectData` + `convertActor` (both exported today); Task 3 extends the import line when the pack symbols are
implemented. Every task therefore ends with this suite executing green; no commit carries a non-evaluating module.

**Files:**
- Create: `tests/unit/ConvertEffectItemsToActiveEffects.test.js`

- [ ] **Step 1: Write the test file with shared stand-ins, fixtures, and the `buildEffectData` suite**

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
   buildEffectData,
   convertActor,
} from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';

// The converter module imports only log/error at module scope, so a static import is safe. The shared test setup
// (tests/setup.js) provides a minimal globalThis.foundry without utils.deepClone, and no ui global; this suite
// installs scoped stand-ins for both (deepClone backs buildEffectData's field copies; ui.notifications.error backs
// the error() helper exercised by the isolation tests) and removes them so later suites keep the shared minimal mock.

/** @type {string[]} - Messages recorded by the ui.notifications.error stand-in (reset after each test). */
const uiErrors = [];

beforeAll(() => {
   // Stand-in for foundry.utils.deepClone, used by buildEffectData to copy the four migrated system fields.
   globalThis.foundry.utils.deepClone = (value) => structuredClone(value);

   // Recording stand-in for the ui global, used by the error() helper on the isolation paths.
   globalThis.ui = {
      notifications: {
         error: (message) => {
            uiErrors.push(message);
         },
      },
   };
});

afterEach(() => {
   // Reset the recorded error messages so assertions never see another test's errors.
   uiErrors.length = 0;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.utils.deepClone;
   delete globalThis.ui;
});

/**
 * Builds a raw legacy effect-Item source entry (the shape of an actor._source.items element).
 * @param {object} [overrides] - Field overrides merged shallowly over the defaults.
 * @returns {object} The raw item source fixture.
 */
function makeLegacyItemSource(overrides = {}) {
   return {
      _id: 'legacyitem000001',
      name: 'Legacy Effect',
      type: 'effect',
      img: 'icons/legacy.webp',
      system: {
         description: '<p>Legacy.</p>',
         active: true,
         duration: {
            type: 'turnStart',
            remaining: 2,
            initiative: 7,
            custom: '',
         },
         rulesElement: [
            {
               operation: 'flatModifier',
            },
         ],
         check: [],
         customTrait: [],
      },
      ...overrides,
   };
}

/**
 * Builds a fake actor exposing only what convertActor reads: raw _source.items, the effects array, and recording
 * embedded-CRUD stubs.
 * @param {object} [options] - The fake's contents.
 * @param {object[]} [options.items] - Raw item source entries for _source.items.
 * @param {object[]} [options.effects] - Active Effect stand-ins for the actor.effects array.
 * @returns {object} The fake actor; its calls array records [method, embeddedName, payload] triples in order.
 */
function makeFakeActor({ items = [], effects = [] } = {}) {
   /** @type {Array<[string, string, *]>} - Recorded embedded-CRUD calls as [method, embeddedName, payload]. */
   const calls = [];

   return {
      name: 'Fake Actor',
      id: 'fakeactor0000001',
      _source: {
         items,
      },
      effects,
      calls,
      createEmbeddedDocuments: async (embeddedName, data) => {
         calls.push(['create', embeddedName, data]);
      },
      deleteEmbeddedDocuments: async (embeddedName, ids) => {
         calls.push(['delete', embeddedName, ids]);
      },
   };
}

describe('buildEffectData (raw source contract)', () => {
   it('maps the core raw source fields onto effect AE creation data', () => {
      const result = buildEffectData(makeLegacyItemSource());

      expect(result.name).toBe('Legacy Effect');
      expect(result.img).toBe('icons/legacy.webp');
      expect(result.type).toBe('effect');
      expect(result.description).toBe('<p>Legacy.</p>');
      expect(result.disabled).toBe(false);
      expect(result.system).toEqual({
         rulesElement: [
            {
               operation: 'flatModifier',
            },
         ],
         duration: {
            type: 'turnStart',
            remaining: 2,
            initiative: 7,
            custom: '',
         },
         check: [],
         customTrait: [],
      });
   });

   it('starts disabled only for explicitly-deactivated permanent effects', () => {
      /** @type {object} - A permanent, explicitly-deactivated legacy item source. */
      const inactivePermanent = makeLegacyItemSource();
      inactivePermanent.system.duration.type = 'permanent';
      inactivePermanent.system.active = false;

      /** @type {object} - A permanent, active legacy item source. */
      const activePermanent = makeLegacyItemSource();
      activePermanent.system.duration.type = 'permanent';
      activePermanent.system.active = true;

      /** @type {object} - A non-permanent, deactivated legacy item source (still starts enabled). */
      const inactiveTimed = makeLegacyItemSource();
      inactiveTimed.system.active = false;

      expect(buildEffectData(inactivePermanent).disabled).toBe(true);
      expect(buildEffectData(activePermanent).disabled).toBe(false);
      expect(buildEffectData(inactiveTimed).disabled).toBe(false);
   });

   it('deep-clones the migrated system fields and defaults a missing description to an empty string', () => {
      /** @type {object} - A legacy item source without a description. */
      const source = makeLegacyItemSource();
      delete source.system.description;

      const result = buildEffectData(source);
      result.system.duration.remaining = 99;

      expect(result.description).toBe('');
      expect(source.system.duration.remaining).toBe(2);
   });
});
```

- [ ] **Step 2: Run the new suite — all `buildEffectData` characterization cases pass**

Run: `npm test -- ConvertEffectItemsToActiveEffects`
Expected: PASS — these cases characterize the current function against the raw-source shape (the function already
reads only raw-compatible fields). The field-level assertions (not a whole-object `toEqual`) stay green when Task 2
adds the provenance `flags` to the creation data.

- [ ] **Step 3: Commit the green characterization scaffolding**

```powershell
git add tests/unit/ConvertEffectItemsToActiveEffects.test.js
git commit -m "test(migration): raw-source characterization suite for buildEffectData"
```

---

### Task 2: `convertActor` discovers legacy items from raw `_source` (fixes OPEN_BUGS #8) + `active` normalization + provenance flag

Three behavior changes land together because they share one write path: discovery moves to raw `_source.items`,
`buildEffectData` normalizes the uncast raw `active` value and stamps `flags.titan.convertedFromItem`, and
`convertActor` skips creating replacements whose source id already has a surviving converted AE (retry-idempotent
create — the user-approved fix for the create-succeeded/delete-failed duplicate window).

**Files:**
- Modify: `src/helpers/migration/ConvertEffectItemsToActiveEffects.js:36-72` (`convertActor`), `:4-34`
  (`buildEffectData`)
- Test: `tests/unit/ConvertEffectItemsToActiveEffects.test.js`

- [ ] **Step 1: Add the normalization, provenance, and `convertActor` test suites**

Append to `tests/unit/ConvertEffectItemsToActiveEffects.test.js`:

```js
describe('buildEffectData (raw active normalization + provenance)', () => {
   it('normalizes template-era string active values like BooleanField casting would', () => {
      /** @type {object} - A permanent legacy source whose active value is the template-era string 'false'. */
      const stringFalse = makeLegacyItemSource();
      stringFalse.system.duration.type = 'permanent';
      stringFalse.system.active = 'false';

      /** @type {object} - A permanent legacy source whose active value is the template-era string 'true'. */
      const stringTrue = makeLegacyItemSource();
      stringTrue.system.duration.type = 'permanent';
      stringTrue.system.active = 'true';

      expect(buildEffectData(stringFalse).disabled).toBe(true);
      expect(buildEffectData(stringTrue).disabled).toBe(false);
   });

   it('defaults a missing active key to the schema default (enabled)', () => {
      /** @type {object} - A permanent legacy source with no active key at all (sparse pre-schema source). */
      const sparse = makeLegacyItemSource();
      sparse.system.duration.type = 'permanent';
      delete sparse.system.active;

      expect(buildEffectData(sparse).disabled).toBe(false);
   });

   it('passes missing check/customTrait through as undefined (filled by schema initials at creation)', () => {
      /** @type {object} - A template-era source lacking the later-added check and customTrait fields. */
      const sparse = makeLegacyItemSource();
      delete sparse.system.check;
      delete sparse.system.customTrait;

      const result = buildEffectData(sparse);

      expect(result.system.check).toBeUndefined();
      expect(result.system.customTrait).toBeUndefined();
   });

   it('stamps the source item id as the convertedFromItem provenance flag', () => {
      const result = buildEffectData(makeLegacyItemSource());

      expect(result.flags).toEqual({
         titan: {
            convertedFromItem: 'legacyitem000001',
         },
      });
   });
});

describe('convertActor (raw _source discovery)', () => {
   it('converts only legacy effect entries: creates replacement AEs, then deletes the source items by _id', async () => {
      /** @type {object} - A legacy effect item source expected to convert. */
      const legacy = makeLegacyItemSource();

      /** @type {object} - A registered-subtype item source expected to be ignored. */
      const weapon = makeLegacyItemSource({
         _id: 'weaponitem000001',
         type: 'weapon',
      });

      /** @type {object} - The fake actor carrying one legacy and one modern item. */
      const actor = makeFakeActor({
         items: [
            legacy,
            weapon,
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(legacy)]],
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('is a no-op when there are no legacy items and no stale mirrors', async () => {
      /** @type {object} - A fake actor with only modern content. */
      const actor = makeFakeActor({
         items: [
            makeLegacyItemSource({
               _id: 'weaponitem000001',
               type: 'weapon',
            }),
         ],
         effects: [
            {
               id: 'modernfx00000001',
               type: 'effect',
               flags: {},
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([]);
   });

   it('deletes stale mirror AEs last, after item conversion', async () => {
      /** @type {object} - A stale cosmetic mirror AE (base subtype, titan effect flag). */
      const mirror = {
         id: 'mirrorfx00000001',
         type: 'base',
         flags: {
            titan: {
               type: 'effect',
            },
         },
      };

      /** @type {object} - The fake actor carrying one legacy item and one stale mirror. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
         effects: [mirror],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(makeLegacyItemSource())]],
         ['delete', 'Item', ['legacyitem000001']],
         ['delete', 'ActiveEffect', ['mirrorfx00000001']],
      ]);
   });

   it('removes stale mirrors even when no legacy items remain', async () => {
      /** @type {object} - The fake actor carrying only a stale mirror. */
      const actor = makeFakeActor({
         effects: [
            {
               id: 'mirrorfx00000001',
               type: 'base',
               flags: {
                  titan: {
                     type: 'effect',
                  },
               },
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['delete', 'ActiveEffect', ['mirrorfx00000001']],
      ]);
   });

   it('skips creating a replacement whose source already has a converted AE, but still deletes the item', async () => {
      /** @type {object} - A surviving converted AE stamped with the legacy source id (interrupted prior run). */
      const survivor = {
         id: 'convertedfx00001',
         type: 'effect',
         flags: {
            titan: {
               convertedFromItem: 'legacyitem000001',
            },
         },
      };

      /** @type {object} - The fake actor stuck mid-conversion: replacement exists, legacy item still present. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
         effects: [survivor],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('creates only the not-yet-converted sources when some replacements already exist', async () => {
      /** @type {object} - A second legacy source with no surviving replacement. */
      const fresh = makeLegacyItemSource({
         _id: 'legacyitem000002',
         name: 'Second Legacy Effect',
      });

      /** @type {object} - The fake actor with one converted and one unconverted legacy item. */
      const actor = makeFakeActor({
         items: [
            makeLegacyItemSource(),
            fresh,
         ],
         effects: [
            {
               id: 'convertedfx00001',
               type: 'effect',
               flags: {
                  titan: {
                     convertedFromItem: 'legacyitem000001',
                  },
               },
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(fresh)]],
         ['delete', 'Item', ['legacyitem000001', 'legacyitem000002']],
      ]);
   });
});
```

- [ ] **Step 2: Run the suite to verify the red state**

Run: `npm test -- ConvertEffectItemsToActiveEffects`
Expected: FAIL with real assertion/throw failures (the Task 1 characterization cases stay green): the
normalization cases fail (`!system.active` treats string `'false'` as truthy; missing `active` inverts), the
provenance case fails (no `flags` in creation data), and every `convertActor` case throws because current code
reads `actor.items` (undefined on the fake) instead of `actor._source.items`.

- [ ] **Step 3: Implement raw-source discovery, `active` normalization, the provenance flag, and the skip-guard**

In `src/helpers/migration/ConvertEffectItemsToActiveEffects.js`, replace `buildEffectData` and `convertActor`
(bodies shown in full). Also verify (read, do not modify) that `TitanActiveEffect._preCreate` merges into
`flags.titan` rather than replacing it wholesale — if it replaces, surface to the user before proceeding (the
provenance stamp must survive creation).

```js
/**
 * Builds Active Effect creation data from a legacy effect Item's raw source data.
 * Maps the legacy item's native and system fields onto the 'effect' Active Effect subtype. The old item used a
 * split active/duration model; under the new universal-disabled model an effect starts ENABLED unless it was an
 * explicitly-deactivated permanent effect. The migrated duration (including its captured initiative) is carried
 * through so the document's _preCreate handler will not override the combat initiative. The status icon and Visual
 * Active Effects description flag are intentionally NOT set here; TitanActiveEffect._preCreate seeds them.
 * Operates on raw source entries (actor._source.items elements) rather than Item instances, because the 'effect'
 * Item subtype is no longer registered: legacy items fail strict construction, land in invalidDocumentIds, and are
 * invisible to actor.items iteration. Raw source bypasses schema casting, so the active value is normalized here
 * (template-era source persisted strings; missing keys take the schema default of true). The created effect is
 * stamped with flags.titan.convertedFromItem so an interrupted conversion never duplicates it on retry.
 * @param {object} itemSource - The legacy effect Item's raw source data (an actor._source.items entry).
 * @returns {object} The Active Effect creation data.
 */
export function buildEffectData(itemSource) {
   /** @type {object} - The legacy item's raw system data, the source of all migrated fields. */
   const system = itemSource.system;

   /** @type {boolean|string} - The uncast raw active value, defaulted like the legacy schema (missing → true). */
   const rawActive = system.active ?? true;

   /** @type {boolean} - The normalized active state, mirroring BooleanField casting for template-era strings. */
   const active = typeof rawActive === 'string' ? rawActive === 'true' : Boolean(rawActive);

   /** @type {boolean} - Whether the new effect should start disabled (explicitly-deactivated permanent only). */
   const disabled = system.duration?.type === 'permanent' ? !active : false;

   return {
      name: itemSource.name,
      img: itemSource.img,
      type: 'effect',
      description: system.description ?? '',
      disabled,
      flags: {
         titan: {
            convertedFromItem: itemSource._id,
         },
      },
      system: {
         rulesElement: foundry.utils.deepClone(system.rulesElement),
         duration: foundry.utils.deepClone(system.duration),
         check: foundry.utils.deepClone(system.check),
         customTrait: foundry.utils.deepClone(system.customTrait),
      },
   };
}

/**
 * Converts every legacy effect Item owned by a single actor into a native 'effect' Active Effect.
 * Discovery reads the actor's raw _source.items rather than the items collection: the 'effect' subtype is no longer
 * registered, so legacy items are invalid documents excluded from actor.items iteration but fully present in raw
 * source (and deletable by id — the client backend resolves deletions with { invalid: true }). No destructive step
 * occurs before the replacement Active Effects exist: the replacement Active Effects are created first, then the
 * source effect Items are batch-deleted, then any stale cosmetic "mirror" Active Effects (the old base-subtype AEs
 * flagged with flags.titan.type === 'effect') are batch-deleted to avoid duplicates. Creation skips any source
 * whose id already has a surviving converted Active Effect (the convertedFromItem provenance stamp), so a
 * conversion interrupted between creation and deletion finishes cleanly on retry instead of duplicating effects.
 * Returns early when there is nothing to do (no effect Items and no stale mirrors); if there are stale mirrors but
 * no effect Items, the mirrors are still removed.
 * @param {TitanActor} actor - The actor whose legacy effect Items should be converted.
 * @returns {Promise<void>}
 */
export async function convertActor(actor) {
   /** @type {object[]} - Raw source entries of the legacy effect Items owned by this actor. */
   const effectItemSources = actor._source.items.filter((item) => item.type === 'effect');

   /** @type {string[]} - The ids of stale mirror Active Effects to delete (base subtype, titan effect flag). */
   const staleEffectIds = actor.effects
      .filter((effect) => effect.type !== 'effect' && effect.flags?.titan?.type === 'effect')
      .map((effect) => effect.id);

   // Nothing to convert and no stale mirrors to clean up: this actor is already in the new state.
   if (effectItemSources.length === 0 && staleEffectIds.length === 0) {
      return;
   }

   /** @type {Set<string>} - Source-item ids that already have a surviving converted Active Effect. */
   const convertedItemIds = new Set(
      actor.effects.map((effect) => effect.flags?.titan?.convertedFromItem).filter(Boolean),
   );

   /** @type {object[]} - Legacy sources still needing a replacement (skips already-converted, retry-safe). */
   const sourcesToCreate = effectItemSources.filter((item) => !convertedItemIds.has(item._id));

   // Create the replacement Active Effects before any destructive step, so no effect data is lost if creation fails.
   if (sourcesToCreate.length > 0) {
      await actor.createEmbeddedDocuments('ActiveEffect', sourcesToCreate.map(buildEffectData));
   }

   // Batch-delete the source effect Items now that every replacement exists.
   if (effectItemSources.length > 0) {
      await actor.deleteEmbeddedDocuments('Item', effectItemSources.map((item) => item._id));
   }

   // Batch-delete the stale mirror Active Effects last.
   if (staleEffectIds.length > 0) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', staleEffectIds);
   }
}
```

`convertActorIsolated` and the default function are untouched in this task.

- [ ] **Step 4: Run the suite — everything green**

Run: `npm test -- ConvertEffectItemsToActiveEffects`
Expected: PASS — all Task 1 characterization, normalization/provenance, and `convertActor` cases.

- [ ] **Step 5: Commit**

```powershell
git add src/helpers/migration/ConvertEffectItemsToActiveEffects.js tests/unit/ConvertEffectItemsToActiveEffects.test.js
git commit -m "fix(migration): raw-_source discovery + active normalization + retry-idempotent create (OPEN_BUGS #8)"
```

---

### Task 3: Pack path — `convertPack` + `convertWorldActorPacks`, wired into the default function

**Files:**
- Modify: `src/helpers/migration/ConvertEffectItemsToActiveEffects.js` (append two functions; extend the default
  function and its JSDoc)
- Test: `tests/unit/ConvertEffectItemsToActiveEffects.test.js`

- [ ] **Step 1: Add the pack-path test suites**

Append to `tests/unit/ConvertEffectItemsToActiveEffects.test.js`:

```js
/**
 * Builds a fake compendium pack exposing only what the pack path reads: metadata, the locked flag, and recording
 * getIndex/configure/getDocument stubs.
 * @param {object} [options] - The fake's contents.
 * @param {object[]} [options.indexEntries] - Projected index entries returned by getIndex.
 * @param {boolean} [options.locked] - The initial lock state.
 * @param {object} [options.documents] - Map of id → fake actor (or Error instance to throw) for getDocument.
 * @param {string} [options.type] - The pack's document type metadata.
 * @param {string} [options.packageType] - The pack's owning package type metadata.
 * @returns {object} The fake pack; its calls array records [method, payload] pairs in order.
 */
function makeFakePack({
   indexEntries = [],
   locked = false,
   documents = {},
   type = 'Actor',
   packageType = 'world',
} = {}) {
   /** @type {Array<[string, *]>} - Recorded pack-API calls as [method, payload] pairs. */
   const calls = [];

   /** @type {object} - The fake pack under construction (self-referenced by configure). */
   const pack = {
      metadata: {
         type,
         packageType,
         label: 'Fake Pack',
      },
      locked,
      calls,
      getIndex: async ({ fields } = {}) => {
         calls.push(['getIndex', fields]);
         return indexEntries;
      },
      configure: async ({ locked: nextLocked }) => {
         calls.push(['configure', nextLocked]);
         pack.locked = nextLocked;
      },
      getDocument: async (id) => {
         calls.push(['getDocument', id]);

         /** @type {object|Error} - The configured result for this id. */
         const result = documents[id];
         if (result instanceof Error) {
            throw result;
         }
         return result;
      },
   };
   return pack;
}

/**
 * Builds a pack-index entry whose items array uses the REAL server projection: each embedded item is filtered to
 * the Item compendiumIndexFields plus _id ({ _id, name, img, type, sort, folder }) — never a system bag.
 * @param {string} id - The entry's _id.
 * @param {string[]} itemTypes - The type string of each projected embedded item.
 * @returns {object} The index-entry fixture.
 */
function makeIndexEntry(id, itemTypes) {
   return {
      _id: id,
      name: 'Packed Actor',
      items: itemTypes.map((itemType, index) => ({
         _id: `projecteditem${String(index).padStart(3, '0')}`,
         name: 'Projected Item',
         img: 'icons/projected.webp',
         type: itemType,
         sort: 0,
         folder: null,
      })),
   };
}

describe('convertPack (index gate + lock handling)', () => {
   it('leaves clean packs completely untouched (no configure, no document loads)', async () => {
      /** @type {object} - A locked pack whose only entry carries no legacy items. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('cleanactor000001', ['weapon'])],
         locked: true,
      });

      await convertPack(pack);

      expect(pack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
   });

   it('unlocks a locked needy pack, converts, and restores the lock in order', async () => {
      /** @type {object} - The packed fake actor carrying one legacy item. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
      });

      /** @type {object} - A locked pack with one needy entry. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: true,
         documents: {
            packedactor00001: actor,
         },
      });

      await convertPack(pack);

      expect(pack.calls).toEqual([
         ['getIndex', ['items']],
         ['configure', false],
         ['getDocument', 'packedactor00001'],
         ['configure', true],
      ]);
      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(makeLegacyItemSource())]],
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('never toggles the lock on an already-unlocked pack', async () => {
      /** @type {object} - An unlocked pack with one needy entry. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: false,
         documents: {
            packedactor00001: makeFakeActor({
               items: [makeLegacyItemSource()],
            }),
         },
      });

      await convertPack(pack);

      expect(pack.calls.filter(([method]) => method === 'configure')).toEqual([]);
   });

   it('isolates a per-actor failure and still converts the rest of the pack, restoring the lock', async () => {
      /** @type {object} - The healthy packed fake actor. */
      const survivor = makeFakeActor({
         items: [makeLegacyItemSource()],
      });

      /** @type {object} - A locked pack where the first entry's document load fails. */
      const pack = makeFakePack({
         indexEntries: [
            makeIndexEntry('brokenactor00001', ['effect']),
            makeIndexEntry('packedactor00001', ['effect']),
         ],
         locked: true,
         documents: {
            brokenactor00001: new Error('load failed'),
            packedactor00001: survivor,
         },
      });

      await convertPack(pack);

      expect(survivor.calls.length).toBe(2);
      expect(pack.calls.at(-1)).toEqual(['configure', true]);
   });

   it('restores the lock in the finally path when the unlock itself fails wholesale', async () => {
      /** @type {object} - A locked pack with one needy entry whose unlock call fails. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: true,
         documents: {
            packedactor00001: makeFakeActor({
               items: [makeLegacyItemSource()],
            }),
         },
      });

      // Replace configure with a stub that fails the unlock (a wholesale failure outside per-actor isolation)
      // while still recording and honoring the finally path's re-lock.
      pack.configure = async ({ locked: nextLocked }) => {
         pack.calls.push(['configure', nextLocked]);
         if (nextLocked === false) {
            throw new Error('unlock failed');
         }
         pack.locked = nextLocked;
      };

      await expect(convertPack(pack)).rejects.toThrow('unlock failed');

      expect(pack.calls.filter(([method]) => method === 'configure')).toEqual([
         ['configure', false],
         ['configure', true],
      ]);
   });

   it('logs a restore-specific error and resolves when only the re-lock fails', async () => {
      /** @type {object} - A locked pack with one needy entry whose re-lock call fails. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: true,
         documents: {
            packedactor00001: makeFakeActor({
               items: [makeLegacyItemSource()],
            }),
         },
      });

      // Replace configure with a stub that succeeds on unlock but fails the finally path's re-lock.
      pack.configure = async ({ locked: nextLocked }) => {
         pack.calls.push(['configure', nextLocked]);
         if (nextLocked === true) {
            throw new Error('re-lock failed');
         }
         pack.locked = nextLocked;
      };

      // The restore failure is caught inside the finally: conversion still resolves (it succeeded).
      await convertPack(pack);

      expect(uiErrors.some((message) => message.includes('Failed to restore the lock'))).toBe(true);
   });
});

describe('default export (wiring: the pack scan is reachable from the boot path)', () => {
   afterEach(() => {
      // Remove the game stand-in so later suites keep the shared minimal mock.
      delete globalThis.game;
   });

   it('reaches the world Actor pack scan when run as the GM', async () => {
      /** @type {object} - An eligible world Actor pack that must receive the index scan. */
      const pack = makeFakePack({});

      globalThis.game = {
         user: {
            isGM: true,
         },
         actors: [],
         scenes: [],
         packs: [pack],
      };

      await convertEffectItemsToActiveEffects();

      expect(pack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
   });

   it('does nothing for non-GM users', async () => {
      /** @type {object} - A pack that must never be scanned by a non-GM client. */
      const pack = makeFakePack({});

      globalThis.game = {
         user: {
            isGM: false,
         },
         actors: [],
         scenes: [],
         packs: [pack],
      };

      await convertEffectItemsToActiveEffects();

      expect(pack.calls).toEqual([]);
   });
});

describe('convertWorldActorPacks (pack filtering + isolation)', () => {
   afterEach(() => {
      // Remove the game stand-in so later suites keep the shared minimal mock.
      delete globalThis.game;
   });

   it('processes only world-package Actor packs', async () => {
      /** @type {object} - An eligible world Actor pack. */
      const worldActorPack = makeFakePack({});

      /** @type {object} - A module-owned Actor pack (ineligible). */
      const moduleActorPack = makeFakePack({
         packageType: 'module',
      });

      /** @type {object} - A world Item pack (ineligible). */
      const worldItemPack = makeFakePack({
         type: 'Item',
      });

      globalThis.game = {
         packs: [
            worldActorPack,
            moduleActorPack,
            worldItemPack,
         ],
      };

      await convertWorldActorPacks();

      expect(worldActorPack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
      expect(moduleActorPack.calls).toEqual([]);
      expect(worldItemPack.calls).toEqual([]);
   });

   it('isolates a pack failure and still processes the remaining packs', async () => {
      /** @type {object} - A pack whose index read fails. */
      const brokenPack = makeFakePack({});
      brokenPack.getIndex = async () => {
         throw new Error('index read failed');
      };

      /** @type {object} - A healthy pack processed after the failure. */
      const healthyPack = makeFakePack({});

      globalThis.game = {
         packs: [
            brokenPack,
            healthyPack,
         ],
      };

      await convertWorldActorPacks();

      expect(healthyPack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
   });
});
```

Also extend the file's converter import (Task 1 staged it; the new symbols exist after Step 3 of this task):

```js
import convertEffectItemsToActiveEffects, {
   buildEffectData,
   convertActor,
   convertPack,
   convertWorldActorPacks,
} from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';
```

- [ ] **Step 2: Run the suite to verify the red state**

Run: `npm test -- ConvertEffectItemsToActiveEffects`
Expected: FAIL — `convertPack` / `convertWorldActorPacks` are not exported yet.

- [ ] **Step 3: Implement the pack path**

Append to `src/helpers/migration/ConvertEffectItemsToActiveEffects.js` (after `convertActorIsolated`):

```js
/**
 * Converts the legacy effect Items inside a single compendium pack's actors.
 * Index-gated: pulls the pack index with each entry's embedded items projected to their summary index fields
 * (_id/name/img/type/sort/folder — no document construction, no validation, so invalid-typed entries are visible)
 * and returns without touching the pack when no entry carries a legacy effect Item. Otherwise the pack is unlocked
 * if needed, each flagged actor is loaded and converted (per-actor failures are logged and skipped so the rest of
 * the pack still converts), and the pack's original lock state is restored in a finally block even when conversion
 * throws. A restore failure is caught inside the finally and logged as a restore-specific error, so it can never
 * mask an in-flight conversion error or be misread as a conversion failure.
 * @param {CompendiumCollection} pack - The compendium pack to convert.
 * @returns {Promise<void>}
 */
export async function convertPack(pack) {
   /** @type {object[]} - The pack index with each entry's items projected to their summary index fields. */
   const index = await pack.getIndex({ fields: ['items'] });

   /** @type {string[]} - The ids of index entries that carry at least one legacy effect Item. */
   const needyIds = index
      .filter((entry) => entry.items?.some((item) => item.type === 'effect'))
      .map((entry) => entry._id);

   // Index gate: leave clean packs completely untouched (no unlock, no document loads).
   if (needyIds.length === 0) {
      return;
   }

   /** @type {boolean} - Whether the pack was locked before conversion (restored in the finally block). */
   const wasLocked = pack.locked;

   try {
      // Unlock the pack for the duration of the conversion.
      if (wasLocked) {
         await pack.configure({ locked: false });
      }

      /** @type {number} - The count of flagged actors successfully converted in this pack. */
      let convertedCount = 0;

      // Load and convert each flagged actor, isolating per-actor failures so the rest of the pack still converts.
      for (const id of needyIds) {
         try {
            /** @type {TitanActor} - The packed actor to convert. */
            const actor = await pack.getDocument(id);

            await convertActor(actor);
            convertedCount += 1;
         }
         catch (err) {
            error(
               `Failed to convert legacy effect Items for packed actor (${id}) in pack "${pack.metadata.label}".`,
               err,
            );
         }
      }

      log(`Converted ${convertedCount} of ${needyIds.length} flagged actor(s) in world pack "${pack.metadata.label}".`);
   }
   finally {
      // Restore the pack's original lock state even when conversion throws, without masking an in-flight error.
      if (wasLocked) {
         try {
            await pack.configure({ locked: true });
         }
         catch (err) {
            error(`Failed to restore the lock on pack "${pack.metadata.label}" — the pack is left unlocked.`, err);
         }
      }
   }
}

/**
 * Converts legacy effect Items inside every world Actor compendium pack.
 * Covers world-package Actor packs only: module and system packs belong to their packages and are not rewritten.
 * Each pack's conversion is isolated, so a failure on one pack (index read, lock toggle, or a wholesale conversion
 * failure) is logged and the remaining packs still process.
 * @returns {Promise<void>}
 */
export async function convertWorldActorPacks() {
   for (const pack of game.packs) {
      // Only world-package Actor packs are eligible for conversion.
      if (pack.metadata.type === 'Actor' && pack.metadata.packageType === 'world') {
         try {
            await convertPack(pack);
         }
         catch (err) {
            error(`Failed to convert legacy effect Items in pack "${pack.metadata.label}".`, err);
         }
      }
   }
}
```

Then extend the default function: replace its JSDoc and add the pack call after the scenes loop:

```js
/**
 * Converts all legacy effect Items in the world into native 'effect' Active Effects.
 * Runs only for the GM. Processes every world actor, the actors of unlinked tokens across all scenes, and the
 * actors inside world Actor compendium packs (index-gated, with locked packs unlocked and restored). Each actor's
 * conversion is isolated, so a failure on one actor is logged and the migration continues with the next.
 * Idempotent: once no legacy effect Items remain, the converter is a no-op.
 * @returns {Promise<void>}
 */
export default async function convertEffectItemsToActiveEffects() {
   if (!game.user.isGM) {
      return;
   }

   log('Starting conversion of legacy effect Items to Active Effects.');

   // Convert all world actors.
   for (const actor of game.actors) {
      await convertActorIsolated(actor);
   }

   // Convert the actors of unlinked tokens across all scenes.
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (!token.actorLink && token.actor) {
            await convertActorIsolated(token.actor);
         }
      }
   }

   // Convert the actors inside world Actor compendium packs.
   await convertWorldActorPacks();

   log('Conversion of legacy effect Items to Active Effects complete.');
}
```

Note: the fake index entries are a plain array — `Array#filter`/`Array#map` and foundry `Collection#filter`/`#map`
share these signatures, so the implementation works against both.

- [ ] **Step 4: Run the full new suite — everything green**

Run: `npm test -- ConvertEffectItemsToActiveEffects`
Expected: PASS — all `buildEffectData`, `convertActor`, `convertPack`, and `convertWorldActorPacks` cases.

- [ ] **Step 5: Run the whole unit suite to catch regressions**

Run: `npm test`
Expected: PASS — 183 existing + the new cases, 0 failures.

- [ ] **Step 6: Commit**

```powershell
git add src/helpers/migration/ConvertEffectItemsToActiveEffects.js tests/unit/ConvertEffectItemsToActiveEffects.test.js
git commit -m "feat(migration): convert legacy effect Items inside world Actor packs (TODO #6)"
```

---

### Task 4: E2E — converter boot path is a safe no-op on a clean locked world pack

Seeding an unregistered-subtype item at runtime is impossible by design (server-side strict validation), so this
spec covers the safe plumbing: pack creation, a reload-boot through the converter, the index gate skipping a clean
pack, lock preservation, and zero page errors. The deep conversion path is unit-covered (Task 3) plus the manual
verification in Task 6.

**Files:**
- Create: `tests/e2e/pack-conversion.spec.js`

- [ ] **Step 1: Write the spec**

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Pack effect-item conversion lock (safe plumbing): the every-load converter scans world Actor packs through a raw
 * index projection and must leave a clean pack completely untouched — no unlock, no writes, no errors. Deep
 * conversion (legacy items present) cannot be seeded at runtime because the 'effect' Item subtype is unregistered
 * and server-side validation rejects creation; that path is unit-covered
 * (tests/unit/ConvertEffectItemsToActiveEffects.test.js) and manually verified against a pre-conversion world copy.
 */

/** @type {string} The fixture pack's collection id (world-package compendium). */
const PACK_ID = 'world.e2e-pack-conversion';

/** @type {string} The fixture pack's manifest name. */
const PACK_NAME = 'e2e-pack-conversion';

/** @type {string} The fixture pack's display label. */
const PACK_LABEL = 'E2E Pack Conversion';

/** @type {string} Name of the clean packed fixture actor. */
const ACTOR_NAME = 'E2E Packed Clean Actor';

/** @type {string} The converter's completion log line (positive signal that the boot-path conversion finished). */
const CONVERTER_DONE_LINE = 'Conversion of legacy effect Items to Active Effects complete.';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;

/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

/** @type {string[]} Console message texts collected on the shared page (survives reloads; cleared before reload). */
const consoleLines = [];

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   page.on('console', (message) => {
      consoleLines.push(message.text());
   });
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   // Remove the fixture pack so reruns and other files see a clean world (unlock first — the test locks it).
   await page?.evaluate(async (packId) => {
      /** @type {CompendiumCollection|undefined} The fixture pack, if it survived to teardown. */
      const pack = game.packs.get(packId);
      if (pack) {
         await pack.configure({ locked: false });
         await pack.deleteCompendium();
      }
   }, PACK_ID);
   await page?.close();
});

test.describe('pack effect-item conversion (clean-pack safety)', () => {
   test('boot-path converter leaves a clean locked world Actor pack untouched', async () => {
      // Precondition: the TITAN system must have initialized before any pack manipulation.
      /** @type {boolean} Whether the TITAN system finished initializing in the shared page. */
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before the pack walk. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);

      // Remove any stale fixture pack from a prior run (unlocking it first), then seed a fresh locked pack
      // with one clean actor.
      await page.evaluate(async ({ packId, packName, packLabel, actorName }) => {
         /** @type {CompendiumCollection|undefined} A stale fixture pack left by a prior run, if any. */
         const stalePack = game.packs.get(packId);
         if (stalePack) {
            await stalePack.configure({ locked: false });
            await stalePack.deleteCompendium();
         }

         await foundry.documents.collections.CompendiumCollection.createCompendium({
            name: packName,
            label: packLabel,
            type: 'Actor',
         });

         // A clean actor with one modern item proves the index gate ignores non-legacy item types.
         await Actor.create(
            {
               name: actorName,
               type: 'player',
               items: [
                  {
                     name: 'E2E Packed Weapon',
                     type: 'weapon',
                  },
               ],
            },
            { pack: packId },
         );

         await game.packs.get(packId).configure({ locked: true });
      }, {
         packId: PACK_ID,
         packName: PACK_NAME,
         packLabel: PACK_LABEL,
         actorName: ACTOR_NAME,
      });

      // Reload: the every-load converter (including the pack scan) runs again on the boot path. NOTE: this is the
      // suite's FIRST mid-file reload of the shared page (a new harness idiom) — the waitForURL guard makes a lost
      // session fail crisply instead of timing out opaquely downstream.
      consoleLines.length = 0;
      await page.reload();
      await page.waitForURL('**/game', { timeout: 15_000 });
      await page.waitForFunction(() => globalThis.game?.ready === true && typeof game.titan !== 'undefined');

      // Positive completion signal first: the converter's finish line proves the boot-path conversion finished.
      await expect
         .poll(() => consoleLines.some((line) => line.includes(CONVERTER_DONE_LINE)), { timeout: 30_000 })
         .toBe(true);

      // Lock-state symmetry cannot distinguish "gate skipped" from "unlocked and re-locked", so assert the absence
      // of every per-pack line for the fixture: no conversion line, no per-pack failure, no failed lock-restore.
      expect(consoleLines.some((line) => line.includes(`in world pack "${PACK_LABEL}"`))).toBe(false);
      expect(consoleLines.some((line) => line.includes('Failed to convert legacy effect Items'))).toBe(false);
      expect(consoleLines.some((line) => line.includes('Failed to restore the lock'))).toBe(false);

      // The clean pack survived untouched: still locked, one entry, one modern item, zero Active Effects.
      /** @type {{locked: boolean, size: number, itemTypes: string[], effectCount: number}} Post-boot pack state. */
      const state = await page.evaluate(async (packId) => {
         /** @type {CompendiumCollection} The fixture pack after the reload boot. */
         const pack = game.packs.get(packId);

         /** @type {Collection<object>} The pack index with raw items and effects projected. */
         const index = await pack.getIndex({
            fields: [
               'items',
               'effects',
            ],
         });

         /** @type {object} The single packed actor's index entry. */
         const entry = index.contents[0];

         return {
            locked: pack.locked,
            size: index.size,
            itemTypes: entry.items.map((item) => item.type),
            effectCount: entry.effects?.length ?? 0,
         };
      }, PACK_ID);

      expect(state.locked).toBe(true);
      expect(state.size).toBe(1);
      expect(state.itemTypes).toEqual(['weapon']);
      expect(state.effectCount).toBe(0);
      expect(errors).toEqual([]);
   });
});
```

- [ ] **Step 2: Build, then run the new spec (world must be launched at `:30000` — ask the user if it is not)**

```powershell
npm run build
npm run test:e2e -- pack-conversion
```

Expected: 1 passed. NEVER run `npm run build` concurrently with an e2e run, and run Playwright in a FOREGROUND
shell only (detached background shells crash workers with `0xC0000142`).

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/pack-conversion.spec.js
git commit -m "test(e2e): clean-pack safety lock for the boot-path pack converter"
```

---

### Task 5: Docs — delete TODO #6 + OPEN_BUGS #8, update the titan-codebase skill

**Files:**
- Modify: `docs/TODO.md` (delete the whole `### 6.` section, lines 21-28)
- Modify: `docs/OPEN_BUGS.md` (delete the whole `### 8.` section)
- Modify: `.claude/skills/titan-codebase/references/data-flow.md:244-270`

- [ ] **Step 1: Delete the completed entries**

In `docs/TODO.md`, remove the `### 6. Convert effect Items inside compendium-packed actors` section entirely
(heading through its `- **Depends on:**` line). In `docs/OPEN_BUGS.md`, remove the
`### 8. World effect-Item converter is blind to invalid legacy items (unregistered subtype)` section entirely.
Completed entries are DELETED, never marked done.

- [ ] **Step 2: Update the converter description in the titan-codebase skill**

In `.claude/skills/titan-codebase/references/data-flow.md`, replace the final sentence of the
`**Effect Item → Active Effect conversion — convertEffectItemsToActiveEffects**` paragraph
(`Idempotent once no \`effect\` Items remain. Compendium-packed actors are NOT converted.`) with:

```markdown
Idempotent once no `effect` Items remain. Discovery reads raw `actor._source.items` (NOT `actor.items`): the
`effect` subtype is unregistered, so legacy items are invalid documents excluded from collection iteration but
present in raw source and deletable by id. Replacement AEs are stamped `flags.titan.convertedFromItem = <item _id>`
and creation skips already-stamped sources, so an interrupted create→delete window finishes cleanly on retry
instead of duplicating effects; `buildEffectData` normalizes the uncast raw `active` value (template-era source
persisted strings). World Actor compendium packs are also converted (`convertWorldActorPacks` → `convertPack`):
index-gated via `pack.getIndex({ fields: ['items'] })` — a summary projection (`compendiumIndexFields` + `_id` per
item, no `system`, no document construction for clean packs) that the client index retains for the session; locked
packs are unlocked and their lock state restored in a `finally` (a restore failure logs its own pack-naming error
and never masks a conversion error), per-actor and per-pack failures are isolated. Module/system packs are never
touched. The conversion load emits two expected red-error classes per legacy item (invalid-doc init + temp-doc
`Failed data preparation` during deletion); the following load is silent.
```

- [ ] **Step 3: Commit**

```powershell
git add docs/TODO.md docs/OPEN_BUGS.md .claude/skills/titan-codebase/references/data-flow.md
git commit -m "docs: close TODO #6 + OPEN_BUGS #8; update titan-codebase converter notes"
```

---

### Task 6: Full verification + manual deep-path check

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `npm test`
Expected: PASS, 0 failures.

- [ ] **Step 2: Production build is clean and probe-free**

```powershell
npm run build
```

Expected: build succeeds. Then confirm no probe/test code leaked:

```powershell
Select-String -Path dist/titan.mjs -Pattern 'probeBundleEntry|_probe' -SimpleMatch:$false
```

Expected: no matches.

- [ ] **Step 3: Full e2e suite, 3 disjoint foreground shards (world launched at `:30000`; never build concurrently)**

```powershell
npm run test:e2e -- --shard=1/3
npm run test:e2e -- --shard=2/3
npm run test:e2e -- --shard=3/3
```

Expected: all shards pass (401 existing + 1 new). The converter runs on every spec file's boot, so a regression here
would surface suite-wide — treat ANY new boot-path failure as caused by this branch until proven otherwise.

- [ ] **Step 4: Manual deep-path verification (user-assisted)**

Ask the user to run the converter against a copy of a pre-conversion world containing a packed actor with legacy
effect Items (the predecessor spec's section 6.7 mode), confirming: items become equivalent `effect` AEs (each
stamped `flags.titan.convertedFromItem`), no leftover legacy items or mirror AEs, lock state restored, and a second
load is a silent no-op.

**Brief the verifier on expected console noise (buddy-check finding):** the conversion load WILL show red errors —
one `Failed to initialize Item … "effect" is not a valid type` per legacy item (stale worlds emit these on every
load already), plus one caught `Failed data preparation` per deleted legacy item (deletion builds a temp doc whose
`prepareDerivedData` runs against a plain-object `system`). These indicate neither failure nor data damage. **The
pass signal is the SECOND load: zero red errors, zero conversion lines.**

- [ ] **Step 5: Hand off for merge**

Use superpowers:finishing-a-development-branch (merge `feat/pack-effect-item-conversion` → `main`, delete branch,
push) after user sign-off.

---

## Buddy-check directives

- Plan buddy check: **done 2026-06-06** — two blind reviewers + one debate round; **13 agreed findings, 0
  unresolved**, all folded into this plan and the spec. User approved the provenance-flag idempotency design delta
  (`flags.titan.convertedFromItem` + skip-guard).
- Flagged tasks: none pre-authorized — execution uses the normal two-stage per-task review.
- Unflagged tasks showing risk signals during execution: **ask**.

## Self-review notes

- **Spec coverage:** §1/§3 → Task 2; §4 → Task 3; §5 (logging) → Task 3 code; §5 (OPEN_BUGS hygiene) + §7 → Task 5;
  §6 unit → Tasks 1-3, e2e → Task 4, manual → Task 6.
- **Convention compliance:** explicit `git add` paths only (never `packs/`, `.claude/settings.local.json`,
  `.claude/scheduled_tasks.lock`); e2e foreground-only, sharded; no build during e2e; unit runner filters
  positionally (`npm test -- <pattern>`).
- **Known risk:** none outstanding — `convertPack`'s finally-restore is covered for per-actor failures (lock
  restored, no rejection), a wholesale unlock failure (rejection propagates to the per-pack isolation in
  `convertWorldActorPacks`, lock still restored), and a re-lock failure (caught inside the `finally`,
  restore-specific error logged, no masking). The duplicate-AE window is closed by the provenance skip-guard.
- **Buddy-check deviation note:** the pack loop's inline per-entry try/catch (covering `getDocument`) deliberately
  supersedes the earlier pseudocode's `convertActorIsolated` reuse — spec §4 now documents this; do not "fix" it
  back during implementation.
