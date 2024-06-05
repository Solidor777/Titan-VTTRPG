<script>
   import IntegerSelect from '~/helpers/svelte-components/select/NumberSelect.svelte';

   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether the input is currently disabled. */
   export let disabled = void 0;

   // Options
   const options = [2, 3, 4, 5, 6];
</script>

<IntegerSelect bind:value {disabled} on:change {options}/>
