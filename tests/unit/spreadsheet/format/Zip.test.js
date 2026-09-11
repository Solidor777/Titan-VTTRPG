import { describe, it, expect } from 'vitest';
import { zipFiles, unzipFilesAsText, unzipFilesAsBytes } from '~/spreadsheet/format/Zip.js';

describe('Zip', () => {
   it('round-trips text files through zipFiles/unzipFilesAsText', () => {
      const bytes = zipFiles({
         'a.txt': 'hello',
         'b.txt': 'wörld',
      });
      expect(unzipFilesAsText(bytes)).toEqual({
         'a.txt': 'hello',
         'b.txt': 'wörld',
      });
   });

   it('round-trips raw bytes through unzipFilesAsBytes', () => {
      const original = new Uint8Array([
         1,
         2,
         3,
         4,
      ]);
      const bytes = zipFiles({ 'raw.bin': original });
      expect(unzipFilesAsBytes(bytes)['raw.bin']).toEqual(original);
   });
});
