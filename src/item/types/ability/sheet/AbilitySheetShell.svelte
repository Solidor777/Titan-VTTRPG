<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import AbilitySheetHeader from "./AbilitySheetHeader.svelte";
   import AbilitySheetSidebar from "./AbilitySheetSidebar.svelte";
   import AbilitySheetDescriptionTab from "./AbilitySheetDescriptionTab.svelte";
   import ItemSheetChecksTab from "~/item/component/check/ItemSheetChecksTab.svelte";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";

   // Setup context variables
   export let elementRoot;
   export let documentStore;
   export let applicationStateStore;
   setContext("DocumentStore", documentStore);
   setContext("ApplicationStateStore", applicationStateStore);
   const appState = getContext("ApplicationStateStore");

   // Setup tabs
   const tabs = [
      {
         label: localize("description"),
         id: "description",
         component: AbilitySheetDescriptionTab,
      },
      {
         label: localize("checks"),
         id: "checks",
         component: ItemSheetChecksTab,
      },
   ];
</script>

<ApplicationShell bind:elementRoot>
   <div class="ability-sheet">
      <!--Header-->
      <div class="header">
         <AbilitySheetHeader />
      </div>

      <!--Content-->
      <div class="body">
         <!--Sidebar-->
         <div class="sidebar">
            <AbilitySheetSidebar />
         </div>

         <!--Tabs-->
         <div class="tabs">
            <Tabs {tabs} bind:activeTab={$appState.activeTab} />
         </div>
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .ability-sheet {
      @include flex-column;
      font-size: 1rem;
      display: flex;
      flex: 1;

      .body {
         @include flex-row;
         height: 100%;
         width: 100%;

         .sidebar {
            @include flex-row;
            width: 13rem;
            min-width: 13rem;
            margin: 0.5rem 0.5rem 0 0;
         }

         .tabs {
            @include flex-row;
            margin-top: 0.5rem;
            width: 100%;
         }
      }
   }
</style>
