import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {object} List of all system Skills. */
export const DEFAULT_SKILL_ATTRIBUTES = deepFreeze({
   arcana: 'mind',
   athletics: 'body',
   deception: 'mind',
   dexterity: 'body',
   diplomacy: 'soul',
   engineering: 'mind',
   intimidation: 'body',
   investigation: 'mind',
   lore: 'mind',
   medicine: 'mind',
   meleeWeapons: 'body',
   metaphysics: 'soul',
   nature: 'mind',
   perception: 'mind',
   performance: 'soul',
   rangedWeapons: 'body',
   subterfuge: 'mind',
   stealth: 'body',
});
