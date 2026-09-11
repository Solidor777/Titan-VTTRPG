/**
 * Sentinel marking a decoded cell that should leave the target field untouched (schema default on
 * create, existing value preserved on update). Never appears in unflattenRow's return value.
 * @type {symbol}
 */
export const ABSENT = Symbol('spreadsheet-absent');

/**
 * Determines whether a reconstructed node counts as blank for the array-element-existence rule: a node
 * is blank if it is ABSENT, null, the empty string, or an object/array whose values are all blank. Any
 * other value (including 0 and false) is non-blank.
 * @param {*} value - A value produced by buildNode.
 * @returns {boolean} Whether the value counts as blank.
 */
function isBlankValue(value) {
   if (value === ABSENT || value === null || value === '') {
      return true;
   }
   if (Array.isArray(value)) {
      return value.every(isBlankValue);
   }
   if (typeof value === 'object') {
      return Object.values(value).every(isBlankValue);
   }
   return false;
}

/**
 * Recursively builds a nested value (object, compacted array, or a bare leaf) from entries sharing a
 * common path prefix (already stripped from their segment arrays).
 * @param {Array<{segments: string[], value: *}>} entries - Entries relative to this node.
 * @returns {*} A nested object, a compacted array, or (for a single no-segments entry) the leaf value.
 */
function buildNode(entries) {
   if (entries.length === 1 && entries[0].segments.length === 0) {
      return entries[0].value;
   }

   /** @type {Map<string, Array<{segments: string[], value: *}>>} Child entries grouped by first segment. */
   const children = new Map();
   for (const entry of entries) {
      const [head, ...rest] = entry.segments;
      if (!children.has(head)) {
         children.set(head, []);
      }
      children.get(head).push({
         segments: rest,
         value: entry.value,
      });
   }

   /** @type {string[]} */
   const keys = [...children.keys()];
   /** @type {boolean} Whether every child key is a numeric index (an array node). */
   const isArrayNode = keys.length > 0 && keys.every((key) => /^\d+$/.test(key));

   if (isArrayNode) {
      /** @type {Array<{index:number, value:*}>} Every candidate index with its built node, sorted ascending. */
      const candidates = keys
         .map((key) => ({
            index: Number(key),
            value: buildNode(children.get(key)),
         }))
         .sort((a, b) => a.index - b.index);
      // Keep only elements with at least one non-blank cell, then reindex densely (ascending order).
      return candidates.filter((c) => !isBlankValue(c.value)).map((c) => c.value);
   }

   /** @type {object} */
   const node = {};
   for (const key of keys) {
      /** @type {*} */
      const built = buildNode(children.get(key));
      if (built !== ABSENT) {
         node[key] = built;
      }
   }
   // An object node only ever gets a key from a non-ABSENT child; zero surviving keys means every
   // child was ABSENT, so this node itself must propagate as ABSENT rather than survive as a stray {}.
   return Object.keys(node).length === 0 ? ABSENT : node;
}

/**
 * Reconstructs a (possibly partial) document source object from a flat map of dotted path to decoded
 * cell value, applying the wide-layout array-element-existence and index-compaction rules: an array
 * element survives only if at least one of its cells is non-blank (a value other than ABSENT, null, or
 * the empty string); surviving elements are reindexed densely in ascending order.
 * @param {Object<string, *>} flat - Map of dotted field path to decoded cell value.
 * @returns {object} The reconstructed document source (or partial source, for an update row).
 */
export function unflattenRow(flat) {
   /** @type {Array<{segments: string[], value: *}>} */
   const entries = Object.entries(flat).map(([path, value]) => ({
      segments: path.split('.'),
      value,
   }));
   /** @type {*} */
   const result = buildNode(entries);
   return result === ABSENT ? {} : result;
}
