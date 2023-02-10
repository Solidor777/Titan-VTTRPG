import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';

export function getTurnResourceModTemplate(uuid) {
   return {
      operation: 'turnResourceMod',
      selector: 'turnStart',
      key: "stamina",
      value: 1,
      uuid: uuid ?? uuidv4()
   };
}

export function applyTurnResourceModElements(elements) {
   if (elements.length > 0) {
      const turnResourceMods = {};
      // Sort elements by selector
      const selectors = sortObjectsIntoContainerByKey(elements, 'selector');

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {
         turnResourceMods[selector] = {};

         // Sort elements by key
         const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');

         // For each key
         for (const [key, keyElements] of Object.entries(keys)) {
            turnResourceMods[selector][key] = {};

            // Sort elements by type
            const types = sortObjectsIntoContainerByKey(keyElements, 'type');

            // For each type
            for (const [type, typeElements] of Object.entries(types)) {
               turnResourceMods[selector][key][type] = 0;
               // Apply each mod
               for (const element of typeElements) {
                  [selector][key][type] += (element.value);
               }
            }
         }
      }

      this.turnResourceMods = turnResourceMods;
   }

   return;
}