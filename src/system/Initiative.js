export default function registerInitiativeFormula() {
   // Register initiative formula 
   const initiativeFormula = game.settings.get('titan', 'initiativeFormula');
   CONFIG.Combat.initiative = {
      formula: `@rating.initiative.value${initiativeFormula}`
   };

   return;
}