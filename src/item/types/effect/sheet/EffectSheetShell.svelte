<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import EffectSheetDescriptionTab from "./EffectSheetDescriptionTab.svelte";
   import EffectSheetHeader from "./EffectSheetHeader.svelte";
   import ItemSheetRulesElementsTab from "~/item/sheet/ItemSheetRulesElementsTab.svelte";

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
         component: EffectSheetDescriptionTab,
      },
      {
         label: localize("rulesElements"),
         id: "rulesElements",
         component: ItemSheetRulesElementsTab,
      },
   ];
</script>

<ApplicationShell bind:elementRoot>
   <div class="ability-sheet">
      <!--Header-->
      <div class="header">
         <EffectSheetHeader />
      </div>

      <!--Tabs-->
      <div class="tabs">
         <Tabs {tabs} bind:activeTab={$appState.activeTab} />
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

      .tabs {
         @include flex-row;
         margin-top: 0.5rem;
         height: 100%;
         width: 100%;
      }
   }
</style>
