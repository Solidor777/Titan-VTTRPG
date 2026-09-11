/**
 * Escapes a folder's own name so it can be joined into a `/`-separated path and later split back into
 * names unambiguously: a literal `\` becomes `\\` and a literal `/` becomes `\/`. Backslashes are escaped
 * first so the backslash introduced by slash-escaping is never itself mistaken for a literal backslash.
 * @param {string} name - The raw folder name.
 * @returns {string} The escaped name, safe to join with `/`.
 */
function escapeFolderName(name) {
   return name.replace(/\\/g, '\\\\').replace(/\//g, '\\/');
}

/**
 * Reverses {@link escapeFolderName}: unescapes `\\` back to `\` and `\/` back to `/`. Unescapes doubled
 * backslashes first, mirroring the escape order, so a segment's own escape markers can't be misread.
 * @param {string} segment - An escaped path segment, as returned by {@link splitFolderPath}.
 * @returns {string} The raw folder name.
 */
export function unescapeFolderName(segment) {
   return segment.replace(/\\\\/g, '\\').replace(/\\\//g, '/');
}

/**
 * Resolves a folder into a slash-separated path of escaped folder names from the pack root. Shared by
 * export (building the path to write) and import (rebuilding the same path to match folders).
 * @param {Folder|null|undefined} folder - The folder to compute the path for, or nullish for the pack root.
 * @returns {string} The folder path, or an empty string for the pack root.
 */
export function resolveFolderPath(folder) {
   if (!folder) {
      return '';
   }
   /** @type {string[]} Escaped folder names from root to leaf. */
   const names = [];
   /** @type {Folder|null} */
   let current = folder;
   while (current) {
      names.unshift(escapeFolderName(current.name));
      current = current.folder ?? null;
   }
   return names.join('/');
}

/**
 * Splits an escaped folder path into its raw segments with a single left-to-right scan, splitting only on
 * unescaped `/` (a `\/` or `\\` inside a segment stays part of that segment). Segments are returned still
 * escaped, matching the map keys built from {@link resolveFolderPath} joins, so callers must run a segment
 * through {@link unescapeFolderName} before using it as a folder name.
 * @param {string} path - The escaped, slash-separated folder path.
 * @returns {string[]} The path's escaped segments, root to leaf.
 */
export function splitFolderPath(path) {
   /** @type {string[]} */
   const segments = [];
   /** @type {string} The segment currently being built, still escaped. */
   let current = '';
   for (let i = 0; i < path.length; i += 1) {
      if (path[i] === '\\' && (path[i + 1] === '/' || path[i + 1] === '\\')) {
         current += path[i] + path[i + 1];
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
