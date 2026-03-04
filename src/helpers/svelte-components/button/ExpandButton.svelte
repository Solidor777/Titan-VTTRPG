<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { COLLAPSED_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   /** @type boolean Whether the button should currently be expanded. */
   export let expanded = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<button
   {disabled}
   on:click={() => expanded = !expanded}
   on:mousedown={preventDefault}
   use:tooltipAction={tooltip}>
   <i class={expanded ? EXPANDED_ICON : COLLAPSED_ICON}/>
</button>

<style lang="scss">
   button {
      @include button;

      --titan-button-font-size: var(--titan-expand-button-font-size);
      --titan-button-line-height: var(--titan-expand-button-line-height);
   }
</style>

