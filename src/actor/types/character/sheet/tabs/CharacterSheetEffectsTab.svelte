<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import CharacterSheetItemList from '~/actor/types/character/sheet/items/CharacterSheetItemList.svelte';
   import CharacterSheetTabHeaderButton from '~/actor/types/character/sheet/tabs/CharacterSheetTabHeaderButton.svelte';
   import CharacterSheetEffect from '~/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   // Application reference
   const appState = getContext('ApplicationStateStore');

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <div class="row">
         <!--Add Item Button-->
         <div class="button">
            <CharacterSheetTabHeaderButton
               icon={'circle-plus'}
               label={localize('addNewEffect')}
               on:click={() => {
                  $document.addItem('effect');
               }}
            />
         </div>

         <!--Clear temporary effects button-->
         <!--Reset button-->
         <div class="button">
            <CharacterSheetTabHeaderButton
               icon={'clock'}
               label={localize('removeExpiredEffects')}
               on:click={() => {
                  $document.typeComponent.removeExpiredEffects(false);
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
            <TextInput bind:value={$appState.filter.abilities} />
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
   @import '../../../../../Styles/Mixins.scss';

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
         padding: 0.25rem;
         width: 100%;

         .row {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               margin-top: 0.25rem;
            }

            .label {
               font-weight: bold;
               margin-right: 0.25rem;
            }

            .input {
               @include flex-group-left;
            }

            .button {
               margin-left: 0.25rem;
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
            margin-top: 0.5rem;
         }
      }
   }
</style>
