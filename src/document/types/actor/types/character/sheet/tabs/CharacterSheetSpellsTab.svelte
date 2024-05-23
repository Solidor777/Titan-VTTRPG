<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import CharacterSheetSpell
      from '~/document/types/actor/types/character/sheet/items/spell/CharacterSheetSpell.svelte';
   import CharacterSheetItemList
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemList.svelte';
   import CharacterSheetTabHeaderButton
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetTabHeaderButton.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';

   // Application reference
   const appState = getContext('applicationState');

   // Document reference
   const document = getContext('document');
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <!--Label-->
      <div class="label">
         {localize('filter')}
      </div>

      <!--Input-->
      <div class="input">
         <TextInput bind:value={$appState.filter.abilities}/>
      </div>

      <!--Add Item Button-->
      <div class="button">
         <CharacterSheetTabHeaderButton
            icon={CREATE_ICON}
            label={localize('addNewSpell')}
            on:click={() => {
               $document.system.addItem('spell');
            }}
         />
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.spells}>
         <!--Spell List-->
         <div class="list">
            <CharacterSheetItemList
               itemComponent={CharacterSheetSpell}
               filterFunction={(item) => {
                  return item.type === 'spell';
               }}
               filter={$appState.filter.spells}
               isExpandedMap={$appState.isExpanded.spells}
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
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         @include panel-1;

         width: 100%;
         padding: var(--padding-standard);

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
