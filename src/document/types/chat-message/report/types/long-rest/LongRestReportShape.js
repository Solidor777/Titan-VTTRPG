/**
 * Builds the canonical shape template for a long-rest report chat message's system data. Each property's
 * representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present resource snapshot (`resource.wounds`) is `null` so it becomes a nullable object
 * field, preserving the card's `if (obj)` presence guard. The resource snapshot nests under `resource` so
 * the card can read the same `system.resource.*` path as the actor's own persisted resources.
 * @returns {object} The long-rest report shape: the wounds healed and the nested wounds resource
 *    snapshot.
 */
export default function createLongRestReportShape() {
   return {
      // The number of wounds healed over the long rest.
      woundsHealed: 0,

      // Snapshot of the actor's resources after the long rest, at the same path as the actor's own
      // persisted resources.
      resource: {
         // Snapshot of the actor's wounds resource after the long rest, or null when not reported.
         wounds: null,
      },
   };
}
