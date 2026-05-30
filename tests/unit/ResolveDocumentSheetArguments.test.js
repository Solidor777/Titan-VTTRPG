import { describe, it, expect } from 'vitest';
import resolveDocumentSheetArguments from '~/helpers/utility-functions/ResolveDocumentSheetArguments.js';

describe('resolveDocumentSheetArguments', () => {
   it('resolves the positional (document, options) form', () => {
      const doc = new foundry.abstract.Document();
      const { document, options } = resolveDocumentSheetArguments(doc, { classes: ['a'] });
      expect(document).toBe(doc);
      expect(options).toEqual({ classes: ['a'] });
   });

   it('resolves the v14 ({ document }, options) form and merges options', () => {
      const doc = new foundry.abstract.Document();
      const { document, options } = resolveDocumentSheetArguments({ document: doc }, { classes: ['a'] });
      expect(document).toBe(doc);
      expect(options.document).toBe(doc);
      expect(options.classes).toEqual(['a']);
   });

   it('handles the v14 form with no second argument', () => {
      const doc = new foundry.abstract.Document();
      const { document } = resolveDocumentSheetArguments({ document: doc });
      expect(document).toBe(doc);
   });
});
