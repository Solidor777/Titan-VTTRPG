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

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {getContext<Document>} Reference to the Document store. */
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
         <TextInput bind:value={$appState.tabs.abilities.filter}/>
      </div>

      <!--Add Item Button-->
      <div class="button">
         <CharacterSheetTabHeaderButton
            icon={CREATE_ICON}
            label={localize('addNewSpell')}
            on:click={() => {
               $document.createItemFromType('spell');
            }}
         />
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.tabs.spells.scrollTop}>
         <!--Spell List-->
         <div class="list">
            <CharacterSheetItemList
               filter={$appState.tabs.spells.filter}
               filterFunction={(item) => {
                  return item.type === 'spell';
               }}
               isExpandedMap={$appState.tabs.spells.isExpanded}
               itemComponent={CharacterSheetSpell}
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

         @include padding-large;

         .label {
            font-weight: bold;
            margin-right: var(--titan-spacing-standard);
         }

         .input {
            @include flex-group-left;
         }

         .button {
            margin-left: var(--titan-spacing-standard);
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
            margin-top: var(--titan-spacing-large);
         }
      }
   }
</style>
