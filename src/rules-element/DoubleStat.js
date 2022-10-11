import { v4 as uuidv4 } from 'uuid';

export function applyDoubleStat(doubleStat) {
   // Ensure the modifier is valid
   if (doubleStat === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Element.`);
      console.trace();

      return false;
   }
   if (doubleStat.selector === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Selector.`);
      console.trace();

      return false;
   }

   if (doubleStat.key === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Key.`);
      console.trace();

      return false;
   }

   if (doubleStat.type === undefined) {
      console.error(`TITAN | Error applying Double Stat. Undefined Type.`);
      console.trace();

      return false;
   }

   // Find the value object
   let mods = {};
   let baseValue = 0;
   const systemData = this.parent.system;
   switch (doubleStat.selector) {
      case 'attribute': {
         mods = systemData.attribute[doubleStat.key].mod;
         baseValue = systemData.attribute[doubleStat.key].baseValue;
         break;
      }
      case 'resistance': {
         mods = systemData.resistance[doubleStat.key].mod;
         baseValue = systemData.resistance[doubleStat.key].baseValue;
         break;
      }
      case 'training': {
         mods = systemData.skill[doubleStat.key].training.mod;
         baseValue = mods = systemData.skill[doubleStat.key].training.value;
         break;
      }
      case 'expertise': {
         mods = systemData.skill[doubleStat.key].expertise.mod;
         baseValue = systemData.skill[doubleStat.key].expertise.baseValue;
         break;
      }
      case 'rating': {
         mods = systemData.rating[doubleStat.key].mod;
         baseValue = systemData.rating[doubleStat.key].baseValue;
         break;
      }
      case 'resource': {
         mods = systemData.resource[doubleStat.key].mod;
         baseValue = systemData.resource[doubleStat.key].maxBase;
         break;
      }
      case 'speed': {
         mods = systemData.speed[doubleStat.key].mod;
         baseValue = systemData.speed[doubleStat.key].baseValue;
         break;
      }
      case 'mod': {
         mods = systemData.mod[doubleStat.key].mod;
         baseValue = systemData.mod[doubleStat.key].baseValue;
         break;
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${doubleStat.selector})`);
         console.trace();

         return false;
      }
   }

   // Ensure there is a valid object for the mods
   let type = '';
   switch (doubleStat.type) {
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
         console.error(`TITAN | Error applying Flat Modifier. Invalid Type (${doubleStat.type})`);
         console.trace();

         return false;
      }
   }

   // Apply the mod
   mods[type] += baseValue;

   return;
}

export function getDoubleStatTemplate(uuid) {
   return {
      operation: 'doubleStat',
      selector: 'attribute',
      key: 'body',
      uuid: uuid ?? uuidv4()
   };
}