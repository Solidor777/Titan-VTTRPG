<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} IconTagProps
    * @property {string} [label] - The text label to display.
    * @property {string} [icon] - The CSS icon class to apply to the inner `<i>` element.
    * @property {string | TooltipAction} [tooltip] - The tooltip to display on hover, if any.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {IconTagProps} */
   let { label = void 0, icon = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<div
   class="tag"
   data-testid={testId}
   use:tooltipAction={tooltip}
>
   <!--Icon-->
   <i class={icon}></i>

   <!--Label-->
   <div class="label">
      {label}
   </div>
</div>

<style lang="scss">
   .tag {
      @include tag;

      .label {
         font-weight: bold;

         @include margin-left-standard;
      }
   }

</style>
