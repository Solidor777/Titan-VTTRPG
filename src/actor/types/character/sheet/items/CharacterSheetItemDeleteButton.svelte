<script>
   import { getContext } from "svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Reference to the document
   const document = getContext("DocumentStore");

   // Collapsed object
   export let itemId = void 0;
</script>

<IconButton
   icon={"fas fa-trash"}
   on:click={() => {
      $document.deleteItem(itemId, false);
   }}
/>
