<script>
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';

   /** The label for the summary. */
   export let label = void 0;

   /** The value to display. */
   export let value = void 0;

   /** The tooltip to display when the label is hovered. */
   export let fieldTooltip = void 0;

</script>

<!--Field-->
<div class="field" use:tooltip={{content: fieldTooltip ?? ''}}>

   <!--Label-->
   <div class="label">
      {label}
   </div>

   <!--Input-->
   <div class="value">
      <div class="tag">
         {value}
      </div>
   </div>
</div>


<style lang="scss">
   .field {
      @include flex-row;
      @include flex-group-center;

      padding: var(--padding-standard);
      width: 100%;

      .label {
         @include flex-group-right;
         @include border-right;

         width: 100%;
         font-weight: bold;
         padding-right: var(--padding-large);
      }

      .value {
         width: 100%;

         .tag {
            @include border;
            @include label;

            margin-left: var(--padding-large);
         }
      }
   }
</style>
