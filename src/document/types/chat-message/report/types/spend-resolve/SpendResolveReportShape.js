/**
 * Builds the canonical shape template for a spend-resolve report chat message's system data. Each
 * property's representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present resource snapshot (resolve) is `null` so it becomes a nullable object field,
 * preserving the card's `if (obj)` presence guard.
 * @returns {object} The spend-resolve report shape: the resolve spent, the resolve shortage, and the
 *    resolve resource snapshot.
 */
export default function createSpendResolveReportShape() {
   return {
      // The amount of resolve the actor spent.
      resolveSpent: 0,

      // The amount of resolve the actor was short by when spending.
      resolveShortage: 0,

      // Snapshot of the actor's resolve resource after spending, or null when not reported.
      resolve: null,
   };
}
