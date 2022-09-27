<script>
   import { getContext } from "svelte";
   import CheckDifficultySelect from "~/helpers/svelte-components/select/CheckDifficultySelect.svelte";

   // The value of the input
   export let value = void 0;

   export let disabled = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<CheckDifficultySelect
   bind:value
   {disabled}
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
