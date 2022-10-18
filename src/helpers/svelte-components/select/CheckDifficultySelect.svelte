<script>
   import IntegerSelect from "~/helpers/svelte-components/select/IntegerSelect.svelte";

   // Value
   export let value = void 0;

   export let disabled = void 0;

   // Options
   const options = [2, 3, 4, 5, 6];
</script>

<IntegerSelect bind:value {options} {disabled} on:change />
