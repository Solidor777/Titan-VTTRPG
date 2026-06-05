/**
 * Builds the canonical shape template for a healing report chat message's system data. Each property's
 * representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present resource snapshots (stamina, wounds) are `null` so they become nullable object
 * fields, preserving the card's `if (obj)` presence guards.
 * @returns {object} The healing report shape: the stamina restored and the stamina and wounds resource
 *    snapshots.
 */
export default function createHealingReportShape() {
   return {
      // The amount of stamina restored to the actor.
      staminaRestored: 0,

      // Snapshot of the actor's stamina resource after the healing, or null when not reported.
      stamina: null,

      // Snapshot of the actor's wounds resource after the healing, or null when not reported.
      wounds: null,
   };
}
