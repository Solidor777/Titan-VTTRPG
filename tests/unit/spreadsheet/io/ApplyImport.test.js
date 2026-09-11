import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyImport } from '~/spreadsheet/io/ApplyImport.js';

describe('applyImport', () => {
   beforeEach(() => {
      globalThis.getDocumentClass = vi.fn();
   });

   it('creates top-level documents via DocumentClass.createDocuments with keepId', async () => {
      /** @type {object[]} */
      const createdDocs = [{ id: 'a'.repeat(16) }];
      /** @type {object} */
      const ItemClass = { createDocuments: vi.fn(async () => createdDocs) };
      globalThis.getDocumentClass = () => ItemClass;
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Item' } 
      };
      /** @type {object} */
      const plan = {
         packType: 'Item',
         folders: [],
         creates: [
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'a'.repeat(16),
               parentId: '',
               depth: 0,
               source: { _id: 'a'.repeat(16) },
               folderPath: '',
            },
         ],
         updates: [],
         deletes: [],
      };

      const result = await applyImport(plan, pack);

      expect(ItemClass.createDocuments).toHaveBeenCalledWith(
         [{
            _id: 'a'.repeat(16),
            folder: null 
         }],
         {
            pack: 'world.test',
            keepId: true 
         },
      );
      expect(result).toEqual({
         pack,
         created: 1,
         updated: 0,
         deleted: 0 
      });
   });

   it('creates an embedded item via the resolved parent actor instance', async () => {
      /** @type {object[]} */
      const createdActors = [{
         id: 'p'.repeat(16),
         items: { get: () => undefined } 
      }];
      /** @type {object[]} */
      const createdItems = [{ id: 'i'.repeat(16) }];
      /** @type {object} */
      const ActorClass = { createDocuments: vi.fn(async () => createdActors) };
      createdActors[0].createEmbeddedDocuments = vi.fn(async () => createdItems);
      globalThis.getDocumentClass = (name) => (name === 'Actor' ? ActorClass : undefined);
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' } 
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         creates: [
            {
               documentType: 'npc',
               documentName: 'Actor',
               id: 'p'.repeat(16),
               parentId: '',
               depth: 0,
               source: { _id: 'p'.repeat(16) },
               folderPath: '',
            },
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'i'.repeat(16),
               parentId: 'p'.repeat(16),
               depth: 1,
               source: { _id: 'i'.repeat(16) },
               folderPath: '',
            },
         ],
         updates: [],
         deletes: [],
      };

      const result = await applyImport(plan, pack);

      expect(createdActors[0].createEmbeddedDocuments).toHaveBeenCalledWith(
         'Item',
         [{ _id: 'i'.repeat(16) }],
         { keepId: true },
      );
      expect(result.created).toBe(2);
   });

   it('creates a depth-2 effect via the resolved owned-item instance', async () => {
      /** @type {object[]} */
      const createdActors = [{
         id: 'p'.repeat(16),
         items: { get: () => undefined } 
      }];
      /** @type {object[]} */
      const createdItems = [{
         id: 'i'.repeat(16),
         effects: { get: () => undefined } 
      }];
      /** @type {object[]} */
      const createdEffects = [{ id: 'e'.repeat(16) }];
      /** @type {object} */
      const ActorClass = { createDocuments: vi.fn(async () => createdActors) };
      createdActors[0].createEmbeddedDocuments = vi.fn(async () => createdItems);
      createdItems[0].createEmbeddedDocuments = vi.fn(async () => createdEffects);
      globalThis.getDocumentClass = (name) => (name === 'Actor' ? ActorClass : undefined);
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' } 
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         creates: [
            {
               documentType: 'npc',
               documentName: 'Actor',
               id: 'p'.repeat(16),
               parentId: '',
               depth: 0,
               source: { _id: 'p'.repeat(16) },
               folderPath: '',
            },
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'i'.repeat(16),
               parentId: 'p'.repeat(16),
               depth: 1,
               source: { _id: 'i'.repeat(16) },
               folderPath: '',
            },
            {
               documentType: 'condition',
               documentName: 'ActiveEffect',
               id: 'e'.repeat(16),
               parentId: 'i'.repeat(16),
               depth: 2,
               source: { _id: 'e'.repeat(16) },
               folderPath: '',
            },
         ],
         updates: [],
         deletes: [],
      };

      const result = await applyImport(plan, pack);

      expect(createdItems[0].createEmbeddedDocuments).toHaveBeenCalledWith(
         'ActiveEffect',
         [{ _id: 'e'.repeat(16) }],
         { keepId: true },
      );
      expect(result.created).toBe(3);
   });

   it('updates a top-level document by fetching it from the pack and calling update', async () => {
      /** @type {object} */
      const existing = { update: vi.fn() };
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Item' },
         getDocument: async () => existing,
      };
      /** @type {object} */
      const plan = {
         packType: 'Item',
         folders: [],
         creates: [],
         deletes: [],
         updates: [
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'a'.repeat(16),
               parentId: '',
               depth: 0,
               changes: { name: 'New Name' },
               folderPath: '',
            },
         ],
      };

      const result = await applyImport(plan, pack);

      expect(existing.update).toHaveBeenCalledWith({
         name: 'New Name',
         folder: null 
      });
      expect(result.updated).toBe(1);
   });

   it('leaves the folder untouched when the imported row carried no _folder column at all', async () => {
      /** @type {object} */
      const existing = { update: vi.fn() };
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Item' },
         getDocument: async () => existing,
      };
      /** @type {object} */
      const plan = {
         packType: 'Item',
         folders: [],
         creates: [],
         deletes: [],
         updates: [
            {
               // No `folderPath` key at all: the sheet the row came from had no `_folder` column.
               documentType: 'weapon',
               documentName: 'Item',
               id: 'a'.repeat(16),
               parentId: '',
               depth: 0,
               changes: { name: 'New Name' },
            },
         ],
      };

      await applyImport(plan, pack);

      expect(existing.update).toHaveBeenCalledWith({ name: 'New Name' });
   });

   it('moves an updated top-level document into its resolved target folder', async () => {
      /** @type {object} */
      const existing = { update: vi.fn() };
      /** @type {object} */
      const existingFolder = {
         id: 'f'.repeat(16),
         name: 'Weapons',
         folder: null 
      };
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Item' },
         folders: [existingFolder],
         getDocument: async () => existing,
      };
      /** @type {object} */
      const plan = {
         packType: 'Item',
         folders: [{ path: 'Weapons' }],
         deletes: [],
         creates: [],
         updates: [
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'a'.repeat(16),
               parentId: '',
               depth: 0,
               changes: { name: 'New Name' },
               folderPath: 'Weapons',
            },
         ],
      };

      await applyImport(plan, pack);

      expect(existing.update).toHaveBeenCalledWith({
         name: 'New Name',
         folder: 'f'.repeat(16) 
      });
   });

   it('creates an embedded item via a parent fetched from the pack when not in the run', async () => {
      /** @type {object[]} */
      const createdItems = [{ id: 'i'.repeat(16) }];
      /** @type {object} */
      const fetchedActor = {
         id: 'p'.repeat(16),
         createEmbeddedDocuments: vi.fn(async () => createdItems) 
      };
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' },
         getDocument: async (id) => (id === fetchedActor.id ? fetchedActor : undefined),
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         updates: [],
         deletes: [],
         creates: [
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'i'.repeat(16),
               parentId: 'p'.repeat(16),
               depth: 1,
               source: { _id: 'i'.repeat(16) },
               folderPath: '',
            },
         ],
      };

      const result = await applyImport(plan, pack);

      expect(fetchedActor.createEmbeddedDocuments).toHaveBeenCalledWith(
         'Item',
         [{ _id: 'i'.repeat(16) }],
         { keepId: true },
      );
      expect(result.created).toBe(1);
   });

   it('creates a depth-2 effect via a parent item found embedded in the pack, not top level', async () => {
      /** @type {object[]} */
      const createdEffects = [{ id: 'e'.repeat(16) }];
      /** @type {object} */
      const ownedItem = {
         id: 'i'.repeat(16),
         createEmbeddedDocuments: vi.fn(async () => createdEffects) 
      };
      /** @type {object} */
      const owningActor = {
         id: 'p'.repeat(16),
         items: [ownedItem],
         effects: [] 
      };
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' },
         getDocument: async () => undefined,
         getDocuments: async () => [owningActor],
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         updates: [],
         deletes: [],
         creates: [
            {
               documentType: 'condition',
               documentName: 'ActiveEffect',
               id: 'e'.repeat(16),
               parentId: 'i'.repeat(16),
               depth: 2,
               source: { _id: 'e'.repeat(16) },
               folderPath: '',
            },
         ],
      };

      const result = await applyImport(plan, pack);

      expect(ownedItem.createEmbeddedDocuments).toHaveBeenCalledWith(
         'ActiveEffect',
         [{ _id: 'e'.repeat(16) }],
         { keepId: true },
      );
      expect(result.created).toBe(1);
   });

   it('throws a descriptive error naming the parent id when the parent exists nowhere', async () => {
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' },
         getDocument: async () => undefined,
         getDocuments: async () => [],
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         updates: [],
         deletes: [],
         creates: [
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'i'.repeat(16),
               parentId: 'p'.repeat(16),
               depth: 1,
               source: { _id: 'i'.repeat(16) },
               folderPath: '',
            },
         ],
      };

      await expect(applyImport(plan, pack)).rejects.toThrow(new RegExp('p'.repeat(16)));
   });

   it('updates an embedded item via a parent fetched from the pack when not in the run', async () => {
      /** @type {object} */
      const fetchedActor = {
         id: 'p'.repeat(16),
         updateEmbeddedDocuments: vi.fn(),
         items: { get: () => undefined } 
      };
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' },
         getDocument: async (id) => (id === fetchedActor.id ? fetchedActor : undefined),
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         creates: [],
         deletes: [],
         updates: [
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'i'.repeat(16),
               parentId: 'p'.repeat(16),
               depth: 1,
               changes: { name: 'New Name' },
               folderPath: '',
            },
         ],
      };

      const result = await applyImport(plan, pack);

      expect(fetchedActor.updateEmbeddedDocuments).toHaveBeenCalledWith(
         'Item',
         [{
            _id: 'i'.repeat(16),
            name: 'New Name' 
         }],
      );
      expect(result.updated).toBe(1);
   });

   it('updates a depth-2 effect via a parent item found embedded in the pack, not top level', async () => {
      /**
       * @type {object[]} An array (iterable, for `buildPackEmbeddedIndex`) that also carries a `.get`
       * method (for `applyImport`'s post-update `resolved` bookkeeping), mirroring an EmbeddedCollection.
       */
      const ownedItemEffects = Object.assign([], { get: () => undefined });
      /** @type {object} */
      const ownedItem = {
         id: 'i'.repeat(16),
         updateEmbeddedDocuments: vi.fn(),
         effects: ownedItemEffects 
      };
      /** @type {object} */
      const owningActor = {
         id: 'p'.repeat(16),
         items: [ownedItem],
         effects: [] 
      };
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' },
         getDocument: async () => undefined,
         getDocuments: async () => [owningActor],
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         creates: [],
         deletes: [],
         updates: [
            {
               documentType: 'condition',
               documentName: 'ActiveEffect',
               id: 'e'.repeat(16),
               parentId: 'i'.repeat(16),
               depth: 2,
               changes: { name: 'New Name' },
               folderPath: '',
            },
         ],
      };

      const result = await applyImport(plan, pack);

      expect(ownedItem.updateEmbeddedDocuments).toHaveBeenCalledWith(
         'ActiveEffect',
         [{
            _id: 'e'.repeat(16),
            name: 'New Name' 
         }],
      );
      expect(result.updated).toBe(1);
   });

   it('throws a descriptive error naming the parent id when updating and the parent exists nowhere', async () => {
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Actor' },
         getDocument: async () => undefined,
         getDocuments: async () => [],
      };
      /** @type {object} */
      const plan = {
         packType: 'Actor',
         folders: [],
         creates: [],
         deletes: [],
         updates: [
            {
               documentType: 'weapon',
               documentName: 'Item',
               id: 'i'.repeat(16),
               parentId: 'p'.repeat(16),
               depth: 1,
               changes: { name: 'New Name' },
               folderPath: '',
            },
         ],
      };

      await expect(applyImport(plan, pack)).rejects.toThrow(new RegExp('p'.repeat(16)));
   });

   it('refuses to apply into a locked pack', async () => {
      /** @type {object} */
      const pack = {
         locked: true,
         metadata: { label: 'Locked Pack' } 
      };
      await expect(applyImport({
         packType: 'Item',
         creates: [],
         updates: [],
         deletes: [],
         folders: [] 
      }, pack))
         .rejects.toThrow(/locked/);
   });

   it('deletes top-level documents by id via DocumentClass.deleteDocuments', async () => {
      /** @type {object} */
      const ItemClass = { deleteDocuments: vi.fn(async () => []) };
      globalThis.getDocumentClass = () => ItemClass;
      /** @type {object} */
      const pack = {
         locked: false,
         collection: 'world.test',
         metadata: { type: 'Item' } 
      };
      /** @type {object} */
      const plan = {
         packType: 'Item',
         creates: [],
         updates: [],
         folders: [],
         deletes: [{ id: 'z'.repeat(16) }] 
      };

      const result = await applyImport(plan, pack);

      expect(ItemClass.deleteDocuments).toHaveBeenCalledWith(['z'.repeat(16)], { pack: 'world.test' });
      expect(result.deleted).toBe(1);
   });
});
