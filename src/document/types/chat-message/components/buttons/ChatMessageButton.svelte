<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/Tooltip.js';

   /** @type boolean Whether this button is disabled. */
   export let disabled = false;

   /** @type boolean Tooltip for this button, if any. */
   export let tooltip = void 0;
</script>

<button on:click on:mousedown={preventDefault} {disabled} use:tooltipAction="{{content: tooltip}}">
   <slot/>
</button>

<style lang="scss">
   button {
      @include button;

      --button-border-radius: var(--button-chat-message-border-radius);
   }
</style>

