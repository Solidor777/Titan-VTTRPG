<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /** @type {number} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = void 0;

   /** @type {number[]} Options for the select. */
   const options = [
      1,
      2,
      3,
      4,
      5,
      6
   ];

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
   {options}
   {tooltip}
/>
