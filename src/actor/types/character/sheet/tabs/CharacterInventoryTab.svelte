<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterItemList from "../items/CharacterItemList.svelte";
   import CharacterItemAddEntryButton from "../items/CharacterItemAddEntryButton.svelte";
   import CharacterWeaponInventory from "../items/weapon/CharacterWeaponInventory.svelte";
   import CharacterArmor from "../items/armor/CharacterArmor.svelte";

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
            <div class="category-header">
               {localize("weapons")}
            </div>

            <!--Weapon List-->
            <CharacterItemList
               itemComponent={CharacterWeaponInventory}
               filterFunction={(item) => {
                  return item.type === "weapon";
               }}
               filter={$appState.filter.inventory}
               isExpandedMap={$appState.isExpanded.inventory}
            />

            <!--Add Weapon Button-->
            <div class="add-entry-button">
               <CharacterItemAddEntryButton itemType={"weapon"} />
            </div>
         </div>

         <!--Armor-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("armor")}
            </div>

            <!--Armor list-->
            <CharacterItemList
               itemComponent={CharacterArmor}
               filterFunction={(item) => {
                  return item.type === "armor";
               }}
               filter={$appState.filter.inventory}
               isExpandedMap={$appState.isExpanded.inventory}
            />

            <!--Add Armor Button-->
            <div class="add-entry-button">
               <CharacterItemAddEntryButton itemType={"armor"} />
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
            margin-top: 0.5rem;

            .category-header {
               @include flex-row;
               @include flex-group-center;
               font-weight: bold;
               @include font-size-normal;
               margin-bottom: 0.25rem;
            }

            .add-entry-button {
               @include flex-row;
               @include flex-group-center;
               width: 100%;
               margin-top: 0.5rem;
            }
         }
      }
   }
</style>
