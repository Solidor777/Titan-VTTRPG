<script>
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type {number} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = void 0;

   /** @type {SelectOption<number>[]} Options for the select. */
   const options = [
      {
         value: 1,
         label: '1'
      },
      {
         value: 2,
         label: '2'
      },
      {
         value: 3,
         label: '3'
      },
      {
         value: 4,
         label: '4'
      },
      {
         value: 5,
         label: '5'
      },
      {
         value: 6,
         label: '6'
      },
   ];
</script>

<Select
   bind:value
   {disabled}
   on:change
   {options}
/>
