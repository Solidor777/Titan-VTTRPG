<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   const document = getContext("DocumentStore");
</script>

<div class="button" data-tooltip={localize("inspiration")}>
   <IconButton
      icon={$document.system.inspiration ? "fas fa-sun" : ""}
      on:click={() => {
         const inspiration = !$document.system.inspiration;
         $document.update({
            system: {
               inspiration: inspiration,
            },
         });
      }}
   />
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .button {
      --icon-button-padding: 0;
      --icon-button-font-size: 1.5rem;
   }
</style>
