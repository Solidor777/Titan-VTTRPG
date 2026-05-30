<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import createAttributeCheckLabel from '~/helpers/utility-functions/CreateAttributeCheckLabel.js';

   /** @type {{ attribute?: string, skill?: string, tooltip?: string | TooltipAction }} Props for this component. */
   let { attribute = void 0, skill = void 0, tooltip = void 0 } = $props();
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
         @include separator-left;
      }

      &.main {
         font-weight: bold;
      }
   }

</style>
