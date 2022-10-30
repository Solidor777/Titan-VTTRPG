<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Options
   const options = [
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

   // Add none option
   if (allowNone) {
      skillOptions.push({
         label: localize("none"),
         value: "none",
      });
   }
</script>

<div class="attribute-select {value}" on:change>
   <Select {options} bind:value {disabled} />
</div>

<style lang="scss">
   .attribute-select {
      &.body {
         --input-background: var(--body-color);
      }

      &.mind {
         --input-background: var(--mind-color);
      }

      &.soul {
         --input-background: var(--soul-color);
      }
   }
</style>
