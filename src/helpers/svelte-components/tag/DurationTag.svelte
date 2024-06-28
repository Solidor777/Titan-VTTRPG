<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string The Duration unit type (permanent, initiative, turnStart, turnEnd, or custom).*/
   export let type = void 0;

   /** @type number The remaining Duration units, if any.*/
   export let remaining = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
   void 0;
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
         @include border-left;

         padding-left: var(--titan-padding-standard);
         margin-left: var(--titan-padding-standard);
      }
   }
</style>
