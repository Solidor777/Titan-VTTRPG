<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   const rangeTypeOptions = [
      {
         label: localize("LOCAL.melee.label"),
         value: "melee",
      },
      {
         label: localize("LOCAL.ranged.label"),
         value: "ranged",
      },
   ];
</script>

<div class="attribute-select {value}" on:change>
   <Select options={rangeTypeOptions} bind:value />
</div>
