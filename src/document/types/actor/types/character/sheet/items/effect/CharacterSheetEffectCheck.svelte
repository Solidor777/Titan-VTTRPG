<script>
   import { getContext } from 'svelte';
   import CheckRow from '~/document/svelte-components/check/CheckRow.svelte';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * @typedef {object} CharacterSheetEffectCheckProps
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetEffectCheckProps} */
   const { checkIdx = undefined } = $props();

   /**
    * Builds the Check Options for this effect check. The effect ID names the source, so the shared item-check engine
    * reads the live effect from the Actor's applicable effects: an open check dialog follows edits to the effect and
    * closes when it is deleted.
    * @returns {ItemCheckOptions | undefined} The check options, or undefined if the effect or check is invalid.
    */
   function getCheckOptions() {
      // Resolve the live effect through the embedded bridge and ensure the check index is valid.
      const effect = document.data;
      if (effect?.system.check.length > checkIdx) {
         return {
            checkIdx: checkIdx,
            effectId: effect.id,
         };
      }
      return undefined;
   }

   /** @type {ItemCheckParameters | undefined} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Name the effect by ID (the engine reads the live effect), then calculate the display parameters.
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /**
    * Rolls the effect's Check via the shared item-check engine.
    * @returns {void}
    */
   function rollEffectCheck() {
      // Request the check by effect ID; the engine and any open dialog read the live effect.
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         sheetDocument.data.system.requestItemCheck(checkOptions);
      }
   }
</script>

<!--Shared check-row presentation; this component only builds the options-->
<CheckRow
   {checkParameters}
   {checkIdx}
   onRoll={rollEffectCheck}
/>
