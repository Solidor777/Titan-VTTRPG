<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import TextInput from "~/helpers/svelte-components/input/TextInput.svelte";

   // The value of the input
   export let value;

   export let disabled = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<TextInput
   bind:value
   disabled={disabled || !$document.isOwner}
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
         name: $document.name,
      });
   }}
/>
