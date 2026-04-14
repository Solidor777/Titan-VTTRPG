<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {string} The text to display for this element. */
   export let label = void 0;

   /** @type {string} The Icon to display for this Stat. */
   export let icon = void 0;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div
   class="tag"
   use:tooltipAction={tooltip}
>
   <!--Icon-->
   <i class={icon}/>

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
         margin-left: var(--titan-spacing-standard);
      }
   }

</style>
