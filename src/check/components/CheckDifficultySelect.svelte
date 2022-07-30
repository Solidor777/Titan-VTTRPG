<script>
   import NumberSelect from "../../helpers/svelte-components/NumberSelect.svelte";

   // Value
   export let difficulty = void 0;

   // Options
   const options = [2, 3, 4, 5, 6];
</script>

<NumberSelect bind:value={difficulty} {options} />
