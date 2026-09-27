/**
 * @typedef {import('~/sidebar/tray/EffectTrayState.svelte.js').EffectTrayNode} EffectTrayNode
 * @typedef {import('~/sidebar/tray/EffectTrayState.svelte.js').EffectTrayTree} EffectTrayTree
 */

/**
 * @typedef {object} FilteredEffectTree
 * @property {EffectTrayTree} tree - The tree pruned to the folders and effects that match.
 * @property {Set<string>} autoExpand - The uuids of the folders shown expanded while the search is active.
 */

/**
 * Prunes the tray's folder tree to a search, mirroring the core directory search
 * (`DocumentDirectory#_matchSearchFolders` / `#_matchSearchEntries`):
 * - A folder whose name matches is kept with its direct effects, but is not expanded automatically.
 * - An effect that matches is kept, and every folder above it is kept and expanded automatically.
 * - Every folder above a kept folder is kept and expanded automatically.
 * - Folders holding no match are removed.
 * @param {EffectTrayTree} tree - The full folder tree.
 * @param {(folder: Folder) => boolean} isFolderMatch - Whether a folder's name matches the search.
 * @param {(effect: object) => boolean} isEffectMatch - Whether an effect matches the search.
 * @returns {FilteredEffectTree} The pruned tree and the folders to show expanded.
 */
export default function filterEffectTree(tree, isFolderMatch, isEffectMatch) {
   /** @type {Set<string>} The uuids of the folders expanded because they contain a match. */
   const autoExpand = new Set();

   /**
    * Prunes one folder node, or returns null when nothing inside it matches.
    * @param {EffectTrayNode} node - The node to prune.
    * @returns {EffectTrayNode | null} The pruned node, or null to drop it.
    */
   const prune = (node) => {
      /** @type {boolean} Whether the folder's own name matches. */
      const folderHit = isFolderMatch(node.folder);

      /** @type {EffectTrayNode[]} The child folders that hold a match. */
      const children = node.children.map(prune).filter(Boolean);

      /** @type {object[]} The effects in this folder that match by themselves. */
      const effectHits = node.effects.filter(isEffectMatch);
      if (!folderHit && children.length === 0 && effectHits.length === 0) {
         return null;
      }

      if (children.length > 0 || effectHits.length > 0) {
         autoExpand.add(node.folder.uuid);
      }

      return {
         ...node,
         children,
         effects: folderHit ? node.effects : effectHits,
      };
   };

   return {
      tree: {
         children: tree.children.map(prune).filter(Boolean),
         effects: tree.effects.filter(isEffectMatch),
      },
      autoExpand,
   };
}
