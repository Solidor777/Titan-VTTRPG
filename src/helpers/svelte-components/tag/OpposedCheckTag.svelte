<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import createAttributeCheckLabel from '~/helpers/utility-functions/CreateAttributeCheckLabel.js';

   /**
    * @typedef {object} OpposedCheckTagProps
    * @property {string} [attribute] - The Attribute used in the opposed check.
    * @property {string} [skill] - The Skill used in the opposed check.
    * @property {string | TooltipAction} [tooltip] - The tooltip to display on hover, if any.
    * @property {string} [testId] - Optional test identifier forwarded to the root element of AttributeTag.
    */

   /** @type {OpposedCheckTagProps} */
   let { attribute = void 0, skill = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<!--Check label-->
<AttributeTag {attribute} {tooltip} {testId}>
   <!--Label-->
   <div class="label main">
      {localize('opposedCheck')}
   </div>

   <!--Skill & Attribute-->
   <div class="label">
      {createAttributeCheckLabel(attribute, skill)}
   </div>
</AttributeTag>
<style lang="scss">

   .label {
      @include flex-row;
      @include flex-group-center;

      &:not(:first-child) {
         @include separator-left;
      }

      &.main {
         font-weight: bold;
      }
   }

</style>
