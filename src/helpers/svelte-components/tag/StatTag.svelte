<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} StatTagProps
    * Props for this component.
    * @property {string} [label] - The text to display for this element.
    * @property {string | number} [value] - The Value of this Stat.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {StatTagProps} */
   let { label = void 0, value = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<div
   class="tag"
   data-testid={testId}
   use:tooltipAction={tooltip}
>
   <!--Label-->
   <div class="label">
      {label}
   </div>

   <!--Value-->
   <div class="value">
      {value}
   </div>
</div>

<style lang="scss">
   .tag {
      @include tag;

      .label {
         @include border-right;

         font-weight: bold;

         @include padding-right-standard;

         margin: 0 var(--titan-spacing-standard);
      }
   }
</style>
