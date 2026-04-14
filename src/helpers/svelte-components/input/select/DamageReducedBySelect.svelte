<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {boolean} Whether to allow Resistance Check as an option */
   export let allowResistanceCheck = void 0;

   /** @type {boolean} Whether to allow Opposed Check as an option */
   export let allowOpposedCheck = void 0;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** @type {string[]} Options for the Select Svelte component. */
   const options = ['none'];

   // Add Resistance Check if appropriate.
   if (allowResistanceCheck) {
      options.push('resistanceCheck');
   }

   // Add Opposed Check if appropriate.
   if (allowOpposedCheck) {
      options.push('opposedCheck');
   }
</script>

<Select
   bind:value
   {disabled}
   on:change
   {options}
   {tooltip}
/>
