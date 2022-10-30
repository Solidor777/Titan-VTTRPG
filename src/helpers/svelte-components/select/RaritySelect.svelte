<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // Value
   export let value = void 0;

   export let disabled = false;

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
   <Select options={rarityOptions} bind:value {disabled} />
</div>

<style lang="scss">
   .rarity-select {
      &.uncommon {
         --input-background: var(--uncommon-color);
      }

      &.rare {
         --input-background: var(--rare-color);
      }

      &.unique {
         --input-background: var(--unique-color);
      }
   }
</style>
