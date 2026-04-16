import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Generates a tooltip for a stat with a breakdown of any bonuses or penalties from item or effect modifiers.
 * @param {number} baseValue - The base value of the stat before any modifiers are applied.
 * @param {number} value - The value of the stat after any modifiers are applied.
 * @param {number} abilityMod - Sum bonuses and penalties from Abilities.
 * @param {number} effectMod - Sum bonuses and penalties from Effects.
 * @param {number} equipmentMod - Sum bonuses and penalties from Equipment.
 * @param {number} staticMod - Sum bonuses and penalties from Static modifiers.
 * @param {number} extraMod - Sum bonuses and penalties from additional modifiers.
 * @param {string} [baseTooltip] - Label for the base value of the stat in the tooltip.
 * @returns {string} Tooltip for the stat with a breakdown of any bonuses or penalties from item or effect modifiers.
 */
export default function createModifiableStatTooltip(
   baseValue,
   value,
   abilityMod,
   effectMod,
   equipmentMod,
   staticMod,
   extraMod,
   baseTooltip
) {
   // Base label.
   let retVal = baseTooltip ? `<p>${baseTooltip}</p>` : '';

   // Base Value.
   if (baseValue !== undefined) {
      retVal += `<p>${localize('base')}: ${baseValue}</p>`;
   }

   // Abilities.
   if (abilityMod) {
      retVal += `<p>${localize('abilities')}: ${abilityMod}</p>`;
   }

   // Effects.
   if (effectMod) {
      retVal += `<p>${localize('effects')}: ${effectMod}</p>`;
   }

   // Equipment.
   if (equipmentMod) {
      retVal += `<p>${localize('equipment')}: ${equipmentMod}</p>`;
   }

   // Static mod.
   if (staticMod) {
      retVal += `<p>${localize('temp')}: ${staticMod}</p>`;
   }

   // Extra mod.
   if (extraMod) {
      retVal += `<p>${localize('otherModifiers')}: ${extraMod}</p>`;
   }

   return retVal;
}
