<script>
   import { RESISTANCES } from '~/system/Resistances.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import ResistanceInput from '~/helpers/svelte-components/input/ResistanceInput.svelte';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether to allow None as an option. */
   export let allowNone = false;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** @type {string[]}  Options for the Select Svelte component. */
   const options = structuredClone(RESISTANCES);

   // Add none option if appropriate.
   if (allowNone) {
      options.push('none');
   }
</script>

<ResistanceInput resistance={value}>
   <Select
      bind:value
      {disabled}
      on:change
      {options}
      {tooltip}
   />
</ResistanceInput>

