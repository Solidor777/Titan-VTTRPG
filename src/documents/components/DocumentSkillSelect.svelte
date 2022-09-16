<script>
   import SkillSelect from "~/helpers/svelte-components/SkillSelect.svelte";
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   // Document reference
   const document = getContext("DocumentStore");

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

<SkillSelect
   bind:value
   on:change={async () => {
      $document.update(data);
   }}
/>
