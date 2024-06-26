<script>
   import { getContext } from 'svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import ToggleOptionButton from '~/helpers/svelte-components/button/ToggleOptionButton.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import CharacterSheetWeapon
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeapon.svelte';
   import CharacterSheetArmor
      from '~/document/types/actor/types/character/sheet/items/armor/CharacterSheetArmor.svelte';
   import CharacterSheetEquipment
      from '~/document/types/actor/types/character/sheet/items/equipment/CharacterSheetEquipment.svelte';
   import CharacterSheetCommodity
      from '~/document/types/actor/types/character/sheet/items/commodity/CharacterSheetCommodity.svelte';
   import CharacterSheetShield
      from '~/document/types/actor/types/character/sheet/items/shield/CharacterSheetShield.svelte';
   import CharacterSheetMultiItemList
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetMultiItemList.svelte';
   import CharacterSheetTabHeaderButton
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetTabHeaderButton.svelte';
   import { CREATE_ICON, RESET_ICON } from '~/system/Icons.js';

   // Application reference
   const appState = getContext('applicationState');
   const application = getApplication();

   const itemComponents = {
      weapon: CharacterSheetWeapon,
      armor: CharacterSheetArmor,
      shield: CharacterSheetShield,
      equipment: CharacterSheetEquipment,
      commodity: CharacterSheetCommodity,
   };

   $: noOptions =
      $appState.filterOptions.inventory.weapon === false &&
      $appState.filterOptions.inventory.armor === false &&
      $appState.filterOptions.inventory.shield === false &&
      $appState.filterOptions.inventory.equipment === false &&
      $appState.filterOptions.inventory.commodity === false;
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <!--Filter Options-->
      <div class="row">
         {#each Object.keys($appState.filterOptions.inventory) as key}
            <div class="option">
               <ToggleOptionButton
                  label={localize(key)}
                  enabled={$appState.filterOptions.inventory[key]}
                  on:click={() => {
                     $appState.filterOptions.inventory[key] =
                        !$appState.filterOptions.inventory[key];
                  }}
               />
            </div>
         {/each}

         <!--Reset button-->
         <div class="reset">
            <IconButton
               icon="{RESET_ICON}"
               on:click={() => {
                  $appState.filterOptions.inventory.weapon = false;
                  $appState.filterOptions.inventory.armor = false;
                  $appState.filterOptions.inventory.shield = false;
                  $appState.filterOptions.inventory.equipment = false;
                  $appState.filterOptions.inventory.commodity = false;
               }}
            />
         </div>
      </div>

      <!--Field-->
      <div class="row">
         <!--Label-->
         <div class="label">
            {localize('filter')}
         </div>

         <!--Input-->
         <div class="input">
            <TextInput bind:value={$appState.filter.inventory}/>
         </div>

         <!--Add Item Button-->
         <div class="add-entry-button">
            <CharacterSheetTabHeaderButton
               icon={CREATE_ICON}
               label={localize('addNewItem')}
               on:click={() => {
                  application.addInventoryItem();
               }}
            />
         </div>
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.inventory}>
         <CharacterSheetMultiItemList
            {itemComponents}
            filterFunction={(item) => {
               switch (item.type) {
                  case 'armor': {
                     return (
                        noOptions ||
                        $appState.filterOptions.inventory.armor === true
                     );
                  }
                  case 'commodity': {
                     return (
                        noOptions ||
                        $appState.filterOptions.inventory.commodity === true
                     );
                  }
                  case 'equipment': {
                     return (
                        noOptions ||
                        $appState.filterOptions.inventory.equipment === true
                     );
                  }
                  case 'shield': {
                     return (
                        noOptions ||
                        $appState.filterOptions.inventory.shield === true
                     );
                  }
                  case 'weapon': {
                     return (
                        noOptions ||
                        $appState.filterOptions.inventory.weapon === true
                     );
                  }
                  default: {
                     return false;
                  }
               }
            }}
            filter={$appState.filter.inventory}
            isExpandedMap={$appState.isExpanded.inventory}
         />
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;

      .header {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom;
         @include panel-1;
         padding: var(--padding-standard);
         width: 100%;

         .row {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               margin-top: var(--padding-standard);
            }

            .reset {
               --icon-button-font-size: var(--font-size-small);
               --icon-button-radius: 28px;
               margin-left: var(--padding-standard);
            }

            .label {
               font-weight: bold;
               margin-right: var(--padding-standard);
            }

            .input {
               @include flex-group-left;
            }

            .option {
               &:not(:first-child) {
                  margin-left: var(--padding-standard);
               }
            }

            .add-entry-button {
               margin-left: var(--padding-standard);
            }
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;
         margin-top: var(--padding-large);
      }
   }
</style>
