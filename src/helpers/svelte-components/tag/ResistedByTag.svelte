<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';

   /** @type {{ resistance?: string, tooltip?: string | TooltipAction }} Props for this component. */
   let { resistance = void 0, tooltip = void 0 } = $props();
</script>

<ResistanceTag {resistance} {tooltip}>
   <!--Label-->
   <div class="label">
      {localize('resistedBy')}
   </div>

   <!--Resistance-->
   <div class="stat">
      {localize(resistance)}
   </div>
</ResistanceTag>

<style lang="scss">
   .label {
      @include border-right;

      font-weight: bold;

      @include padding-right-standard;
      @include margin-right-standard;
   }
</style>
