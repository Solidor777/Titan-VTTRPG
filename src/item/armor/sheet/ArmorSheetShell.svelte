<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentRaritySelect from "~/documents/components/DocumentRaritySelect.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");
</script>

<ApplicationShell bind:elementRoot>
   <div class="armor-sheet">
      <!--Header-->
      <div class="header">
         <div class="row">
            <div class="label">
               <!--Item portrait-->
               <div class="portrait">
                  <DocumentImagePicker path={"img"} alt={"item portrait"} />
               </div>
               <!--Item name-->
               <div class="name">
                  <DocumentName />
               </div>
            </div>

            <div class="stats">
               <!--Rarity-->
               <div class="stat-label">
                  {localize("LOCAL.rarity.label")}
               </div>
               <div class="stat-input">
                  <DocumentRaritySelect bind:value={$document.system.rarity} />
               </div>

               <!--Value-->
               <div class="stat-label">
                  {localize("LOCAL.value.label")}
               </div>
               <div class="stat-input">
                  <DocumentIntegerInput bind:value={$document.system.value} />
               </div>
            </div>
         </div>
      </div>

      <!--Content-->
      <div class="content">
         <div class="sidebar">Sidebar</div>
         <div class="description">Description</div>
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .armor-sheet {
      @include flex-column;
      font-size: 1rem;
      display: flex;
      flex: 1;

      .header {
         @include border;
         @include flex-column;
         align-items: center;
         justify-content: space-between;
         width: 100%;
         padding: 0.5rem;

         .row {
            @include flex-row;
            @include flex-space-between;
            width: 100%;

            .label {
               @include flex-row;
               @include flex-group-center;
               width: 100%;

               .portrait {
                  width: 5rem;
                  --border-style: none;
               }
            }

            .stats {
               @include grid(2);
               width: 100%;
               box-sizing: border-box;
               margin-left: 0.5rem;

               .stat-label {
                  @include flex-row;
                  @include flex-group-right;
                  font-weight: bold;
               }
            }
         }
      }

      .content {
         @include flex-row;
         height: 100%;
         width: 100%;

         .sidebar {
            @include flex-column;
            @include flex-group-top;
            @include border;
            box-sizing: border-box;
            width: 13rem;
            min-width: 13rem;
            margin: 0.5rem;
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
   }
</style>
