<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;
</script>

<textarea
   bind:value
   {disabled}
   on:change
   use:tooltipAction={tooltip}
/>

<style lang="scss">
   textarea {
      @include input;
      @include flex-row;
      @include flex-group-left;

      flex-wrap: wrap;
      width: 100%;
      height: 100%;
   }
</style>
