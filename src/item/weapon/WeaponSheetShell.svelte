<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import WeaponAttacksTab from "./WeaponAttacksTab.svelte";
   import WeaponDescriptionTab from "./WeaponDescriptionTab.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentRaritySelect from "~/documents/components/DocumentRaritySelect.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");

   // Initialize collapsed state
   const application = getContext("external").application;
   const isCollapsed = application.isCollapsed;
   for (const [key] of Object.entries($document.system.attack)) {
      isCollapsed.desc.attack[key] = isCollapsed.desc.attack[key] ?? false;
      isCollapsed.attacks.attack[key] = isCollapsed.attacks.attack[key] ?? false;
   }

   // Tabs
   const tabs = [
      { label: localize("LOCAL.description.label"), id: "description", component: WeaponDescriptionTab },
      { label: localize("LOCAL.attacks.label"), id: "attacks", component: WeaponAttacksTab },
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
               <div class="stat-label">
                  {localize("LOCAL.rarity.label")}
               </div>
               <div class="stat-input">
                  <DocumentRaritySelect bind:value={$document.system.rarity} />
               </div>

               <div class="stat-label">
                  {localize("LOCAL.value.label")}
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
   @import "../../Styles/Mixins.scss";

   .weapon-sheet {
      font-size: 1rem;
      --header-height: 10rem;
      display: flex;
      flex: 1;
      @include flex-column;

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
