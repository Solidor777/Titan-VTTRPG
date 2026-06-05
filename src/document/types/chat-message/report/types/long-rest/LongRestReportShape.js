/**
 * Builds the canonical shape template for a long-rest report chat message's system data. Each property's
 * representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present resource snapshot (wounds) is `null` so it becomes a nullable object field,
 * preserving the card's `if (obj)` presence guard.
 * @returns {object} The long-rest report shape: the wounds healed and the wounds resource snapshot.
 */
export default function createLongRestReportShape() {
   return {
      // The number of wounds healed over the long rest.
      woundsHealed: 0,

      // Snapshot of the actor's wounds resource after the long rest, or null when not reported.
      wounds: null,
   };
}
