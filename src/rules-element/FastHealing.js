import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';

export function getFastHealingTemplate(uuid) {
   return {
      operation: 'fastHealing',
      selector: 'turnStart',
      value: 1,
      uuid: uuid ?? uuidv4()
   };
}

export function applyFastHealingElements(elements) {
   if (elements.length > 0) {
      const fastHealing = {};
      // Sort elements by selector
      const selectors = sortObjectsIntoContainerByKey(elements, 'selector');

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {
         fastHealing[selector] = {};
         // Sort elements by type
         const types = sortObjectsIntoContainerByKey(selectorElements, 'type');

         // For each type
         for (const [type, typeElements] of Object.entries(types)) {
            fastHealing[selector][type] = 0;
            // Apply each mod
            for (const element of typeElements) {
               [selector][type] += (element.value);
            }
         }
      }

      this.fastHealing = fastHealing;
   }
   else {
      this.fastHealing = false;
   }

   return;
}