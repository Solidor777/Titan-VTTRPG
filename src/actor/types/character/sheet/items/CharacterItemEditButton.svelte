<script>
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Collapsed object
   export let item = void 0;
</script>

<IconButton
   icon={"fas fa-pen-to-square"}
   on:click={() => {
      item.sheet.render(true);
   }}
/>
