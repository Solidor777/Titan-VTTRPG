import { Hashing } from '@typhonjs-fvtt/runtime/util';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';

export function getMulBaseTemplate(uuid, type) {
   return {
      operation: 'mulBase',
      selector: 'attribute',
      key: 'body',
      value: 2,
      uuid: uuid ?? Hashing.uuidv4(),
      type: type ?? ''
   };
}

export function applyMulBaseElements(elements) {
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
            const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

            // For each type
            for (const [type, typeElements] of Object.entries(types)) {
               // Apply each mod
               for (const element of typeElements) {
                  modObject[type] += baseValue * (element.value - 1);
               }
            }
         }
      }
   }

   return;
}