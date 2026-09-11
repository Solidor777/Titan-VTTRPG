/**
 * Top-level document keys never flattened: server/compendium-owned metadata (`_stats`, `ownership`) and
 * embedded-document collections, which the caller (BuildTables) walks separately as their own document
 * envelopes. `folder` is likewise excluded — the caller supplies a resolved `_folder` path instead.
 * @type {Set<string>}
 */
const EXCLUDED_TOP_LEVEL_KEYS = new Set([
   '_stats',
   'ownership',
   'items',
   'effects',
   'folder',
]);

/**
 * Recursively flattens one value into the accumulator, dotting object keys and array indices onto the
 * given path. An empty array contributes no entries (there is nothing to index); `null` is preserved as
 * a real value (e.g. a cleared nullable id field).
 * @param {string} path - The dotted path accumulated so far.
 * @param {*} value - The value at that path.
 * @param {Object<string,*>} flat - The accumulator map (mutated).
 */
function flattenValue(path, value, flat) {
   if (Array.isArray(value)) {
      value.forEach((element, index) => flattenValue(`${path}.${index}`, element, flat));
      return;
   }
   if (value !== null && typeof value === 'object') {
      for (const [key, sub] of Object.entries(value)) {
         flattenValue(`${path}.${key}`, sub, flat);
      }
      return;
   }
   flat[path] = value;
}

/**
 * Flattens a document's own persisted source (as returned by `Document#toObject()`) into a flat map of
 * dotted path to value, excluding server/compendium-owned metadata and embedded-document collections
 * (see EXCLUDED_TOP_LEVEL_KEYS).
 * @param {object} source - The document's source data.
 * @returns {Object<string,*>} The flat path -> value map.
 */
export function flattenDocument(source) {
   /** @type {Object<string,*>} */
   const flat = {};
   for (const [key, value] of Object.entries(source)) {
      if (EXCLUDED_TOP_LEVEL_KEYS.has(key)) {
         continue;
      }
      flattenValue(key, value, flat);
   }
   return flat;
}
