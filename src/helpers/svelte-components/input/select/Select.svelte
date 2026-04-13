<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { createEventDispatcher } from 'svelte';

   /**
    * Object used to store data for an Option within a Select Svelte component.
    * @template T
    * @typedef {object} SelectOption
    * @property {T} value - The value for this option.
    * @property {string | number|TextData} [label] - The label to display for this option.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this option, if any.
    */

   /**
    * Options for the Select Svelte component.
    * @template T
    * @type {(SelectOption<T> | string | number)[]} */
   export let options = void 0;

   /** @type {*} - The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} - Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type EventDispatcher Dispatcher for component Events. */
   const eventDispatcher = createEventDispatcher();

   // Ensure the value is within range of the options available.
   $: if (options?.length > 0) {
      switch (typeof options[0]) {
         case 'number':
         case 'string': {
            if (!options.includes(value)) {
               value = options[0];
               eventDispatcher('change');
            }
            break;
         }
         case 'object': {
            if (!options.find(option => option.value === value)) {
               value = options[0].value;
               eventDispatcher('change');
            }
            break;
         }
         default: {
            break;
         }
      }
   }
</script>

<select
   bind:value
   {disabled}
   on:change={() => eventDispatcher('change')}
   use:tooltipAction={tooltip}
>
   {#each options as option}
      <option
         value={option.value ?? option}
         use:tooltipAction={option.tooltip}
      >
         <Text text={option.label ?? option.value ?? option}/>
      </option>
   {/each}
</select>

<style lang="scss">
   select {
      @include input;

      option {
         @include flex-group-left;

         background: var(--titan-input-background);
      }
   }
</style>
