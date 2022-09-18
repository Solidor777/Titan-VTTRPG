<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/input/DocumentNameInput.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentRaritySelect from "~/documents/components/select/DocumentRaritySelect.svelte";
   import WeaponSheetAttacksTab from "./WeaponSheetAttacksTab.svelte";
   import WeaponSheetDescriptionTab from "./WeaponSheetDescriptionTab.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentStore", documentStore);
   const document = getContext("DocumentStore");

   // Initialize collapsed state
   const application = getContext("external").application;
   const isExpanded = application.isExpanded;
   for (const [key] of Object.entries($document.system.attack)) {
      isExpanded.desc.attack[key] = isExpanded.desc.attack[key] ?? true;
      isExpanded.attacks.attack[key] = isExpanded.attacks.attack[key] ?? true;
   }

   // Tabs
   const tabs = [
      { label: localize("description"), id: "description", component: WeaponSheetDescriptionTab },
      { label: localize("attacks"), id: "attacks", component: WeaponSheetAttacksTab },
   ];
   application.activeTab = application.activeTab ?? "description";
</script>

<ApplicationShell bind:elementRoot>
   <div class="weapon-sheet">
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
                  {localize("rarity")}
               </div>
               <div class="stat-input">
                  <DocumentRaritySelect bind:value={$document.system.rarity} />
               </div>

               <!--Value-->
               <div class="stat-label">
                  {localize("value")}
               </div>
               <div class="stat-input">
                  <DocumentIntegerInput bind:value={$document.system.value} />
               </div>
            </div>
         </div>
      </div>
      <!--Tab Content-->
      <div class="tabs">
         <Tabs {tabs} bind:activeTab={application.activeTab} />
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .weapon-sheet {
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

      .tabs {
         @include flex-column;
         margin-top: 0.5rem;
         position: relative;
         height: 100%;
         width: 100%;
      }
   }
</style>
