/**
 * Normalizes the polymorphic arguments passed to a Document sheet constructor. Foundry v14 constructs
 * `DocumentSheetV2` applications as `new Sheet({ document, ...options })` (a single options object), while TITAN
 * callers historically pass `(document, options)` positionally. This resolves either form to a consistent shape.
 * @param {foundry.abstract.Document | object} documentOrOptions - The Document, or an options object carrying it.
 * @param {object} [options={}] - Application options, when the Document is supplied positionally.
 * @returns {{ document: foundry.abstract.Document, options: object }} The resolved Document and merged options.
 */
export default function resolveDocumentSheetArguments(documentOrOptions, options = {}) {
   // Positional form: the first argument is the Document itself.
   if (documentOrOptions instanceof foundry.abstract.Document) {
      return {
         document: documentOrOptions,
         options: options,
      };
   }

   // Options-object form (Foundry v14): the document is a property of the first argument.
   /** @type {object} - The merged application options carrying the document. */
   const mergedOptions = foundry.utils.mergeObject(documentOrOptions ?? {}, options);
   return {
      document: mergedOptions.document,
      options: mergedOptions,
   };
}
