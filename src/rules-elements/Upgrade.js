export function applyUpgrade(flatModifier, actorData) {
   // Ensure the modifier is valid
   if (flatModifier === undefined ||
      flatModifier.operation === undefined ||
      flatModifier.selector === undefined ||
      flatModifier.key === undefined ||
      flatModifier.type === undefined ||
      flatModifier.value === undefined) {
      console.error(`TITAN | Error applying Flat Modifier. Invalid Element. (${flatModifier})`);
      return;
   }

   // Find the value object
   let valueObject = {};
   switch (flatModifier.selector) {
      case 'attribute': {
         valueObject = actorData.attribute[flatModifier.key];
         break;
      }
      case 'resistance': {
         valueObject = actorData.resistance[flatModifier.key];
         break;
      }
      case 'training': {
         valueObject = actorData.skill[flatModifier.key].training;
         break;
      }
      case 'expertise': {
         valueObject = actorData.skill[flatModifier.key].expertise;
         break;
      }
      case 'rating': {
         valueObject = actorData.rating[flatModifier.key];
         break;
      }
      case 'resource': {
         valueObject = actorData.resource[flatModifier.key];
         break;
      }
      case 'speed': {
         valueObject = actorData.speed[flatModifier.key];
         break;
      }
      case 'mod': {
         valueObject = actorData.mod[flatModifier.key];
         break;
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${flatModifier.selector})`);
         return;
      }
   }

   // Modifier the dynamic mods
   if (valueObject.itemMod === undefined) {
      valueObject.itemMod = flatModifier.value;
   }
   else if (valueObject.itemMod + flatModifier.value !== undefined) {
      valueObject.itemMod += flatModifier.value;
   }
   else {
      console.error(`TITAN | Error applying Flat Modifier. Invalid Value provided. (${flatModifier.value})`);
   }

   return;
}

export function getRuleElementTemplate() {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      type: 'effect',
   };
}