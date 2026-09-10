/**
 * Builds the canonical shape template for a spend-resolve report chat message's system data. Each
 * property's representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present resource snapshot (`resource.resolve`) is `null` so it becomes a nullable object
 * field, preserving the card's `if (obj)` presence guard. The resource snapshot nests under `resource` so
 * the card can read the same `system.resource.*` path as the actor's own persisted resources.
 * @returns {object} The spend-resolve report shape: the resolve spent, the resolve shortage, and the
 *    nested resolve resource snapshot.
 */
export default function createSpendResolveReportShape() {
   return {
      // The amount of resolve the actor spent.
      resolveSpent: 0,

      // The amount of resolve the actor was short by when spending.
      resolveShortage: 0,

      // Snapshot of the actor's resources after spending, at the same path as the actor's own persisted
      // resources.
      resource: {
         // Snapshot of the actor's resolve resource after spending, or null when not reported.
         resolve: null,
      },
   };
}
