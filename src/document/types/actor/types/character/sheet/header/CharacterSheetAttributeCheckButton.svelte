<script>
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentOwnerAttributeButton from '~/document/svelte-components/DocumentOwnerAttributeButton.svelte';
   import { getIcon } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetAttributeCheckButtonProps
    * @property {string} attribute The Attribute that this component represents.
    */

   /** @type {CharacterSheetAttributeCheckButtonProps} */
   const { attribute } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {AttributeCheckParameters} Calculated check parameters. */
   let checkParameters = $derived(
      $document.system.getAttributeCheckParameters(
         $document.system.initializeAttributeCheckOptions({ attribute: attribute }))
   );

   /** @type {string} Calculated tooltip. */
   let tooltip = $derived(
      localize(`${checkParameters.attribute}.desc`) +
      getAttributeCheckParametersTooltip(checkParameters)
   );

   /** @type {string} Calculated icon. */
   const icon = getIcon(attribute);
</script>

<DocumentOwnerAttributeButton
   {attribute}
   onclick={() => $document.system.requestAttributeCheck({attribute: attribute})}
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
