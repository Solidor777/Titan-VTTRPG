<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import WeaponSheetAttack from "./WeaponSheetAttack.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Reference to the weapon item
   const document = getContext("DocumentSheetObject");

   // Initialize collapsed state
   const application = getContext("external").application;
</script>

<div class="weapon-attacks-tab">
   <!--For Each attack-->
   {#each Object.entries($document.system.attack) as [attackIdx]}
      <div class="attack-sheet" transition:slide|local>
         <WeaponSheetAttack {attackIdx} bind:isCollapsedObject={application.isCollapsed.attacks.attack} />
      </div>
   {/each}

   <div class="add-attack-button">
      <EfxButton efx={ripple()} on:click={application.addAttack.bind(application)}>
         <i class="fas fa-circle-plus" />
      </EfxButton>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .weapon-attacks-tab {
      display: grid;
      gap: 0.5rem;
      margin: 0.5rem 0.5rem;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 13rem));
      width: 100%;

      .add-attack-button {
         @include flex-row;
         @include flex-group-center;

         .fas {
            padding: 0.25rem;
         }
      }
   }
</style>
