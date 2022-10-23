import { v4 as uuidv4 } from 'uuid';

export function getMulBaseTemplate(uuid) {
   return {
      operation: 'mulBase',
      selector: 'attribute',
      key: 'body',
      value: 2,
      uuid: uuid ?? uuidv4()
   };
}

export function applyMulBase(mulBase) {
   // Ensure the modifier is valid
   if (mulBase === undefined) {
      console.error(`TITAN | Error applying Mul Base. Undefined Element.`);
      console.trace();

      return false;
   }
   if (mulBase.selector === undefined) {
      console.error(`TITAN | Error applying Mul Base. Undefined Selector.`);
      console.trace();

      return false;
   }

   if (mulBase.key === undefined) {
      console.error(`TITAN | Error applying Mul Base. Undefined Key.`);
      console.trace();

      return false;
   }

   if (mulBase.type === undefined) {
      console.error(`TITAN | Error applying Mul Base. Undefined Type.`);
      console.trace();

      return false;
   }

   if (mulBase.value === undefined) {
      console.error(`TITAN | Error applying Mul Base. Undefined Value.`);
      console.trace();

      return false;
   }

   // Find the value object
   let mods = {};
   let baseValue = 0;
   const systemData = this.parent.system;
   switch (mulBase.selector) {
      case 'attribute': {
         mods = systemData.attribute[mulBase.key].mod;
         baseValue = systemData.attribute[mulBase.key].baseValue;
         break;
      }
      case 'resistance': {
         mods = systemData.resistance[mulBase.key].mod;
         baseValue = systemData.resistance[mulBase.key].baseValue;
         break;
      }
      case 'training': {
         mods = systemData.skill[mulBase.key].training.mod;
         baseValue = mods = systemData.skill[mulBase.key].training.value;
         break;
      }
      case 'expertise': {
         mods = systemData.skill[mulBase.key].expertise.mod;
         baseValue = systemData.skill[mulBase.key].expertise.baseValue;
         break;
      }
      case 'rating': {
         mods = systemData.rating[mulBase.key].mod;
         baseValue = systemData.rating[mulBase.key].baseValue;
         break;
      }
      case 'resource': {
         mods = systemData.resource[mulBase.key].mod;
         baseValue = systemData.resource[mulBase.key].maxBase;
         break;
      }
      case 'speed': {
         mods = systemData.speed[mulBase.key].mod;
         baseValue = systemData.speed[mulBase.key].baseValue;
         break;
      }
      case 'mod': {
         mods = systemData.mod[mulBase.key].mod;
         baseValue = systemData.mod[mulBase.key].baseValue;
         break;
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${mulBase.selector})`);
         console.trace();

         return false;
      }
   }

   // Ensure there is a valid object for the mods
   let type = '';
   switch (mulBase.type) {
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
         console.error(`TITAN | Error applying Flat Modifier. Invalid Type (${mulBase.type})`);
         console.trace();

         return false;
      }
   }

   // Apply the mod

   mods[type] += baseValue * (mulBase.value - 1);

   return;
}