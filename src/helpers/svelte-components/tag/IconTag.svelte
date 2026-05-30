<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {{ label?: string, icon?: string, tooltip?: string | TooltipAction }} Props for this component. */
   let { label = void 0, icon = void 0, tooltip = void 0 } = $props();
</script>

<div
   class="tag"
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
