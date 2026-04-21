import initiativeFormula from '~/helpers/Settings/InitiativeFormula.js';

/**
 * Sets up the system initiative formula.
 */
export default function registerInitiativeFormula() {
   // Register initiative formula.
   CONFIG.Combat.initiative = {
      formula: `@rating.initiative.value${initiativeFormula()}`,
   };
}
