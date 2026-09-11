import { forceStringCell, lookupFieldSchema } from '~/spreadsheet/codec/DecodeCell.js';
import { flattenDocument } from '~/spreadsheet/codec/FlattenDocument.js';
import { FIXED_COLUMNS, normalizePath, uniqueSheetNames } from '~/spreadsheet/codec/Workbook.js';

/**
 * Protects untyped-bag string values (rules elements, traits, `flags.*`, any array-of-objects field) so
 * they survive `decodeLiteral`'s literal rules on the next import: applies `forceStringCell` to every
 * string value whose column is neither a fixed column nor a schema-typed field. Mutates `flatRows` in
 * place; shared by both layouts since relational child sheets are also built from these same flat rows.
 * @param {Array<Object<string,*>>} flatRows - One flat row map per document (fixed columns included).
 * @param {{fieldTypes: object, fieldOrder: string[]}} [typeSchema] - The type's resolved schema info.
 * @returns {void}
 */
function forceUntypedStringCells(flatRows, typeSchema) {
   /** @type {Object<string, {type:string,nullable:boolean}>} */
   const fieldTypes = typeSchema?.fieldTypes ?? {};
   for (const row of flatRows) {
      for (const path of Object.keys(row)) {
         if (FIXED_COLUMNS.includes(path) || typeof row[path] !== 'string') {
            continue;
         }
         if (lookupFieldSchema(fieldTypes, path) === undefined) {
            row[path] = forceStringCell(row[path]);
         }
      }
   }
}

/**
 * @typedef {object} DocumentEnvelope
 * @property {string} documentType - The subtype name (e.g. "weapon", "npc", "effect").
 * @property {object} source - The document's own persisted fields (Document#toObject()).
 * @property {string} [parentId] - The owning document's id, for an embedded item or effect.
 * @property {string} [folderPath] - Slash-separated folder path from the pack root (top-level only).
 */

/**
 * Orders discovered column paths so schema-declared fields precede fields with no known order,
 * preserving the schema's own field order and falling back to first-seen order for anything the schema
 * doesn't name (untyped bag contents, flags.*, and any unresolved field).
 * @param {string[]} paths - Every discovered concrete dotted path, in first-seen order.
 * @param {string[]} fieldOrder - The type's schema-declared paths, in schema order (wildcards for array
 * elements, e.g. "system.attack.*.damage").
 * @returns {string[]} The paths, reordered.
 */
export function orderColumns(paths, fieldOrder) {
   /** @type {Map<string, number>} Schema order index per normalized (wildcarded) path. */
   const orderIndex = new Map(fieldOrder.map((path, i) => [
      path,
      i,
   ]));
   /** @type {Map<string, number>} First-seen index, used as the fallback and as the tiebreaker rank base. */
   const seenIndex = new Map(paths.map((path, i) => [
      path,
      i,
   ]));

   return [...paths].sort((a, b) => {
      /** @type {number} */
      const rankA = orderIndex.get(normalizePath(a)) ?? (fieldOrder.length + seenIndex.get(a));
      /** @type {number} */
      const rankB = orderIndex.get(normalizePath(b)) ?? (fieldOrder.length + seenIndex.get(b));
      return rankA - rankB;
   });
}

/**
 * Detects every array path present among a document type's discovered columns. A path is recorded the
 * moment a numeric segment is encountered while scanning: the array path is the field-name-only prefix
 * accumulated so far (indices never join the prefix), so a nested array yields two entries — its own
 * array path and its parent's — exactly matching the interspersed structure a concrete path actually
 * has. Returned outermost-first (fewest segments) so parent arrays are laid out before nested ones.
 * @param {string[]} paths - Discovered concrete dotted paths (fixed columns already excluded).
 * @returns {string[]} Distinct array paths, e.g. ["system.attack", "system.attack.trait"].
 * @throws {Error} When a path has two consecutive numeric segments: a primitive array nested directly
 *    inside a primitive array has no field-name prefix to name its own array path/child sheet, so the
 *    relational layout cannot represent it.
 */
export function detectArrayPaths(paths) {
   /** @type {Set<string>} */
   const arrayPaths = new Set();
   for (const path of paths) {
      /** @type {string[]} Field-name segments accumulated so far (indices are never pushed here). */
      let prefix = [];
      /** @type {boolean} Whether the segment immediately preceding the current one is a numeric index. */
      let priorSegmentIsNumeric = false;
      for (const segment of path.split('.')) {
         /** @type {boolean} Whether this segment is a numeric array index. */
         const isNumeric = /^\d+$/.test(segment);
         if (isNumeric && priorSegmentIsNumeric) {
            throw new Error(
               `Unsupported field shape: a primitive array nested directly inside a primitive array at "${path}"`,
            );
         }
         if (isNumeric) {
            arrayPaths.add(prefix.join('.'));
         }
         else {
            prefix = [
               ...prefix,
               segment,
            ];
         }
         priorSegmentIsNumeric = isNumeric;
      }
   }
   return [...arrayPaths].sort((a, b) => a.split('.').length - b.split('.').length);
}

/**
 * Builds a matcher for one array path against concrete flattened row paths. See this task's header
 * note for the full derivation. Example: for arrayPath "system.attack.trait" with allArrayPaths
 * ["system.attack", "system.attack.trait"], the concrete path "system.attack.0.trait.1.name" matches
 * with `{index: "0.1", subField: "name"}`; the concrete path "system.attack.0.damage" does NOT match
 * (it belongs to the shallower "system.attack" array path instead — its remainder after consuming
 * "system.attack.<N>" doesn't start with "trait", so segment-comparison fails).
 *
 * Reserved sentinel: for a PRIMITIVE array (e.g. `statuses: ["prone"]`), the concrete path
 * "statuses.0" has nothing left after consuming the array segment and its index — the array element
 * IS the leaf value, not an object with sub-fields. That case matches with the reserved sub-field name
 * "_value" (distinct from the "_id"/"_index" columns every child sheet also carries), so `statuses`
 * matched against "statuses.0" yields `{index: "0", subField: "_value"}`. The import-side expander
 * must special-case "_value" back into a bare array element rather than an object property.
 * @param {string} arrayPath - The array path being matched, e.g. "system.attack.trait".
 * @param {string[]} allArrayPaths - Every array path detected for the document type.
 * @returns {(path: string) => {index: string, subField: string}|null} A matcher returning the dotted
 * index and remaining sub-field path (or "_value" for a primitive array element) for a concrete path
 * belonging to this array, or null.
 */
export function buildArrayPathMatcher(arrayPath, allArrayPaths) {
   /** @type {string[]} */
   const segments = arrayPath.split('.');
   /** @type {Set<string>} */
   const arraySet = new Set(allArrayPaths);
   /** @type {boolean[]} Whether a numeric index follows segment i, for each i. */
   const indexFollows = segments.map((_, i) => arraySet.has(segments.slice(0, i + 1).join('.')));

   return (path) => {
      /** @type {string[]} */
      const pathSegments = path.split('.');
      /** @type {string[]} Numeric indices consumed, in order. */
      const indices = [];
      let cursor = 0;
      for (let i = 0; i < segments.length; i += 1) {
         if (pathSegments[cursor] !== segments[i]) {
            return null;
         }
         cursor += 1;
         if (indexFollows[i]) {
            if (!/^\d+$/.test(pathSegments[cursor] ?? '')) {
               return null;
            }
            indices.push(pathSegments[cursor]);
            cursor += 1;
         }
      }
      /** @type {string[]} The remaining segments: the sub-field within this specific array element. */
      const subFieldSegments = pathSegments.slice(cursor);
      // An empty remainder means the concrete path IS the array element's own leaf value (a primitive
      // array, e.g. "statuses.0"): matched with the reserved sentinel sub-field name "_value", distinct
      // from the "_id"/"_index" reserved columns every child sheet also carries.
      if (subFieldSegments.length === 0) {
         return {
            index: indices.join('.'),
            subField: '_value',
         };
      }
      // A remainder still containing a numeric segment belongs to a DEEPER nested array instead (that
      // array's own matcher pulls it into its own child sheet).
      if (subFieldSegments.some((seg) => /^\d+$/.test(seg))) {
         return null;
      }
      return {
         index: indices.join('.'),
         subField: subFieldSegments.join('.'),
      };
   };
}

/**
 * Builds the `_manifest` sheet recording the layout, pack type, and one row per data sheet.
 * @param {'wide'|'relational'} layout - The array layout used.
 * @param {string} packType - The pack's document type.
 * @param {Array<{sheet:string,documentType:string,arrayPath:string}>} entries - One entry per data sheet.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Sheet} The manifest sheet.
 */
function buildManifestSheet(layout, packType, entries) {
   /** @type {Array<Object<string,string>>} */
   const rows = [
      {
         key: 'layout',
         value: layout,
         documentType: '',
         arrayPath: '',
      },
      {
         key: 'packType',
         value: packType,
         documentType: '',
         arrayPath: '',
      },
      {
         key: 'version',
         value: '1',
         documentType: '',
         arrayPath: '',
      },
      ...entries.map((e) => ({
         key: 'sheet',
         value: e.sheet,
         documentType: e.documentType,
         arrayPath: e.arrayPath,
      })),
   ];
   return {
      name: '_manifest',
      columns: [
         'key',
         'value',
         'documentType',
         'arrayPath',
      ],
      rows,
   };
}

/**
 * Builds one wide-layout sheet for a document type: fixed columns first, then every other discovered
 * column (arrays expanded into indexed dotted columns), ordered by schema field order.
 * @param {string} documentType - The document type (also the sheet name).
 * @param {Array<Object<string,*>>} flatRows - One flat row map per document (fixed columns included).
 * @param {{fieldOrder: string[]}} [typeSchema] - The type's resolved schema order info.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Sheet} The built sheet.
 */
function buildWideSheet(documentType, flatRows, typeSchema) {
   /** @type {Set<string>} Every non-fixed column discovered across all rows, first-seen order. */
   const discovered = new Set();
   for (const row of flatRows) {
      for (const path of Object.keys(row)) {
         if (!FIXED_COLUMNS.includes(path)) {
            discovered.add(path);
         }
      }
   }
   /** @type {string[]} */
   const rest = orderColumns([...discovered], typeSchema?.fieldOrder ?? []);
   return {
      name: documentType,
      columns: [
         ...FIXED_COLUMNS,
         ...rest,
      ],
      rows: flatRows,
   };
}

/**
 * Whether a discovered concrete path belongs to some array (i.e. some detected array path's matcher
 * accepts it), used to exclude array-derived columns from the document sheet's own scalar columns.
 * @param {string} path - A concrete discovered path.
 * @param {Array<(path:string)=>object|null>} matchers - One matcher per detected array path.
 * @returns {boolean} True if the path belongs to some array.
 */
function isUnderAnyArrayPath(path, matchers) {
   return matchers.some((matcher) => matcher(path) !== null);
}

/**
 * Builds one child sheet for a single array path: one row per surviving array element across every
 * document row of the type, keyed by the owning document's `_id` and a dotted `_index` (one entry per
 * array nesting level within this arrayPath, so a trait nested inside an attack gets an index like
 * "0.1" — attack index 0, trait index 1).
 * @param {string} documentType - The owning type, used to name the sheet.
 * @param {string} arrayPath - The array's field path (e.g. "system.attack.trait").
 * @param {string[]} allArrayPaths - Every array path detected for the document type.
 * @param {Array<Object<string,*>>} flatRows - Every document's full flat row map (`_id` included).
 * @returns {{sheet: import('~/spreadsheet/codec/Workbook.js').Sheet, arrayPath: string}} The child sheet.
 * @throws {Error} When an array element's own sub-field is literally named "_id" or "_index": the child
 *    sheet's row-spread (`{ _id: id, _index: index, ...fields }`) would let that sub-field silently
 *    overwrite the owning document's id/index column.
 */
function buildChildSheet(documentType, arrayPath, allArrayPaths, flatRows) {
   /** @type {(path:string) => {index:string,subField:string}|null} */
   const matcher = buildArrayPathMatcher(arrayPath, allArrayPaths);

   /** @type {Set<string>} Sub-field column names, first-seen order. */
   const subFields = new Set();
   /** @type {Map<string, Map<string, object>>} Element data grouped by document id then dotted index. */
   const byDocument = new Map();

   for (const row of flatRows) {
      /** @type {Map<string, object>} */
      const elements = byDocument.get(row._id) ?? new Map();
      byDocument.set(row._id, elements);
      for (const [path, value] of Object.entries(row)) {
         /** @type {{index:string,subField:string}|null} */
         const match = matcher(path);
         if (!match) {
            continue;
         }
         if (match.subField === '_id' || match.subField === '_index') {
            throw new Error(`Reserved column name "${match.subField}" used by a field under "${arrayPath}"`);
         }
         subFields.add(match.subField);
         if (!elements.has(match.index)) {
            elements.set(match.index, {});
         }
         elements.get(match.index)[match.subField] = value;
      }
   }

   /** @type {Array<Object<string,*>>} */
   const rows = [];
   for (const [id, elements] of byDocument) {
      for (const [index, fields] of elements) {
         rows.push({
            _id: id,
            _index: index,
            ...fields,
         });
      }
   }

   return {
      arrayPath,
      sheet: {
         name: `${documentType}.${arrayPath}`,
         columns: [
            '_id',
            '_index',
            ...subFields,
         ],
         rows,
      },
   };
}

/**
 * Builds the relational-layout document sheet (scalar columns only) plus one child sheet per array
 * path detected for the type.
 * @param {string} documentType - The document type (also the document sheet's name).
 * @param {Array<Object<string,*>>} flatRows - One flat row map per document (fixed columns included).
 * @param {{fieldOrder: string[]}} [typeSchema] - The type's resolved schema order info.
 * @returns {{documentSheet: import('~/spreadsheet/codec/Workbook.js').Sheet, childSheets:
 *    Array<{sheet:object,arrayPath:string}>}} The document sheet plus its array-derived child sheets.
 */
function buildRelationalSheets(documentType, flatRows, typeSchema) {
   /** @type {Set<string>} Every non-fixed column discovered across all rows. */
   const discovered = new Set();
   for (const row of flatRows) {
      for (const path of Object.keys(row)) {
         if (!FIXED_COLUMNS.includes(path)) {
            discovered.add(path);
         }
      }
   }

   /** @type {string[]} */
   const arrayPaths = detectArrayPaths([...discovered]);
   /** @type {Array<(path:string)=>object|null>} One matcher per array path, reused below. */
   const matchers = arrayPaths.map((arrayPath) => buildArrayPathMatcher(arrayPath, arrayPaths));

   /** @type {string[]} */
   const scalarColumns = orderColumns(
      [...discovered].filter((p) => !isUnderAnyArrayPath(p, matchers)),
      typeSchema?.fieldOrder ?? [],
   );
   /** @type {Array<Object<string,*>>} */
   const documentRows = flatRows.map((row) => {
      /** @type {Object<string,*>} */
      const picked = {};
      for (const column of [
         ...FIXED_COLUMNS,
         ...scalarColumns,
      ]) {
         picked[column] = row[column];
      }
      return picked;
   });

   /** @type {Array<{sheet:object,arrayPath:string}>} */
   const childSheets = arrayPaths.map((arrayPath) => buildChildSheet(documentType, arrayPath, arrayPaths, flatRows));

   return {
      documentSheet: {
         name: documentType,
         columns: [
            ...FIXED_COLUMNS,
            ...scalarColumns,
         ],
         rows: documentRows,
      },
      childSheets,
   };
}

/**
 * Builds a Workbook from a list of document envelopes for one pack export.
 * @param {DocumentEnvelope[]} envelopes - Every document to export (top-level and embedded).
 * @param {'wide'|'relational'} layout - The array layout to use.
 * @param {'Actor'|'Item'|'ActiveEffect'} packType - The pack's document type, recorded in the manifest.
 * @param {Object<string, {fieldTypes: object, fieldOrder: string[]}>} typeSchemas - Per document-type
 * schema info from resolveTypeSchemas, used only to order columns.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The built workbook, manifest first.
 */
export function buildTables(envelopes, layout, packType, typeSchemas) {
   /** @type {Map<string, DocumentEnvelope[]>} Envelopes grouped by document type, first-seen order. */
   const byType = new Map();
   for (const envelope of envelopes) {
      if (!byType.has(envelope.documentType)) {
         byType.set(envelope.documentType, []);
      }
      byType.get(envelope.documentType).push(envelope);
   }

   /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet[]} */
   const sheets = [];
   /** @type {Array<{sheet:string, documentType:string, arrayPath:string}>} */
   const manifestEntries = [];

   for (const [documentType, docs] of byType) {
      /** @type {Array<Object<string,*>>} This type's flat row maps, fixed columns merged in. */
      const flatRows = docs.map((doc) => ({
         ...flattenDocument(doc.source),
         _parentId: doc.parentId ?? '',
         _folder: doc.folderPath ?? '',
      }));
      /** @type {{fieldTypes:object,fieldOrder:string[]}|undefined} */
      const typeSchema = typeSchemas[documentType];
      forceUntypedStringCells(flatRows, typeSchema);

      if (layout === 'wide') {
         sheets.push(buildWideSheet(documentType, flatRows, typeSchema));
         manifestEntries.push({
            sheet: documentType,
            documentType,
            arrayPath: '',
         });
      }
      else {
         /** @type {{documentSheet: object, childSheets: Array<{sheet:object,arrayPath:string}>}} */
         const relational = buildRelationalSheets(documentType, flatRows, typeSchema);
         sheets.push(relational.documentSheet);
         manifestEntries.push({
            sheet: relational.documentSheet.name,
            documentType,
            arrayPath: '',
         });
         for (const child of relational.childSheets) {
            sheets.push(child.sheet);
            manifestEntries.push({
               sheet: child.sheet.name,
               documentType,
               arrayPath: child.arrayPath,
            });
         }
      }
   }

   // Truncates/de-duplicates every data sheet's name to Excel's 31-character limit ONCE, here, before the
   // manifest is built, so the manifest's recorded sheet names and the sheets' own final names always
   // agree in both formats; encodeXlsx's own call is then a no-op on these already-final names.
   /** @type {string[]} Final sheet names, in the same order as `sheets`/`manifestEntries`. */
   const finalNames = uniqueSheetNames(sheets.map((sheet) => sheet.name));
   sheets.forEach((sheet, i) => {
      sheet.name = finalNames[i];
      manifestEntries[i].sheet = finalNames[i];
   });

   return {
      sheets: [
         buildManifestSheet(layout, packType, manifestEntries),
         ...sheets,
      ],
   };
}
