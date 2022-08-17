<script>
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { getContext } from "svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Collapsed object
   export let itemId = void 0;
</script>

<IconButton icon={"fas fa-trash"} efx={ripple} on:click={application.deleteItem.bind(application, itemId)} />
