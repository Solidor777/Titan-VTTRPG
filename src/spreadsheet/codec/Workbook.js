/**
 * @typedef {object} Sheet
 * @property {string} name - The sheet's display/file name.
 * @property {string[]} columns - Column names, in display order.
 * @property {Array<Object<string, string|number|boolean|null|undefined>>} rows - Row data, each row a
 *    map of column name to cell value (undefined for a cell absent from the underlying file).
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
export const FIXED_COLUMNS = ['_id', '_parentId', '_folder', 'name', 'type', 'img', 'sort'];

/**
 * Schema-equivalent type info for the fixed leading columns, since they live on the Document itself
 * rather than in a DataModel's `system` schema that `resolveFieldSchema` could walk.
 * @type {Object<string, {type: 'string'|'number'|'boolean', nullable: boolean}>}
 */
export const FIXED_COLUMN_TYPES = {
   _id: { type: 'string', nullable: false },
   _parentId: { type: 'string', nullable: true },
   _folder: { type: 'string', nullable: true },
   name: { type: 'string', nullable: false },
   type: { type: 'string', nullable: false },
   img: { type: 'string', nullable: false },
   sort: { type: 'number', nullable: false },
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
   return { name, columns: [], rows: [] };
}
