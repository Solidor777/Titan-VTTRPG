<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} DurationTagProps
    * @property {string} [type] - The duration type key (e.g. `'permanent'`, `'turnStart'`, `'turnEnd'`).
    * @property {number} [remaining] - The number of turns remaining; not shown for `'permanent'` type.
    * @property {string | TooltipAction} [tooltip] - The tooltip to display on hover, if any.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {DurationTagProps} */
   let { type = void 0, remaining = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<div class="tag" data-testid={testId} use:tooltipAction={tooltip}>
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
