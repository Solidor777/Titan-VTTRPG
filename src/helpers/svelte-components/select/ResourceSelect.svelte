<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Options
   const resourceOptions = [
      {
         label: localize("resolve"),
         value: "resolve",
      },
      {
         label: localize("stamina"),
         value: "stamina",
      },
      {
         label: localize("wounds"),
         value: "wounds",
      },
   ];

   // Add none option
   if (allowNone) {
      resourceOptions.push({
         label: localize("none"),
         value: "none",
      });
   }
</script>

<Select options={resourceOptions} bind:value on:change {disabled} />
