/**
 * Helper function for svelte elements that need to force an update on a system document.
 * @param {Document} document - The Document to be updated.
 * @param {boolean} disabled - Whether the element is currently disabled.
 * @param {string} path - Path to the data that should be updated.
 * @param {*} value - Value to be updated.
 */
export default async function updateDocumentPathData(document, disabled, path, value) {
   if (!disabled && document?.isOwner) {
      const updateData = {};
      updateData[path] = value;
      await document.update(updateData);
   }
}
