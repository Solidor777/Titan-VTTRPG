<script>
   import { getContext } from 'svelte';
   import CastingCheckTags from '~/document/svelte-components/check/CastingCheckTags.svelte';

   /** @type {object} The embedded spell bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   // The item id is fixed for this component's lifetime (provider instances are id-keyed); capturing
   // once in checkOptions is intentional.
   /** @type {CastingCheckOptions} Base options for the Casting Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {CastingCheckParameters} Resolved dice and modifiers for the spell's casting check. */
   let checkParameters = $derived.by(() => {

      // Ensure the item is still valid.
      if (document.data) {

         // Update the parameters.
         return sheetDocument.data.system.getCastingCheckParameters(
            sheetDocument.data.system.initializeCastingCheckOptions(checkOptions)
         );
      }
      return undefined;
   });
</script>

<!--Shared casting-check tags, rendering the actor-resolved parameters (incl. dice/training/expertise)-->
<CastingCheckTags parameters={checkParameters}/>
