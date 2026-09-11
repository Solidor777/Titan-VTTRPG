/**
 * @typedef {object} Sheet
 * @property {string} name - The sheet's display/file name.
 * @property {string[]} columns - Column names, in display order.
 * @property {Array<Object<string, string|number|boolean|null|undefined>>} rows - Row data, each row a
 * map of column name to cell value (undefined for a cell absent from the underlying file).
 */

/**
 * @typedef {object} Workbook
 * @property {Sheet[]} sheets - Every sheet in the workbook, `_manifest` first when present.
 */

/**
 * The fixed leading columns every document-type sheet carries, in display order, before any
 * type-specific `system.*`/`flags.*`/`prototypeToken.*` columns.
 * @type {string[]}
 */
export const FIXED_COLUMNS = [
   '_id',
   '_parentId',
   '_folder',
   'name',
   'type',
   'img',
   'sort',
];

/**
 * Schema-equivalent type info for the fixed leading columns, since they live on the Document itself
 * rather than in a DataModel's `system` schema that `resolveFieldSchema` could walk.
 * @type {Object<string, {type: 'string'|'number'|'boolean', nullable: boolean}>}
 */
export const FIXED_COLUMN_TYPES = {
   _id: {
      type: 'string',
      nullable: false,
   },
   _parentId: {
      type: 'string',
      nullable: true,
   },
   _folder: {
      type: 'string',
      nullable: true,
   },
   name: {
      type: 'string',
      nullable: false,
   },
   type: {
      type: 'string',
      nullable: false,
   },
   img: {
      type: 'string',
      nullable: false,
   },
   sort: {
      type: 'number',
      nullable: false,
   },
};

/**
 * Normalizes a concrete dotted field path by replacing every purely-numeric segment (an array index)
 * with `*`, matching the wildcard form schema-derived field paths use.
 * @param {string} path - The concrete dotted path, e.g. "system.attack.0.trait.1.name".
 * @returns {string} The normalized path, e.g. "system.attack.*.trait.*.name".
 */
export function normalizePath(path) {
   return path.split('.').map((segment) => (/^\d+$/.test(segment) ? '*' : segment)).join('.');
}

/**
 * Builds an empty Sheet with the given name.
 * @param {string} name - The sheet name.
 * @returns {Sheet} The empty sheet.
 */
export function createEmptySheet(name) {
   return {
      name,
      columns: [],
      rows: [],
   };
}

/**
 * Truncates and de-duplicates sheet names to Excel's 31-character limit, stripping the characters
 * Excel forbids in a sheet name (`[ ] : * ? / \`). Applied once at the Workbook level by `buildTables`
 * before either format's encoder runs, so the `_manifest` sheet's recorded names and the actual sheet
 * names always agree; `encodeXlsx` also calls it, which is a no-op on already-final names but still
 * protects a hand-built Workbook that skipped `buildTables`.
 * @param {string[]} names - The desired sheet names, in order.
 * @returns {string[]} The final sheet names, unique and each 31 characters or fewer.
 */
export function uniqueSheetNames(names) {
   /** @type {Set<string>} Names already assigned, to detect and resolve collisions. */
   const used = new Set();
   return names.map((rawName) => {
      /** @type {string} The name with forbidden characters stripped. */
      const cleaned = rawName.replace(/[[\]:*?/\\]/g, '');
      /** @type {string} The candidate name, truncated and made unique below. */
      let candidate = cleaned.slice(0, 31);
      /** @type {number} The collision count seen so far for this candidate. */
      let suffix = 1;
      while (used.has(candidate)) {
         /** @type {string} The numeric collision-breaking suffix, e.g. "~2". */
         const tag = `~${(suffix += 1)}`;
         candidate = `${cleaned.slice(0, 31 - tag.length)}${tag}`;
      }
      used.add(candidate);
      return candidate;
   });
}
