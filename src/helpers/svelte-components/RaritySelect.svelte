<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   const rarityOptions = [
      {
         label: localize("LOCAL.common.label"),
         value: "common",
      },
      {
         label: localize("LOCAL.uncommon.label"),
         value: "uncommon",
      },
      {
         label: localize("LOCAL.rare.label"),
         value: "rare",
      },
      {
         label: localize("LOCAL.unique.label"),
         value: "unique",
      },
   ];
</script>

<div class="rarity-select {value}" on:change>
   <Select options={rarityOptions} bind:value />
</div>

<style lang="scss">
   .rarity-select {
      &.uncommon {
         --input-background-color: var(--uncommon-color-bright);
      }

      &.rare {
         --input-background-color: var(--rare-color-bright);
      }

      &.unique {
         --input-background-color: var(--unique-color-bright);
      }
   }
</style>
