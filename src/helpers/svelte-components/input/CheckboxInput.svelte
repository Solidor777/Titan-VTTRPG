<script>
   import { createEventDispatcher } from 'svelte';
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {EventDispatcher} Dispatcher for component Events. */
   const eventDispatcher = createEventDispatcher();

   /** @type {boolean} The boolean value to bind to. */
   export let value;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** Toggles the value and broadcasts the change event. */
   function onClick() {
      value = !value;
      eventDispatcher('change');
   }
</script>

<button
   {disabled}
   on:click={onClick}
   on:mousedown={preventDefault}
   use:tooltipAction={tooltip}>
   {#if value === true}
      <i class="fas fa-check"/>
   {/if}

</button>

<style lang="scss">
   button {
      @include input;

      background: radial-gradient(var(--titan-input-background));
      height: var(--titan-input-height);
      margin: 0;
      min-height: var(--titan-input-height);
      min-width: var(--titan-input-height);
      padding: 0;
      width: var(--titan-input-height);
   }
</style>
