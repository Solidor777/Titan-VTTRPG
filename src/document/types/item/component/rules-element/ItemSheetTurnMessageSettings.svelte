<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentSelect from '~/document/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import onRulesElementOperationChanged
      from '~/document/types/item/component/rules-element/RulesElementUpdateOperation';
   import DocumentBoundEditorInput from '~/document/components/input/DocumentBoundEditorInput.svelte';
   import { DELETE_ICON } from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');

   export let operationOptions = void 0;
   export let idx = void 0;
   export let element = void 0;

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
               <DocumentSelect
                  options={operationOptions}
                  bind:value={element.operation}
                  on:change={() => {
                     onRulesElementOperationChanged($document, idx);
                  }}
               />
            </div>

            <!--Selector-->
            <div class="field select">
               <DocumentSelect
                  options={selectorOptions}
                  bind:value={element.selector}
               />
            </div>
         </div>

         <!--Delete Element-->
         <div class="delete-button">
            <IconButton
               icon={DELETE_ICON}
               on:click={() => {
                  $document.system.removeRulesElement(idx);
               }}
            />
         </div>
      </div>
      <!--Message text-->
      <div class="section">
         <DocumentBoundEditorInput bind:value={element.message}/>
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
            margin-bottom: var(--padding-large);
            flex-wrap: wrap;

            .field {
               @include flex-row;
               margin: var(--padding-large) var(--padding-standard) 0 var(--padding-standard);

               &.select {
                  @include flex-group-left;
               }
            }
         }

         .delete-button {
            @include flex-column;
            @include flex-group-top;
            margin: var(--padding-standard) var(--padding-standard) 0 0;
         }
      }

      .section {
         @include flex-column;
         margin-top: var(--padding-standard);
         width: 100%;
         min-height: 160px;
         height: 100%;
      }
   }
</style>
