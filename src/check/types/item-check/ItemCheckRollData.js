/**
 * The roll-data fields an Item Check reads: `check` (validation, initialization, and parameters), `customTrait`
 * (initialization and parameters), and `description`, `img`, and `name` (parameters). Coupled to
 * `CharacterDataModel#validateItemCheckOptions`, `#initializeItemCheckOptions`, and `#getItemCheckParameters`.
 * @type {readonly string[]}
 */
const ITEM_CHECK_ROLL_DATA_FIELDS = Object.freeze([
   'check',
   'customTrait',
   'description',
   'img',
   'name',
]);

/**
 * Creates plain Item Check roll data from an item-like source (e.g. a chat card's live system data model): a deep
 * copy of just the fields an Item Check reads, so the check never holds the source by reference.
 * @param {object} source - The item-like source; a data model is read through its `toObject()`.
 * @returns {object} The plain roll data.
 */
export default function createItemCheckRollData(source) {
   /** @type {object} The source's plain data. */
   const data = typeof source.toObject === 'function' ? source.toObject() : source;
   return structuredClone(Object.fromEntries(ITEM_CHECK_ROLL_DATA_FIELDS.map((field) => [
      field,
      data[field],
   ])));
}
