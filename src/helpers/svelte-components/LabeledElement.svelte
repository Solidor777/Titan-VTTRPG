<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';
   import Label from '~/helpers/svelte-components/label/Label.svelte';

   /** @type {string} Label to display. */
   export let label = void 0;

   /** @type {string} Optional Icon to display. */
   export let icon = void 0;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div
   class="labeled-element"
   use:tooltipAction={tooltip}
>
   <!--Label-->
   <div class="label">
      {#if (icon)}
         <IconLabel
            {icon}
            {label}
         />
      {:else}
         <Label>
            {label}
         </Label>
      {/if}
   </div>

   <!--Element-->
   <div class="element">
      <slot></slot>
   </div>
</div>


<style lang="scss">
   .labeled-element {
      @include flex-row;
      @include flex-group-left;

      .element {
         flex-grow: 1;
         margin-left: var(--titan-spacing-standard);
      }
   }
</style>
