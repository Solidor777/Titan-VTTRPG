/**
 * Builds the canonical shape template for a turn-start report chat message's OBJECT system data. Each
 * property's representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * array fields (message, conditions) are NOT declared here because Foundry's ObjectField rejects arrays
 * (`getType([]) === 'Array'`) - they are added as explicit ArrayFields on the data model instead. Every
 * conditionally-present compound is `null` so it becomes a nullable object field, preserving the card's
 * `if (obj)` presence guards; `fastHealing`/`persistentDamage` stay opaque ObjectFields to keep their
 * variable per-source keys (equipment/ability/effect) that the apply-button tooltip reads. The resource
 * snapshots nest under `resource` so the card can read the same `system.resource.*` path as the actor's
 * own persisted resources.
 * @returns {object} The turn-start report object-field shape: the expired-effects flag and the
 *    conditionally-present effects, healing/damage offers, resolve-regain offer, and nested resource
 *    snapshots.
 */
export default function createTurnStartReportShape() {
   return {
      // Whether expired effects were removed automatically as part of this turn start.
      expiredEffectsRemoved: false,

      // Snapshot of the actor's active effects reported at turn start, or null when not reported.
      effects: null,

      // The fast healing offer applied or offered at turn start, or null when absent.
      fastHealing: null,

      // The persistent damage offer applied or offered at turn start, or null when absent.
      persistentDamage: null,

      // The resolve regain offer applied or offered at turn start, or null when absent.
      resolveRegain: null,

      // Snapshots of the actor's resources after the turn start, at the same paths as the actor's own
      // persisted resources.
      resource: {
         // Snapshot of the actor's stamina resource after the turn start, or null when not reported.
         stamina: null,

         // Snapshot of the actor's wounds resource after the turn start, or null when not reported.
         wounds: null,

         // Snapshot of the actor's resolve resource after the turn start, or null when not reported.
         resolve: null,
      },
   };
}
