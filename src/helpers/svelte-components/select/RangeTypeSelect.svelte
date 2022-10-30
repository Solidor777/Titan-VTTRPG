<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // Value
   export let value = void 0;

   export let disabled = false;

   // Options
   const rangeTypeOptions = [
      {
         label: localize("melee"),
         value: "melee",
      },
      {
         label: localize("ranged"),
         value: "ranged",
      },
   ];
</script>

<div class="attribute-select {value}" on:change>
   <Select options={rangeTypeOptions} bind:value {disabled} />
</div>
