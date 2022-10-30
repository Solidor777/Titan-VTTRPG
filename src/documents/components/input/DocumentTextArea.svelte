<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import TextArea from "~/helpers/svelte-components/input/TextArea.svelte";

   // The value of the input
   export let value;

   export let disabled = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<TextArea
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
