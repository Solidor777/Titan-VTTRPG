import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';

export function getFlatModifierTemplate(uuid, type) {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? ''
   };
}

export function applyFlatModifierElements(elements) {
   if (elements.length > 0) {
      // Get actor system data
      const systemData = this.parent.system;

      // Sort elements by selector
      const selectors = sortObjectsIntoContainerByKey(elements, 'selector');

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {

         // Sort elements by key
         const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');

         // For each key
         for (const [key, keyElements] of Object.entries(keys)) {

            // Sort elements by type
            const types = sortObjectsIntoContainerByKey(keyElements, 'type');

            // Get the stat data
            const stat = (selector === 'training' || selector === 'expertise') ? systemData.skill[key][selector] : systemData[selector][key];
            const modObject = stat.mod;

            // For each type
            for (const [type, typeElements] of Object.entries(types)) {
               // Apply each mod
               for (const element of typeElements) {
                  modObject[type] += element.value;
               }
            }
         }
      }
   }

   return;
}