<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   export let options = [
      {
         label: localize("body"),
         value: "body",
      },
      {
         label: localize("mind"),
         value: "mind",
      },
      {
         label: localize("soul"),
         value: "soul",
      },
   ];
</script>

<div class="attribute-select {value}" on:change>
   <Select {options} bind:value />
</div>

<style lang="scss">
   .attribute-select {
      &.body {
         --input-background-color: var(--body-color-bright);
      }

      &.mind {
         --input-background-color: var(--mind-color-bright);
      }

      &.soul {
         --input-background-color: var(--soul-color-bright);
      }
   }
</style>
