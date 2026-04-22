<script>
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentOwnerAttributeButton from '~/document/svelte-components/DocumentOwnerAttributeButton.svelte';
   import { getIcon } from '~/system/Icons.js';

   /** @type {string} The Attribute that this component represents. */
   export let attribute;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {AttributeCheckParameters} Calculated check parameters. */
   let checkParameters = $document.system.getAttributeCheckParameters(
      $document.system.initializeAttributeCheckOptions({ attribute: attribute }));

   /** @type {string} Calculated tooltip. */
   let tooltip = localize(`${checkParameters.attribute}.desc`);
   tooltip += getAttributeCheckParametersTooltip(checkParameters);

   /** @type {string} Calculated icon. */
   let icon = getIcon(attribute);

   // Update data in response to changes.
   $: {
      // Update Check Parameters.
      checkParameters = $document.system.getAttributeCheckParameters(
         $document.system.initializeAttributeCheckOptions({ attribute: attribute }));

      // Update Tooltip.
      tooltip = localize(`${checkParameters.attribute}.desc`);
      tooltip += getAttributeCheckParametersTooltip(checkParameters);
   }
</script>

<DocumentOwnerAttributeButton
   {attribute}
   on:click={() => $document.system.requestAttributeCheck({attribute: attribute})}
   {tooltip}>
   <div class="button-inner">
      <!--Icon-->
      <i class={icon}></i>

      <!--Label-->
      <div>
         {localize(attribute)}
      </div>

   </div>

</DocumentOwnerAttributeButton>

<style lang="scss">
   .button-inner {
      @include flex-row;
      @include flex-group-center;

      i {
         @include margin-right-standard;
      }
   }
</style>
