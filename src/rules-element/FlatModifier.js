import { v4 as uuidv4 } from 'uuid';

export function applyFlatModifier(flatModifier) {
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
   const systemData = this.parent.system;
   switch (flatModifier.selector) {
      case 'attribute': {
         valueObject = systemData.attribute[flatModifier.key];
         break;
      }
      case 'resistance': {
         valueObject = systemData.resistance[flatModifier.key];
         break;
      }
      case 'training': {
         valueObject = systemData.skill[flatModifier.key].training;
         break;
      }
      case 'expertise': {
         valueObject = systemData.skill[flatModifier.key].expertise;
         break;
      }
      case 'rating': {
         valueObject = systemData.rating[flatModifier.key];
         break;
      }
      case 'resource': {
         valueObject = systemData.resource[flatModifier.key];
         break;
      }
      case 'speed': {
         valueObject = systemData.system.speed[flatModifier.key];
         break;
      }
      case 'mod': {
         valueObject = systemData.system.mod[flatModifier.key];
         break;
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${flatModifier.selector})`);
         return;
      }
   }

   // Determine the mod type
   const modType = flatModifier.type === "effect" ? "effectMod" : "itemMod";

   // Apply the mod
   if (valueObject[modType] + flatModifier.value !== undefined) {
      valueObject[modType] += flatModifier.value;
   }
   else {
      console.error(`TITAN | Error applying Flat Modifier. Invalid Value provided. (${modType} ${flatModifier.value})`);
   }

   return;
}

export function getFlatModifierTemplate() {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      uuid: uuidv4()
   };
}