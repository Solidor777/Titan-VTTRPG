<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import createAttributeCheckLabel from '~/helpers/utility-functions/CreateAttributeCheckLabel.js';

   /** @type string The Attribute to use for the Check. */
   export let attribute = void 0;

   /** @type string The Skill to use for the Check. */
   export let skill = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<!--Check label-->
<AttributeTag {attribute} {tooltip}>
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
         @include border-left;

         margin-left: var(--titan-padding-standard);
         padding-left: var(--titan-padding-standard);
      }

      &.main {
         font-weight: bold;
      }
   }

</style>
