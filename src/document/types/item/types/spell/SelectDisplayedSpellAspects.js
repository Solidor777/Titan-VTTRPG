/**
 * @typedef {object} DisplayedSpellAspect
 * @property {string} key - A stable identity for keyed rendering: the standard aspect's label or the custom aspect's
 * uuid.
 * @property {boolean} isCustom - Whether the entry is a custom aspect rather than a standard one.
 * @property {number} index - The entry's index within its source list (`system.aspect` or `system.customAspect`).
 * @property {string} label - The label to show; a localization key when `isLocalized`, otherwise the user's text.
 * @property {boolean} isLocalized - Whether `label` must be passed through localization before display.
 * @property {number} cost - The aspect's cost.
 * @property {object} aspect - The source aspect object.
 */

/**
 * Selects the aspects that make up a Spell's total aspect cost, in display order: every enabled standard aspect, then
 * every custom aspect. Mirrors `calculateSpellAspectCosts`: a disabled standard aspect costs nothing and is omitted,
 * and custom aspects always count. Every component that lists a Spell's aspects, or shows or hides a section by
 * whether any exist, reads this selection instead of an aspect's `enabled` flag, so none can drift from the total.
 * @param {object[]} aspects - The Spell's standard aspects (`system.aspect`).
 * @param {object[]} customAspects - The Spell's custom aspects (`system.customAspect`).
 * @returns {DisplayedSpellAspect[]} One entry per aspect that counts toward the total cost, in display order.
 */
export default function selectDisplayedSpellAspects(aspects, customAspects) {
   /** @type {DisplayedSpellAspect[]} The entries collected in display order. */
   const displayed = [];

   aspects.forEach((aspect, index) => {
      if (aspect.enabled === true) {
         displayed.push({
            key: aspect.label,
            isCustom: false,
            index,
            label: aspect.unit ?? aspect.label,
            isLocalized: true,
            cost: aspect.cost,
            aspect,
         });
      }
   });

   customAspects.forEach((aspect, index) => {
      displayed.push({
         key: aspect.uuid,
         isCustom: true,
         index,
         label: aspect.label,
         isLocalized: false,
         cost: aspect.cost,
         aspect,
      });
   });

   return displayed;
}
