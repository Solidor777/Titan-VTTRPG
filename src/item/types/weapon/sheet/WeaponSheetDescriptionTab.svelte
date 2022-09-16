<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import WeaponSheetAttack from "./WeaponSheetAttack.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import WeaponSheetSidebar from "./WeaponSheetSidebar.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the weapon item
   const document = getContext("DocumentSheetObject");
</script>

<div class="weapon-description-tab">
   <!--Sidebar-->
   <div class="sidebar">
      <WeaponSheetSidebar />
   </div>
   <div class="description">Description</div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   .weapon-description-tab {
      @include flex-row;
      height: 100%;
      width: 100%;

      .sidebar {
         width: 13rem;
         min-width: 13rem;
      }

      .description {
         @include flex-column;
         @include flex-group-top;
         @include border;
         box-sizing: border-box;
         width: 100%;
         margin: 0.5rem 0.5rem 0.5rem 0;
         padding: 0.5rem;
      }
   }
</style>
