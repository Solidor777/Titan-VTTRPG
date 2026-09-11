import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCompendium } from '~/spreadsheet/io/ExportCompendium.js';
import { unzipFilesAsText } from '~/spreadsheet/format/Zip.js';

/**
 * Minimal stand-in for an owned Item/ActiveEffect document.
 * @param type
 * @param id
 * @param system
 * @param effects
 */
function makeDoc(type, id, system = {}, effects = []) {
   return {
      type,
      id,
      effects,
      toObject: () => ({
         _id: id,
         name: id,
         type,
         system 
      }) 
   };
}

/** Minimal stand-in for a Foundry DataField, matching real DataField's own instance-property copying. */
class MockField {
   /**
    * @param {object} options - The field configuration (e.g. Nullable).
    */
   constructor(options = {}) {
      Object.assign(this, options);
   }
}

/** Stand-in for StringField. */
class MockStringField extends MockField {}
/** Stand-in for NumberField. */
class MockNumberField extends MockField {}

/** Stand-in for SchemaField, capturing its sub-fields map. */
class MockSchemaField extends MockField {
   /**
    * @param {object} fields - Map of sub-field name to MockField.
    * @param {object} [options] - Field options.
    */
   constructor(fields, options = {}) {
      super(options);
      /** @type {object} */
      this.fields = fields;
   }
}

describe('exportCompendium', () => {
   beforeEach(() => {
      /** @type {object} Minimal per-document-type CONFIG entry resolveTypeSchemas reads. */
      const emptyTypeConfig = {
         dataModels: {},
         documentClass: { schema: { fields: {} } } 
      };
      globalThis.CONFIG = {
         Item: emptyTypeConfig,
         Actor: emptyTypeConfig,
         ActiveEffect: emptyTypeConfig 
      };
      globalThis.foundry.utils.saveDataToFile = vi.fn();
   });

   it('walks embedded items and their effects into the export and triggers a download', async () => {
      /** @type {object} A weapon with one effect on it. */
      const weapon = makeDoc('weapon', 'a'.repeat(16), { rarity: 'common' }, [makeDoc('effect', 'c'.repeat(16))]);
      /** @type {object} An actor owning that weapon. */
      const actor = {
         type: 'npc',
         id: 'b'.repeat(16),
         items: [weapon],
         effects: [],
         folder: null,
         toObject: () => ({
            _id: 'b'.repeat(16),
            name: 'Goblin',
            type: 'npc' 
         }),
      };
      /** @type {object} A pack stand-in. */
      const pack = {
         metadata: {
            type: 'Actor',
            label: 'Test Actors' 
         },
         folders: [],
         getDocuments: async () => [actor],
      };

      await exportCompendium(pack, 'csv', 'wide');

      expect(globalThis.foundry.utils.saveDataToFile).toHaveBeenCalledOnce();
      /** @type {[Uint8Array|string, string, string]} */
      const [, mimeType, filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Test Actors.zip');
      expect(mimeType).toBe('application/zip');
   });

   it('writes exactly one row per embedded document across the full actor/item/effect graph', async () => {
      /** @type {object} An effect living on the owned weapon (depth 2). */
      const itemEffect = makeDoc('effect', 'c'.repeat(16));
      /** @type {object} An effect living on the actor itself (depth 1). */
      const actorEffect = makeDoc('effect', 'd'.repeat(16));
      /** @type {object} A weapon owning one effect. */
      const weapon = makeDoc('weapon', 'a'.repeat(16), { rarity: 'common' }, [itemEffect]);
      /** @type {object} An actor owning that weapon and its own effect. */
      const actor = {
         type: 'npc',
         id: 'b'.repeat(16),
         items: [weapon],
         effects: [actorEffect],
         folder: null,
         toObject: () => ({
            _id: 'b'.repeat(16),
            name: 'Goblin',
            type: 'npc' 
         }),
      };
      /** @type {object} */
      const pack = {
         metadata: {
            type: 'Actor',
            label: 'Test Actors' 
         },
         folders: [],
         getDocuments: async () => [actor],
      };

      await exportCompendium(pack, 'csv', 'wide');

      /** @type {Object<string,string>} The downloaded zip's CSV files, keyed by filename. */
      const files = unzipFilesAsText(globalThis.foundry.utils.saveDataToFile.mock.calls[0][0]);
      /** @type {string[]} The effect sheet's data rows (header row dropped). */
      const effectRows = files['effect.csv'].replace(/^﻿/, '').split('\r\n').filter(Boolean).slice(1);
      expect(effectRows).toHaveLength(2);
      expect(effectRows.filter((row) => row.includes('c'.repeat(16)))).toHaveLength(1);
      expect(effectRows.filter((row) => row.includes('d'.repeat(16)))).toHaveLength(1);
      /** @type {string[]} The weapon sheet's data rows. */
      const weaponRows = files['weapon.csv'].replace(/^﻿/, '').split('\r\n').filter(Boolean).slice(1);
      expect(weaponRows).toHaveLength(1);
   });

   it("orders an actor pack's embedded weapon sheet columns by the weapon's own schema, not first-seen", async () => {
      globalThis.foundry.data = {
         fields: {
            StringField: MockStringField,
            NumberField: MockNumberField,
            SchemaField: MockSchemaField,
            ArrayField: class {},
            BooleanField: class {},
         },
      };
      /**
       * Stand-in DataModel declaring "rarity" before "value", the opposite of the document's own field
       * insertion order below, so the assertion proves the order comes from the schema, not first-seen.
       */
      class WeaponDataModel {
         static get schema() {
            return new MockSchemaField({
               rarity: new MockStringField({ nullable: false }),
               value: new MockNumberField({ nullable: false }),
            });
         }
      }
      globalThis.CONFIG.Item = {
         dataModels: { weapon: WeaponDataModel },
         documentClass: { schema: { fields: {} } } 
      };
      /** @type {object} A weapon whose own field insertion order is value-then-rarity. */
      const weapon = makeDoc('weapon', 'a'.repeat(16), {
         value: 5,
         rarity: 'common' 
      });
      /** @type {object} An actor owning that weapon. */
      const actor = {
         type: 'npc',
         id: 'b'.repeat(16),
         items: [weapon],
         effects: [],
         folder: null,
         toObject: () => ({
            _id: 'b'.repeat(16),
            name: 'Goblin',
            type: 'npc' 
         }),
      };
      /** @type {object} */
      const pack = {
         metadata: {
            type: 'Actor',
            label: 'Test Actors' 
         },
         folders: [],
         getDocuments: async () => [actor],
      };

      await exportCompendium(pack, 'csv', 'wide');

      /** @type {Object<string,string>} The downloaded zip's CSV files, keyed by filename. */
      const files = unzipFilesAsText(globalThis.foundry.utils.saveDataToFile.mock.calls[0][0]);
      /** @type {string} The weapon sheet's header row. */
      const weaponHeader = files['weapon.csv'].replace(/^﻿/, '').split('\r\n')[0];
      expect(weaponHeader.indexOf('system.rarity')).toBeLessThan(weaponHeader.indexOf('system.value'));

      delete globalThis.foundry.data;
   });

   it('downloads a .zip containing only the manifest for a pack with zero documents', async () => {
      /** @type {object} Minimal per-document-type CONFIG entry resolveTypeSchemas reads. */
      const emptyTypeConfig = {
         dataModels: {},
         documentClass: { schema: { fields: {} } } 
      };
      globalThis.CONFIG = {
         Item: emptyTypeConfig,
         ActiveEffect: emptyTypeConfig 
      };
      /** @type {object} */
      const pack = {
         metadata: {
            type: 'Item',
            label: 'Empty Items' 
         },
         folders: [],
         getDocuments: async () => [] 
      };
      await exportCompendium(pack, 'csv', 'wide');
      /** @type {[Uint8Array|string, string, string]} */
      const [payload, mimeType, filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Empty Items.zip');
      expect(mimeType).toBe('application/zip');
      /** @type {Object<string,string>} The downloaded zip's CSV files, keyed by filename. */
      const files = unzipFilesAsText(payload);
      expect(Object.keys(files)).toEqual(['_manifest.csv']);
   });

   it('downloads a .xlsx for xlsx format', async () => {
      /** @type {object} */
      const pack = {
         metadata: {
            type: 'Item',
            label: 'Weapons' 
         },
         folders: [],
         getDocuments: async () => [] 
      };
      await exportCompendium(pack, 'xlsx', 'wide');
      /** @type {[Uint8Array|string, string, string]} */
      const [, mimeType, filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Weapons.xlsx');
      expect(mimeType).toBe('application/octet-stream');
   });
});
