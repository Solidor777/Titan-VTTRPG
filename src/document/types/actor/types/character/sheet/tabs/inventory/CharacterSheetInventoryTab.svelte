<script>
   import { getContext } from 'svelte';
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

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   const itemComponents = {
      weapon: CharacterSheetWeapon,
      armor: CharacterSheetArmor,
      shield: CharacterSheetShield,
      equipment: CharacterSheetEquipment,
      commodity: CharacterSheetCommodity,
   };

   /** @type {boolean} True when no inventory filter options are enabled, meaning show all items. */
   const noOptions = $derived(
      $appState.tabs.inventory.filterOptions.weapon === false &&
      $appState.tabs.inventory.filterOptions.armor === false &&
      $appState.tabs.inventory.filterOptions.shield === false &&
      $appState.tabs.inventory.filterOptions.equipment === false &&
      $appState.tabs.inventory.filterOptions.commodity === false,
   );
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <!--Filter Options-->
      <div class="row">
         {#each Object.keys($appState.tabs.inventory.filterOptions) as key}
            <div class="option">
               <ToggleOptionButton
                  label={localize(key)}
                  enabled={$appState.tabs.inventory.filterOptions[key]}
                  onclick={() => {
                     $appState.tabs.inventory.filterOptions[key] =
                        !$appState.tabs.inventory.filterOptions[key];
                  }}
               />
            </div>
         {/each}

         <!--Reset button-->
         <div class="reset">
            <IconButton
               icon={RESET_ICON}
               onclick={() => {
                  $appState.tabs.inventory.filterOptions.weapon = false;
                  $appState.tabs.inventory.filterOptions.armor = false;
                  $appState.tabs.inventory.filterOptions.shield = false;
                  $appState.tabs.inventory.filterOptions.equipment = false;
                  $appState.tabs.inventory.filterOptions.commodity = false;
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
            <TextInput bind:value={$appState.tabs.inventory.filter}/>
         </div>

         <!--Add Item Button-->
         <div class="add-entry-button">
            <CharacterSheetTabHeaderButton
               disabled={!document.data.isOwner}
               icon={CREATE_ICON}
               label={localize('addNewItem')}
               onclick={() => {
                  document.data.system.addInventoryItem();
               }}
            />
         </div>
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.tabs.inventory.scrollTop}>
         <CharacterSheetMultiItemList
            filter={$appState.tabs.inventory.filter}
            filterFunction={(item) => {
               switch (item.type) {
                  case 'armor': {
                     return (
                        noOptions ||
                        $appState.tabs.inventory.filterOptions.armor === true
                     );
                  }
                  case 'commodity': {
                     return (
                        noOptions ||
                        $appState.tabs.inventory.filterOptions.commodity === true
                     );
                  }
                  case 'equipment': {
                     return (
                        noOptions ||
                        $appState.tabs.inventory.filterOptions.equipment === true
                     );
                  }
                  case 'shield': {
                     return (
                        noOptions ||
                        $appState.tabs.inventory.filterOptions.shield === true
                     );
                  }
                  case 'weapon': {
                     return (
                        noOptions ||
                        $appState.tabs.inventory.filterOptions.weapon === true
                     );
                  }
                  default: {
                     return false;
                  }
               }
            }}
            isExpandedMap={$appState.tabs.inventory.isExpanded}
            {itemComponents}
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
         @include padding-large;

         width: 100%;

         .row {
            @include flex-row;
            @include flex-group-center;

            width: 100%;

            &:not(:first-child) {
               @include margin-top-standard;
            }

            .reset {
               --titan-button-font-size: var(--titan-font-size-small);
               --titan-icon-button-radius: 28px;

               @include margin-left-standard;
            }

            .label {
               font-weight: bold;

               @include margin-right-standard;
            }

            .input {
               @include flex-group-left;
            }

            .option {
               &:not(:first-child) {
                  @include margin-left-standard;
               }
            }

            .add-entry-button {
               @include margin-left-standard;
            }
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         height: 100%;
      }
   }
</style>
