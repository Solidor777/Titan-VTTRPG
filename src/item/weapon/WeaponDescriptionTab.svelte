<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import AttackSheetVertical from "./AttackSheetVertical.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the weapon item
   const document = getContext("DocumentSheetObject");
</script>

<div class="weapon-description-tab">
   <!--Sidebar-->
   <div class="sidebar">
      <!--Attacks-->
      <div class="attacks">
         <!--Attacks Label-->
         <div class="attacks-header">
            {localize("LOCAL.attacks.label")}
         </div>
         <div class="scrolling-content">
            <ScrollingContainer>
               <div class="attack-list">
                  <!--List of attacks-->
                  <ol>
                     <!--For Each attack-->
                     {#each Object.entries($document.system.attack) as [attackIdx, attack]}
                        <li transition:slide|local>
                           <AttackSheetVertical
                              {attackIdx}
                              bind:isCollapsedObject={application.isCollapsed.desc.attack}
                           />
                        </li>
                     {/each}
                  </ol>
                  <!--Add attack button-->
                  <div class="add-attack-button">
                     <IconButton
                        icon={"fas fa-circle-plus"}
                        efx={ripple()}
                        on:click={application.addAttack.bind(application)}
                     />
                  </div>
               </div>
            </ScrollingContainer>
         </div>
      </div>
   </div>
   <div class="description">Description</div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .weapon-description-tab {
      @include flex-row;
      height: 100%;
      width: 100%;
      --sidebar-width: 13rem;

      .sidebar {
         @include flex-column;
         @include flex-group-top;
         @include border;
         box-sizing: border-box;
         width: 13rem;
         min-width: 13rem;
         margin: 0.5rem;

         .attacks {
            @include flex-column;
            @include flex-group-top;
            margin-top: 0.5rem;
            height: 100%;
            width: 100%;
            font-weight: bold;

            .scrolling-content {
               @include flex-column;
               @include flex-group-top;
               height: 100%;
               width: 100%;
               margin-top: 0.5rem;

               .attack-list {
               }

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
               }
            }
         }
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
