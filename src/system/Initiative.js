export default function registerInitiativeFormula() {
   // Register initiative formula 
   let initiativeFormula = '';
   const initiativeSettings = game.settings.get('titan', 'initiativeFormula');
   if (initiativeSettings === 'roll2d6') {
      initiativeFormula = '2d6+';
   }
   else if (initiativeSettings === 'roll1d6') {
      initiativeFormula = '1d6 + ';
   }
   CONFIG.Combat.initiative = {
      formula: `${initiativeFormula}@rating.initiative.value`
   };

   return;
}