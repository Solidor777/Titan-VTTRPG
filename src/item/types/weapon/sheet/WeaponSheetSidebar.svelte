<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import WeaponSheetAttack from "./WeaponSheetAttack.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application reference
   const application = getContext("external").application;
</script>

<div class="attacks">
   <!--Attacks Label-->
   <div class="attacks-header">
      {localize("LOCAL.attacks.label")}
   </div>
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={application.scrollTop.sidebar}>
         <!--List of attacks-->
         <ol>
            <!--For Each attack-->
            {#each Object.entries($document.system.attack) as [attackIdx]}
               <li transition:slide|local>
                  <WeaponSheetAttack {attackIdx} bind:isExpandedObject={application.isExpanded.desc.attack} />
               </li>
            {/each}
         </ol>
         <!--Add attack button-->
         <div class="add-attack-button">
            <EfxButton efx={ripple()} on:click={application.addAttack.bind(application)}>
               <i class="fas fa-circle-plus" />
            </EfxButton>
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .attacks {
      @include flex-column;
      @include flex-group-top;
      margin-top: 0.5rem;
      height: 100%;
      width: 100%;
      font-weight: bold;
      padding: 0.5rem;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         width: 100%;
         margin-top: 0.5rem;

         ol {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            list-style: none;
            margin: 0;
            padding: 0;

            :not(:first-child) {
               margin-top: 0.5rem;
            }
         }

         .add-attack-button {
            @include flex-row;
            @include flex-group-center;
            margin-top: 0.5rem;

            .fas {
               padding: 0.25rem;
            }
         }
      }
   }
</style>
