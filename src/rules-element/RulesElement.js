export default function sortAndApplyElementsToModObject(actor, elements, modFunction) {
   if (elements.length > 0) {
      // Get actor system data
      const systemData = actor.system;

      // Sort by selector
      const selectors = {};
      for (const element of elements) {
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
            const modObject = stat.mod;
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
                  modFunction(modObject, type, elementValue, baseValue);
               }
            }
         }
      }
   }

   return;
}