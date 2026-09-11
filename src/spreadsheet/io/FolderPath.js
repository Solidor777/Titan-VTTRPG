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

/**
 * Splits an escaped folder path into its raw segments, splitting only on unescaped `/` (a `\/` inside a
 * segment stays literal). Segments are returned still escaped, matching the map keys built from
 * {@link resolveFolderPath} joins, so callers must unescape a segment themselves before using it as a
 * folder name.
 * @param {string} path - The escaped, slash-separated folder path.
 * @returns {string[]} The path's escaped segments, root to leaf.
 */
export function splitFolderPath(path) {
   /** @type {string[]} */
   const segments = [];
   /** @type {string} The segment currently being built, still escaped. */
   let current = '';
   for (let i = 0; i < path.length; i += 1) {
      if (path[i] === '\\' && path[i + 1] === '/') {
         current += '\\/';
         i += 1;
      }
      else if (path[i] === '/') {
         segments.push(current);
         current = '';
      }
      else {
         current += path[i];
      }
   }
   segments.push(current);
   return segments;
}
