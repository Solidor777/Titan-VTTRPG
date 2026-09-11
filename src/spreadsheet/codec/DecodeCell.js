import { ABSENT } from '~/spreadsheet/codec/UnflattenRow.js';
import { FIXED_COLUMN_TYPES, normalizePath } from '~/spreadsheet/codec/Workbook.js';

export { ABSENT };

/** @type {RegExp} Matches a cell whose entire text is wrapped in double quotes (forced-string convention). */
const QUOTED_STRING_PATTERN = /^"(.*)"$/s;

/**
 * Decodes one untyped-bag cell using literal rules: `true`/`false` -> boolean, `null` -> null, text
 * that parses as a finite number -> number, a fully double-quoted cell -> that text with the quotes
 * stripped (forces a literal string, e.g. `"5"` -> the string `5`), anything else -> the text as-is.
 * An already-typed value (from XLSX) passes through unchanged.
 * @param {string|number|boolean} rawValue - The non-blank raw cell value.
 * @returns {string|number|boolean|null} The decoded literal value.
 */
function decodeLiteral(rawValue) {
   if (typeof rawValue !== 'string') {
      return rawValue;
   }
   /** @type {RegExpMatchArray|null} */
   const quotedMatch = rawValue.match(QUOTED_STRING_PATTERN);
   if (quotedMatch) {
      return quotedMatch[1];
   }
   if (rawValue === 'true' || rawValue === 'false') {
      return rawValue === 'true';
   }
   if (rawValue === 'null') {
      return null;
   }
   if (Number.isFinite(Number(rawValue))) {
      return Number(rawValue);
   }
   return rawValue;
}

/**
 * Forces a string value to survive the round trip through `decodeLiteral`'s literal rules, used on
 * export for untyped-bag string values so a value like `'5'` or `'true'` doesn't get reinterpreted as a
 * number/boolean on the next import. Wraps `text` in double quotes (the forced-string convention
 * `decodeLiteral` already unwraps) whenever `decodeLiteral(text)` would not hand back the identical
 * string — numbers, `true`/`false`, `null`, and already-quoted text all fail that check. A value
 * `decodeLiteral` already returns unchanged (an ordinary word like `'Slashing'`) needs no wrapping.
 * An empty string is left unchanged rather than quoted: `decodeCell`'s untyped-bag blank rule treats
 * `''` as ABSENT (see its header note), and `decodeLiteral('')` would otherwise coerce it to the number
 * `0` (`Number('')` is `0`), which would wrongly trigger quoting and turn a dropped field into a
 * literal empty-string one.
 * @param {string} text - The exported string value.
 * @returns {string} `text` as-is, or wrapped in double quotes to force literal-string decoding.
 */
export function forceStringCell(text) {
   if (text === '') {
      return text;
   }
   return decodeLiteral(text) === text ? text : `"${text}"`;
}

/**
 * Decodes one raw cell value into its final typed value, following the spec's cell-encoding rules:
 * when `fieldSchema` is known (a typed, schema-driven field), a non-blank value is coerced to that
 * type and a blank value resolves to null (nullable), empty string (non-nullable string), or ABSENT;
 * when `fieldSchema` is undefined (an untyped bag — rules elements, traits, `flags.*`, or any
 * array-of-objects field), a non-blank value follows the literal rules and a blank value is ABSENT.
 * @param {string|number|boolean|undefined} rawValue - The raw cell value (undefined for a blank cell;
 * already typed for XLSX, always a string for CSV).
 * @param {{type: 'string'|'number'|'boolean', nullable: boolean}|undefined} fieldSchema - The field's
 * resolved schema type info, or undefined for an untyped bag.
 * @returns {string|number|boolean|null|symbol} The decoded value, or the ABSENT sentinel.
 */
export function decodeCell(rawValue, fieldSchema) {
   /** @type {boolean} */
   const isBlank = rawValue === undefined || rawValue === '';

   if (!fieldSchema) {
      return isBlank ? ABSENT : decodeLiteral(rawValue);
   }

   if (isBlank) {
      if (fieldSchema.nullable) {
         return null;
      }
      if (fieldSchema.type === 'string') {
         return '';
      }
      return ABSENT;
   }

   switch (fieldSchema.type) {
      case 'number': {
         /** @type {number} */
         const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
         if (!Number.isFinite(numeric)) {
            throw new Error(`Expected a number, got "${rawValue}"`);
         }
         return numeric;
      }
      case 'boolean': {
         if (typeof rawValue === 'boolean') {
            return rawValue;
         }
         if (rawValue === 'true') {
            return true;
         }
         if (rawValue === 'false') {
            return false;
         }
         throw new Error(`Expected true or false, got "${rawValue}"`);
      }
      default:
         return String(rawValue);
   }
}

/**
 * Resolves a concrete dotted column path's field schema: the fixed-column type if the path names one
 * of them, else the schema-typed entry for its normalized (wildcarded) form, else undefined (untyped
 * bag).
 * @param {Object<string, {type:string,nullable:boolean}>} fieldTypes - The document subtype's resolved
 * schema-typed field map (see resolveTypeSchemas), keyed by normalized path.
 * @param {string} path - The concrete column path.
 * @returns {{type:string,nullable:boolean}|undefined} The resolved field schema, if any.
 */
export function lookupFieldSchema(fieldTypes, path) {
   return FIXED_COLUMN_TYPES[path] ?? fieldTypes[normalizePath(path)];
}

/**
 * Decodes one sheet row's raw cell values into a flat path -> value map.
 * @param {Object<string,*>} row - The raw row (column name -> raw cell value).
 * @param {string[]} columns - The sheet's column names, in order.
 * @param {Object<string, {type:string,nullable:boolean}>} fieldTypes - The document subtype's resolved
 * schema-typed field map.
 * @returns {Object<string,*>} The decoded flat map (ABSENT-valued entries retained; unflattenRow drops
 * them appropriately).
 */
export function decodeRow(row, columns, fieldTypes) {
   /** @type {Object<string,*>} */
   const flat = {};
   for (const column of columns) {
      flat[column] = decodeCell(row[column], lookupFieldSchema(fieldTypes, column));
   }
   return flat;
}
