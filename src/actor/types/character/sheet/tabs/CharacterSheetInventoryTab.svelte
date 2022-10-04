<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSheetItemList from "~/actor/types/character/sheet/items/CharacterSheetItemList.svelte";
   import CharacterSheetItemAddEntryButton from "~/actor/types/character/sheet/items/CharacterSheetItemAddEntryButton.svelte";
   import CharacterSheetWeapon from "~/actor/types/character/sheet/items/weapon/CharacterSheetWeapon.svelte";
   import CharacterSheetArmor from "~/actor/types/character/sheet/items/armor/CharacterSheetArmor.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="inventory-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.inventory} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.inventory}>
         <!--Weapons-->
         <div class="category">
            <!--List Header-->
            <div class="header">
               {localize("weapons")}
            </div>

            <!--Weapon List-->
            <div class="list">
               <CharacterSheetItemList
                  itemComponent={CharacterSheetWeapon}
                  filterFunction={(item) => {
                     return item.type === "weapon";
                  }}
                  filter={$appState.filter.inventory}
                  isExpandedMap={$appState.isExpanded.inventory}
               />

               <!--Add Weapon Button-->
               <div class="add-entry-button">
                  <CharacterSheetItemAddEntryButton itemType={"weapon"} />
               </div>
            </div>
         </div>

         <!--Armor-->
         <div class="category">
            <!--List Header-->
            <div class="header">
               {localize("armor")}
            </div>

            <!--Armor list-->
            <div class="list">
               <CharacterSheetItemList
                  itemComponent={CharacterSheetArmor}
                  filterFunction={(item) => {
                     return item.type === "armor";
                  }}
                  filter={$appState.filter.inventory}
                  isExpandedMap={$appState.isExpanded.inventory}
               />

               <!--Add Armor Button-->
               <div class="add-entry-button">
                  <CharacterSheetItemAddEntryButton itemType={"armor"} />
               </div>
            </div>
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .inventory-tab {
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

         .category {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin-top: 0.5rem;

            &:not(:first-child) {
               @include border-top;
               padding-top: 0.5rem;
            }

            .header {
               @include flex-row;
               @include flex-group-center;
               font-weight: bold;
            }

            .list {
               @include flex-column;
               @include flex-group-top;
               width: 100%;
               margin-top: 0.5rem;

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
      }
   }
</style>
