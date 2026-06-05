/**
 * Builds the canonical shape template for a turn-start-revert report chat message's system data. Each
 * property's representative value seeds the matching typed schema field via `buildSchemaFromShape`;
 * every property is `null` so it becomes a nullable object field, preserving the card's `if (obj)`
 * presence guards. The revert confirm-offer objects (fastHealingRevert, persistentDamageRevert,
 * resolveRegainRevert) and the resource snapshots (stamina, wounds, resolve) are all conditionally
 * present, so they stay opaque nullable ObjectFields the card reads sub-fields off.
 * @returns {object} The turn-start-revert report shape: the fast-healing, persistent-damage, and
 *    resolve-regain revert offers, and the stamina, wounds, and resolve resource snapshots.
 */
export default function createTurnStartRevertReportShape() {
   return {
      // The fast healing revert offer reported at turn-start revert, or null when absent.
      fastHealingRevert: null,

      // The persistent damage revert offer reported at turn-start revert, or null when absent.
      persistentDamageRevert: null,

      // The resolve regain revert offer reported at turn-start revert, or null when absent.
      resolveRegainRevert: null,

      // Snapshot of the actor's stamina resource after the revert, or null when not reported.
      stamina: null,

      // Snapshot of the actor's wounds resource after the revert, or null when not reported.
      wounds: null,

      // Snapshot of the actor's resolve resource after the revert, or null when not reported.
      resolve: null,
   };
}
