/**
 * @typedef {object} ModifiableStat
 * Object containing the information for a stat that can be modified by items or effects.
 * @property {number} baseValue - The base value of the stat before any modifiers are applied.
 * @property {number} value - The value of the stat after any modifiers are applied.
 * @property {object} mod - Object containing any item or effect modifiers.
 * @property {number} mod.ability - Bonuses or penalties from Abilities.
 * @property {number} mod.effect - Bonuses or penalties from Effects.
 * @property {number} mod.equipment - Bonuses or penalties from Equipment.
 * @property {number} mod.static - Bonuses or penalties from Static modifiers.
 */