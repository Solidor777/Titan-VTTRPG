<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type String The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<input
   bind:value
   {disabled}
   on:change
   on:keyup
   use:tooltipAction={tooltip}
/>

<style lang="scss">
   input {
      @include input;
   }
</style>
