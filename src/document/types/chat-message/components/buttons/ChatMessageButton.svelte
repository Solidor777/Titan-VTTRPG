<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/Tooltip.js';

   /** @type boolean Whether this button is disabled. */
   export let disabled = false;

   /** @type boolean Tooltip for this button, if any. */
   export let tooltip = void 0;
</script>

<button {disabled} on:click on:mousedown={preventDefault} use:tooltipAction="{{content: tooltip}}">
   <slot/>
</button>

<style lang="scss">
   button {
      @include button;

      --titan-button-border-radius: var(--titan-button-chat-message-border-radius);
   }
</style>

