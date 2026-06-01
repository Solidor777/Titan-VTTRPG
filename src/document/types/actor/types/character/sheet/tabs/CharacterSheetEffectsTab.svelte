<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import CharacterSheetEffectList
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectList.svelte';
   import CharacterSheetTabHeaderButton
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetTabHeaderButton.svelte';
   import { CREATE_ICON, REMOVE_TEMP_EFFECTS_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {object} Reference to the reactive Document store. */
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
               onclick={() => {
                  document.data.createEmbeddedDocuments('ActiveEffect', [{
                     name: localize('newEffect'),
                     type: 'effect',
                  }]);
               }}
            />
         </div>

         <!--Clear temporary effects button-->
         <!--Reset button-->
         <div class="button">
            <CharacterSheetTabHeaderButton
               icon={REMOVE_TEMP_EFFECTS_ICON}
               label={localize('removeExpiredEffects')}
               onclick={() => {
                  document.data.system.requestRemoveExpiredEffects();
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
            <TextInput bind:value={$appState.tabs.effects.filter}/>
         </div>
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.tabs.effects.scrollTop}>
         <!--Effects List-->
         <div class="list">
            <CharacterSheetEffectList filter={$appState.tabs.effects.filter}/>
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
         @include padding-large;

         width: 100%;

         .row {
            @include flex-row;
            @include flex-group-center;

            width: 100%;

            &:not(:first-child) {
               @include margin-top-standard;
            }

            .label {
               font-weight: bold;

               @include margin-right-standard;
            }

            .input {
               @include flex-group-left;
            }

            .button {
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
