<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   const attributeOptions = [
      {
         label: localize("LOCAL.body.label"),
         value: "body",
      },
      {
         label: localize("LOCAL.mind.label"),
         value: "mind",
      },
      {
         label: localize("LOCAL.soul.label"),
         value: "soul",
      },
   ];
</script>

<div class="attribute-select {value}">
   <Select options={attributeOptions} bind:value />
</div>

<style lang="scss">
   .attribute-select {
      &.body {
         --color-background-input: var(--color-body-bright);
      }

      &.mind {
         --color-background-input: var(--color-mind-bright);
      }

      &.soul {
         --color-background-input: var(--color-soul-bright);
      }
   }
</style>
