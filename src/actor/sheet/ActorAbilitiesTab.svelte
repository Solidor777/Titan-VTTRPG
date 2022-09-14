<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ActorItemList from "./ActorItemList.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import ActorAddItemEntryButton from "./ActorAddItemEntryButton.svelte";
   import ActorAbility from "./items/ActorAbility.svelte";
   import ActorFilterOptions from "./ActorFilterOptions.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="abilities-tab">
   <ActorFilterOptions />

   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.abilities} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("LOCAL.abilities.label")}
            </div>

            <!--Abilities List-->
            <ActorItemList
               itemComponent={ActorAbility}
               filterFunction={(item) => {
                  return item.type === "ability";
               }}
               filter={$appState.filter.abilities}
               isExpandedMap={$appState.isExpanded.abilities}
            />

            <!--Add Spell Button-->
            <ActorAddItemEntryButton itemType={"ability"} />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .abilities-tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         .category {
            @include flex-column;
            @include flex-group-top;
            @include border;
            width: 100%;
            padding: 0.26rem;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }

            .category-header {
               @include flex-row;
               @include flex-group-center;
               font-weight: bold;
               font-size: 1rem;
            }
         }
      }
   }
</style>
