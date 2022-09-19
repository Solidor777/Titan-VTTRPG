<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import WeaponSheetAttack from "./WeaponSheetAttack.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Application staore reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="sidebar">
   <!--Header-->
   <div class="header">
      {localize("attacks")}
   </div>

   <!--Attacks-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>Attacks</ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      width: 100%;
      box-sizing: border-box;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         width: 100%;
         font-weight: bold;
         margin-top: 0.5rem;
         padding-bottom: 0.5rem;
      }

      .scrolling-content {
         width: 100%;
         height: 100%;
      }
   }
</style>
