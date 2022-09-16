<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import WeaponSheetAttack from "./WeaponSheetAttack.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application reference
   const application = getContext("external").application;
</script>

<ScrollingContainer bind:scrollTop={application.scrollTop.attacks}>
   <div class="weapon-attacks-tab">
      {#each Object.entries($document.system.attack) as [attackIdx]}
         <div class="attack-sheet" transition:slide|local>
            <WeaponSheetAttack {attackIdx} bind:isExpandedObject={application.isExpanded.attacks.attack} />
         </div>
      {/each}

      <div class="add-attack-button">
         <EfxButton efx={ripple()} on:click={application.addAttack.bind(application)}>
            <i class="fas fa-circle-plus" />
         </EfxButton>
      </div>
   </div>
</ScrollingContainer>

<!--For Each attack-->
<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .weapon-attacks-tab {
      @include grid(3);
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
