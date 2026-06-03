<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {
      REFLEXES_ICON,
      RESILIENCE_ICON,
      WILLPOWER_ICON,
   } from '~/system/Icons.js';
   import DocumentOwnerResistanceButton from '~/document/svelte-components/DocumentOwnerResistanceButton.svelte';
   import getResistanceCheckParametersTooltip from '~/helpers/utility-functions/GetResistanceCheckParametersTooltip.js';

   /**
    * @typedef {object} CharacterSheetResistanceCheckButtonProps
    * @property {string} resistance The Resistance that this component represents.
    */

   /** @type {CharacterSheetResistanceCheckButtonProps} */
   const { resistance } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {ResistanceCheckParameters} Resolved dice and modifiers for the resistance check this button rolls. */
   let checkParameters = $derived(
      document.data.system.getResistanceCheckParameters(
         document.data.system.initializeResistanceCheckOptions({ resistance: resistance }))
   );

   /** @type {string} Hover text describing the resistance and its check modifiers. */
   let tooltip = $derived(
      localize(`${checkParameters.resistance}.desc`) +
      getResistanceCheckParametersTooltip(checkParameters)
   );

   /** @type {string} Font-icon class chosen to represent this resistance. */
   const icon = (() => {
      switch (resistance) {
         case 'reflexes': {
            return REFLEXES_ICON;
         }
         case 'resilience': {
            return RESILIENCE_ICON;
         }
         default: {
            return WILLPOWER_ICON;
         }
      }
   })();
</script>

<DocumentOwnerResistanceButton
   onclick={() => document.data.system.requestResistanceCheck({resistance: resistance})}
   {resistance}
   tooltip={{ text: tooltip, localize: false }}>
   <div class="button-inner">
      <!--Icon-->
      <i class={icon}></i>

      <!--Label-->
      <div>
         {localize(resistance)}
      </div>

   </div>

</DocumentOwnerResistanceButton>

<style lang="scss">
   .button-inner {
      @include flex-row;
      @include flex-group-center;

      i {
         @include margin-right-standard;
      }
   }
</style>
