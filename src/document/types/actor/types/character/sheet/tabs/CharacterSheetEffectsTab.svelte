<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import CharacterSheetItemList
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemList.svelte';
   import CharacterSheetTabHeaderButton
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetTabHeaderButton.svelte';
   import CharacterSheetEffect
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte';
   import { CREATE_ICON, REMOVE_TEMP_EFFECTS_ICON } from '~/system/Icons.js';

   // Application reference
   const appState = getContext('applicationState');

   // Document reference
   const document = getContext('document');
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <div class="row">
         <!--Add Item Button-->
         <div class="button">
            <CharacterSheetTabHeaderButton
               icon={CREATE_ICON}
               label={localize('addNewEffect')}
               on:click={() => {
                  $document.system.addItem('effect');
               }}
            />
         </div>

         <!--Clear temporary effects button-->
         <!--Reset button-->
         <div class="button">
            <CharacterSheetTabHeaderButton
               icon={REMOVE_TEMP_EFFECTS_ICON}
               label={localize('removeExpiredEffects')}
               on:click={() => {
                  $document.system.requestRemoveExpiredEffects();
               }}
            />
         </div>
      </div>
      <div class="row">
         <!--Label-->
         <div class="label">
            {localize('filter')}
         </div>

         <!--Input-->
         <div class="input">
            <TextInput bind:value={$appState.filter.abilities}/>
         </div>
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities List-->
         <div class="list">
            <CharacterSheetItemList
               itemComponent={CharacterSheetEffect}
               filterFunction={(item) => {
                  return item.type === 'effect';
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
         padding: var(--padding-standard);
         width: 100%;

         .row {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               margin-top: var(--padding-standard);
            }

            .label {
               font-weight: bold;
               margin-right: var(--padding-standard);
            }

            .input {
               @include flex-group-left;
            }

            .button {
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
