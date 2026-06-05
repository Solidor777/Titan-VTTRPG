/**
 * Builds the canonical shape template for a turn-end-revert report chat message's system data. Each
 * property's representative value seeds the matching typed schema field via `buildSchemaFromShape`;
 * every property is `null` so it becomes a nullable object field, preserving the card's `if (obj)`
 * presence guards. Unlike the turn-start-revert report, turn-end revert carries no resolve-regain offer
 * and no resolve snapshot - turn end neither regains nor reports resolve.
 * @returns {object} The turn-end-revert report shape: the fast-healing and persistent-damage revert
 *    offers, and the stamina and wounds resource snapshots.
 */
export default function createTurnEndRevertReportShape() {
   return {
      // The fast healing revert offer reported at turn-end revert, or null when absent.
      fastHealingRevert: null,

      // The persistent damage revert offer reported at turn-end revert, or null when absent.
      persistentDamageRevert: null,

      // Snapshot of the actor's stamina resource after the revert, or null when not reported.
      stamina: null,

      // Snapshot of the actor's wounds resource after the revert, or null when not reported.
      wounds: null,
   };
}
