/**
 * Builds the canonical shape template for a healing report chat message's system data. Each property's
 * representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present resource snapshots (`resource.stamina`, `resource.wounds`) are `null` so they
 * become nullable object fields, preserving the card's `if (obj)` presence guards. The resource
 * snapshots nest under `resource` so the card can read the same `system.resource.*` path as the actor's
 * own persisted resources.
 * @returns {object} The healing report shape: the stamina restored and the nested stamina and wounds
 *    resource snapshots.
 */
export default function createHealingReportShape() {
   return {
      // The amount of stamina restored to the actor.
      staminaRestored: 0,

      // Snapshots of the actor's resources after the healing, at the same paths as the actor's own
      // persisted resources.
      resource: {
         // Snapshot of the actor's stamina resource after the healing, or null when not reported.
         stamina: null,

         // Snapshot of the actor's wounds resource after the healing, or null when not reported.
         wounds: null,
      },
   };
}
