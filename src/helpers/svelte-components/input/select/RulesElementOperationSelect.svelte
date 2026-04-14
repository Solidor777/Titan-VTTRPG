<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { RULES_ELEMENT_OPERATIONS } from '~/system/RulesElementOperations.js';

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

<Select
   bind:value
   {disabled}
   on:change
   options={RULES_ELEMENT_OPERATIONS}
   {tooltip}
/>
