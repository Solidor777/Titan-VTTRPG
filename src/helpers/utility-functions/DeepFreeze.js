/**
 * Recursively freezes an object or array and every object and array inside it, so that none can be changed.
 * @param {object | []} data - The object or array to freeze.
 * @returns {object | []} The frozen object or array.
 */
export default function deepFreeze(data) {
   // If array, freeze every entry.
   if (Array.isArray(data)) {
      for (const entry of data) {
         deepFreeze(entry);
      }
   }

   // Otherwise, freeze every property on this object.
   else if (data !== null && typeof data === 'object') {
      for (const key in data) {
         if (Object.hasOwn(data, key)) {
            deepFreeze(data[key]);
         }
      }
   }

   return Object.freeze(data);
}
