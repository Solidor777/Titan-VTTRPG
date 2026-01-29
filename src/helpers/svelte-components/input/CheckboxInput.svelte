<script>
   import { createEventDispatcher } from 'svelte';
   import { CHECKED_ICON, UNCHECKED_ICON } from '~/system/Icons.js';
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type EventDispatcher Dispatcher for component Events. */
   const eventDispatcher = createEventDispatcher();

   /** @type boolean The value that this input should modify. */
   export let value;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
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
   <i class={value === true ? CHECKED_ICON : UNCHECKED_ICON}/>
</button>

<style lang="scss">
   button {
      height: var(--titan-button-font-size);
      min-height: var(--titan-button-font-size);
      padding: 0;
      margin: 0;
      border: none;
      background: var(--titan-button-font-color);
      color: var(--titan-button-background);

      &:disabled {
         cursor: default;
         color: var(--titan-button-background-disabled);
      }

      &:hover {
         &:not(:disabled) {
            cursor: pointer;
            color: var(--titan-button-background-hover);
         }
      }
   }
</style>
