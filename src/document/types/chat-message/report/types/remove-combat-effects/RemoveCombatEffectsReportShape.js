/**
 * Builds the canonical shape template for a remove-combat-effects report chat message's system data.
 * This report is header-only: it carries no payload beyond the shared report label fields (actorName,
 * actorImg) defined on the family base, so the shape is empty. It is kept for uniformity with the other
 * report leaves and as the single source the schema and the golden-master test both reference.
 * @returns {object} The remove-combat-effects report shape (empty; no leaf-specific fields).
 */
export default function createRemoveCombatEffectsReportShape() {
   return {};
}
