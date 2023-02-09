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

export function applyMulBaseElements(mulBaseElements) {
   if (mulBaseElements.length > 0) {
      // Get actor system data
      const systemData = this.parent.system;

      // Sort by selector
      const selectors = {};
      for (const element of mulBaseElements) {
         if (!selectors[element.selector]) {
            selectors[element.selector] = [];
         }
         selectors[element.selector].push(element);
      };

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {
         // Sort by key
         const keys = {};
         for (const element of selectorElements) {
            if (!keys[element.key]) {
               keys[element.key] = [];
            }
            keys[element.key].push(element);
         }

         // For each key
         for (const [key, keyElements] of Object.entries(keys)) {
            // Get the stat data
            const stat = (selector === 'training' || selector === 'expertise') ? systemData.skill[key][selector] : systemData[selector][key];
            const mod = stat.mod;
            const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

            // Sort by type
            const types = {};
            for (const element of keyElements) {
               if (!types[element.type]) {
                  types[element.type] = [];
               }
               types[element.type].push(element.value);
            }

            // For each type
            for (const [type, typeElementValues] of Object.entries(types)) {
               // Apply each mod
               for (const elementValue of typeElementValues) {
                  mod[type] += baseValue * (elementValue - 1);
               }
            }

         }
      }
   }

   return;
}