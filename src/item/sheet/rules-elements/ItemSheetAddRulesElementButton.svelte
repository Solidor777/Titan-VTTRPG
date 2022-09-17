<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Application reference
   const application = getContext("external").application;
</script>

<div class="button">
   <EfxButton
      efx={ripple}
      on:click={() => {
         application.addRulesElement();
      }}>{localize("addRulesElement")}<i class="fas fa-circle-plus" /></EfxButton
   >
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .button {
      @include flex-row;
      @include flex-group-center;
      width: 100%;

      .fas {
         margin-left: 0.25rem;
      }
   }
</style>
