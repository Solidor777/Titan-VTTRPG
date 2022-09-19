<script>
   import { getContext } from "svelte";
   import SkillSelect from "~/helpers/svelte-components/select/SkillSelect.svelte";

   // The value of the input
   export let value;

   // Whether to allow none
   export let allowNone = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<SkillSelect
   {allowNone}
   bind:value
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
