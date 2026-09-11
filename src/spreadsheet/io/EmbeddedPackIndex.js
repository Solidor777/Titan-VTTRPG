/**
 * Builds an index of every document already embedded in the target pack — each top-level document's
 * owned items, those items' effects, and each top-level document's own effects — keyed by id. Used by
 * `PlanImport.js` to resolve a row whose parent is absent from the uploaded file but already exists in
 * the pack, and by `ApplyImport.js` to resolve a row's actual parent INSTANCE when that parent is itself
 * embedded (depth 2) and so is invisible to `pack.getDocument`, which only finds top-level documents.
 * @param {CompendiumCollection} targetPack - The existing target pack.
 * @returns {Promise<Map<string, {document:object, parentId:string, depth:number}>>} Embedded-document id
 *    -> its real parent id, document instance, and nesting depth (1 = owned item or top-level document's
 *    own effect, 2 = an effect on an owned item).
 */
export async function buildPackEmbeddedIndex(targetPack) {
   /** @type {Map<string, {document:object, parentId:string, depth:number}>} */
   const index = new Map();
   /** @type {object[]} */
   const topLevelDocuments = await targetPack.getDocuments();
   for (const document of topLevelDocuments) {
      for (const item of document.items ?? []) {
         index.set(item.id, { document: item, parentId: document.id, depth: 1 });
         for (const effect of item.effects ?? []) {
            index.set(effect.id, { document: effect, parentId: item.id, depth: 2 });
         }
      }
      for (const effect of document.effects ?? []) {
         index.set(effect.id, { document: effect, parentId: document.id, depth: 1 });
      }
   }
   return index;
}
