import { v4 as uuidv4 } from 'uuid';

export function applyDoubleBase(doubleBase) {
   // Ensure the modifier is valid
   if (doubleBase === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Element.`);
      console.trace();

      return false;
   }
   if (doubleBase.selector === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Selector.`);
      console.trace();

      return false;
   }

   if (doubleBase.key === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Key.`);
      console.trace();

      return false;
   }

   if (doubleBase.type === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Type.`);
      console.trace();

      return false;
   }

   // Find the value object
   let mods = {};
   let baseValue = 0;
   const systemData = this.parent.system;
   switch (doubleBase.selector) {
      case 'attribute': {
         mods = systemData.attribute[doubleBase.key].mod;
         baseValue = systemData.attribute[doubleBase.key].baseValue;
         break;
      }
      case 'resistance': {
         mods = systemData.resistance[doubleBase.key].mod;
         baseValue = systemData.resistance[doubleBase.key].baseValue;
         break;
      }
      case 'training': {
         mods = systemData.skill[doubleBase.key].training.mod;
         baseValue = mods = systemData.skill[doubleBase.key].training.value;
         break;
      }
      case 'expertise': {
         mods = systemData.skill[doubleBase.key].expertise.mod;
         baseValue = systemData.skill[doubleBase.key].expertise.baseValue;
         break;
      }
      case 'rating': {
         mods = systemData.rating[doubleBase.key].mod;
         baseValue = systemData.rating[doubleBase.key].baseValue;
         break;
      }
      case 'resource': {
         mods = systemData.resource[doubleBase.key].mod;
         baseValue = systemData.resource[doubleBase.key].maxBase;
         break;
      }
      case 'speed': {
         mods = systemData.speed[doubleBase.key].mod;
         baseValue = systemData.speed[doubleBase.key].baseValue;
         break;
      }
      case 'mod': {
         mods = systemData.mod[doubleBase.key].mod;
         baseValue = systemData.mod[doubleBase.key].baseValue;
         break;
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${doubleBase.selector})`);
         console.trace();

         return false;
      }
   }

   // Ensure there is a valid object for the mods
   let type = '';
   switch (doubleBase.type) {
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
         console.error(`TITAN | Error applying Flat Modifier. Invalid Type (${doubleBase.type})`);
         console.trace();

         return false;
      }
   }

   // Apply the mod
   mods[type] += baseValue;

   return;
}

export function getDoubleBaseTemplate(uuid) {
   return {
      operation: 'doubleBase',
      selector: 'attribute',
      key: 'body',
      uuid: uuid ?? uuidv4()
   };
}