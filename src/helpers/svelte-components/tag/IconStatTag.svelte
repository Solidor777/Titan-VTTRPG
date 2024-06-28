<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string The Label to display for this element. */
   export let label = void 0;

   /** @type {string|number} The Value of this Stat. */
   export let value = void 0;

   /** @type string The Icon to display for this Stat. */
   export let icon = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="tag" use:tooltipAction={tooltip}>
   <!--Icon-->
   <i class={icon}/>

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
         padding-right: var(--titan-padding-standard);
         margin: 0 var(--titan-padding-standard);
      }
   }
</style>
