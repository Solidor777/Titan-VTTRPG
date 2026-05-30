<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ToggleOptionButton from '~/helpers/svelte-components/button/ToggleOptionButton.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import CharacterSheetItemList
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemList.svelte';
   import CharacterSheetAbility
      from '~/document/types/actor/types/character/sheet/items/ability/CharacterSheetAbility.svelte';
   import CharacterSheetTabHeaderButton
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetTabHeaderButton.svelte';
   import { CREATE_ICON, RESET_ICON } from '~/system/Icons.js';

   /** @type {CharacterSheetState} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <!--Filter Options-->
      <div class="row">
         {#each Object.keys($appState.tabs.abilities.filterOptions) as key}
            <div class="option">
               <ToggleOptionButton
                  label={localize(key)}
                  enabled={$appState.tabs.abilities.filterOptions[key]}
                  onclick={() => {
                     $appState.tabs.abilities.filterOptions[key] =
                        !$appState.tabs.abilities.filterOptions[key];
                  }}
               />
            </div>
         {/each}

         <!--Reset button-->
         <div class="reset">
            <IconButton
               icon={RESET_ICON}
               label={localize('resetFilter')}
               onclick={() => {
                  $appState.tabs.abilities.filterOptions.action = false;
                  $appState.tabs.abilities.filterOptions.reaction = false;
                  $appState.tabs.abilities.filterOptions.passive = false;
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
            <TextInput bind:value={$appState.tabs.abilities.filter}/>
         </div>

         <!--Add Item Button-->
         <div class="add-entry-button">
            <CharacterSheetTabHeaderButton
               icon={CREATE_ICON}
               label={localize('addNewAbility')}
               onclick={() => {
                  document.data.createItemFromType('ability');
               }}
            />
         </div>
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.tabs.abilities.scrollTop}>
         <!--Abilities List-->
         <div class="list">
            <CharacterSheetItemList
               filter={$appState.tabs.abilities.filter}
               filterFunction={(item) => {
                  if (item.type !== 'ability') {
                     return false;
                  }
                  if (
                     $appState.tabs.abilities.filterOptions.action &&
                     !item.system.action
                  ) {
                     return false;
                  }

                  if (
                     $appState.tabs.abilities.filterOptions.reaction &&
                     !item.system.reaction
                  ) {
                     return false;
                  }

                  return !($appState.tabs.abilities.filterOptions.passive &&
                     !item.system.passive);
                  }
               }
               isExpandedMap={$appState.tabs.abilities.isExpanded}
               itemComponent={CharacterSheetAbility}
            />
         </div>
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
         @include padding-standard;

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

         .option {
            &:not(:first-child) {
               @include margin-left-standard;
            }
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         height: 100%;

         .list {
            @include flex-column;
            @include flex-group-top;

            width: 100%;

            @include margin-top-large;
         }
      }
   }
</style>
