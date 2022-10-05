<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSheetItemList from "~/actor/types/character/sheet/items/CharacterSheetItemList.svelte";
   import CharacterSheetItemAddEntryButton from "~/actor/types/character/sheet/items/CharacterSheetItemAddEntryButton.svelte";
   import CharacterSheetWeapon from "~/actor/types/character/sheet/items/weapon/CharacterSheetWeapon.svelte";
   import CharacterSheetArmor from "~/actor/types/character/sheet/items/armor/CharacterSheetArmor.svelte";
   import CharacterSheetEquipment from "~/actor/types/character/sheet/items/equipment/CharacterSheetEquipment.svelte";
   import CharacterSheetCommodity from "~/actor/types/character/sheet/items/commodity/CharacterSheetCommodity.svelte";
   import ToggleOptionButton from "~/helpers/svelte-components/button/ToggleOptionButton.svelte";
   import TextInput from "~/helpers/svelte-components/input/TextInput.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");

   $: noOptions =
      $appState.filterOptions.inventory.weapon === false &&
      $appState.filterOptions.inventory.armor === false &&
      $appState.filterOptions.inventory.equipment === false &&
      $appState.filterOptions.inventory.commodity === false;
</script>

<div class="inventory-tab">
   <!--Filter-->
   <div class="filter">
      <div class="label">
         {localize("filter")}
      </div>

      <div class="input">
         <TextInput bind:value={$appState.filter.inventory} />
      </div>

      {#each Object.entries($appState.filterOptions.inventory) as [key]}
         <ToggleOptionButton label={localize(key)} bind:enabled={$appState.filterOptions.inventory[key]} />
      {/each}

      <div
         class="reset"
         on:click={() => {
            $appState.filterOptions.inventory.weapon = false;
            $appState.filterOptions.inventory.armor = false;
            $appState.filterOptions.inventory.equipment = false;
            $appState.filterOptions.inventory.commodity = false;
         }}
      >
         <IconButton icon="fas fa-rotate-left" />
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.inventory}>
         {#if $appState.filterOptions.inventory.weapon === true || noOptions}
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
                     <CharacterSheetItemAddEntryButton label={localize("addNewWeapon")} itemType={"weapon"} />
                  </div>
               </div>
            </div>
         {/if}

         <!--Armor-->
         {#if $appState.filterOptions.inventory.armor === true || noOptions}
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
                     <CharacterSheetItemAddEntryButton label={localize("addNewArmor")} itemType={"armor"} />
                  </div>
               </div>
            </div>
         {/if}

         <!--Equipment-->
         {#if $appState.filterOptions.inventory.equipment === true || noOptions}
            <div class="category">
               <!--List Header-->
               <div class="header">
                  {localize("equipment")}
               </div>

               <!--Equipment list-->
               <div class="list">
                  <CharacterSheetItemList
                     itemComponent={CharacterSheetEquipment}
                     filterFunction={(item) => {
                        return item.type === "equipment";
                     }}
                     filter={$appState.filter.inventory}
                     isExpandedMap={$appState.isExpanded.inventory}
                  />

                  <!--Add Armor Button-->
                  <div class="add-entry-button">
                     <CharacterSheetItemAddEntryButton itemType={"equipment"} label={localize("addNewEquipment")} />
                  </div>
               </div>
            </div>
         {/if}

         <!--Commodity-->
         {#if $appState.filterOptions.inventory.commodity === true || noOptions}
            <div class="category">
               <!--List Header-->
               <div class="header">
                  {localize("commodity")}
               </div>

               <!--Equipment list-->
               <div class="list">
                  <CharacterSheetItemList
                     itemComponent={CharacterSheetCommodity}
                     filterFunction={(item) => {
                        return item.type === "commodity";
                     }}
                     filter={$appState.filter.inventory}
                     isExpandedMap={$appState.isExpanded.inventory}
                  />

                  <!--Add Armor Button-->
                  <div class="add-entry-button">
                     <CharacterSheetItemAddEntryButton itemType={"commodity"} label={localize("addNewCommodity")} />
                  </div>
               </div>
            </div>
         {/if}
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

      .filter {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         @include panel-1;

         .label {
            font-weight: bold;
            margin: 0 0.25rem;
         }

         .input {
            @include flex-group-left;
         }

         .reset {
            @include font-size-small;
            --icon-button-font-size: var(--font-size-small);
            --icon-button-radius: 1.75rem;
         }
      }

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
               @include panel-1;
               @include border-top-bottom;
               width: 100%;
               font-weight: bold;
               padding: 0.5rem 0;
            }

            .list {
               @include flex-column;
               @include flex-group-top;
               padding: 0 0.25rem;
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
