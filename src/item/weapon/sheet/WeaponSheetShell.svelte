<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import HeaderWithSidebar from "~/helpers/svelte-components/HeaderWithSidebar.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");
</script>

<ApplicationShell bind:elementRoot>
   <div class="weapon-sheet">
      <HeaderWithSidebar>
         <!--Sidebar-->
         <div class="sidebar" slot="sidebar">
            <!--Item portrait-->
            <div class="portrait">
               <DocumentImagePicker path={"img"} alt={"item portrait"} />
            </div>

            <!--Attacks-->
            <div class="attacks">
               <ScrollingContainer>
                  <!--Attacks Label-->
                  <div class="label">
                     {localize("LOCAL.attacks.label")}
                  </div>

                  <!--List of attacks-->
                  <div class="attack-list">
                     <!--For Each attack-->
                     {#each Object.entries($document.system.attack) as [key, attack]}
                        <div class="attack">
                           <DocumentTextInput bind:value={$document.system.attack[key].name} />
                        </div>
                     {/each}
                  </div>
               </ScrollingContainer>
            </div>
         </div>

         <!--Header-->
         <div class="header" slot="header">
            <div class="row">
               <!--Item name Sheet-->
               <div class="item-name">
                  <DocumentTextInput bind:value={$document.name} />
               </div>
            </div>
         </div>
         <div class="content" slot="content">Weapon Content</div>
      </HeaderWithSidebar>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .weapon-sheet {
      font-size: 1rem;
      --sidebar-width: 12rem;
      --header-height: 10rem;

      .sidebar {
         @include flex-column;
         @include flex-group-top;
         @include border-normal;
         padding: 0.5rem;
         height: 100%;
         margin-right: 0.5rem;

         .portrait {
            width: 8rem;
            --border-style-normal: none;
         }

         .attacks {
            @include flex-column;
            width: 100%;
            height: 100%;

            .attack-list {
               margin-top: 0.5rem;

               .attack {
               }
            }
         }
      }

      .header {
         @include flex-column;
         @include flex-group-center;
         @include border-normal;
         padding: 0.5rem;
         height: 100%;
         .row {
            @include flex-row;
            @include flex-group-left;
            width: 100%;
         }
      }

      .content {
         @include flex-column;
         @include flex-group-top;
         @include border-normal;
         padding: 0.5rem;
         height: 100%;
         margin-top: 0.5rem;
      }

      .label {
         font-weight: bold;
      }
   }
</style>
