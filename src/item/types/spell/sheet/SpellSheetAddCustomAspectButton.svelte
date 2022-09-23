<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Document Setup
   const document = getContext("DocumentStore");
</script>

<div class="add-aspect-button">
   <EfxButton
      on:click={() => {
         $document.spell.addCustomAspect();
      }}>{localize("addCustomAspect")}<i class="fas fa-circle-plus" /></EfxButton
   >
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .add-aspect-button {
      @include flex-row;

      .fas {
         margin-left: 0.25rem;
      }
   }
</style>
