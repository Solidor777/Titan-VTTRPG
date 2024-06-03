import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Sets up the system initiative formula.
 */
export default function registerInitiativeFormula() {
   // Register initiative formula
   const initiativeFormula = getSetting('initiativeFormula');
   CONFIG.Combat.initiative = {
      formula: `@rating.initiative.value${initiativeFormula}`,
   };
}
