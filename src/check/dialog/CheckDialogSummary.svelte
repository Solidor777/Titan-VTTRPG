<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** The label for the summary. */
   export let label = void 0;

   /** The value to display. */
   export let value = void 0;

   /** The tooltipAction to display when the label is hovered. */
   export let fieldTooltip = void 0;

</script>

<!--Field-->
<div class="field" use:tooltipAction="{fieldTooltip}">

   <!--Label-->
   <div class="label">
      {label}
   </div>

   <!--Value-->
   <div class="value ">
      <div class="tag">
         {value}
      </div>
   </div>
</div>

<style lang="scss">
   .field {
      @include flex-row;
      @include flex-group-center;

      padding: var(--titan-padding-standard);
      width: 100%;

      .label {
         @include flex-group-right;
         @include border-right;

         width: 100%;
         font-weight: bold;
         padding-right: var(--titan-padding-large);
      }

      .value {
         width: 100%;

         .tag {
            @include border;
            @include tag;

            margin-left: var(--titan-padding-large);
         }
      }
   }
</style>
