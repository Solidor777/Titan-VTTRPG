export default function applyFlatModifier(flatModifier, actorData) {
   function applyModifier(valueObject) {
      if (valueObject?.dynamicMod === undefined) {
         valueObject.dynamicMod = flatModifier.value;
      }
      else if (valueObject?.dynamicMod + flatModifier.value !== undefined) {
         valueObject.dynamicMod += flatModifier.value;
      }
      else {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Value provided. (${flatModifier.value})`);
         return false;
      }
      return true;
   }

   // Switch depending on the selector
   switch (flatModifier.selector) {
      case 'attribute': {
         return applyModifier(actorData.attribute[flatModifier.key]);
      }
      case 'resistance': {
         return applyModifier(actorData.resistance[flatModifier.key]);
      }
      case 'training': {
         return applyModifier(actorData.skill[flatModifier.key].training);
      }
      case 'expertise': {
         return applyModifier(actorData.skill[flatModifier.key].expertise);
      }
      case 'rating': {
         return applyModifier(actorData.rating[flatModifier.key]);
      }
      case 'resource': {
         return applyModifier(actorData.resource[flatModifier.key]);
      }
      case 'speed': {
         return applyModifier(actorData.speed[flatModifier.key]);
      }
      case 'mod': {
         return applyModifier(actorData.mod[flatModifier.key]);
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${flatModifier.selector})`);
         return false;
      }
   }
}