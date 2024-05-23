/**
 * Recursively freezes all properties of an object or array, so that they can no longer be changes.
 * @param {object|[]} data - The object or array to freeze.
 * @returns {object|[]} The frozen object or array.
 */
export default function deepFreeze(data) {
   // If array, freeze every entry
   if (Array.isArray(data)) {
      for (const entry in data) {
         deepFreeze(entry);
      }
   }

   // Otherwise, freeze every property on this object
   else if (typeof value === 'object') {
      for (const key in data) {
         if (Object.prototype.hasOwn(data, key)) {
            deepFreeze(data[key]);
         }
      }
   }
   
   return Object.freeze(data);
}
