/**
 * Resolves a folder into a slash-separated path of folder names from the pack root, escaping a literal
 * slash inside a folder's own name as `\/` so the path can later be split back into names unambiguously.
 * Shared by export (building the path to write) and import (rebuilding the same path to match folders).
 * @param {Folder|null|undefined} folder - The folder to compute the path for, or nullish for the pack root.
 * @returns {string} The folder path, or an empty string for the pack root.
 */
export function resolveFolderPath(folder) {
   if (!folder) {
      return '';
   }
   /** @type {string[]} Folder names from root to leaf. */
   const names = [];
   /** @type {Folder|null} */
   let current = folder;
   while (current) {
      names.unshift(current.name.replace(/\//g, '\\/'));
      current = current.folder ?? null;
   }
   return names.join('/');
}
