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
         label: localize("armor"),
         value: "armor",
      },
      {
         label: localize("damage"),
         value: "damage",
      },
      {
         label: localize("healing"),
         value: "healing",
      },
      {
         label: localize("resolveRegain"),
         value: "resolveRegain",
      },
      {
         label: localize("woundRegain"),
         value: "woundRegain",
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

<Select {options} bind:value on:change {disabled} />
