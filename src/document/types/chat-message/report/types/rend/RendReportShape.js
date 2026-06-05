/**
 * Builds the canonical shape template for a rend report chat message's system data. Each property's
 * representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present armor resource snapshot is `null` so it becomes a nullable object field,
 * preserving the card's `if (armor)` presence guard.
 * @returns {object} The rend report shape: the armor label fields, the armor lost tally, and the
 *    armor resource snapshot.
 */
export default function createRendReportShape() {
   return {
      // The display image of the armor that was rent.
      armorImg: '',

      // The display name of the armor that was rent.
      armorName: '',

      // The amount of armor lost as a result of the rend.
      armorLost: 0,

      // Snapshot of the actor's armor resource after the rend, or null when not reported.
      armor: null,
   };
}
