<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

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

   // Add none option
   if (allowNone) {
      options.push({
         label: localize("none"),
         value: "none",
      });
   }
</script>

<div class="resistance-select {value}" on:change>
   <Select {options} bind:value {disabled} />
</div>

<style lang="scss">
   .resistance-select {
      &.reflexes {
         --input-background: var(--reflexes-color);
      }

      &.resilience {
         --input-background: var(--resilience-color);
      }

      &.willpower {
         --input-background: var(--willpower-color);
      }
   }
</style>
