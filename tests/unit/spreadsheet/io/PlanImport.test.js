import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planImport } from '~/spreadsheet/io/PlanImport.js';

/** Builds a minimal in-browser File-like object carrying CSV text. */
function csvFile(name, text) {
   return { name, text: async () => text, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

describe('planImport', () => {
   beforeEach(() => {
      globalThis.CONFIG = {
         Item: { dataModels: {}, documentClass: class { constructor(source) { Object.assign(this, source); } } },
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
