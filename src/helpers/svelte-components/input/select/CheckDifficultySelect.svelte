<script>
   import IntegerSelect from '~/helpers/svelte-components/input/select/NumberSelect.svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = void 0;

   /** @type number[] Options for the select. */
   const options = [2, 3, 4, 5, 6];
</script>

<IntegerSelect bind:value {disabled} on:change {options}/>
