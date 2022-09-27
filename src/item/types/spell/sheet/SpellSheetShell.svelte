<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import ItemSheetChecksTab from "~/item/component/check/ItemSheetChecksTab.svelte";
   import ItemSheetRulesElementsTab from "~/item/component/rules-element/ItemSheetRulesElementsTab.svelte";
   import ItemSheetDescriptionTab from "~/item/sheet/ItemSheetDescriptionTab.svelte";
   import SpellSheetSidebar from "./SpellSheetSidebar.svelte";
   import SpellSheetHeader from "./SpellSheetHeader.svelte";
   import SpellSheetCastingCheckTab from "./SpellSheetCastingCheckTab.svelte";

   // Setup context variables
   export let elementRoot;
   export let documentStore;
   export let applicationStateStore;
   setContext("DocumentStore", documentStore);
   setContext("ApplicationStateStore", applicationStateStore);
   const appState = getContext("ApplicationStateStore");

   // Tabs
   const tabs = [
      {
         label: localize("description"),
         id: "description",
         component: ItemSheetDescriptionTab,
      },
      {
         label: localize("castingCheck"),
         id: "castingCheck",
         component: SpellSheetCastingCheckTab,
      },
      {
         label: localize("checks"),
         id: "checks",
         component: ItemSheetChecksTab,
      },
   ];
</script>

<ApplicationShell bind:elementRoot>
   <div class="item-sheet">
      <!--Header-->
      <div class="header">
         <SpellSheetHeader />
      </div>

      <!--Content-->
      <div class="body">
         <!--Sidebar-->
         <div class="sidebar"><SpellSheetSidebar /></div>

         <!--Tabs-->
         <div class="tabs">
            <Tabs {tabs} bind:activeTab={$appState.activeTab} />
         </div>
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .item-sheet {
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
