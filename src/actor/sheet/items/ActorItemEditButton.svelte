<script>
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Collapsed object
   export let item = void 0;
</script>

<IconButton
   icon={"fas fa-pen-to-square"}
   efx={ripple}
   on:click={() => {
      item.sheet.render(true);
   }}
/>
