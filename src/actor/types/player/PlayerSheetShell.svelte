<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import CharacterSheetSkillsTab from "~/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsTab.svelte";
   import CharacterSheetAbilitiesTab from "~/actor/types/character/sheet/tabs/CharacterSheetAbilitiesTab.svelte";
   import CharacterSheetInventoryTab from "~/actor/types/character/sheet/tabs/CharacterSheetInventoryTab.svelte";
   import CharacterSpellsTab from "~/actor/types/character/sheet/tabs/CharacterSpellsTab.svelte";
   import CharacterEffectsTab from "~/actor/types/character/sheet/tabs/CharacterEffectsTab.svelte";
   import PlayerSheetSidebar from "./PlayerSheetSidebar.svelte";
   import PlayerSheetHeader from "./PlayerSheetHeader.svelte";

   // Setup context variables
   export let elementRoot;
   export let documentStore;
   export let applicationStateStore;
   setContext("DocumentStore", documentStore);
   setContext("ApplicationStateStore", applicationStateStore);
   const appState = getContext("ApplicationStateStore");

   // Tabs
   const tabs = [
      { label: localize("skills"), id: "skills", component: CharacterSheetSkillsTab },
      { label: localize("inventory"), id: "inventory", component: CharacterSheetInventoryTab },
      { label: localize("abilities"), id: "abilities", component: CharacterSheetAbilitiesTab },
      { label: localize("spells"), id: "spells", component: CharacterSpellsTab },
      { label: localize("effects"), id: "effects", component: CharacterEffectsTab },
   ];
</script>

<ApplicationShell bind:elementRoot>
   <!--Sheet-->
   <div class="actor-sheet">
      <!--Sidebar-->
      <div class="sidebar">
         <PlayerSheetSidebar />
      </div>

      <!--Sheet Body-->
      <div class="body">
         <!--Header -->
         <div class="header">
            <PlayerSheetHeader />
         </div>

         <!--Tab Content-->
         <div class="tabs">
            <Tabs {tabs} bind:activeTab={$appState.activeTab} />
         </div>
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .actor-sheet {
      @include flex-row;
      @include font-size-normal;
      display: flex;
      flex: 1;

      .sidebar {
         @include flex-row;
         width: 13rem;
         min-width: 13rem;
         margin-right: 0.5rem;
      }

      .body {
         display: flex;
         flex: 1;
         @include flex-column;

         .header {
            @include flex-column;
            width: 100%;
         }

         .tabs {
            @include flex-column;
            margin-top: 0.5rem;
            height: 100%;
            width: 100%;
         }
      }
   }
</style>
