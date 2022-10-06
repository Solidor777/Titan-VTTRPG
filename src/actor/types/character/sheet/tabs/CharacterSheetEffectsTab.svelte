<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSheetItemList from "../items/CharacterSheetItemList.svelte";
   import CharacterSheetItemAddEntryButton from "../items/CharacterSheetItemAddEntryButton.svelte";
   import CharacterSheetEffect from "../items/effect/CharacterSheetEffect.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.abilities} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities List-->
         <div class="list">
            <CharacterSheetItemList
               itemComponent={CharacterSheetEffect}
               filterFunction={(item) => {
                  return item.type === "effect";
               }}
               filter={$appState.filter.abilities}
               isExpandedMap={$appState.isExpanded.abilities}
            />
         </div>

         <!--Add Spell Button-->
         <div class="add-entry-button">
            <CharacterSheetItemAddEntryButton itemType={"effect"} label={localize("addNewEffect")} />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         .list {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin-top: 0.5rem;
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }
         }
      }
   }
</style>
