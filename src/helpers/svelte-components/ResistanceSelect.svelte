<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   export let options = [
      {
         label: localize("reflexes"),
         value: "reflexes",
      },
      {
         label: localize("resilience"),
         value: "resilience",
      },
      {
         label: localize("willpower"),
         value: "willpower",
      },
   ];
</script>

<div class="resistance-select {value}" on:change>
   <Select {options} bind:value />
</div>

<style lang="scss">
   .resistance-select {
      &.reflexes {
         --input-background-color: var(--reflexes-color-bright);
      }

      &.resilience {
         --input-background-color: var(--resilience-color-bright);
      }

      &.willpower {
         --input-background-color: var(--willpower-color-bright);
      }
   }
</style>
