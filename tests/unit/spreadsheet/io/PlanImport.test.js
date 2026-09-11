import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planImport } from '~/spreadsheet/io/PlanImport.js';

/** Builds a minimal in-browser File-like object carrying CSV text. */
function csvFile(name, text) {
   return { name, text: async () => text, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

/** Minimal stand-in for SchemaField, matched via instanceof by resolveFieldSchema. */
class MockSchemaField {
   /**
    * @param {object} fields - Map of sub-field name to a mock field (empty for the stand-ins below).
    */
   constructor(fields) {
      /** @type {object} */
      this.fields = fields;
   }
}

/**
 * An empty ActiveEffect subtype DataModel stand-in: no schema fields, just a registered subtype name.
 * @returns {Function} The stand-in DataModel class.
 */
function makeEmptySchemaDataModel() {
   return class {
      static get schema() {
         return new MockSchemaField({});
      }
   };
}

/** @type {string} The actor row's id in the embedded-graph fixture below (depth 0). */
const ACTOR_ID = 'a'.repeat(16);

/** @type {string} The actor's owned weapon (depth 1). */
const ITEM_ID = 'b'.repeat(16);

/** @type {string} The effect on the actor itself (depth 1, the same depth as the owned weapon). */
const ACTOR_EFFECT_ID = 'c'.repeat(16);

/** @type {string} The effect on the owned weapon (depth 2). */
const ITEM_EFFECT_ID = 'd'.repeat(16);

/**
 * Builds the CSV file set for a full Actor-pack graph: one npc owning one weapon, the weapon carrying
 * its own effect, and the npc carrying a direct effect of its own — the depth 0/1/1/2 shape an actor
 * pack export produces.
 * @returns {object[]} The File-like CSV inputs, manifest first.
 */
function actorGraphFiles() {
   /** @type {string} */
   const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Actor,,\r\n'
      + 'sheet,npc,npc,\r\nsheet,weapon,weapon,\r\nsheet,effect,effect,\r\n';
   /** @type {string} */
   const npc = `﻿_id,_parentId,name\r\n${ACTOR_ID},,Goblin\r\n`;
   /** @type {string} */
   const weapon = `﻿_id,_parentId,name\r\n${ITEM_ID},${ACTOR_ID},Dagger\r\n`;
   /** @type {string} Both effects share one sheet: sheets are per subtype, not per document class. */
   const effect = `﻿_id,_parentId,name\r\n${ACTOR_EFFECT_ID},${ACTOR_ID},Blessed\r\n`
      + `${ITEM_EFFECT_ID},${ITEM_ID},Sharp\r\n`;
   return [
      csvFile('_manifest.csv', manifest),
      csvFile('npc.csv', npc),
      csvFile('weapon.csv', weapon),
      csvFile('effect.csv', effect),
   ];
}

describe('planImport', () => {
   beforeEach(() => {
      // resolveTypeSchemasForPack always resolves ActiveEffect too (every pack type can embed one), which
      // walks each registered subtype's static schema via instanceof checks against these field classes.
      globalThis.foundry.data = { fields: { SchemaField: MockSchemaField } };
      globalThis.CONFIG = {
         Item: { dataModels: {}, documentClass: class { constructor(source) { Object.assign(this, source); } } },
         ActiveEffect: { dataModels: {}, documentClass: { schema: {} } },
      };
      // A fresh, call-unique 16-char id per invocation: some scenarios (e.g. a blank _id AND a
      // file-local key both needing a generated id in the same import) need two distinct fresh ids,
      // and a constant-returning mock would collide the two, corrupting the id -> envelope map.
      let idCounter = 0;
      globalThis.foundry.utils.randomID = () => `fresh${String(idCounter++).padStart(11, '0')}`;
      globalThis.getDocumentClass = (name) => globalThis.CONFIG[name].documentClass;
   });

   it('plans a create for a row with no existing pack document', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\n'
         + 'layout,wide,,\r\npackType,Item,,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = '﻿_id,_parentId,_folder,name,type,img,sort\r\n'
         + `${'a'.repeat(16)},,,Sword,weapon,i.svg,1\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} A target pack with no existing documents. */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.errors).toEqual([]);
      expect(plan.creates).toHaveLength(1);
      expect(plan.creates[0]).toMatchObject({ documentType: 'weapon', id: 'a'.repeat(16), depth: 0, parentId: '' });
   });

   it('plans an update for a row whose id already exists in the target pack, via a dry-run validation', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\n'
         + 'sheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = `﻿_id,_parentId,_folder,name\r\n${'a'.repeat(16)},,,Renamed Sword\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} A pretend existing document supporting a dry-run updateSource. */
      const existing = { updateSource: vi.fn() };
      /** @type {object} */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => existing, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.errors).toEqual([]);
      expect(plan.updates).toHaveLength(1);
      expect(existing.updateSource).toHaveBeenCalledWith({ name: 'Renamed Sword' }, { dryRun: true });
   });

   it('records a construction error without throwing', async () => {
      globalThis.CONFIG.Item.documentClass = class { constructor() { throw new Error('invalid'); } };
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\n'
         + 'sheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = `﻿_id,name\r\n${'a'.repeat(16)},Sword\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.creates).toHaveLength(0);
      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0].message).toContain('invalid');
   });

   it('assigns a fresh id to a blank _id and to a non-Foundry-id file-local key, remapping references', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Actor,,\r\n'
         + 'sheet,npc,npc,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const npc = '﻿_id,_parentId,name\r\nnew-goblin,,Goblin\r\n';
      /** @type {string} */
      const weapon = '﻿_id,_parentId,name\r\n,new-goblin,Dagger\r\n';
      globalThis.CONFIG.Actor = {
         dataModels: {},
         documentClass: class { constructor(source) { Object.assign(this, source); } },
      };
      const files = [csvFile('_manifest.csv', manifest), csvFile('npc.csv', npc), csvFile('weapon.csv', weapon)];
      /** @type {object} */
      const targetPack = { metadata: { type: 'Actor' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      /** @type {object} */
      const npcCreate = plan.creates.find((c) => c.documentType === 'npc');
      /** @type {object} */
      const weaponCreate = plan.creates.find((c) => c.documentType === 'weapon');
      expect(npcCreate.id).toMatch(/^[a-zA-Z0-9]{16}$/);
      expect(weaponCreate.parentId).toBe(npcCreate.id);
      expect(weaponCreate.depth).toBe(1);
   });

   it('routes an actor pack\'s owned item, own effect, and item effect to their own document classes',
      async () => {
      /** @type {object[]} Every document-class construction planImport performs, in order. */
      const constructed = [];
      /** Builds a stand-in document class recording the class name each row is validated against. */
      const makeDocumentClass = (documentName) => class {
         constructor(source) {
            constructed.push({ documentName, id: source._id });
            Object.assign(this, source);
         }
      };
      globalThis.CONFIG = {
         Actor: { dataModels: {}, documentClass: makeDocumentClass('Actor') },
         Item: { dataModels: {}, documentClass: makeDocumentClass('Item') },
         // The subtype registry is what tells an actor's own effect apart from its owned item: both are
         // depth-1 children of the actor, so depth and pack type alone cannot route them.
         ActiveEffect: { dataModels: { effect: makeEmptySchemaDataModel() }, documentClass: makeDocumentClass('ActiveEffect') },
      };
      const files = actorGraphFiles();

      const plan = await planImport(files, null, false);

      expect(plan.errors).toEqual([]);
      expect(plan.creates).toHaveLength(4);
      expect(plan.creates.find((c) => c.id === ACTOR_ID))
         .toMatchObject({ documentName: 'Actor', depth: 0, parentId: '' });
      expect(plan.creates.find((c) => c.id === ITEM_ID))
         .toMatchObject({ documentName: 'Item', depth: 1, parentId: ACTOR_ID });
      expect(plan.creates.find((c) => c.id === ACTOR_EFFECT_ID))
         .toMatchObject({ documentName: 'ActiveEffect', depth: 1, parentId: ACTOR_ID });
      expect(plan.creates.find((c) => c.id === ITEM_EFFECT_ID))
         .toMatchObject({ documentName: 'ActiveEffect', depth: 2, parentId: ITEM_ID });
      // Each row is validated through the class it will actually be created as: constructing the owned
      // weapon as an Actor is what the real Foundry DocumentTypeField rejects.
      expect(constructed).toContainEqual({ documentName: 'Item', id: ITEM_ID });
      expect(constructed).toContainEqual({ documentName: 'ActiveEffect', id: ACTOR_EFFECT_ID });
      expect(constructed).toContainEqual({ documentName: 'ActiveEffect', id: ITEM_EFFECT_ID });
      expect(constructed.filter((c) => c.documentName === 'Actor')).toEqual([{ documentName: 'Actor', id: ACTOR_ID }]);
   });

   it('decodes an embedded row\'s typed cell via resolveTypeSchemasForPack(\'Actor\') feeding the weapon\'s '
      + 'own Item schema into readTables', async () => {
      /** Stand-in for NumberField, matched via instanceof by resolveFieldSchema. */
      class MockNumberField {
         constructor(options = {}) {
            Object.assign(this, options);
         }
      }
      globalThis.foundry.data = {
         fields: {
            StringField: class MockStringField {},
            NumberField: MockNumberField,
            BooleanField: class MockBooleanField {},
            ObjectField: class MockObjectField {},
            ArrayField: class MockArrayField {},
            SchemaField: MockSchemaField,
         },
      };
      /** Stand-in DataModel exposing the weapon subtype's schema with one number-typed field. */
      class WeaponDataModel {
         static get schema() {
            return new MockSchemaField({ value: new MockNumberField({ nullable: false }) });
         }
      }
      globalThis.CONFIG.Actor = { dataModels: {}, documentClass: class {} };
      globalThis.CONFIG.Item.dataModels = { weapon: WeaponDataModel };

      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Actor,,\r\n'
         + 'sheet,npc,npc,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const npc = `﻿_id,_parentId,name\r\n${ACTOR_ID},,Goblin\r\n`;
      /** @type {string} A number-typed "system.value" cell carried as CSV text, not a native number. */
      const weapon = `﻿_id,_parentId,name,system.value\r\n${ITEM_ID},${ACTOR_ID},Dagger,12\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('npc.csv', npc), csvFile('weapon.csv', weapon)];
      /** @type {object} A target pack with no existing documents, so the weapon row plans as a create. */
      const targetPack = { metadata: { type: 'Actor' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.errors).toEqual([]);
      /** @type {object} */
      const weaponCreate = plan.creates.find((c) => c.id === ITEM_ID);
      expect(weaponCreate.source.system.value).toBe(12);
   });

   it('plans updates for embedded rows that already exist in the target pack, at every depth', async () => {
      globalThis.CONFIG = {
         Actor: { dataModels: {}, documentClass: class {} },
         Item: { dataModels: {}, documentClass: class {} },
         ActiveEffect: { dataModels: { effect: makeEmptySchemaDataModel() }, documentClass: class {} },
      };
      /** @type {object} The effect already on the owned item (depth 2). */
      const existingItemEffect = { updateSource: vi.fn() };
      /** @type {object} The item already owned by the actor (depth 1). */
      const existingItem = {
         updateSource: vi.fn(),
         effects: { get: (id) => (id === ITEM_EFFECT_ID ? existingItemEffect : undefined) },
      };
      /** @type {object} The effect already on the actor itself (depth 1). */
      const existingActorEffect = { updateSource: vi.fn() };
      /** @type {object} The actor already in the pack (depth 0). */
      const existingActor = {
         updateSource: vi.fn(),
         items: { get: (id) => (id === ITEM_ID ? existingItem : undefined) },
         effects: { get: (id) => (id === ACTOR_EFFECT_ID ? existingActorEffect : undefined) },
      };
      /** @type {object} */
      const targetPack = {
         metadata: { type: 'Actor' },
         getDocument: async (id) => (id === ACTOR_ID ? existingActor : null),
         getIndex: async () => [],
      };

      const plan = await planImport(actorGraphFiles(), targetPack, false);

      expect(plan.errors).toEqual([]);
      expect(plan.creates).toEqual([]);
      expect(plan.updates).toHaveLength(4);
      expect(plan.updates.find((u) => u.id === ITEM_ID))
         .toMatchObject({ documentName: 'Item', depth: 1, parentId: ACTOR_ID });
      expect(plan.updates.find((u) => u.id === ACTOR_EFFECT_ID))
         .toMatchObject({ documentName: 'ActiveEffect', depth: 1, parentId: ACTOR_ID });
      expect(plan.updates.find((u) => u.id === ITEM_EFFECT_ID))
         .toMatchObject({ documentName: 'ActiveEffect', depth: 2, parentId: ITEM_ID });
      // Every embedded row is dry-run validated against its OWN existing document, not the actor's.
      expect(existingItem.updateSource).toHaveBeenCalledWith({ name: 'Dagger' }, { dryRun: true });
      expect(existingActorEffect.updateSource).toHaveBeenCalledWith({ name: 'Blessed' }, { dryRun: true });
      expect(existingItemEffect.updateSource).toHaveBeenCalledWith({ name: 'Sharp' }, { dryRun: true });
   });

   it('plans a delete for every top-level pack index entry absent from the file when deleteMissing is true',
      async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\n'
         + 'sheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = `﻿_id,name\r\n${'a'.repeat(16)},Sword\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} */
      const targetPack = {
         metadata: { type: 'Item' },
         getDocument: async () => null,
         getIndex: async () => [{ _id: 'a'.repeat(16), type: 'weapon' }, { _id: 'z'.repeat(16), type: 'weapon' }],
      };

      const plan = await planImport(files, targetPack, true);

      expect(plan.deletes).toEqual([{ id: 'z'.repeat(16) }]);
   });

   it('refuses a file whose packType does not match the target pack', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\n';
      const files = [csvFile('_manifest.csv', manifest)];
      /** @type {object} */
      const targetPack = { metadata: { type: 'Actor' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0].message).toMatch(/does not match/);
   });

   it('returns a graceful error-only plan when readTables throws on a malformed typed cell', async () => {
      /** Stand-in for NumberField, matched via instanceof by resolveFieldSchema. */
      class MockNumberField {
         constructor(options = {}) {
            Object.assign(this, options);
         }
      }
      /** Stand-in for SchemaField, matched via instanceof by resolveFieldSchema. */
      class MockSchemaField {
         constructor(fields, options = {}) {
            Object.assign(this, options);
            /** @type {object} */
            this.fields = fields;
         }
      }
      globalThis.foundry.data = {
         fields: {
            StringField: class MockStringField {},
            NumberField: MockNumberField,
            BooleanField: class MockBooleanField {},
            ObjectField: class MockObjectField {},
            ArrayField: class MockArrayField {},
            SchemaField: MockSchemaField,
         },
      };
      /** Stand-in DataModel exposing a static schema with one number-typed field. */
      class WeaponDataModel {
         static get schema() {
            return new MockSchemaField({ value: new MockNumberField({ nullable: false }) });
         }
      }
      globalThis.CONFIG.Item.dataModels = { weapon: WeaponDataModel };

      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\n'
         + 'sheet,weapon,weapon,\r\n';
      /** @type {string} A malformed non-numeric value in the "system.value" number-typed column. */
      const weapon = `﻿_id,name,system.value\r\n${'a'.repeat(16)},Sword,not-a-number\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.creates).toEqual([]);
      expect(plan.updates).toEqual([]);
      expect(plan.deletes).toEqual([]);
      expect(plan.folders).toEqual([]);
      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0]).toMatchObject({ sheet: '_manifest', row: 0, column: '' });
      expect(plan.errors[0].message).toContain('Failed to read the file:');

      delete globalThis.foundry.data;
   });

   it('returns a graceful error-only plan when the uploaded file itself cannot be decoded', async () => {
      /** @type {object} A single .xlsx-named file whose bytes are not a valid zip/xlsx archive. */
      const corruptXlsx = {
         name: 'weapons.xlsx',
         arrayBuffer: async () => new TextEncoder().encode('not a real xlsx file').buffer,
      };
      /** @type {object} */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport([corruptXlsx], targetPack, false);

      expect(plan.creates).toEqual([]);
      expect(plan.updates).toEqual([]);
      expect(plan.deletes).toEqual([]);
      expect(plan.folders).toEqual([]);
      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0]).toMatchObject({ sheet: '_manifest', row: 0, column: '' });
      expect(plan.errors[0].message).toContain('Failed to read the file:');
      expect(plan.packType).toBe('');
   });
});
