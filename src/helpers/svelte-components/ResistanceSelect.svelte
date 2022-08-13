<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   const resistanceOptions = [
      {
         label: localize("LOCAL.reflexes.label"),
         value: "reflexes",
      },
      {
         label: localize("LOCAL.resilience.label"),
         value: "resilience",
      },
      {
         label: localize("LOCAL.willpower.label"),
         value: "willpower",
      },
   ];
</script>

<div class="resistance-select {value}" on:change>
   <Select options={resistanceOptions} bind:value />
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
