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
      background: var(--titan-input-font-color);
      border-color: var(--titan-input-border-color);
      border-style: var(--titan-input-border-style);
      border-width: var(--titan-input-border-width);
      box-sizing: border-box;
      color: var(--titan-input-background);
      font-size: var(--titan-input-height);
      height: var(--titan-input-height);
      margin: 0;
      min-height: var(--titan-input-height);
      min-width: var(--titan-input-min-height);
      padding: 0;
      width: var(--titan-input-min-height);

      &:disabled {
         --titan-input-background: var(--titan-input-disabled-background);
         --titan-input-border-color: var(--titan-input-disabled-border-color);
         --titan-input-font-color: var(--titan-input-disabled-font-color);
      }

      &:not(:disabled) {
         &:hover {
            --titan-input-border-color: var(--titan-input-hover-border-color);
            --titan-input-font-color: var(--titan-input-hover-font-color);
            --titan-input-background: var(--titan-input-hover-background);
         }
      }
   }
</style>
