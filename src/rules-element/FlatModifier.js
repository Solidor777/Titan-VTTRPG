import { v4 as uuidv4 } from 'uuid';

export function applyFlatModifier(flatModifier) {
   // Ensure the modifier is valid
   if (flatModifier === undefined) {
      console.error(`TITAN | Error applying Flat Modifier. Undefined Element.`);
      return;
   }
   if (flatModifier.selector === undefined) {
      console.error(`TITAN | Error applying Flat Modifier. Undefined Selector.`);
   }

   if (flatModifier.key === undefined) {
      console.error(`TITAN | Error applying Flat Modifier. Undefined Key.`);
   }

   if (flatModifier.type === undefined) {
      console.error(`TITAN | Error applying Flat Modifier. Undefined Type.`);
   }

   if (flatModifier.value === undefined) {
      console.error(`TITAN | Error applying Flat Modifier. Undefined Value.`);
   }

   // Find the value object
   let mods = {};
   const systemData = this.parent.system;
   switch (flatModifier.selector) {
      case 'attribute': {
         mods = systemData.attribute[flatModifier.key].mod;
         break;
      }
      case 'resistance': {
         mods = systemData.resistance[flatModifier.key].mod;
         break;
      }
      case 'training': {
         mods = systemData.skill[flatModifier.key].training.mod;
         break;
      }
      case 'expertise': {
         mods = systemData.skill[flatModifier.key].expertise.mod;
         break;
      }
      case 'rating': {
         mods = systemData.rating[flatModifier.key].mod;
         break;
      }
      case 'resource': {
         mods = systemData.resource[flatModifier.key].mod;
         break;
      }
      case 'speed': {
         mods = systemData.speed[flatModifier.key].mod;
         break;
      }
      case 'mod': {
         mods = systemData.mod[flatModifier.key].mod;
         break;
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${flatModifier.selector})`);
         return;
      }
   }

   // Ensure there is a valid object for the mods
   let type = '';
   switch (flatModifier.type) {
      case 'ability': {
         type = 'ability';
         break;
      }
      case 'armor':
      case 'equipment':
      case 'shield':
      case 'weapon': {
         type = 'equipment';
         break;
      }
      case 'effect': {
         type = 'effect';
         break;
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Type (${flatModifier.type})`);
         return;
      }
   }

   // Apply the mod
   mods[type] += flatModifier.value;

   return;
}

export function getFlatModifierTemplate(sourceType) {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      uuid: uuidv4()
   };
}