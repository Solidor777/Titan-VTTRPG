<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   const rarityOptions = [
      {
         label: localize("common"),
         value: "common",
      },
      {
         label: localize("uncommon"),
         value: "uncommon",
      },
      {
         label: localize("rare"),
         value: "rare",
      },
      {
         label: localize("unique"),
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
