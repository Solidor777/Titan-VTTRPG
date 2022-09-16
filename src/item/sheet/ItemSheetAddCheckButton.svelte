<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Application reference
   const application = getContext("external").application;
</script>

<div class="add-aspect-button">
   <EfxButton
      efx={ripple}
      on:click={() => {
         application.addCheck();
      }}>{localize("addCheck")}<i class="fas fa-circle-plus" /></EfxButton
   >
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .add-aspect-button {
      @include flex-row;

      .fas {
         margin-left: 0.25rem;
      }
   }
</style>
