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
    * Builds the Check Options for this effect check, resolving fresh roll data from the effect.
    * The shared item-check engine cannot resolve an effect from the item collection, so the
    * effect's roll data is supplied directly via the engine's itemRollData passthrough branch.
    * @returns {ItemCheckOptions | undefined} The check options, or undefined if the effect or check is invalid.
    */
   function getCheckOptions() {
      // Resolve the live effect through the embedded bridge and ensure the check index is valid.
      const effect = document.data;
      if (effect?.system.check.length > checkIdx) {
         return {
            itemRollData: effect.getRollData(),
            checkIdx: checkIdx,
         };
      }
      return undefined;
   }

   /** @type {ItemCheckParameters | undefined} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Build the options from current effect roll data, then calculate the display parameters.
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
    */
   function rollEffectCheck() {
      // Build options fresh at roll time so the roll captures the effect's current state.
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
