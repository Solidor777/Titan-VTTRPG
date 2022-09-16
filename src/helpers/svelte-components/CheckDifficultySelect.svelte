<script>
   import IntegerSelect from "~/helpers/svelte-components/IntegerSelect.svelte";

   // Value
   export let difficulty = void 0;

   export let disabled = void 0;

   // Options
   const options = [2, 3, 4, 5, 6];
</script>

<IntegerSelect bind:value={difficulty} {options} {disabled} />
