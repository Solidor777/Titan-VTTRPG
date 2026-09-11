/**
 * Builds a pure slug generator with per-instance collision tracking, matching the compendium's anchor
 * convention: a repeated slug gets `-1`, `-2`, … suffixes in generation order.
 * @returns {function(string): string} `slugFor(text)`, returning a unique slug for this generator's
 * lifetime.
 */
export function createSlugger() {
   /** @type {Map<string, number>} Count of prior uses per base slug, for collision suffixes. */
   const seen = new Map();

   /**
    * Converts heading text into a unique, URL-safe anchor slug: lowercased, whitespace collapsed to
    * `-`, characters outside `[a-z0-9-]` stripped, `-` runs collapsed, leading/trailing `-` trimmed.
    * @param {string} text - The heading text to slugify.
    * @returns {string} The unique slug.
    */
   return function slugFor(text) {
      /** @type {string} The slug before collision-suffixing. */
      const base = String(text)
         .toLowerCase()
         .replace(/\s+/g, '-')
         .replace(/[^a-z0-9-]/g, '')
         .replace(/-+/g, '-')
         .replace(/^-|-$/g, '');

      /** @type {number} Prior uses of this base slug. */
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);

      return count === 0 ? base : `${base}-${count}`;
   };
}
