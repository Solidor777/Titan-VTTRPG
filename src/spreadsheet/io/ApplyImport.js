import { resolveFolderPath, splitFolderPath, unescapeFolderName } from '~/spreadsheet/io/FolderPath.js';
import { buildPackEmbeddedIndex } from '~/spreadsheet/io/EmbeddedPackIndex.js';

/**
 * Groups an array by a key function, preserving first-seen key order.
 * @template T
 * @param {T[]} items - The items to group.
 * @param {(item: T) => string} keyOf - Derives each item's group key.
 * @returns {Map<string, T[]>} The grouped items.
 */
function groupBy(items, keyOf) {
   /** @type {Map<string, T[]>} */
   const groups = new Map();
   for (const item of items) {
      /** @type {string} */
      const key = keyOf(item);
      if (!groups.has(key)) {
         groups.set(key, []);
      }
      groups.get(key).push(item);
   }
   return groups;
}

/**
 * Resolves a list of slash-separated folder paths against a pack's existing folders, creating any
 * missing folders (and their missing ancestors, since paths are processed shortest-first) in the pack.
 * @param {string[]} paths - The folder paths to resolve.
 * @param {CompendiumCollection} pack - The target pack.
 * @returns {Promise<Map<string,string>>} Map of folder path to its (existing or newly created) folder id.
 */
async function resolveFolders(paths, pack) {
   /** @type {Map<string,string>} path -> folder id. */
   const resolved = new Map();
   for (const folder of pack.folders ?? []) {
      resolved.set(resolveFolderPath(folder), folder.id);
   }

   /** @type {string[]} */
   const sortedPaths = [...new Set(paths)]
      .filter(Boolean)
      .sort((a, b) => splitFolderPath(a).length - splitFolderPath(b).length);
   for (const path of sortedPaths) {
      if (resolved.has(path)) {
         continue;
      }
      /** @type {string[]} Escaped segments; the map keys above are also escaped-segment joins. */
      const segments = splitFolderPath(path);
      /** @type {string} */
      const parentPath = segments.slice(0, -1).join('/');
      /** @type {Folder[]} */
      const [created] = await Folder.createDocuments(
         [{
            name: unescapeFolderName(segments[segments.length - 1]),
            type: pack.metadata.type,
            folder: resolved.get(parentPath) ?? null,
         }],
         { pack: pack.collection },
      );
      resolved.set(path, created.id);
   }
   return resolved;
}

/**
 * Resolves an embedded row's parent document instance. Tries one created or updated earlier in this same
 * run first, then a top-level pack document, then a document already embedded in the pack (an item
 * embedded on an actor, or an effect embedded on an item) via the pack's embedded-document index, since
 * `pack.getDocument` only resolves top-level documents and so misses a depth-2 parent, such as an effect
 * whose parent item is itself embedded on an actor, that was never touched by this import run.
 * @param {string} parentId - The parent document's id.
 * @param {Map<string, object>} resolved - Documents created or updated earlier in this same run.
 * @param {CompendiumCollection} pack - The target pack.
 * @param {{promise: Promise<Map<string,{document:object}>>|null}} embeddedIndexCache - Mutated in place
 * to memoize the pack's embedded-document index across every call within one `applyImport` run.
 * @returns {Promise<object|undefined>} The parent instance, or undefined if it exists nowhere.
 */
async function resolveParent(parentId, resolved, pack, embeddedIndexCache) {
   if (resolved.has(parentId)) {
      return resolved.get(parentId);
   }
   /** @type {object|undefined} */
   const topLevel = await pack.getDocument(parentId);
   if (topLevel) {
      return topLevel;
   }
   embeddedIndexCache.promise ??= buildPackEmbeddedIndex(pack);
   return (await embeddedIndexCache.promise).get(parentId)?.document;
}

/**
 * Applies a validated ImportPlan: creates the target compendium if requested, creates missing folders,
 * then creates and updates documents depth-first (top-level before embedded, so a newly created or
 * fetched parent instance exists before embedding into it), then deletes top-level documents if planned.
 * Each plan entry names the document class it is written through (`documentName`, resolved during
 * planning), so an actor's owned items and its own effects route to their own embedded collections.
 * @param {import('~/spreadsheet/io/PlanImport.js').ImportPlan} plan - The validated plan.
 * @param {CompendiumCollection|null} targetPack - The existing target pack, or null to create one.
 * @param {string} [newCompendiumLabel] - The label for a newly created compendium (required if
 * targetPack is null).
 * @returns {Promise<{pack: CompendiumCollection, created: number, updated: number, deleted: number}>}
 */
export async function applyImport(plan, targetPack, newCompendiumLabel) {
   /** @type {CompendiumCollection} */
   const pack = targetPack ?? await CompendiumCollection.createCompendium({
      type: plan.packType,
      label: newCompendiumLabel,
      name: newCompendiumLabel.slugify(),
   });

   if (pack.locked) {
      throw new Error(`The pack "${pack.metadata.label}" is locked and cannot be imported into.`);
   }

   /** @type {Map<string,string>} Folder path -> resolved folder id. */
   const folderIds = await resolveFolders(plan.folders.map((f) => f.path), pack);
   /** @type {Map<string, object>} Resolved document instances, keyed by id, filled in per depth. */
   const resolved = new Map();
   /**
    * @type {{promise: Promise<Map<string,{document:object}>>|null}} Memoizes the pack's embedded-document
    * index (built lazily, at most once per run) for `resolveParent`'s depth-2 fallback.
    */
   const embeddedIndexCache = { promise: null };

   /** @type {number[]} Distinct create/update depths, ascending. */
   const depths = [...new Set([
      ...plan.creates,
      ...plan.updates,
   ].map((e) => e.depth))].sort((a, b) => a - b);

   /** @type {number} */
   let createdCount = 0;
   /** @type {number} */
   let updatedCount = 0;

   for (const depth of depths) {
      // Grouped by document class as well as parent, because one parent holds two embedded collections:
      // an actor's owned items and its own effects are both depth-1 children and go through separate
      // createEmbeddedDocuments / updateEmbeddedDocuments calls.
      /** @type {Map<string, object[]>} Creates at this depth, grouped by document class and parent id. */
      const createGroups = groupBy(
         plan.creates.filter((c) => c.depth === depth),
         (c) => `${c.documentName} ${c.parentId ?? ''}`,
      );
      for (const group of createGroups.values()) {
         /** @type {'Actor'|'Item'|'ActiveEffect'} Shared by construction: it is part of the group key. */
         const documentName = group[0].documentName;
         /** @type {string} */
         const parentId = group[0].parentId ?? '';
         /** @type {object[]} */
         const data = group.map((c) => ({
            ...c.source,
            ...(depth === 0 ? { folder: folderIds.get(c.folderPath) ?? null } : {}),
         }));
         /** @type {object[]} */
         let docs;
         if (depth === 0) {
            docs = await getDocumentClass(documentName).createDocuments(data, {
               pack: pack.collection,
               keepId: true,
            });
         }
         else {
            /**
             * @type {object|undefined} The parent instance: created or updated earlier this same run, or
             * fetched fresh when the parent wasn't itself touched by this import (e.g. an already-existing,
             * unchanged Actor that owns newly created Items, or an already-existing embedded Item that
             * owns a newly created Effect).
             */
            const parent = await resolveParent(parentId, resolved, pack, embeddedIndexCache);
            if (!parent) {
               throw new Error(
                  `Cannot create ${documentName} documents under parent "${parentId}": `
                  + 'the parent document was not found in this import or in the target pack.',
               );
            }
            docs = await parent.createEmbeddedDocuments(documentName, data, { keepId: true });
         }
         docs.forEach((doc) => resolved.set(doc.id, doc));
         createdCount += docs.length;
      }

      /** @type {Map<string, object[]>} Updates at this depth, grouped by document class and parent id. */
      const updateGroups = groupBy(
         plan.updates.filter((u) => u.depth === depth),
         (u) => `${u.documentName} ${u.parentId ?? ''}`,
      );
      for (const group of updateGroups.values()) {
         /** @type {'Actor'|'Item'|'ActiveEffect'} */
         const documentName = group[0].documentName;
         /** @type {string} */
         const parentId = group[0].parentId ?? '';
         if (depth === 0) {
            for (const update of group) {
               /** @type {object} */
               const document = await pack.getDocument(update.id);
               await document.update({
                  ...update.changes,
                  // A row with no `_folder` column (folderPath undefined) leaves the folder untouched; a
                  // present-but-blank cell (folderPath '') moves the document to the pack root.
                  ...(update.folderPath !== undefined
                     ? { folder: update.folderPath ? folderIds.get(update.folderPath) ?? null : null }
                     : {}),
               });
               resolved.set(update.id, document);
            }
         }
         else {
            /**
             * @type {object|undefined} The resolved parent instance: created or updated earlier in this same
             * pass, or fetched fresh when only its embedded child changed and its own fields did not
             * (including a depth-2 parent that is itself embedded, via the pack's embedded-document index).
             */
            const parent = await resolveParent(parentId, resolved, pack, embeddedIndexCache);
            if (!parent) {
               throw new Error(
                  `Cannot update ${documentName} documents under parent "${parentId}": `
                  + 'the parent document was not found in this import or in the target pack.',
               );
            }
            await parent.updateEmbeddedDocuments(documentName, group.map((u) => ({
               _id: u.id,
               ...u.changes,
            })));
            /** @type {string} The parent's embedded-collection property name for this document class. */
            const collectionKey = documentName === 'Item' ? 'items' : 'effects';
            for (const update of group) {
               resolved.set(update.id, parent[collectionKey].get(update.id));
            }
         }
         updatedCount += group.length;
      }
   }

   if (plan.deletes.length) {
      await getDocumentClass(plan.packType).deleteDocuments(plan.deletes.map((d) => d.id), { pack: pack.collection });
   }

   return {
      pack,
      created: createdCount,
      updated: updatedCount,
      deleted: plan.deletes.length,
   };
}
