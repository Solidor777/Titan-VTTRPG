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
      height: var(--titan-input-height);
      min-height: var(--titan-input-height);
      font-size: var(--titan-input-height);
      padding: 0;
      margin: 0;
      border: none;

      &:not(:disabled) {
         background: var(--titan-input-font-color);
         color: var(--titan-input-background);


         &:hover {
            cursor: pointer;
            color: var(--titan-input-hover-background);
         }
      }

      &:disabled {
         cursor: default;
         color: var(--titan-input-disabled-background);
      }

   }
</style>
