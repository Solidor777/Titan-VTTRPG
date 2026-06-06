<script>
   import { getContext, setContext } from 'svelte';
   import EmbeddedDocument from '~/document/reactive/EmbeddedDocument.svelte.js';
   import warn from '~/helpers/utility-functions/Warn.js';

   /**
    * @typedef {object} EmbeddedDocumentProviderProps
    * @property {foundry.abstract.Document} doc - The live embedded document to provide to descendants.
    * @property {import('svelte').Snippet} [children] - Content rendered with the shadowed 'document' context.
    */

   /** @type {EmbeddedDocumentProviderProps} */
   const { doc, children } = $props();

   /** @type {Record<string, string>} Map of embedded document class names to parent collection names. */
   const COLLECTION_BY_DOCUMENT_NAME = {
      Item: 'items',
      ActiveEffect: 'effects',
   };

   // The provider captures its target document at init by design: instances in an {#each} MUST be keyed by
   // doc.id so a new id mounts a new provider (see .claude/skills/titan-codebase/references/conventions.md).
   /** @type {string|undefined} The parent collection holding the embedded document. */
   // svelte-ignore state_referenced_locally
   const collection = COLLECTION_BY_DOCUMENT_NAME[doc.documentName];
   if (!collection) {
      // svelte-ignore state_referenced_locally
      warn(`EmbeddedDocumentProvider received an unsupported document type (${doc.documentName}).`);
   }

   /** @type {object} The nearest ancestor document bridge (the value this provider shadows). */
   const parent = getContext('document');

   // Shadow 'document' for descendants only; 'sheetDocument' is intentionally never shadowed.
   // svelte-ignore state_referenced_locally
   setContext('document', new EmbeddedDocument(parent, collection, doc.id));
</script>

{@render children?.()}
