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

   /** @type {AttributeCheckParameters} Resolved dice and modifiers for the attribute check this button rolls. */
   let checkParameters = $derived(
      document.data.system.getAttributeCheckParameters(
         document.data.system.initializeAttributeCheckOptions({ attribute: attribute }))
   );

   /** @type {string} Hover text describing the attribute and its check modifiers. */
   let tooltip = $derived(
      localize(`${checkParameters.attribute}.desc`) +
      getAttributeCheckParametersTooltip(checkParameters)
   );

   // attribute is a fixed prop for this button's lifetime; capturing once for the icon is correct.
   // svelte-ignore state_referenced_locally
   /** @type {string} Font-icon class chosen to represent this attribute. */
   const icon = getIcon(attribute);
</script>

<DocumentOwnerAttributeButton
   {attribute}
   onclick={() => document.data.system.requestAttributeCheck({attribute: attribute})}
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
