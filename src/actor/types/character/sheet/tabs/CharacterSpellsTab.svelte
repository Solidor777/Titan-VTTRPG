<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSpell from "../items/spell/CharacterSpell.svelte";
   import CharacterItemList from "../items/CharacterItemList.svelte";
   import CharacterItemAddEntryButton from "../items/CharacterItemAddEntryButton.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="spells-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.spells} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.spells}>
         <!--Spell List-->
         <div class="spells">
            <CharacterItemList
               itemComponent={CharacterSpell}
               filterFunction={(item) => {
                  return item.type === "spell";
               }}
               filter={$appState.filter.spells}
               isExpandedMap={$appState.isExpanded.spells}
            />

            <!--Add Spell Button-->
            <div class="add-entry-button">
               <CharacterItemAddEntryButton itemType={"spell"} />
            </div>
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .spells-tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;
         padding-left: 0.25rem;

         .spells {
            @include flex-column;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;
         }
      }
   }
</style>
