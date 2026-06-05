/**
 * Builds the canonical shape template for an effects-expired report chat message's system data. Each
 * property's representative value seeds the matching typed schema field via `buildSchemaFromShape`. The
 * expired-effects flag is an always-present boolean (seeded false), while the effects snapshot is
 * conditionally present, so it is `null` to become a nullable object field, preserving the card's
 * `if (effects)` presence guard.
 * @returns {object} The effects-expired report shape: the expired-effects-removed flag and the
 *    conditionally-present effects snapshot.
 */
export default function createEffectsExpiredReportShape() {
   return {
      // Whether expired effects were removed automatically as part of this report.
      expiredEffectsRemoved: false,

      // Snapshot of the actor's expired effects reported, or null when not reported.
      effects: null,
   };
}
