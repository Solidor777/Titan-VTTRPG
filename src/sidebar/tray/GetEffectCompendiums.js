/**
 * Gets the compendium packs the tray can display: every visible ActiveEffect-type pack, sorted with
 * TITAN (system) packs first, then alphabetically by label.
 * @returns {CompendiumCollection[]} The visible ActiveEffect packs in display order.
 */
export default function getEffectCompendiums() {
   /** @type {CompendiumCollection[]} The visible ActiveEffect packs. */
   const packs = game.packs.filter((pack) => pack.metadata.type === 'ActiveEffect' && pack.visible);

   // System (TITAN) packs sort before world/module packs; ties break alphabetically by label.
   return packs.sort((a, b) => {
      /** @type {boolean} Whether pack a is a system pack. */
      const aSystem = a.metadata.packageType === 'system';

      /** @type {boolean} Whether pack b is a system pack. */
      const bSystem = b.metadata.packageType === 'system';

      if (aSystem !== bSystem) {
         return aSystem ? -1 : 1;
      }

      return a.metadata.label.localeCompare(b.metadata.label);
   });
}
