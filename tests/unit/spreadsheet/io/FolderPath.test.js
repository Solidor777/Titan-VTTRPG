import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveFolderPath, splitFolderPath, unescapeFolderName } from '~/spreadsheet/io/FolderPath.js';

/**
 * Builds a linked chain of mock `Folder` objects (root first) from a list of names, the same shape
 * `resolveFolderPath` walks via `folder.folder`.
 * @param {string[]} names - Folder names from root to leaf.
 * @returns {object|null} The leaf folder, or null for an empty chain.
 */
function chainFolders(names) {
   /** @type {object|null} */
   let current = null;
   for (const name of names) {
      current = {
         name,
         folder: current,
      };
   }
   return current;
}

describe('FolderPath round trip', () => {
   it('recovers the original folder names via splitFolderPath + unescapeFolderName', () => {
      fc.assert(
         fc.property(
            fc.array(
               fc.array(fc.constantFrom(...'ab\\/ '.split('')), {
                  minLength: 1,
                  maxLength: 8,
               })
                  .map((chars) => chars.join('')),
               {
                  minLength: 1,
                  maxLength: 5,
               },
            ),
            (names) => {
               const path = resolveFolderPath(chainFolders(names));
               const recovered = splitFolderPath(path).map(unescapeFolderName);
               expect(recovered).toEqual(names);
            },
         ),
      );
   });

   it('splits a path with an escaped backslash then a real separator', () => {
      const path = resolveFolderPath(chainFolders([
         'a\\',
         'b',
      ]));
      expect(path).toBe('a\\\\/b');
      expect(splitFolderPath(path).map(unescapeFolderName)).toEqual([
         'a\\',
         'b',
      ]);
   });

   it('splits a single segment containing an escaped literal slash', () => {
      const path = resolveFolderPath(chainFolders(['a\\/b']));
      expect(splitFolderPath(path).map(unescapeFolderName)).toEqual(['a\\/b']);
   });

   it('splits two segments joined on a real separator', () => {
      const path = resolveFolderPath(chainFolders([
         'a/b',
         'c',
      ]));
      expect(splitFolderPath(path).map(unescapeFolderName)).toEqual([
         'a/b',
         'c',
      ]);
   });

   it('returns an empty string for the pack root', () => {
      expect(resolveFolderPath(null)).toBe('');
      expect(resolveFolderPath(undefined)).toBe('');
   });
});
