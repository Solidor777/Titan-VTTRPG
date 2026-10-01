/**
 * Gives the source changes the creation of an Active Effect applies: an `effect`-subtype effect always shows its
 * status icon, and a timed one (any duration but permanent) is disabled exactly when no time remains, while a
 * permanent effect keeps its `disabled` (a manual toggle) and any other subtype is unchanged. Read from a constructed
 * effect, whose data its schema has already cleaned (a stored string `remaining` cast, a missing one defaulted), so
 * the creation of a document (`TitanActiveEffect._preCreate`) and of an effect written as data
 * (`TitanActiveEffect.buildCreationSource`) store the same values.
 * @param {TitanActiveEffect} effect - The constructed Active Effect.
 * @returns {{disabled?: boolean, showIcon?: number}} The changes; empty when none applies.
 */
export default function getEffectCreationChanges(effect) {
   /** @type {{disabled?: boolean, showIcon?: number}} The changes that apply. */
   const changes = {};
   if (effect.type !== 'effect') {
      return changes;
   }
   if (effect.showIcon !== CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS) {
      changes.showIcon = CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS;
   }
   if (effect.system.duration.type !== 'permanent') {
      changes.disabled = effect.system.duration.remaining <= 0;
   }
   return changes;
}
