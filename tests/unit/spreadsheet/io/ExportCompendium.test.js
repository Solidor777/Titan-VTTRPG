import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCompendium } from '~/spreadsheet/io/ExportCompendium.js';

/** Minimal stand-in for an owned Item/ActiveEffect document. */
function makeDoc(type, id, system = {}, effects = []) {
   return { type, id, effects, toObject: () => ({ _id: id, name: id, type, system }) };
}

describe('exportCompendium', () => {
   beforeEach(() => {
      /** @type {object} Minimal per-document-type CONFIG entry resolveTypeSchemas reads. */
      const emptyTypeConfig = { dataModels: {}, documentClass: { schema: { fields: {} } } };
      globalThis.CONFIG = { Item: emptyTypeConfig, Actor: emptyTypeConfig };
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
         toObject: () => ({ _id: 'b'.repeat(16), name: 'Goblin', type: 'npc' }),
      };
      /** @type {object} A pack stand-in. */
      const pack = {
         metadata: { type: 'Actor', label: 'Test Actors' },
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

   it('downloads a single .csv when the workbook has exactly one sheet', async () => {
      globalThis.CONFIG = { Item: { dataModels: {}, documentClass: { schema: { fields: {} } } } };
      /** @type {object} */
      const pack = { metadata: { type: 'Item', label: 'Empty Items' }, folders: [], getDocuments: async () => [] };
      await exportCompendium(pack, 'csv', 'wide');
      /** @type {[Uint8Array|string, string, string]} */
      const [, , filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Empty Items.csv');
   });

   it('downloads a .xlsx for xlsx format', async () => {
      /** @type {object} */
      const pack = { metadata: { type: 'Item', label: 'Weapons' }, folders: [], getDocuments: async () => [] };
      await exportCompendium(pack, 'xlsx', 'wide');
      /** @type {[Uint8Array|string, string, string]} */
      const [, mimeType, filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Weapons.xlsx');
      expect(mimeType).toBe('application/octet-stream');
   });
});
