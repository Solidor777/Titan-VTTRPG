/**
 * Builds the canonical shape template for a damage report chat message's system data. Each property's
 * representative value seeds the matching typed schema field via `buildSchemaFromShape`; the
 * conditionally-present resource snapshots (stamina, wounds) and the optional tags container are `null`
 * so they become nullable object fields, preserving the card's `if (obj)` presence guards.
 * @returns {object} The damage report shape: damage tallies, the ignored-armor flag, the stamina and
 *    wounds resource snapshots, and the tags container.
 */
export default function createDamageReportShape() {
   return {
      // The total stamina and wounds damage applied to the actor.
      damageTaken: 0,

      // The amount of incoming damage the actor's armor resisted.
      damageResisted: 0,

      // The stamina lost as a result of the damage.
      staminaLost: 0,

      // The wounds suffered as a result of the damage.
      woundsSuffered: 0,

      // Whether the damage ignored the actor's armor.
      ignoredArmor: false,

      // Snapshot of the actor's stamina resource after the damage, or null when not reported.
      stamina: null,

      // Snapshot of the actor's wounds resource after the damage, or null when not reported.
      wounds: null,

      // Container of damage tags (penetrating, ineffective) displayed on the card, or null when absent.
      tags: null,
   };
}
