<script>
   import { getContext } from "svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Collapsed object
   export let itemId = void 0;
</script>

<IconButton
   icon={"fas fa-trash"}
   on:click={() => {
      application.deleteItem(itemId, false);
   }}
/>
