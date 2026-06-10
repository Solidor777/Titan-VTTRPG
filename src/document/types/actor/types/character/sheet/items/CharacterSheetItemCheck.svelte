<script>
   import { getContext } from 'svelte';
   import CheckRow from '~/document/svelte-components/check/CheckRow.svelte';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * @typedef {object} CharacterSheetItemCheckProps
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetItemCheckProps} */
   const { checkIdx = undefined } = $props();

   // The id and index are fixed for this component's lifetime (provider instances are id-keyed); the
   // checkOptions object is intentionally built once and reused across derived reads and event handlers.
   // svelte-ignore state_referenced_locally
   /** @type {ItemCheckOptions} Options for the check. */
   const checkOptions = {
      itemId: document.doc._id,
      checkIdx: checkIdx,
   };

   /** @type {ItemCheckParameters | undefined} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      if (document.data?.system.check.length > checkIdx) {

         // Update the check parameters.
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions)
         );
      }
      return undefined;
   });

   /**
    * Rolls the Item Check.
    */
   function rollItemCheck() {
      sheetDocument.data.system.requestItemCheck(checkOptions);
   }
</script>

<!--Shared check-row presentation; this component only builds the options-->
<CheckRow
   {checkParameters}
   {checkIdx}
   onRoll={rollItemCheck}
/>
