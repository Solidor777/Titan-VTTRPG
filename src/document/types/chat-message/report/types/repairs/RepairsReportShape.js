/**
 * Builds the canonical shape template for a repairs report chat message's system data. Each property's
 * representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present armor resource snapshot is `null` so it becomes a nullable object field,
 * preserving the card's `if (armor)` presence guard.
 * @returns {object} The repairs report shape: the armor label fields, the armor repaired tally, and the
 *    armor resource snapshot.
 */
export default function createRepairsReportShape() {
   return {
      // The display image of the armor that was repaired.
      armorImg: '',

      // The display name of the armor that was repaired.
      armorName: '',

      // The amount of armor restored as a result of the repairs.
      armorRepaired: 0,

      // Snapshot of the actor's armor resource after the repairs, or null when not reported.
      armor: null,
   };
}
