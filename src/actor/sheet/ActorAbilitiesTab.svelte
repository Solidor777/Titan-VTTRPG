<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ActorItemList from "./ActorItemList.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import ActorAddItemEntryButton from "./ActorAddItemEntryButton.svelte";
   import ActorAbility from "./items/ActorAbility.svelte";
   import ToggleOptionButton from "~/helpers/svelte-components/ToggleOptionButton.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="abilities-tab">
   <div class="filter-options">
      {#each Object.entries($appState.filterOptions.abilities) as [key, value]}
         <ToggleOptionButton label={localize(`${key}`)} bind:enabled={$appState.filterOptions.abilities[key]} />
      {/each}
   </div>

   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.abilities} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("abilities")}
            </div>

            <!--Abilities List-->
            <ActorItemList
               itemComponent={ActorAbility}
               filterFunction={(item) => {
                  if (item.type !== "ability") {
                     return false;
                  }
                  if ($appState.filterOptions.abilities.action && !item.system.action) {
                     return false;
                  }

                  if ($appState.filterOptions.abilities.reaction && !item.system.reaction) {
                     return false;
                  }

                  if ($appState.filterOptions.abilities.passive && !item.system.passive) {
                     return false;
                  }

                  return true;
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

      .filter-options {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         margin-top: 0.25rem;
         margin-bottom: 0.25rem;
         padding-bottom: 0.25rem;
         width: 100%;
      }

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
