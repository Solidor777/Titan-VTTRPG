import getSetting from '~/helpers/utility-functions/GetSetting.js';

export default function registerInitiativeFormula() {
   // Register initiative formula
   const initiativeFormula = getSetting('initiativeFormula');
   CONFIG.Combat.initiative = {
      formula: `@rating.initiative.value${initiativeFormula}`,
   };
}
