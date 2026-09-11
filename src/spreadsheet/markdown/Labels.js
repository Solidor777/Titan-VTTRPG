/**
 * Plural and capitalized English fallback labels for each Item pack type, `[plural, Plural]`. Used
 * for root-level type-group headings when the lang file has no override.
 * @type {Object<string, [string, string]>}
 */
export const PLURAL_TYPE_LABELS = {
   weapon: ['weapons', 'Weapons'],
   armor: ['armor', 'Armor'],
   shield: ['shields', 'Shields'],
   equipment: ['equipment', 'Equipment'],
   commodity: ['commodities', 'Commodities'],
   ability: ['abilities', 'Abilities'],
   spell: ['spells', 'Spells'],
};

/**
 * The fixed rendering order for Item pack types (root type groups and spell aspect ordering).
 * @type {string[]}
 */
export const TYPE_ORDER = [
   'weapon',
   'armor',
   'shield',
   'equipment',
   'commodity',
   'ability',
   'spell',
];

/**
 * Builds a pure label lookup over a Foundry language JSON's `LOCAL` map.
 * @param {{LOCAL?: Object<string, string>}} langJson - A loaded language file (`lang/en.json` shape).
 * @returns {function(string, string=): string} `label(key, fallback = key)`, resolving
 *    `LOCAL['<key>.text']` and falling back to `fallback` when the key is absent.
 */
export function createLabels(langJson) {
   /** @type {Object<string, string>} The flat `LOCAL` map, or an empty map when absent. */
   const local = langJson?.LOCAL ?? {};

   /**
    * Resolves a label by key, falling back when the key is absent from `LOCAL`.
    * @param {string} key - The label key, without the `.text` suffix.
    * @param {string} [fallback] - The text to use when the key is missing. Defaults to `key`.
    * @returns {string} The resolved label text.
    */
   return function label(key, fallback = key) {
      /** @type {string|undefined} The looked-up text for `<key>.text`. */
      const text = local[`${key}.text`];
      return text !== undefined ? text : fallback;
   };
}
