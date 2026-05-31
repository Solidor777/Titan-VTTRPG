/**
 * Helper function for svelte elements that need to force an update on a system document.
 * @param {Document} document - The document to be updated.
 * @param {boolean} disabled - Whether the element is currently disabled.
 * @returns {Promise<void>} Resolves once the document re-save completes, or immediately if skipped.
 */
export default async function refreshSystemDocument(document, disabled) {
   if (!disabled && document?.isOwner) {
      return await document.update({
         system: structuredClone(document.system),
         flags: structuredClone(document.flags)
      });
   }
}
