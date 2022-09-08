<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Document Setup
   const document = getContext("DocumentSheetObject");
</script>

<div class="add-aspect-button">
   <EfxButton
      efx={ripple}
      on:click={() => {
         $document.spell.addCustomAspect();
      }}>{localize("LOCAL.addCustomAspect.label")}<i class="fas fa-circle-plus" /></EfxButton
   >
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .add-aspect-button {
      @include flex-row;
      margin-top: 0.25rem;

      .fas {
         margin-left: 0.25rem;
      }
   }
</style>
