/**
 * Renders a comma-separated trait list from a standard-trait array (`{name, value}`, per
 * `AttackTraits.js`/`ArmorTraits.js`/`ShieldTraits.js`) and a custom-trait array
 * (`CustomItemTrait.js`'s `{name, description, uuid}`), matching `TraitTag.svelte`'s display rule: a
 * boolean-`true` trait renders its label alone, a numeric trait renders `Label N`, and a `false`/`0`
 * trait is skipped. Custom traits render their stored name, in order, after the standard traits.
 * @param {{name: string, value: (boolean|number)}[]} standardTraits - The standard traits to render.
 * @param {{name: string}[]} customTraits - The custom traits to render.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {string} The comma-separated trait list, or `''` when there are no traits to show.
 */
export function renderTraitList(standardTraits, customTraits, labels) {
   /** @type {string[]} The rendered trait entries, in stored order. */
   const parts = [];

   for (const trait of standardTraits ?? []) {
      if (trait.value === true) {
         parts.push(labels(trait.name));
      }
      else if (typeof trait.value === 'number' && trait.value !== 0) {
         parts.push(`${labels(trait.name)} ${trait.value}`);
      }
   }

   for (const trait of customTraits ?? []) {
      parts.push(trait.name);
   }

   return parts.join(', ');
}
