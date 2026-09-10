/**
 * Resolves which embedded document type a given nesting depth represents for a pack type: depth 0 is
 * the pack's own type; depth 1 is "Item" for an Actor pack (an owned item) or "ActiveEffect" otherwise
 * (a direct effect); depth 2 is always "ActiveEffect" (an effect on an owned item).
 * @param {'Actor'|'Item'|'ActiveEffect'} packType - The pack's document type.
 * @param {number} depth - The nesting depth.
 * @returns {'Actor'|'Item'|'ActiveEffect'} The document type at that depth.
 */
function embeddedTypeAt(packType, depth) {
   if (depth === 0) {
      return packType;
   }
   if (depth === 1) {
      return packType === 'Actor' ? 'Item' : 'ActiveEffect';
   }
   return 'ActiveEffect';
}

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
 * Rebuilds a folder's slash-separated path from the pack root, mirroring the export side's escaping so
 * paths compare equal.
 * @param {Folder} folder - The folder to compute the path for.
 * @returns {string} The folder's path.
 */
function folderPathOf(folder) {
   /** @type {string[]} */
   const names = [];
   /** @type {Folder|null} */
   let current = folder;
   while (current) {
      names.unshift(current.name.replace(/\//g, '\\/'));
      current = current.folder ?? null;
   }
   return names.join('/');
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
      resolved.set(folderPathOf(folder), folder.id);
   }

   /** @type {string[]} */
   const sortedPaths = [...new Set(paths)]
      .filter(Boolean)
      .sort((a, b) => a.split('/').length - b.split('/').length);
   for (const path of sortedPaths) {
      if (resolved.has(path)) {
         continue;
      }
      /** @type {string[]} */
      const segments = path.split('/');
      /** @type {string} */
      const parentPath = segments.slice(0, -1).join('/');
      /** @type {Folder[]} */
      const [created] = await Folder.createDocuments(
         [{
            name: segments[segments.length - 1],
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
 * Applies a validated ImportPlan: creates the target compendium if requested, creates missing folders,
 * then creates and updates documents depth-first (top-level before embedded, so a newly created or
 * fetched parent instance exists before embedding into it), then deletes top-level documents if planned.
 * @param {import('~/spreadsheet/io/PlanImport.js').ImportPlan} plan - The validated plan.
 * @param {CompendiumCollection|null} targetPack - The existing target pack, or null to create one.
 * @param {string} [newCompendiumLabel] - The label for a newly created compendium (required if
 *    targetPack is null).
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

   /** @type {number[]} Distinct create/update depths, ascending. */
   const depths = [...new Set([...plan.creates, ...plan.updates].map((e) => e.depth))].sort((a, b) => a - b);

   /** @type {number} */
   let createdCount = 0;
   /** @type {number} */
   let updatedCount = 0;

   for (const depth of depths) {
      /** @type {Map<string, object[]>} Creates at this depth, grouped by parent id ('' for top-level). */
      const createsByParent = groupBy(plan.creates.filter((c) => c.depth === depth), (c) => c.parentId ?? '');
      for (const [parentId, group] of createsByParent) {
         /** @type {object[]} */
         const data = group.map((c) => ({
            ...c.source,
            ...(depth === 0 ? { folder: folderIds.get(c.folderPath) ?? null } : {}),
         }));
         /** @type {object[]} */
         const docs = depth === 0
            ? await getDocumentClass(embeddedTypeAt(plan.packType, depth)).createDocuments(
               data,
               { pack: pack.collection, keepId: true },
            )
            : await resolved.get(parentId).createEmbeddedDocuments(
               embeddedTypeAt(plan.packType, depth),
               data,
               { keepId: true },
            );
         docs.forEach((doc, i) => resolved.set(group[i].id, doc));
         createdCount += docs.length;
      }

      /** @type {Map<string, object[]>} Updates at this depth, grouped by parent id. */
      const updatesByParent = groupBy(plan.updates.filter((u) => u.depth === depth), (u) => u.parentId ?? '');
      for (const [parentId, group] of updatesByParent) {
         if (depth === 0) {
            for (const update of group) {
               /** @type {object} */
               const document = await pack.getDocument(update.id);
               await document.update(update.changes);
               resolved.set(update.id, document);
            }
         }
         else {
            /** @type {object} The resolved parent instance: created/updated earlier in this same pass, or
             * (a parent whose own fields are unchanged, only its embedded child changed) fetched fresh. */
            const parent = resolved.get(parentId) ?? await pack.getDocument(parentId);
            await parent.updateEmbeddedDocuments(
               embeddedTypeAt(plan.packType, depth),
               group.map((u) => ({ _id: u.id, ...u.changes })),
            );
            /** @type {string} The parent's embedded-collection property name at this depth. */
            const collectionKey = embeddedTypeAt(plan.packType, depth) === 'Item' ? 'items' : 'effects';
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

   return { pack, created: createdCount, updated: updatedCount, deleted: plan.deletes.length };
}
