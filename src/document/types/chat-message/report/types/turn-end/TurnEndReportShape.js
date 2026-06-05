/**
 * Builds the canonical shape template for a turn-end report chat message's OBJECT system data. Each
 * property's representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * `message` array field is NOT declared here because Foundry's ObjectField rejects arrays
 * (`getType([]) === 'Array'`) - it is added as an explicit ArrayField on the data model instead. Every
 * conditionally-present compound is `null` so it becomes a nullable object field, preserving the card's
 * `if (obj)` presence guards; `fastHealing`/`persistentDamage` stay opaque ObjectFields to keep their
 * variable per-source keys (equipment/ability/effect) that the apply-button tooltip reads. Turn end has
 * neither a resolve-regain offer nor a resolve snapshot (those are turn-start only).
 * @returns {object} The turn-end report object-field shape: the expired-effects flag and the
 *    conditionally-present effects, healing/damage offers, and stamina/wounds resource snapshots.
 */
export default function createTurnEndReportShape() {
   return {
      // Whether expired effects were removed automatically as part of this turn end.
      expiredEffectsRemoved: false,

      // Snapshot of the actor's active effects reported at turn end, or null when not reported.
      effects: null,

      // The fast healing offer applied or offered at turn end, or null when absent.
      fastHealing: null,

      // The persistent damage offer applied or offered at turn end, or null when absent.
      persistentDamage: null,

      // Snapshot of the actor's stamina resource after the turn end, or null when not reported.
      stamina: null,

      // Snapshot of the actor's wounds resource after the turn end, or null when not reported.
      wounds: null,
   };
}
