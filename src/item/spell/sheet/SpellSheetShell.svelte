<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import DocumentRaritySelect from "~/documents/components/DocumentRaritySelect.svelte";
   import SpellSheetStandardDescriptionTab from "./SpellSheetStandardDescriptionTab.svelte";
   import SpellSheetStandardAspectsTab from "./SpellSheetStandardAspectsTab.svelte";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");
   const application = getContext("external").application;

   // Tabs
   const tabs = [
      { label: localize("LOCAL.description.label"), id: "description", component: SpellSheetStandardDescriptionTab },
      { label: localize("LOCAL.aspects.label"), id: "aspects", component: SpellSheetStandardAspectsTab },
   ];
   application.activeTab = application.activeTab ?? "aspects";
</script>

<ApplicationShell bind:elementRoot>
   <div class="spell-sheet">
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
            </div>
         </div>
      </div>

      <!--Content-->
      <div class="content">
         <div class="sidebar">
            <div class="stats">Sidebar</div>
         </div>
         <div class="description">
            <Tabs {tabs} bind:activeTab={application.activeTab} />
         </div>
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .spell-sheet {
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
            padding: 0.5rem;
            margin-top: 0.5rem;
         }

         .description {
            @include flex-column;
            @include flex-group-top;
            @include border;
            box-sizing: border-box;
            width: 100%;
            margin: 0.5rem 0 0 0.5rem;
            padding: 0.5rem;
         }
      }
   }
</style>
