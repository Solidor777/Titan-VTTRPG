<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Options
   const ratingOptions = [
      {
         label: localize("awareness"),
         value: "awareness",
      },
      {
         label: localize("defense"),
         value: "defense",
      },
      {
         label: localize("melee"),
         value: "melee",
      },
      {
         label: localize("accuracy"),
         value: "accuracy",
      },
      {
         label: localize("initiative"),
         value: "initiative",
      },
   ];

   // Add none option
   if (allowNone) {
      ratingOptions.push({
         label: localize("none"),
         value: "none",
      });
   }
</script>

<Select options={ratingOptions} bind:value on:change {disabled} />
