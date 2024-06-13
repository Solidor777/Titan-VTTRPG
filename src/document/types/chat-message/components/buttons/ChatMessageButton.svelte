<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type boolean Whether this button is disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<button {disabled} on:click on:mousedown={preventDefault} use:tooltipAction={tooltip}>
   <slot/>
</button>

<style lang="scss">
   button {
      @include button;

      --titan-button-border-radius: var(--titan-button-chat-message-border-radius);
   }
</style>

