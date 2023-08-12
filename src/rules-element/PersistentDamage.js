import { Hashing } from '@typhonjs-fvtt/runtime/util';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';

export function getPersistentDamageTemplate(uuid, type) {
   return {
      operation: 'persistentDamage',
      selector: 'turnStart',
      value: 1,
      uuid: uuid ?? Hashing.uuidv4(),
      type: type ?? ''
   };
}

export function applyPersistentDamageElements(elements) {
   if (elements.length > 0) {
      const persistentDamage = {};
      // Sort elements by selector
      const selectors = sortObjectsIntoContainerByKey(elements, 'selector');

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {
         persistentDamage[selector] = {};
         // Sort elements by type
         const types = sortObjectsIntoContainerByKey(selectorElements, 'type');

         // For each type
         for (const [type, typeElements] of Object.entries(types)) {
            persistentDamage[selector][type] = 0;
            // Apply each mod
            for (const element of typeElements) {
               persistentDamage[selector][type] += (element.value);
            }
         }
      }

      this.persistentDamage = persistentDamage;
   }
   else {
      this.persistentDamage = false;
   }

   return;
}