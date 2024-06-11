<script>
   import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';

   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value of the input. */
   export let min = false;

   /** @type {number|boolean} The maximum value of the input. */
   export let max = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

</script>

<NumberInput
   bind:value
   {disabled}
   isInteger={true}
   {max}
   {min}
   on:change
/>
