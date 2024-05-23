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

   // Application reference
   const appState = getContext('applicationState');

   // Document reference
   const document = getContext('document');
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <!--Filter Options-->
      <div class="row">
         {#each Object.keys($appState.filterOptions.abilities) as key}
            <div class="option">
               <ToggleOptionButton
                  label={localize(key)}
                  enabled={$appState.filterOptions.abilities[key]}
                  on:click={() => {
                     $appState.filterOptions.abilities[key] =
                        !$appState.filterOptions.abilities[key];
                  }}
               />
            </div>
         {/each}

         <!--Reset button-->
         <div class="reset">
            <IconButton
               icon="{RESET_ICON}"
               on:click={() => {
                  $appState.filterOptions.abilities.action = false;
                  $appState.filterOptions.abilities.reaction = false;
                  $appState.filterOptions.abilities.passive = false;
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
            <TextInput bind:value={$appState.filter.abilities}/>
         </div>

         <!--Add Item Button-->
         <div class="add-entry-button">
            <CharacterSheetTabHeaderButton
               label={localize('addNewAbility')}
               icon={CREATE_ICON}
               on:click={() => {
                  $document.system.addItem('ability');
               }}
            />
         </div>
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities List-->
         <div class="list">
            <CharacterSheetItemList
               itemComponent={CharacterSheetAbility}
               filterFunction={(item) => {
                  if (item.type !== 'ability') {
                     return false;
                  }
                  if (
                     $appState.filterOptions.abilities.action &&
                     !item.system.action
                  ) {
                     return false;
                  }

                  if (
                     $appState.filterOptions.abilities.reaction &&
                     !item.system.reaction
                  ) {
                     return false;
                  }

                  if (
                     $appState.filterOptions.abilities.passive &&
                     !item.system.passive
                  ) {
                     return false;
                  }

                  return true;
               }}
               filter={$appState.filter.abilities}
               isExpandedMap={$appState.isExpanded.abilities}
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

         width: 100%;
         padding: var(--padding-standard);

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

         .option {
            &:not(:first-child) {
               margin-left: var(--padding-standard);
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
            margin-top: var(--padding-large);
         }
      }
   }
</style>
