<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

</script>

<div class="labeled-input" use:tooltipAction={tooltip}>
   <!--Label Slot-->
   <div class="label">
      <slot name="label"></slot>
   </div>

   <!--Input Slot-->
   <div class="input">
      <slot name="input"></slot>
   </div>
</div>


<style lang="scss">
   .labeled-input {
      @include flex-row;
      @include flex-group-left;

      width: 100%;

      .label {
         font-weight: bold;
      }

      .input {
         flex-grow: 1;
         margin-left: var(--titan-padding-standard);
      }
   }
</style>
