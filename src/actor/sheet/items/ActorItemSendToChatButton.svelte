<script>
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Collapsed object
   export let item = void 0;
</script>

<IconButton
   icon={"fas fa-comment"}
   efx={ripple}
   on:click={async () => {
      await item.sendToChat();
   }}
/>
