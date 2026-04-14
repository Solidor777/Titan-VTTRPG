<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REFLEXES_ICON, RESILIENCE_ICON, WILLPOWER_ICON } from '~/system/Icons.js';
   import DocumentOwnerResistanceButton from '~/document/svelte-components/DocumentOwnerResistanceButton.svelte';
   import getResistanceCheckParametersTooltip from '~/helpers/utility-functions/GetResistanceCheckParametersTooltip.js';

   /** @type {string} The Attribute that this component represents. */
   export let resistance;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {ResistanceCheckParameters} Calculated check parameters. */
   let checkParameters = $document.system.getResistanceCheckParameters(
      $document.system.initializeResistanceCheckOptions({ resistance: resistance }));

   /** @type {string} Calculated tooltip. */
   let tooltip = localize(`${checkParameters.resistance}.desc`);
   tooltip += getResistanceCheckParametersTooltip(checkParameters);

   /** @type {string} Calculated icon. */
   let icon;
   switch (resistance) {
      case 'reflexes': {
         icon = REFLEXES_ICON;
         break;
      }
      case 'resilience': {
         icon = RESILIENCE_ICON;
         break;
      }
      default: {
         icon = WILLPOWER_ICON;
         break;
      }
   }

   // Update data in response to changes.
   $: {
      // Update Check Parameters.
      checkParameters = $document.system.getResistanceCheckParameters(
         $document.system.initializeResistanceCheckOptions({ resistance: resistance }));

      // Update Tooltip.
      tooltip = localize(`${checkParameters.resistance}.desc`);
      tooltip += getResistanceCheckParametersTooltip(checkParameters);
   }
</script>

<DocumentOwnerResistanceButton
   on:click={() => $document.system.requestResistanceCheck({resistance: resistance})}
   {resistance}
   {tooltip}>
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
         margin-right: var(--titan-spacing-standard);
      }
   }
</style>
