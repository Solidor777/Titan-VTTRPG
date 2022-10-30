<script>
   import { getContext } from "svelte";
   import ResistanceSelect from "~/helpers/svelte-components/select/ResistanceSelect.svelte";

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<ResistanceSelect
   {allowNone}
   disabled={disabled || !$document.isOwner}
   bind:value
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
