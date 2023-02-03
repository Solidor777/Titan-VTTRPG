import { getSetting } from '~/helpers/Utility';

export default function registerInitiativeFormula() {
   // Register initiative formula 
   const initiativeFormula = getSetting('initiativeFormula');
   CONFIG.Combat.initiative = {
      formula: `@rating.initiative.value${initiativeFormula}`
   };

   return;
}