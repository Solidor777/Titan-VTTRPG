<script>
   import { getContext } from "svelte";
   import ResistanceSelect from "~/helpers/svelte-components/ResistanceSelect.svelte";

   // The value of the input
   export let value = void 0;

   // The options for the select
   export let options = [
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

   // Document reference
   const document = getContext("DocumentSheetObject");

   let data;
   $: {
      data = {
         img: $document.img,
         system: $document.system,
         flags: $document.flags,
         name: $document.name,
      };
   }
</script>

<ResistanceSelect
   bind:value
   {options}
   on:change={async () => {
      $document.update(data);
   }}
/>
