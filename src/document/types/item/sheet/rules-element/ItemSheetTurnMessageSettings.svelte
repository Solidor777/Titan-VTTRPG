<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentBoundEditorInput from '~/document/svelte-components/input/DocumentBoundEditorInput.svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import ItemSheetRulesElementOperationSelect
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte';

   /** @type {number} The index of the rules element in the item's rules elements array. */
   export let idx = void 0;

   /**@type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**@type {object} Reference to the Rules Element object. */
   $: element = $document?.rulesElement[idx];

   const selectorOptions = [
      {
         label: localize('turnStart'),
         value: 'turnStart',
      },
      {
         label: localize('turnEnd'),
         value: 'turnEnd',
      },
   ];

   // Setup tabs
</script>

{#if element && element.operation === 'turnMessage'}
   <div class="element" transition:slide|local>
      <!--Main Header-->
      <div class="header">
         <!--Element Operation-->
         <div class="settings">
            <div class="field select">
               <ItemSheetRulesElementOperationSelect {idx}/>
            </div>

            <!--Selector-->
            <div class="field select">
               <DocumentSelect
                  options={selectorOptions}
                  bind:value={$document.system.rulesElement[idx].selector}
               />
            </div>
         </div>

         <!--Delete Element-->
         <div class="delete-button">
            <IconButton
               icon={DELETE_ICON}
               on:click={() => {
                  $document.system.deleteRulesElement(idx);
               }}
            />
         </div>
      </div>
      <!--Message text-->
      <div class="section">
         <DocumentBoundEditorInput bind:value={$document.system.rulesElement[idx].message}/>
      </div>
   </div>
{/if}

<style lang="scss">
   .element {
      @include flex-column;
      @include flex-group-top-left;
      @include border;
      @include panel-1;

      width: 100%;
      height: 100%;

      .header {
         @include flex-row;

         width: 100%;

         .settings {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
            margin-bottom: var(--titan-spacing-large);
            flex-wrap: wrap;

            .field {
               @include flex-row;

               margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 var(--titan-spacing-standard);

               &.select {
                  @include flex-group-left;
               }
            }
         }

         .delete-button {
            @include flex-column;
            @include flex-group-top;

            margin: var(--titan-spacing-standard) var(--titan-spacing-standard) 0 0;
         }
      }

      .section {
         @include flex-column;

         margin-top: var(--titan-spacing-standard);
         width: 100%;
         min-height: 160px;
         height: 100%;
      }
   }
</style>
