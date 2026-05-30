<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {{ type?: string, remaining?: number, tooltip?: string | TooltipAction }} Props for this component. */
   let { type = void 0, remaining = void 0, tooltip = void 0 } = $props();
</script>

<div class="tag" use:tooltipAction={tooltip}>
   <!--Label-->
   <div class="label">
      {localize('duration')}
   </div>

   <!--Type-->
   <div class="value">
      {localize(type)}
   </div>

   <!--Remaining-->
   {#if type !== 'permanent'}
      <div class="value">
         {remaining}
      </div>
   {/if}
</div>

<style lang="scss">
   .tag {
      @include tag;

      .label {
         font-weight: bold;
      }

      .value {
         @include separator-left;
      }
   }
</style>
