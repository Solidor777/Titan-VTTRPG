import { decodeRow, decodeCell, lookupFieldSchema } from '~/spreadsheet/codec/DecodeCell.js';
import { unflattenRow } from '~/spreadsheet/codec/UnflattenRow.js';

/**
 * Reads the `_manifest` sheet (if present) into its layout/packType header values and one entry per
 * data sheet. Falls back to "every sheet is a wide-layout document sheet named after its own type,
 * packType unknown" when no manifest is present, so a hand-made file still imports.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The decoded workbook.
 * @returns {{layout: 'wide'|'relational', packType: string, entries:
 *    Array<{sheet:string,documentType:string,arrayPath:string}>}} The manifest's layout/packType, plus
 * one entry per data sheet.
 */
function readManifest(workbook) {
   /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet|undefined} */
   const manifestSheet = workbook.sheets.find((s) => s.name === '_manifest');
   if (!manifestSheet) {
      return {
         layout: 'wide',
         packType: '',
         entries: workbook.sheets.map((sheet) => ({
            sheet: sheet.name,
            documentType: sheet.name,
            arrayPath: '',
         })),
      };
   }

   /** @type {string} */
   let layout = 'wide';
   /** @type {string} */
   let packType = '';
   /** @type {Array<{sheet:string,documentType:string,arrayPath:string}>} */
   const entries = [];
   for (const row of manifestSheet.rows) {
      if (row.key === 'layout') {
         layout = row.value;
      }
      else if (row.key === 'packType') {
         packType = row.value;
      }
      else if (row.key === 'sheet') {
         entries.push({
            sheet: row.value,
            documentType: row.documentType,
            arrayPath: row.arrayPath,
         });
      }
   }
   return {
      layout,
      packType,
      entries,
   };
}

/**
 * Builds a function that expands one relational child-sheet cell (a sub-field name plus its dotted
 * `_index`) back into the concrete flattened path it came from — the mechanical inverse of
 * `buildArrayPathMatcher` (see BuildTables.js's header note): a numeric index segment is spliced back in
 * after array-path segment `i` exactly when `buildArrayPathMatcher` would have consumed one there. The
 * reserved sub-field name "_value" (a primitive array element, matched by `buildArrayPathMatcher` when a
 * concrete path has nothing left after the array's own index) expands back to the array-index path alone
 * — no sub-field segment appended — so the primitive value lands directly at the array element's own
 * path and `unflattenRow` reconstructs a bare-value array rather than an array of `{_value}` objects.
 * @param {string} arrayPath - The child sheet's array path, e.g. "system.attack.trait".
 * @param {string[]} allArrayPaths - Every array path for the document type (from the manifest).
 * @returns {(index: string, subField: string) => string} The path-expansion function.
 */
function buildArrayPathExpander(arrayPath, allArrayPaths) {
   /** @type {string[]} */
   const segments = arrayPath.split('.');
   /** @type {Set<string>} */
   const arraySet = new Set(allArrayPaths);
   /** @type {boolean[]} */
   const indexFollows = segments.map((_, i) => arraySet.has(segments.slice(0, i + 1).join('.')));

   return (index, subField) => {
      /** @type {string[]} */
      const indexParts = index.split('.');
      /** @type {string[]} */
      const result = [];
      let indexCursor = 0;
      segments.forEach((segment, i) => {
         result.push(segment);
         if (indexFollows[i]) {
            result.push(indexParts[indexCursor]);
            indexCursor += 1;
         }
      });
      return subField === '_value' ? result.join('.') : [
         ...result,
         subField,
      ].join('.');
   };
}

/**
 * Collects every relational child-sheet cell for a document type into a flat-path-map addition, keyed
 * by owning document id, ready to be merged into that document's own decoded flat row before
 * unflattening. Each cell decodes against the SAME schema `readTables` uses for the equivalent
 * wide-layout column: the expanded concrete path (indices spliced back in) is looked up in `fieldTypes`,
 * so a schema-typed array element (e.g. An ActiveEffect's `changes` field) decodes identically regardless
 * of layout. A path with no schema entry still falls back to the untyped-bag literal rules (array-of-
 * object fields have no per-field schema type in this system — see resolveFieldSchema's ObjectField
 * handling).
 * @param {string} documentType - The owning document type.
 * @param {string[]} arrayPaths - Every array path for this document type, from the manifest.
 * @param {Array<{sheet:string,documentType:string,arrayPath:string}>} manifestEntries - Every manifest entry.
 * @param {Map<string, import('~/spreadsheet/codec/Workbook.js').Sheet>} sheetsByName - Sheets by name.
 * @param {Object<string, {type:string,nullable:boolean}>} fieldTypes - The document type's resolved
 * schema-typed field map, used to decode each cell against its real field schema by expanded path.
 * @returns {Map<string, Object<string,*>>} Document id -> additional flat entries from child sheets.
 */
function collectChildFlatEntries(documentType, arrayPaths, manifestEntries, sheetsByName, fieldTypes) {
   /** @type {Map<string, Object<string,*>>} */
   const result = new Map();
   for (const arrayPath of arrayPaths) {
      /** @type {{sheet:string}|undefined} */
      const entry = manifestEntries.find((e) => e.documentType === documentType && e.arrayPath === arrayPath);
      /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet|undefined} */
      const sheet = entry && sheetsByName.get(entry.sheet);
      if (!sheet) {
         continue;
      }

      /** @type {(index:string, subField:string) => string} */
      const expand = buildArrayPathExpander(arrayPath, arrayPaths);
      for (const row of sheet.rows) {
         /** @type {string} */
         const id = row._id;
         /** @type {Object<string,*>} */
         const flat = result.get(id) ?? {};
         result.set(id, flat);
         for (const column of sheet.columns) {
            if (column === '_id' || column === '_index') {
               continue;
            }
            /** @type {string} The concrete path AFTER indices are spliced back in; the schema lookup key. */
            const expandedPath = expand(row._index, column);
            flat[expandedPath] = decodeCell(row[column], lookupFieldSchema(fieldTypes, expandedPath));
         }
      }
   }
   return result;
}

/**
 * Reads a Workbook (as produced by BuildTables, or a hand-made equivalent) back into document
 * envelopes ready for validation and import.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The decoded workbook.
 * @param {Object<string, {fieldTypes: object, fieldOrder: string[]}>} typeSchemas - Per document-type
 * schema info from resolveTypeSchemas, used for schema-driven decode of document-sheet columns.
 * @returns {{layout:'wide'|'relational', packType:string, envelopes:
 *    Array<import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope & {sheetName:string,
 *    rowNumber:number}>}} The workbook's layout and pack type, plus one document envelope per data row.
 * @throws {Error} When a relational-layout document sheet with a child sheet has two or more rows
 *    sharing a blank `_id`: they would collapse onto the same map key when child-sheet rows are merged
 *    back in, cross-contaminating each other's relational array data.
 */
export function readTables(workbook, typeSchemas) {
   /** @type {{layout:string,packType:string,entries:Array<{sheet:string,documentType:string,arrayPath:string}>}} */
   const manifest = readManifest(workbook);

   /** @type {Map<string, string[]>} Array paths per document type, from non-blank manifest entries. */
   const arrayPathsByType = new Map();
   for (const entry of manifest.entries) {
      if (!entry.arrayPath) {
         continue;
      }
      /** @type {string[]} */
      const list = arrayPathsByType.get(entry.documentType) ?? [];
      list.push(entry.arrayPath);
      arrayPathsByType.set(entry.documentType, list);
   }

   /** @type {Map<string, import('~/spreadsheet/codec/Workbook.js').Sheet>} */
   const sheetsByName = new Map(workbook.sheets.map((s) => [
      s.name,
      s,
   ]));

   /**
    * @type {Array<import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope &
        {sheetName:string,rowNumber:number}>} */
   const envelopes = [];
   for (const entry of manifest.entries.filter((e) => !e.arrayPath)) {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet|undefined} */
      const sheet = sheetsByName.get(entry.sheet);
      if (!sheet) {
         continue;
      }

      /** @type {string[]} */
      const arrayPaths = arrayPathsByType.get(entry.documentType) ?? [];

      // Relational child-sheet rows are merged back onto their parent by raw `_id` (see
      // collectChildFlatEntries below). Two or more brand-new rows that all leave `_id` blank collapse
      // onto the same blank-string map key, cross-contaminating each other's relational array data - so
      // this shape is rejected outright rather than silently merged. Wide layout has no child sheets to
      // merge, so a blank id there is unambiguous and stays allowed; so does a single blank-id row.
      if (manifest.layout === 'relational' && arrayPaths.length > 0) {
         /** @type {number[]} 1-based spreadsheet row numbers of every row with a blank _id. */
         const blankIdRows = [];
         sheet.rows.forEach((row, rowIndex) => {
            if (!row._id) {
               blankIdRows.push(rowIndex + 2); // +1 for the header row, +1 to present 1-indexed.
            }
         });
         if (blankIdRows.length >= 2) {
            throw new Error(
               `${sheet.name}: rows ${blankIdRows[0]} and ${blankIdRows[1]} both have a blank _id; give each ` +
               'new document a file-local key (e.g. "new-goblin") so its relational rows can be matched',
            );
         }
      }

      /** @type {{fieldTypes:object}} */
      const typeSchema = typeSchemas[entry.documentType] ?? { fieldTypes: {} };
      /** @type {Map<string, Object<string,*>>} */
      const childFlatById = collectChildFlatEntries(
         entry.documentType,
         arrayPaths,
         manifest.entries,
         sheetsByName,
         typeSchema.fieldTypes,
      );

      sheet.rows.forEach((row, rowIndex) => {
         /** @type {Object<string,*>} */
         const flat = {
            ...decodeRow(row, sheet.columns, typeSchema.fieldTypes),
            ...(childFlatById.get(row._id) ?? {}),
         };
         /** @type {object} */
         const source = unflattenRow(flat);
         /** @type {string} */
         const parentId = source._parentId || '';
         // Absent from the sheet's own columns (a hand-trimmed file) is distinct from a present-but-blank
         // cell (`''`, meaning "pack root"): an update row with no `_folder` column must leave the
         // document's existing folder untouched, not move it to the root, so callers see `undefined`
         // rather than `''` for a column that was never there.
         /** @type {string|undefined} */
         const folderPath = sheet.columns.includes('_folder') ? (source._folder || '') : undefined;
         delete source._parentId;
         delete source._folder;
         envelopes.push({
            documentType: entry.documentType,
            source,
            parentId,
            folderPath,
            sheetName: entry.sheet,
            rowNumber: rowIndex + 2, // +1 for the header row, +1 to present as a 1-indexed spreadsheet row.
         });
      });
   }

   return {
      layout: manifest.layout,
      packType: manifest.packType,
      envelopes,
   };
}
