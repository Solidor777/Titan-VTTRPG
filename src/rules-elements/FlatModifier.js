export default function flatModifier(selector, key, value, actorData) {
   function applyModifier(valueObject) {
      if (valueObject?.dynamicMod === undefined) {
         valueObject.dynamicMod = value;
      }
      else if (valueObject?.dynamicMod + value !== undefined) {
         valueObject.dynamicMod += value;
      }
      else {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Value provided. (${value})`);
         return false;
      }
      return true;
   }

   // Switch depending on the selector
   switch (selector) {
      case 'attribute': {
         return applyModifier(actorData.attribute[key]);
      }
      case 'resistance': {
         return applyModifier(actorData.resistance[key]);
      }
      case 'training': {
         return applyModifier(actorData.skill[key].training);
      }
      case 'rating': {
         return applyModifier(actorData.rating[key]);
      }
      case 'resource': {
         return applyModifier(actorData.resource[key]);
      }
      case 'speed': {
         return applyModifier(actorData.speed[key]);
      }
      case 'mod': {
         return applyModifier(actorData.mod[key]);
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${selector})`);
         return false;
      }
   }
}