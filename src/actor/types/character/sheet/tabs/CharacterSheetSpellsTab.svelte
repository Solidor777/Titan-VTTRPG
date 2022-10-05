<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSheetSpell from "~/actor/types/character/sheet/items/spell/CharacterSheetSpell.svelte";
   import CharacterSheetItemList from "~/actor/types/character/sheet/items/CharacterSheetItemList.svelte";
   import CharacterSheetItemAddEntryButton from "~/actor/types/character/sheet/items/CharacterSheetItemAddEntryButton.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.spells} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.spells}>
         <!--Spell List-->
         <div class="list">
            <CharacterSheetItemList
               itemComponent={CharacterSheetSpell}
               filterFunction={(item) => {
                  return item.type === "spell";
               }}
               filter={$appState.filter.spells}
               isExpandedMap={$appState.isExpanded.spells}
            />
         </div>

         <!--Add Spell Button-->
         <div class="add-entry-button">
            <CharacterSheetItemAddEntryButton label={localize("addNewSpell")} itemType={"spell"} />
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
